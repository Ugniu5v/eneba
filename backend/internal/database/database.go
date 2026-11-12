package database

import (
	"context"
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"eneba-market/backend/internal/catalog"
	"eneba-market/backend/internal/ids"

	"github.com/lib/pq"
	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var sqliteSchema string

//go:embed schema_postgres.sql
var postgresSchema string

// Dialect identifies the SQL engine behind a DB.
type Dialect string

const (
	DialectSQLite   Dialect = "sqlite"
	DialectPostgres Dialect = "postgres"
)

// DB carries the connection pool plus the dialect needed by schema migrations.
type DB struct {
	*sql.DB
	Dialect Dialect
}

// Open connects to the database named by dsn. A postgres:// or postgresql://
// URL connects to PostgreSQL (Supabase, local Postgres, ...); anything else is
// treated as a SQLite file path. SQLite remains the zero-setup default for the
// demo, while DATABASE_URL in cmd/api switches the same binary to Supabase.
func Open(dsn string) (*DB, error) {
	return OpenWithOptions(dsn, OpenOptions{})
}

// OpenOptions tunes the PostgreSQL pool. Zero values keep the defaults, which
// suit a long-lived container. Serverless platforms should pass a smaller pool:
// every warm function instance holds its own connections and Supavisor already
// multiplexes clients.
type OpenOptions struct {
	MaxOpenConns int
	MaxIdleConns int
}

func OpenWithOptions(dsn string, opts OpenOptions) (*DB, error) {
	dsn = strings.TrimSpace(dsn)
	if dsn == "" {
		return nil, fmt.Errorf("database URL or path is required")
	}
	if isPostgresDSN(dsn) {
		return openPostgres(dsn, opts)
	}
	if i := strings.Index(dsn, "://"); i > 0 {
		return nil, fmt.Errorf("unsupported database URL scheme %q: use a postgres:// or postgresql:// URL", dsn[:i])
	}
	return openSQLite(dsn)
}

func isPostgresDSN(dsn string) bool {
	lower := strings.ToLower(dsn)
	return strings.HasPrefix(lower, "postgres://") || strings.HasPrefix(lower, "postgresql://")
}

func openPostgres(dsn string, opts OpenOptions) (*DB, error) {
	prepared, err := preparePostgresURL(dsn)
	if err != nil {
		return nil, err
	}
	connector, err := pq.NewConnector(prepared)
	if err != nil {
		return nil, fmt.Errorf("configure postgres connection: %w", redactDSNError(err, prepared))
	}
	db := sql.OpenDB(connector)
	// Supabase's transaction pooler (Supavisor, port 6543) already multiplexes
	// many clients onto a smaller set of server connections, so the API pool is
	// deliberately small. lib/pq uses unnamed statements for QueryContext and
	// ExecContext, so no prepared statements survive a pooled transaction.
	maxOpen, maxIdle := opts.MaxOpenConns, opts.MaxIdleConns
	if maxOpen <= 0 {
		maxOpen = 10
	}
	if maxIdle <= 0 || maxIdle > maxOpen {
		maxIdle = max(1, maxOpen/2)
	}
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping postgres database: %w", err)
	}
	return &DB{DB: db, Dialect: DialectPostgres}, nil
}

