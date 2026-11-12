package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"eneba-market/backend/internal/ids"
)

type checkoutLine struct {
	offerID         string
	productID       string
	productTitle    string
	productSlug     string
	sellerName      string
	region          string
	platform        string
	coverImage      string
	unitPriceCents  int
	quantity        int
	cashbackPercent int
	keyIDs          []int64
	keyCodes        []string
}

func (s *Store) CreateOrder(ctx context.Context, userID string, items []CheckoutItem, payment PaymentInfo, cashbackCents int) (Order, error) {
	if len(items) == 0 {
		return Order{}, fmt.Errorf("cart is empty")
	}
	if cashbackCents < 0 {
		return Order{}, fmt.Errorf("cashback amount cannot be negative")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Order{}, fmt.Errorf("begin checkout: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	lines := make([]checkoutLine, 0, len(items))
	subtotal := 0

	for _, item := range items {
		if strings.TrimSpace(item.OfferID) == "" {
			return Order{}, fmt.Errorf("invalid offer")
		}
		if item.Quantity < 1 || item.Quantity > 5 {
			return Order{}, fmt.Errorf("quantity must be between 1 and 5")
		}
		var line checkoutLine
		var stock int
		err := tx.QueryRowContext(ctx, `
			SELECT o.id, o.product_id, p.title, p.slug, o.seller_name, o.region, o.platform,
				p.cover_image, o.price_cents, o.stock, p.cashback_percent
			FROM offers o JOIN products p ON p.id = o.product_id
			WHERE o.id = $1`, item.OfferID,
		).Scan(&line.offerID, &line.productID, &line.productTitle, &line.productSlug, &line.sellerName,
			&line.region, &line.platform, &line.coverImage, &line.unitPriceCents, &stock,
			&line.cashbackPercent)
		if errors.Is(err, sql.ErrNoRows) || (err == nil && stock < item.Quantity) {
			return Order{}, ErrInsufficientStock
		}
		if err != nil {
			return Order{}, fmt.Errorf("load checkout offer: %w", err)
		}
		line.quantity = item.Quantity

		rows, err := tx.QueryContext(ctx, `
			SELECT id, code FROM product_keys
			WHERE offer_id = $1 AND is_sold = 0
			ORDER BY id ASC LIMIT $2`, item.OfferID, item.Quantity)
		if err != nil {
			return Order{}, fmt.Errorf("load inventory: %w", err)
		}
		for rows.Next() {
			var keyID int64
			var code string
			if err := rows.Scan(&keyID, &code); err != nil {
				rows.Close()
				return Order{}, fmt.Errorf("scan inventory: %w", err)
			}
			line.keyIDs = append(line.keyIDs, keyID)
			line.keyCodes = append(line.keyCodes, code)
		}
		if err := rows.Close(); err != nil {
			return Order{}, fmt.Errorf("close inventory rows: %w", err)
		}
		if len(line.keyIDs) < item.Quantity {
			return Order{}, ErrInsufficientStock
		}
		// Reserve the keys and stock as soon as the line is accepted so two
		// lines that share an offer cannot receive the same key in one order.
		for _, keyID := range line.keyIDs {
			if _, err := tx.ExecContext(ctx, `
				UPDATE product_keys SET is_sold = 1, sold_at = $1 WHERE id = $2 AND is_sold = 0`,
				now.Format(time.RFC3339), keyID,
			); err != nil {
				return Order{}, fmt.Errorf("reserve inventory: %w", err)
			}
		}
		res, err := tx.ExecContext(ctx, `
			UPDATE offers SET stock = stock - $1 WHERE id = $2 AND stock >= $3`,
			line.quantity, line.offerID, line.quantity)
		if err != nil {
			return Order{}, fmt.Errorf("update offer stock: %w", err)
		}
		if err := ensureAffected(res); err != nil {
			return Order{}, ErrInsufficientStock
		}
		subtotal += line.unitPriceCents * item.Quantity
		lines = append(lines, line)
	}

	cashbackEarned := 0
	for _, line := range lines {
		lineTotal := line.unitPriceCents * line.quantity
		cashbackEarned += int(math.Round(float64(lineTotal) * float64(line.cashbackPercent) / 100))
	}
	balance, err := cashbackBalance(ctx, tx, userID)
	if err != nil {
		return Order{}, err
	}
	if cashbackCents > balance {
		return Order{}, ErrInsufficientCashback
	}
	if cashbackCents > subtotal {
		cashbackCents = subtotal
	}
	total := subtotal - cashbackCents

	orderID := ids.New("ord")
	number := ids.OrderNumber(now)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO orders (
			id, number, user_id, subtotal_cents, fee_cents, cashback_used_cents,
			cashback_earned_cents, total_cents, currency, status, payment_method,
			payment_ref, card_last4, created_at
		) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, 'EUR', 'Delivered', $8, $9, $10, $11)`,
		orderID, number, userID, subtotal, cashbackCents, cashbackEarned, total,
		payment.Method, payment.Ref, payment.Last4, now.Format(time.RFC3339),
	); err != nil {
		return Order{}, fmt.Errorf("create order: %w", err)
	}

	cashbackAt := now.Format(time.RFC3339)
	if cashbackCents > 0 {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO cashback_entries (id, user_id, order_id, kind, amount_cents, description, created_at)
			VALUES ($1, $2, $3, 'redeemed', $4, $5, $6)`,
			ids.New("cbk"), userID, orderID, -cashbackCents,
			"Cashback applied to order "+number, cashbackAt,
		); err != nil {
			return Order{}, fmt.Errorf("record cashback redemption: %w", err)
		}
	}
	if cashbackEarned > 0 {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO cashback_entries (id, user_id, order_id, kind, amount_cents, description, created_at)
			VALUES ($1, $2, $3, 'earned', $4, $5, $6)`,
			ids.New("cbk"), userID, orderID, cashbackEarned,
			"Cashback earned on order "+number, cashbackAt,
		); err != nil {
			return Order{}, fmt.Errorf("record cashback earning: %w", err)
		}
	}

	for lineIndex, line := range lines {
		itemID := ids.New("itm")
		lineTotal := line.unitPriceCents * line.quantity
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO order_items (
				id, order_id, offer_id, product_id, product_title, product_slug, seller_name,
				region, platform, cover_image, unit_price_cents, quantity, line_total_cents, line_no
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
			itemID, orderID, line.offerID, line.productID, line.productTitle, line.productSlug,
			line.sellerName, line.region, line.platform, line.coverImage, line.unitPriceCents,
			line.quantity, lineTotal, lineIndex,
		); err != nil {
			return Order{}, fmt.Errorf("create order item: %w", err)
		}

		for i := 0; i < line.quantity; i++ {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO digital_keys (id, order_id, order_item_id, code, created_at)
				VALUES ($1, $2, $3, $4, $5)`,
				ids.New("key"), orderID, itemID, line.keyCodes[i], now.Format(time.RFC3339),
			); err != nil {
				return Order{}, fmt.Errorf("assign digital key: %w", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return Order{}, fmt.Errorf("commit order: %w", err)
	}
	return s.GetOrder(ctx, userID, number)
}

