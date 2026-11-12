package store

import (
	"context"
	"database/sql"
	"fmt"
)

// rowQuerier is implemented by both *sql.DB and *sql.Tx, so the balance can be
// read inside the same transaction that redeems it.
type rowQuerier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// CashbackSummary returns the current balance plus the complete ledger. The
// balance is always derived from the entries, which keeps redemptions and
// credits in one auditable place.
func (s *Store) CashbackSummary(ctx context.Context, userID string) (CashbackSummary, error) {
	summary := CashbackSummary{
		BalanceCents:  0,
		EarnedCents:   0,
		RedeemedCents: 0,
		Entries:       []CashbackEntry{},
	}
	if err := s.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(amount_cents), 0),
			COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN amount_cents < 0 THEN -amount_cents ELSE 0 END), 0)
		FROM cashback_entries WHERE user_id = $1`, userID,
	).Scan(&summary.BalanceCents, &summary.EarnedCents, &summary.RedeemedCents); err != nil {
		return CashbackSummary{}, fmt.Errorf("sum cashback: %w", err)
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT ce.id, ce.kind, ce.amount_cents, ce.description, ce.created_at,
			COALESCE(o.number, '')
		FROM cashback_entries ce
		LEFT JOIN orders o ON o.id = ce.order_id
		WHERE ce.user_id = $1
		ORDER BY ce.created_at DESC, ce.id DESC`, userID)
	if err != nil {
		return CashbackSummary{}, fmt.Errorf("list cashback entries: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var entry CashbackEntry
		if err := rows.Scan(&entry.ID, &entry.Kind, &entry.AmountCents, &entry.Description,
			&entry.CreatedAt, &entry.OrderNumber); err != nil {
			return CashbackSummary{}, fmt.Errorf("scan cashback entry: %w", err)
		}
		summary.Entries = append(summary.Entries, entry)
	}
	if err := rows.Err(); err != nil {
		return CashbackSummary{}, fmt.Errorf("iterate cashback entries: %w", err)
	}
	return summary, nil
}

func cashbackBalance(ctx context.Context, q rowQuerier, userID string) (int, error) {
	var balance int
	if err := q.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM cashback_entries WHERE user_id = $1`, userID,
	).Scan(&balance); err != nil {
		return 0, fmt.Errorf("cashback balance: %w", err)
	}
	return balance, nil
}
