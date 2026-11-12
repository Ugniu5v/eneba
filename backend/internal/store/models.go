package store

import (
	"errors"
	"time"
)

var (
	ErrNotFound             = errors.New("not found")
	ErrEmailTaken           = errors.New("email already registered")
	ErrInvalidSession       = errors.New("invalid or expired session")
	ErrInsufficientStock    = errors.New("an item in your cart is no longer available")
	ErrInsufficientCashback = errors.New("cashback balance is too low")
)

type Offer struct {
	ID                 string  `json:"id"`
	SellerName         string  `json:"sellerName"`
	SellerRating       float64 `json:"sellerRating"`
	SellerReviews      int     `json:"sellerReviews"`
	PriceCents         int     `json:"priceCents"`
	OriginalPriceCents int     `json:"originalPriceCents"`
	Currency           string  `json:"currency"`
	Region             string  `json:"region"`
	Platform           string  `json:"platform"`
	Delivery           string  `json:"delivery"`
	Stock              int     `json:"stock"`
	IsOfficial         bool    `json:"isOfficial"`
}

type ProductSummary struct {
	ID              string  `json:"id"`
	Slug            string  `json:"slug"`
	Title           string  `json:"title"`
	Subtitle        string  `json:"subtitle"`
	Category        string  `json:"category"`
	ProductType     string  `json:"productType"`
	Platform        string  `json:"platform"`
	Region          string  `json:"region"`
	Genre           string  `json:"genre"`
	ReleaseDate     string  `json:"releaseDate"`
	CoverImage      string  `json:"coverImage"`
	Rating          float64 `json:"rating"`
	RatingCount     int     `json:"ratingCount"`
	Badge           string  `json:"badge"`
	IsNew           bool    `json:"isNew"`
	Featured        bool    `json:"featured"`
	CashbackPercent int     `json:"cashbackPercent"`
	GiftValueCents  int     `json:"giftValueCents"`
	GiftCurrency    string  `json:"giftCurrency"`
	LowestOffer     Offer   `json:"lowestOffer"`
	OfferCount      int     `json:"offerCount"`
	DiscountPercent int     `json:"discountPercent"`
}

type ProductDetail struct {
	ProductSummary
	Description string   `json:"description"`
	Developer   string   `json:"developer"`
	Publisher   string   `json:"publisher"`
	Features    []string `json:"features"`
	Offers      []Offer  `json:"offers"`
}

type Banner struct {
	ID       string  `json:"id"`
	Slot     string  `json:"slot"`
	Eyebrow  string  `json:"eyebrow"`
	Title    string  `json:"title"`
	Subtitle string  `json:"subtitle"`
	CTALabel string  `json:"ctaLabel"`
	CTAHref  string  `json:"ctaHref"`
	Image    string  `json:"image"`
	Theme    string  `json:"theme"`
	EndsAt   *string `json:"endsAt,omitempty"`
}

type Category struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
	Icon string `json:"icon"`
	Href string `json:"href"`
}

type HomeSection struct {
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	Layout       string `json:"layout"`
	Source       string `json:"source"`
	CTALabel     string `json:"ctaLabel"`
	CTAHref      string `json:"ctaHref"`
	MaxItems     int    `json:"maxItems"`
	SortOrder    int    `json:"sortOrder"`
	ProductCount int    `json:"productCount,omitempty"`
}

type User struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	CreatedAt   string `json:"createdAt"`
}

type UserAuth struct {
	User
	PasswordHash string `json:"-"`
}

type PaymentInfo struct {
	Method string
	Ref    string
	Last4  string
}

type CheckoutItem struct {
	OfferID  string `json:"offerId"`
	Quantity int    `json:"quantity"`
}

type DigitalKey struct {
	Code      string `json:"code"`
	CreatedAt string `json:"createdAt"`
}

type OrderItem struct {
	ProductTitle   string       `json:"productTitle"`
	ProductSlug    string       `json:"productSlug"`
	SellerName     string       `json:"sellerName"`
	Region         string       `json:"region"`
	Platform       string       `json:"platform"`
	CoverImage     string       `json:"coverImage"`
	UnitPriceCents int          `json:"unitPriceCents"`
	Quantity       int          `json:"quantity"`
	LineTotalCents int          `json:"lineTotalCents"`
	Keys           []DigitalKey `json:"keys"`
}

type Order struct {
	Number              string      `json:"number"`
	Status              string      `json:"status"`
	CreatedAt           string      `json:"createdAt"`
	SubtotalCents       int         `json:"subtotalCents"`
	FeeCents            int         `json:"feeCents"`
	CashbackUsedCents   int         `json:"cashbackUsedCents"`
	CashbackEarnedCents int         `json:"cashbackEarnedCents"`
	TotalCents          int         `json:"totalCents"`
	Currency            string      `json:"currency"`
	PaymentMethod       string      `json:"paymentMethod"`
	CardLast4           string      `json:"cardLast4"`
	ItemCount           int         `json:"itemCount"`
	KeysConfirmed       bool        `json:"keysConfirmed"`
	Items               []OrderItem `json:"items"`
}

// CashbackEntry is one line of a user's cashback ledger. Earned amounts are
// positive and redemptions are negative, so the balance is their sum.
type CashbackEntry struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"`
	AmountCents int    `json:"amountCents"`
	Description string `json:"description"`
	OrderNumber string `json:"orderNumber,omitempty"`
	CreatedAt   string `json:"createdAt"`
}

type CashbackSummary struct {
	BalanceCents  int             `json:"balanceCents"`
	EarnedCents   int             `json:"earnedCents"`
	RedeemedCents int             `json:"redeemedCents"`
	Entries       []CashbackEntry `json:"entries"`
}

func (s ProductSummary) ComputeDiscount() int {
	if s.LowestOffer.OriginalPriceCents <= 0 || s.LowestOffer.PriceCents >= s.LowestOffer.OriginalPriceCents {
		return 0
	}
	return int(float64(s.LowestOffer.OriginalPriceCents-s.LowestOffer.PriceCents) /
		float64(s.LowestOffer.OriginalPriceCents) * 100)
}

func NewSessionExpiry(now time.Time) time.Time {
	return now.AddDate(0, 0, 30)
}