// preparePostgresURL fills in the connection parameters a hosted Postgres
// connection needs without overriding what the operator supplied. Supabase
// hosts always use TLS, and connect_timeout keeps a bad URL from hanging the
// process before the HTTP server starts.
func preparePostgresURL(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		// url.Error embeds the whole connection string, including the password.
		var urlErr *url.Error
		if errors.As(err, &urlErr) {
			err = urlErr.Err
		}
		return "", fmt.Errorf("parse database URL: %w", err)
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return "", fmt.Errorf("unsupported database URL scheme %q: use postgres:// or postgresql://", u.Scheme)
	}
	q := u.Query()
	if u.Hostname() == "" && q.Get("host") == "" && q.Get("hostaddr") == "" {
		return "", fmt.Errorf("database URL is missing a host")
	}
	if q.Get("sslmode") == "" && isSupabaseHost(u.Hostname()) {
		q.Set("sslmode", "require")
	}
	if q.Get("connect_timeout") == "" {
		q.Set("connect_timeout", "10")
	}
	if q.Get("application_name") == "" {
		q.Set("application_name", "eneba-api")
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

// redactDSNError keeps the database password out of startup logs when the
// driver rejects a connection string.
func redactDSNError(err error, dsn string) error {
	parsed, parseErr := url.Parse(dsn)
	if parseErr != nil || parsed.User == nil {
		return err
	}
	password, ok := parsed.User.Password()
	if !ok || password == "" {
		return err
	}
	message := err.Error()
	message = strings.ReplaceAll(message, password, "<redacted>")
	message = strings.ReplaceAll(message, url.QueryEscape(password), "<redacted>")
	return errors.New(message)
}

func isSupabaseHost(host string) bool {
	host = strings.ToLower(host)
	for _, suffix := range []string{".supabase.co", ".supabase.com", ".supabase.net"} {
		if strings.HasSuffix(host, suffix) {
			return true
		}
	}
	return false
}

func openSQLite(path string) (*DB, error) {
	if path != ":memory:" {
		dir := filepath.Dir(path)
		if dir != "." && dir != "" {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return nil, fmt.Errorf("create database directory: %w", err)
			}
		}
	}

	dsn := "file:" + path + "?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"
	if path == ":memory:" {
		dsn = "file:eneba-memory?mode=memory&cache=shared&_pragma=foreign_keys(1)"
	}
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	// A single writer connection keeps SQLite inventory checkout simple and
	// predictable. PostgreSQL gets a real pool instead.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return &DB{DB: db, Dialect: DialectSQLite}, nil
}

