package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"eneba-market/backend/internal/ids"
)

// DB is the subset of *sql.DB the store uses. The database package's pool
// wrapper satisfies it, which keeps dialect details out of the query layer.
type DB interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error)
	PingContext(ctx context.Context) error
}

type Store struct {
	db DB
}

// Ping verifies the database still answers. The health endpoint uses it to
// catch a wrong Supabase URL or a pooler that refuses connections.
func (s *Store) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

func New(db DB) *Store {
	return &Store{db: db}
}

func (s *Store) ListProducts(ctx context.Context) ([]ProductSummary, error) {
	rows, err := s.db.QueryContext(ctx, `
		WITH ranked_offers AS (
			SELECT o.*, ROW_NUMBER() OVER (
				PARTITION BY o.product_id ORDER BY o.price_cents ASC, o.seller_rating DESC
			) AS rn
			FROM offers o
			WHERE o.stock > 0
		),
		offer_counts AS (
			SELECT product_id, COUNT(*) AS offer_count
			FROM offers WHERE stock > 0 GROUP BY product_id
		)
		SELECT
			p.id, p.slug, p.title, p.subtitle, p.category, p.product_type, p.platform, p.region,
			p.genre, p.release_date, p.rating, p.rating_count, p.badge, p.is_new, p.is_featured,
			p.cover_image, p.cashback_percent, p.gift_value_cents, p.gift_currency,
			o.id, o.seller_name, o.seller_rating, o.seller_reviews, o.price_cents,
			o.original_price_cents, o.currency, o.region, o.platform, o.delivery, o.stock,
			o.is_official, c.offer_count
		FROM products p
		JOIN ranked_offers o ON o.product_id = p.id AND o.rn = 1
		JOIN offer_counts c ON c.product_id = p.id
		ORDER BY p.rating_count DESC, p.title ASC`)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()

	products := make([]ProductSummary, 0, 48)
	for rows.Next() {
		var p ProductSummary
		var isNew, isFeatured, isOfficial int
		if err := rows.Scan(
			&p.ID, &p.Slug, &p.Title, &p.Subtitle, &p.Category, &p.ProductType, &p.Platform, &p.Region,
			&p.Genre, &p.ReleaseDate, &p.Rating, &p.RatingCount, &p.Badge, &isNew, &isFeatured,
			&p.CoverImage, &p.CashbackPercent, &p.GiftValueCents, &p.GiftCurrency,
			&p.LowestOffer.ID, &p.LowestOffer.SellerName, &p.LowestOffer.SellerRating,
			&p.LowestOffer.SellerReviews, &p.LowestOffer.PriceCents, &p.LowestOffer.OriginalPriceCents,
			&p.LowestOffer.Currency, &p.LowestOffer.Region, &p.LowestOffer.Platform, &p.LowestOffer.Delivery,
			&p.LowestOffer.Stock, &isOfficial, &p.OfferCount,
		); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		p.IsNew = isNew == 1
		p.Featured = isFeatured == 1
		p.LowestOffer.IsOfficial = isOfficial == 1
		p.DiscountPercent = p.ComputeDiscount()
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate products: %w", err)
	}
	return products, nil
}

