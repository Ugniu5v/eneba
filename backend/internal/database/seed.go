package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"eneba-market/backend/internal/catalog"
	"eneba-market/backend/internal/ids"

	"golang.org/x/crypto/bcrypt"
)

const (
	DemoEmail    = "demo@eneba.test"
	DemoPassword = "Demo1234!"
)

// Seed populates an empty database with products, offers, inventory, homepage
// configuration and one demo account with order history. It is idempotent.
func Seed(ctx context.Context, db *DB) (bool, error) {
	var count int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM products`).Scan(&count); err != nil {
		return false, fmt.Errorf("check seed state: %w", err)
	}
	if count > 0 {
		return false, nil
	}

	data, err := catalog.Load()
	if err != nil {
		return false, err
	}
	now := time.Now().UTC()
	hash, err := bcrypt.GenerateFromPassword([]byte(DemoPassword), bcrypt.DefaultCost)
	if err != nil {
		return false, fmt.Errorf("hash demo password: %w", err)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	userID := ids.New("usr")
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO users (id, email, display_name, password_hash, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		userID, DemoEmail, "Alex Morgan", string(hash), now.Format(time.RFC3339),
	); err != nil {
		return false, fmt.Errorf("seed demo user: %w", err)
	}

	for i, p := range data.Products {
		if err := insertCatalogProduct(ctx, tx, data, p, i, now); err != nil {
			return false, err
		}
	}

	installedAt := time.Now().UTC()
	for _, b := range data.Banners {
		endsAt := catalog.BannerEndsAt(b.EndsInDays, installedAt)
		var nullEnds any
		if endsAt != "" {
			nullEnds = endsAt
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO banners (id, slot, eyebrow, title, subtitle, cta_label, cta_href, image, theme, ends_at, sort_order, active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)`,
			b.ID, b.Slot, b.Eyebrow, b.Title, b.Subtitle, b.CTALabel, b.CTAHref, b.Image, b.Theme, nullEnds, b.SortOrder,
		); err != nil {
			return false, fmt.Errorf("seed banner %s: %w", b.ID, err)
		}
	}

	for i, c := range data.Categories {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO categories (id, name, slug, icon, href, sort_order) VALUES ($1, $2, $3, $4, $5, $6)`,
			"cat_"+c.Slug, c.Name, c.Slug, c.Icon, c.Href, i,
		); err != nil {
			return false, fmt.Errorf("seed category %s: %w", c.Slug, err)
		}
	}

	for _, s := range data.Sections {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO home_sections (slug, title, subtitle, layout, source, cta_label, cta_href, max_items, sort_order, active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`,
			s.Slug, s.Title, s.Subtitle, s.Layout, s.Source, s.CTALabel, s.CTAHref, s.MaxItems, s.SortOrder,
		); err != nil {
			return false, fmt.Errorf("seed section %s: %w", s.Slug, err)
		}
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO meta (key, value) VALUES ('seed_version', '1'), ('seeded_at', $1)`,
		now.Format(time.RFC3339)); err != nil {
		return false, fmt.Errorf("seed metadata: %w", err)
	}

	if err := seedDemoOrder(ctx, tx, userID, now); err != nil {
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, fmt.Errorf("commit seed: %w", err)
	}
	return true, nil
}

var (
	gameFactors = []float64{0.58, 0.65, 0.72, 0.76, 0.62, 0.68, 0.55, 0.71}
	giftFactors = []float64{0.968, 0.982, 0.995, 0.975}
	sellerPool  = []int{1, 0, 2, 3, 4}
)

// insertCatalogProduct writes one catalogue product together with its seller
// offers and demo inventory. Shared by the first-run seed and the additive
// catalogue sync so a new product arrives with exactly the same shape.
func insertCatalogProduct(ctx context.Context, tx *sql.Tx, data catalog.Data, p catalog.Product, index int, now time.Time) error {
	productID := ids.New("prd")
	features, _ := json.Marshal(p.Features)
	cover := "/assets/covers/" + p.Slug + ".svg"
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO products (
			id, slug, title, subtitle, description, category, product_type, platform, region, genre,
			developer, publisher, release_date, rating, rating_count, badge, is_new, is_featured,
			cover_image, hero_image, cashback_percent, features_json, gift_value_cents,
			gift_currency, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
		productID, p.Slug, p.Title, p.Subtitle, p.Description, p.Category, p.ProductType,
		p.Platform, p.Region, p.Genre, p.Developer, p.Publisher, p.ReleaseDate,
		p.Rating, p.RatingCount, p.Badge, boolInt(p.IsNew), boolInt(p.Featured),
		cover, cover, p.CashbackPercent, string(features), p.GiftValueCents,
		p.GiftCurrency, now.Format(time.RFC3339),
	); err != nil {
		return fmt.Errorf("seed product %s: %w", p.Slug, err)
	}

	offerCount := 3
	if p.Featured {
		offerCount = 4
	}
	for j := 0; j < offerCount; j++ {
		seller := data.Sellers[sellerPool[(index+j)%len(sellerPool)]]
		var factor float64
		if p.ProductType == "Gift Card" || p.ProductType == "Gaming eCard" || p.ProductType == "Subscription" {
			factor = giftFactors[(index+j)%len(giftFactors)]
		} else {
			factor = gameFactors[(index+j)%len(gameFactors)]
		}
		price := int(math.Round(float64(p.BasePriceCents) * factor))
		if price < 99 {
			price = 99
		}
		// Generated denominations are normal-priced items: only the card's
		// original face-value SKU keeps the discounted "sale" marker.
		originalPrice := p.BasePriceCents
		if p.RegularPrice {
			originalPrice = price
		}
		stock := 6 + ((index*3 + j*5) % 11)
		offerID := ids.New("off")
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO offers (
				id, product_id, seller_name, seller_rating, seller_reviews, price_cents,
				original_price_cents, currency, region, platform, delivery, stock, is_official, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, 'EUR', $8, $9, 'Instant delivery', $10, $11, $12)`,
			offerID, productID, seller.Name, seller.Rating, seller.Reviews,
			price, originalPrice, p.Region, p.Platform, stock, boolInt(seller.Official), now.Format(time.RFC3339),
		); err != nil {
			return fmt.Errorf("seed offer %s/%s: %w", p.Slug, seller.Name, err)
		}
		if err := insertProductKeys(ctx, tx, offerID, stock); err != nil {
			return fmt.Errorf("seed inventory %s: %w", p.Slug, err)
		}
	}
	return nil
}