func Migrate(ctx context.Context, db *DB) error {
	schema := sqliteSchema
	if db.Dialect == DialectPostgres {
		schema = postgresSchema
	}
	for _, statement := range strings.Split(schema, ";") {
		statement = strings.TrimSpace(statement)
		if statement == "" {
			continue
		}
		if _, err := db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("apply schema: %w", err)
		}
	}
	// Databases created before gift-card values existed need the new columns;
	// CREATE TABLE IF NOT EXISTS above leaves those tables untouched.
	if _, err := ensureColumn(ctx, db, "products", "gift_value_cents", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	if _, err := ensureColumn(ctx, db, "products", "gift_currency", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}
	if err := backfillGiftValues(ctx, db); err != nil {
		return err
	}
	// Digital keys are withheld by the API until the buyer confirms the region
	// and platform. Orders placed before that rule existed are treated as
	// already confirmed, so a demo account keeps its delivered history.
	added, err := ensureColumn(ctx, db, "orders", "keys_confirmed_at", "TEXT NOT NULL DEFAULT ''")
	if err != nil {
		return err
	}
	if added {
		if _, err := db.ExecContext(ctx, `
			UPDATE orders SET keys_confirmed_at = created_at WHERE keys_confirmed_at = ''`); err != nil {
			return fmt.Errorf("backfill key confirmation: %w", err)
		}
	}
	// Cashback is stored on the order as well as in the ledger. Databases from
	// before the feature need both columns before the historical credit is
	// derived from each product's cashback percentage.
	if _, err := ensureColumn(ctx, db, "orders", "cashback_used_cents", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	if _, err := ensureColumn(ctx, db, "orders", "cashback_earned_cents", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return err
	}
	if err := backfillCashback(ctx, db); err != nil {
		return err
	}
	// Order items keep their cart position explicitly. SQLite's implicit rowid
	// has no PostgreSQL equivalent, so the column is added to both schemas.
	added, err = ensureColumn(ctx, db, "order_items", "line_no", "INTEGER NOT NULL DEFAULT 0")
	if err != nil {
		return err
	}
	if added {
		if err := backfillOrderItemLines(ctx, db); err != nil {
			return err
		}
	}
	return syncCatalogProducts(ctx, db)
}

// backfillOrderItemLines gives legacy order items a stable position. Fresh
// databases set line_no on insert, so this only runs on upgrade.
func backfillOrderItemLines(ctx context.Context, db *DB) error {
	query := `UPDATE order_items SET line_no = rowid WHERE line_no = 0`
	if db.Dialect == DialectPostgres {
		query = `
			UPDATE order_items AS oi
			SET line_no = numbered.rn
			FROM (
				SELECT id, (ROW_NUMBER() OVER (ORDER BY ctid))::int AS rn
				FROM order_items
			) AS numbered
			WHERE oi.id = numbered.id AND oi.line_no = 0`
	}
	if _, err := db.ExecContext(ctx, query); err != nil {
		return fmt.Errorf("backfill order item positions: %w", err)
	}
	return nil
}

// backfillCashback credits the historical demo orders once. Fresh databases
// have no orders at this point and receive their cashback from Seed instead.
func backfillCashback(ctx context.Context, db *DB) error {
	const marker = "cashback_backfill_v1"
	var existing string
	err := db.QueryRowContext(ctx, `SELECT value FROM meta WHERE key = $1`, marker).Scan(&existing)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("check cashback backfill: %w", err)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin cashback backfill: %w", err)
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, `
		SELECT o.id, o.user_id, o.created_at,
			CAST(ROUND(SUM(oi.line_total_cents * p.cashback_percent) / 100.0) AS INTEGER)
		FROM orders o
		JOIN order_items oi ON oi.order_id = o.id
		JOIN products p ON p.id = oi.product_id
		LEFT JOIN cashback_entries ce ON ce.order_id = o.id AND ce.kind = 'earned'
		WHERE ce.id IS NULL
		GROUP BY o.id, o.user_id, o.created_at`)
	if err != nil {
		return fmt.Errorf("list orders for cashback backfill: %w", err)
	}
	type credit struct {
		orderID   string
		userID    string
		createdAt string
		amount    int
	}
	credits := make([]credit, 0)
	for rows.Next() {
		var c credit
		if err := rows.Scan(&c.orderID, &c.userID, &c.createdAt, &c.amount); err != nil {
			rows.Close()
			return fmt.Errorf("scan cashback backfill: %w", err)
		}
		credits = append(credits, c)
	}
	if err := rows.Close(); err != nil {
		return fmt.Errorf("close cashback backfill rows: %w", err)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, c := range credits {
		if _, err := tx.ExecContext(ctx,
			`UPDATE orders SET cashback_earned_cents = $1 WHERE id = $2`, c.amount, c.orderID,
		); err != nil {
			return fmt.Errorf("backfill order cashback: %w", err)
		}
		if c.amount <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO cashback_entries (id, user_id, order_id, kind, amount_cents, description, created_at)
			VALUES ($1, $2, $3, 'earned', $4, 'Cashback earned on a past order', $5)`,
			ids.New("cbk"), c.userID, c.orderID, c.amount, c.createdAt,
		); err != nil {
			return fmt.Errorf("backfill cashback entry: %w", err)
		}
	}

	// ON CONFLICT ... DO UPDATE works on PostgreSQL and on the SQLite versions
	// bundled with modernc.org/sqlite.
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO meta (key, value) VALUES ($1, '1')
		 ON CONFLICT (key) DO UPDATE SET value = excluded.value`, marker,
	); err != nil {
		return fmt.Errorf("record cashback backfill: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit cashback backfill: %w", err)
	}
	return nil
}

// ensureColumn adds a column when a database created by an older schema lacks
// it. It reports whether this call added the column, so one-time data
// backfills only run on the upgrade that introduced the column.
func ensureColumn(ctx context.Context, db *DB, table, column, definition string) (bool, error) {
	found := false
	if db.Dialect == DialectPostgres {
		if err := db.QueryRowContext(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = current_schema()
				  AND table_name = $1 AND column_name = $2
			)`, table, column).Scan(&found); err != nil {
			return false, fmt.Errorf("inspect %s columns: %w", table, err)
		}
	} else {
		rows, err := db.QueryContext(ctx, "PRAGMA table_info("+table+")")
		if err != nil {
			return false, fmt.Errorf("inspect %s columns: %w", table, err)
		}
		for rows.Next() {
			var cid, notNull, primaryKey int
			var name, dataType string
			var defaultValue any
			if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &primaryKey); err != nil {
				rows.Close()
				return false, fmt.Errorf("scan %s columns: %w", table, err)
			}
			if name == column {
				found = true
			}
		}
		if err := rows.Close(); err != nil {
			return false, fmt.Errorf("close %s columns: %w", table, err)
		}
	}
	if found {
		return false, nil
	}
	if _, err := db.ExecContext(ctx, "ALTER TABLE "+table+" ADD COLUMN "+column+" "+definition); err != nil {
		// A concurrent starter may have added the column between the inspection
		// and the ALTER; in that case the schema is already what we need.
		if strings.Contains(err.Error(), "duplicate column name") || strings.Contains(err.Error(), "already exists") {
			return false, nil
		}
		return false, fmt.Errorf("add %s.%s: %w", table, column, err)
	}
	return true, nil
}

// syncCatalogProducts adds catalogue products that are missing from an existing
// demo database. This is what lets a new gift-card denomination become its own
// searchable product without deleting the demo account, orders or sold keys.
func syncCatalogProducts(ctx context.Context, db *DB) error {
	var count int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM products`).Scan(&count); err != nil {
		return fmt.Errorf("check catalogue products: %w", err)
	}
	// An empty database is populated by Seed, which needs the whole first-run
	// configuration (demo user, banners, categories, homepage blocks).
	if count == 0 {
		return nil
	}
	data, err := catalog.Load()
	if err != nil {
		return err
	}

	rows, err := db.QueryContext(ctx, `SELECT slug FROM products`)
	if err != nil {
		return fmt.Errorf("list existing product slugs: %w", err)
	}
	existing := make(map[string]bool, count)
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			rows.Close()
			return fmt.Errorf("scan existing product slug: %w", err)
		}
		existing[slug] = true
	}
	if err := rows.Close(); err != nil {
		return fmt.Errorf("close product slug rows: %w", err)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin catalogue sync: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	for i, product := range data.Products {
		if existing[product.Slug] {
			continue
		}
		if err := insertCatalogProduct(ctx, tx, data, product, i, now); err != nil {
			return fmt.Errorf("sync catalogue product %s: %w", product.Slug, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit catalogue sync: %w", err)
	}
	return nil
}

// backfillGiftValues keeps existing demo databases in sync with the catalogue's
// gift-card face values without requiring a destructive reseed.
func backfillGiftValues(ctx context.Context, db *DB) error {
	data, err := catalog.Load()
	if err != nil {
		return err
	}
	for _, product := range data.Products {
		if product.GiftValueCents <= 0 && product.GiftCurrency == "" {
			continue
		}
		// Keep the demo's popularity ordering in sync too: generated
		// denominations are less-reviewed than the brand's main card, otherwise
		// the most-popular store page becomes a wall of one brand's amounts.
		if _, err := db.ExecContext(ctx,
			`UPDATE products SET gift_value_cents = $1, gift_currency = $2, rating_count = $3 WHERE slug = $4`,
			product.GiftValueCents, product.GiftCurrency, product.RatingCount, product.Slug,
		); err != nil {
			return fmt.Errorf("backfill gift value for %s: %w", product.Slug, err)
		}
	}
	return nil
}