func (s *Store) GetProduct(ctx context.Context, slug string) (*ProductDetail, error) {
	var productID string
	var p ProductSummary
	var isNew, isFeatured int
	var description, developer, publisher, featuresJSON string

	err := s.db.QueryRowContext(ctx, `
		SELECT id, slug, title, subtitle, category, product_type, platform, region, genre,
			release_date, rating, rating_count, badge, is_new, is_featured, cover_image,
			cashback_percent, gift_value_cents, gift_currency, description, developer,
			publisher, features_json
		FROM products WHERE slug = $1`, slug,
	).Scan(
		&productID, &p.Slug, &p.Title, &p.Subtitle, &p.Category, &p.ProductType, &p.Platform,
		&p.Region, &p.Genre, &p.ReleaseDate, &p.Rating, &p.RatingCount, &p.Badge, &isNew,
		&isFeatured, &p.CoverImage, &p.CashbackPercent, &p.GiftValueCents, &p.GiftCurrency,
		&description, &developer, &publisher, &featuresJSON,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	p.ID = productID
	p.IsNew = isNew == 1
	p.Featured = isFeatured == 1

	offers, err := s.listOffers(ctx, productID)
	if err != nil {
		return nil, err
	}
	if len(offers) == 0 {
		return nil, ErrNotFound
	}
	p.LowestOffer = offers[0]
	p.OfferCount = len(offers)
	p.DiscountPercent = p.ComputeDiscount()

	var features []string
	if err := json.Unmarshal([]byte(featuresJSON), &features); err != nil {
		features = nil
	}
	return &ProductDetail{
		ProductSummary: p,
		Description:    description,
		Developer:      developer,
		Publisher:      publisher,
		Features:       features,
		Offers:         offers,
	}, nil
}

func (s *Store) listOffers(ctx context.Context, productID string) ([]Offer, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, seller_name, seller_rating, seller_reviews, price_cents, original_price_cents,
			currency, region, platform, delivery, stock, is_official
		FROM offers
		WHERE product_id = $1 AND stock > 0
		ORDER BY price_cents ASC, seller_rating DESC`, productID)
	if err != nil {
		return nil, fmt.Errorf("list offers: %w", err)
	}
	defer rows.Close()
	offers := make([]Offer, 0, 4)
	for rows.Next() {
		var o Offer
		var official int
		if err := rows.Scan(
			&o.ID, &o.SellerName, &o.SellerRating, &o.SellerReviews, &o.PriceCents,
			&o.OriginalPriceCents, &o.Currency, &o.Region, &o.Platform, &o.Delivery,
			&o.Stock, &official,
		); err != nil {
			return nil, fmt.Errorf("scan offer: %w", err)
		}
		o.IsOfficial = official == 1
		offers = append(offers, o)
	}
	return offers, rows.Err()
}

func (s *Store) ListBanners(ctx context.Context) ([]Banner, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, slot, eyebrow, title, subtitle, cta_label, cta_href, image, theme, ends_at
		FROM banners WHERE active = 1 ORDER BY sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("list banners: %w", err)
	}
	defer rows.Close()
	banners := make([]Banner, 0, 3)
	for rows.Next() {
		var b Banner
		var endsAt sql.NullString
		if err := rows.Scan(&b.ID, &b.Slot, &b.Eyebrow, &b.Title, &b.Subtitle, &b.CTALabel,
			&b.CTAHref, &b.Image, &b.Theme, &endsAt); err != nil {
			return nil, fmt.Errorf("scan banner: %w", err)
		}
		if endsAt.Valid {
			b.EndsAt = &endsAt.String
		}
		banners = append(banners, b)
	}
	return banners, rows.Err()
}

func (s *Store) ListCategories(ctx context.Context) ([]Category, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT name, slug, icon, href FROM categories ORDER BY sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()
	categories := make([]Category, 0, 16)
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.Name, &c.Slug, &c.Icon, &c.Href); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func (s *Store) ListHomeSections(ctx context.Context) ([]HomeSection, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT slug, title, subtitle, layout, source, cta_label, cta_href, max_items, sort_order
		FROM home_sections WHERE active = 1 ORDER BY sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("list home sections: %w", err)
	}
	defer rows.Close()
	sections := make([]HomeSection, 0, 6)
	for rows.Next() {
		var section HomeSection
		if err := rows.Scan(&section.Slug, &section.Title, &section.Subtitle, &section.Layout,
			&section.Source, &section.CTALabel, &section.CTAHref, &section.MaxItems, &section.SortOrder); err != nil {
			return nil, fmt.Errorf("scan home section: %w", err)
		}
		sections = append(sections, section)
	}
	return sections, rows.Err()
}

func (s *Store) GetHomeSection(ctx context.Context, slug string) (*HomeSection, error) {
	var section HomeSection
	err := s.db.QueryRowContext(ctx, `
		SELECT slug, title, subtitle, layout, source, cta_label, cta_href, max_items, sort_order
		FROM home_sections WHERE slug = $1 AND active = 1`, slug,
	).Scan(&section.Slug, &section.Title, &section.Subtitle, &section.Layout, &section.Source,
		&section.CTALabel, &section.CTAHref, &section.MaxItems, &section.SortOrder)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get home section: %w", err)
	}
	return &section, nil
}

func (s *Store) CreateUser(ctx context.Context, email, displayName, passwordHash string) (User, error) {
	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM users WHERE email = $1`, email).Scan(&exists)
	if err == nil {
		return User{}, ErrEmailTaken
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return User{}, fmt.Errorf("check user: %w", err)
	}
	user := User{
		ID:          ids.New("usr"),
		Email:       email,
		DisplayName: displayName,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)`,
		user.ID, user.Email, user.DisplayName, passwordHash, user.CreatedAt,
	); err != nil {
		return User{}, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (s *Store) UpdateDisplayName(ctx context.Context, userID, displayName string) (User, error) {
	if _, err := s.db.ExecContext(ctx, `UPDATE users SET display_name = $1 WHERE id = $2`, displayName, userID); err != nil {
		return User{}, fmt.Errorf("update display name: %w", err)
	}
	var u User
	err := s.db.QueryRowContext(ctx, `
		SELECT id, email, display_name, created_at FROM users WHERE id = $1`, userID,
	).Scan(&u.ID, &u.Email, &u.DisplayName, &u.CreatedAt)
	if err != nil {
		return User{}, fmt.Errorf("reload user: %w", err)
	}
	return u, nil
}

func (s *Store) UserByEmail(ctx context.Context, email string) (UserAuth, error) {
	var u UserAuth
	err := s.db.QueryRowContext(ctx, `
		SELECT id, email, display_name, created_at, password_hash FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.DisplayName, &u.CreatedAt, &u.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return UserAuth{}, ErrNotFound
	}
	if err != nil {
		return UserAuth{}, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

func (s *Store) CreateSession(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)`,
		tokenHash, userID, expiresAt.UTC().Format(time.RFC3339), time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

func (s *Store) UserBySession(ctx context.Context, tokenHash string) (User, error) {
	var u User
	err := s.db.QueryRowContext(ctx, `
		SELECT u.id, u.email, u.display_name, u.created_at
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > $2`,
		tokenHash, time.Now().UTC().Format(time.RFC3339),
	).Scan(&u.ID, &u.Email, &u.DisplayName, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrInvalidSession
	}
	if err != nil {
		return User{}, fmt.Errorf("get session user: %w", err)
	}
	return u, nil
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}