func ensureAffected(res sql.Result) error {
	count, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return errors.New("no rows affected")
	}
	return nil
}

func (s *Store) GetOrder(ctx context.Context, userID, number string) (Order, error) {
	var order Order
	var orderID, keysConfirmedAt string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, number, status, created_at, subtotal_cents, fee_cents,
			cashback_used_cents, cashback_earned_cents, total_cents,
			currency, payment_method, card_last4, keys_confirmed_at
		FROM orders WHERE number = $1 AND user_id = $2`, number, userID,
	).Scan(&orderID, &order.Number, &order.Status, &order.CreatedAt, &order.SubtotalCents,
		&order.FeeCents, &order.CashbackUsedCents, &order.CashbackEarnedCents,
		&order.TotalCents, &order.Currency, &order.PaymentMethod, &order.CardLast4,
		&keysConfirmedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, ErrNotFound
	}
	if err != nil {
		return Order{}, fmt.Errorf("get order: %w", err)
	}
	order.KeysConfirmed = keysConfirmedAt != ""
	items, count, err := s.loadOrderItems(ctx, orderID, order.KeysConfirmed)
	if err != nil {
		return Order{}, err
	}
	order.Items = items
	order.ItemCount = count
	return order, nil
}

func (s *Store) ListOrders(ctx context.Context, userID string) ([]Order, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, number, status, created_at, subtotal_cents, fee_cents,
			cashback_used_cents, cashback_earned_cents, total_cents,
			currency, payment_method, card_last4, keys_confirmed_at
		FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}
	defer rows.Close()

	type orderRow struct {
		order           Order
		orderID         string
		keysConfirmedAt string
	}
	rowsData := make([]orderRow, 0)
	for rows.Next() {
		var row orderRow
		if err := rows.Scan(&row.orderID, &row.order.Number, &row.order.Status, &row.order.CreatedAt,
			&row.order.SubtotalCents, &row.order.FeeCents, &row.order.CashbackUsedCents,
			&row.order.CashbackEarnedCents, &row.order.TotalCents, &row.order.Currency,
			&row.order.PaymentMethod, &row.order.CardLast4, &row.keysConfirmedAt); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		row.order.KeysConfirmed = row.keysConfirmedAt != ""
		rowsData = append(rowsData, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	orders := make([]Order, 0, len(rowsData))
	for _, row := range rowsData {
		items, count, err := s.loadOrderItems(ctx, row.orderID, row.order.KeysConfirmed)
		if err != nil {
			return nil, err
		}
		row.order.Items = items
		row.order.ItemCount = count
		orders = append(orders, row.order)
	}
	return orders, nil
}

func (s *Store) loadOrderItems(ctx context.Context, orderID string, includeKeys bool) ([]OrderItem, int, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, product_title, product_slug, seller_name, region, platform, cover_image,
			unit_price_cents, quantity, line_total_cents
		FROM order_items WHERE order_id = $1 ORDER BY line_no ASC, id ASC`, orderID)
	if err != nil {
		return nil, 0, fmt.Errorf("list order items: %w", err)
	}
	defer rows.Close()

	type keyedItem struct {
		item OrderItem
		id   string
	}
	items := make([]keyedItem, 0, 4)
	count := 0
	for rows.Next() {
		var item keyedItem
		if err := rows.Scan(&item.id, &item.item.ProductTitle, &item.item.ProductSlug,
			&item.item.SellerName, &item.item.Region, &item.item.Platform, &item.item.CoverImage,
			&item.item.UnitPriceCents, &item.item.Quantity, &item.item.LineTotalCents); err != nil {
			return nil, 0, fmt.Errorf("scan order item: %w", err)
		}
		item.item.Keys = []DigitalKey{}
		items = append(items, item)
		count += item.item.Quantity
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	result := make([]OrderItem, 0, len(items))
	for _, item := range items {
		if includeKeys {
			keyRows, err := s.db.QueryContext(ctx, `
				SELECT code, created_at FROM digital_keys WHERE order_item_id = $1 ORDER BY created_at ASC`, item.id)
			if err != nil {
				return nil, 0, fmt.Errorf("list digital keys: %w", err)
			}
			for keyRows.Next() {
				var key DigitalKey
				if err := keyRows.Scan(&key.Code, &key.CreatedAt); err != nil {
					keyRows.Close()
					return nil, 0, fmt.Errorf("scan digital key: %w", err)
				}
				item.item.Keys = append(item.item.Keys, key)
			}
			if err := keyRows.Close(); err != nil {
				return nil, 0, err
			}
		}
		result = append(result, item.item)
	}
	return result, count, nil
}

// ConfirmOrderKeys records that the buyer checked the region and platform of
// every item, and only then returns the order with its digital keys attached.
// Keys are never serialised for an unconfirmed order, so dismissing the client
// dialog cannot expose them.
func (s *Store) ConfirmOrderKeys(ctx context.Context, userID, number string, now time.Time) (Order, error) {
	if _, err := s.db.ExecContext(ctx, `
		UPDATE orders SET keys_confirmed_at = $1
		WHERE number = $2 AND user_id = $3 AND keys_confirmed_at = ''`,
		now.UTC().Format(time.RFC3339), number, userID,
	); err != nil {
		return Order{}, fmt.Errorf("confirm order keys: %w", err)
	}
	// GetOrder also covers an already-confirmed order and returns ErrNotFound
	// when the number does not belong to this account.
	return s.GetOrder(ctx, userID, number)
}
