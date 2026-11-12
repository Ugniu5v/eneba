package database_test

import (
	"context"
	"path/filepath"
	"testing"

	"eneba-market/backend/internal/database"
)

// Existing databases upgrade in place: the migration must recover the cashback
// that historical orders would have earned instead of leaving the new balance
// at zero until the next purchase.
func TestMigrateBackfillsCashbackForExistingOrders(t *testing.T) {
	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	ctx := context.Background()
	if err := database.Migrate(ctx, db); err != nil {
		t.Fatalf("initial migrate: %v", err)
	}
	if _, err := database.Seed(ctx, db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// Simulate a database created before cashback existed: no ledger, no order
	// totals and no backfill marker.
	if _, err := db.ExecContext(ctx, `DELETE FROM cashback_entries`); err != nil {
		t.Fatalf("clear cashback ledger: %v", err)
	}
	if _, err := db.ExecContext(ctx, `UPDATE orders SET cashback_earned_cents = 0`); err != nil {
		t.Fatalf("clear order cashback: %v", err)
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM meta WHERE key = 'cashback_backfill_v1'`); err != nil {
		t.Fatalf("clear backfill marker: %v", err)
	}

	if err := database.Migrate(ctx, db); err != nil {
		t.Fatalf("upgrade migrate: %v", err)
	}

	var balance, earned int
	if err := db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount_cents), 0) FROM cashback_entries`,
	).Scan(&balance); err != nil {
		t.Fatalf("read backfilled balance: %v", err)
	}
	if err := db.QueryRowContext(ctx,
		`SELECT cashback_earned_cents FROM orders WHERE number = 'ENB-DEMO-26'`,
	).Scan(&earned); err != nil {
		t.Fatalf("read backfilled order: %v", err)
	}
	if balance <= 0 || balance != earned {
		t.Fatalf("expected the historical order's cashback to be credited: balance=%d order=%d",
			balance, earned)
	}

	// The marker makes the operation one-time; a second migration must not
	// double-credit the same order.
	if err := database.Migrate(ctx, db); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	var again int
	if err := db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount_cents), 0) FROM cashback_entries`,
	).Scan(&again); err != nil {
		t.Fatalf("read balance again: %v", err)
	}
	if again != balance {
		t.Fatalf("migration double-credited cashback: got %d want %d", again, balance)
	}
}
