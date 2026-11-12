package database_test

import (
	"context"
	"os"
	"testing"
	"time"

	"eneba-market/backend/internal/database"
	"eneba-market/backend/internal/store"
)

// TestPostgresBackend runs the real schema, seed and catalogue queries against
// PostgreSQL. It is skipped unless TEST_DATABASE_URL points at a disposable
// database, e.g.:
//
//	docker run --rm -e POSTGRES_PASSWORD=eneba -p 5432:5432 postgres:17
//	TEST_DATABASE_URL='postgres://postgres:eneba@localhost:5432/postgres?sslmode=disable' go test ./...
//
// The test does not drop anything, so do not point it at a database you care
// about; it seeds only when the products table is empty.
func TestPostgresBackend(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to a disposable PostgreSQL database")
	}
	db, err := database.Open(dsn)
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	if db.Dialect != database.DialectPostgres {
		t.Fatalf("dialect = %q, want %q", db.Dialect, database.DialectPostgres)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	if err := database.Migrate(ctx, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if _, err := database.Seed(ctx, db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	var products, keys int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM products`).Scan(&products); err != nil {
		t.Fatalf("count products: %v", err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM product_keys`).Scan(&keys); err != nil {
		t.Fatalf("count product keys: %v", err)
	}
	if products == 0 || keys == 0 {
		t.Fatalf("seeded database is empty: products=%d keys=%d", products, keys)
	}

	repo := store.New(db)
	list, err := repo.ListProducts(ctx)
	if err != nil {
		t.Fatalf("list products: %v", err)
	}
	if len(list) == 0 {
		t.Fatal("ListProducts returned no products")
	}
	detail, err := repo.GetProduct(ctx, list[0].Slug)
	if err != nil {
		t.Fatalf("get product %s: %v", list[0].Slug, err)
	}
	if len(detail.Offers) == 0 {
		t.Fatalf("product %s has no offers", list[0].Slug)
	}
}