// insertProductKeys writes one offer's demo inventory in a single statement.
// Seeding a hosted PostgreSQL database over a pooler is latency-bound, so this
// avoids thousands of round trips for the ~10k generated keys.
func insertProductKeys(ctx context.Context, tx *sql.Tx, offerID string, count int) error {
	if count <= 0 {
		return nil
	}
	rows := make([]string, 0, count)
	args := make([]any, 0, count*2)
	for i := 0; i < count; i++ {
		rows = append(rows, fmt.Sprintf("($%d, $%d, 0, NULL)", len(args)+1, len(args)+2))
		args = append(args, offerID, ids.DigitalKey())
	}
	query := `INSERT INTO product_keys (offer_id, code, is_sold, sold_at) VALUES ` + strings.Join(rows, ", ")
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return err
	}
	return nil
}

func seedDemoOrder(ctx context.Context, tx *sql.Tx, userID string, now time.Time) error {
	var offerID, productID, title, slug, cover, seller, region, platform string
	var price, cashbackPercent int
	err := tx.QueryRowContext(ctx, `
		SELECT o.id, p.id, p.title, p.slug, p.cover_image, o.seller_name, o.region, o.platform,
			o.price_cents, p.cashback_percent
		FROM offers o JOIN products p ON p.id = o.product_id
		WHERE p.slug = 'neon-drift-2088' AND o.stock > 0
		ORDER BY o.price_cents ASC LIMIT 1`).Scan(
		&offerID, &productID, &title, &slug, &cover, &seller, &region, &platform, &price,
		&cashbackPercent,
	)
	if err != nil {
		return fmt.Errorf("seed demo order offer: %w", err)
	}

	var keyID int64
	var keyCode string
	if err := tx.QueryRowContext(ctx, `
		SELECT id, code FROM product_keys WHERE offer_id = $1 AND is_sold = 0 LIMIT 1`, offerID,
	).Scan(&keyID, &keyCode); err != nil {
		return fmt.Errorf("seed demo order key: %w", err)
	}

	orderedAt := now.AddDate(0, 0, -5)
	orderID := ids.New("ord")
	itemID := ids.New("itm")
	number := "ENB-DEMO-26"
	cashbackEarned := int(math.Round(float64(price) * float64(cashbackPercent) / 100))
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO orders (id, number, user_id, subtotal_cents, fee_cents, cashback_used_cents, cashback_earned_cents, total_cents, currency, status, payment_method, payment_ref, card_last4, created_at, keys_confirmed_at)
		VALUES ($1, $2, $3, $4, 0, 0, $5, $6, 'EUR', 'Delivered', 'card', 'SIM-DEMO-ORDER', '4242', $7, $8)`,
		orderID, number, userID, price, cashbackEarned, price, orderedAt.Format(time.RFC3339), orderedAt.Format(time.RFC3339),
	); err != nil {
		return fmt.Errorf("seed demo order: %w", err)
	}
	if cashbackEarned > 0 {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO cashback_entries (id, user_id, order_id, kind, amount_cents, description, created_at)
			VALUES ($1, $2, $3, 'earned', $4, 'Cashback earned on order ENB-DEMO-26', $5)`,
			ids.New("cbk"), userID, orderID, cashbackEarned, orderedAt.Format(time.RFC3339),
		); err != nil {
			return fmt.Errorf("seed demo cashback: %w", err)
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO order_items (id, order_id, offer_id, product_id, product_title, product_slug, seller_name, region, platform, cover_image, unit_price_cents, quantity, line_total_cents, line_no)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12, 0)`,
		itemID, orderID, offerID, productID, title, slug, seller, region, platform, cover, price, price,
	); err != nil {
		return fmt.Errorf("seed demo order item: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO digital_keys (id, order_id, order_item_id, code, created_at) VALUES ($1, $2, $3, $4, $5)`,
		ids.New("key"), orderID, itemID, keyCode, orderedAt.Format(time.RFC3339),
	); err != nil {
		return fmt.Errorf("seed demo key: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE product_keys SET is_sold = 1, sold_at = $1 WHERE id = $2`,
		orderedAt.Format(time.RFC3339), keyID); err != nil {
		return fmt.Errorf("seed demo inventory: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE offers SET stock = stock - 1 WHERE id = $1`, offerID); err != nil {
		return fmt.Errorf("seed demo stock: %w", err)
	}
	return nil
}

func boolInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
