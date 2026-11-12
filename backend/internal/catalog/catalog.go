// Package catalog contains the first-run seed data for the demo marketplace.
// In a production marketplace this data would be managed by merchandising tools;
// here it is embedded so the project runs with a single command.
package catalog

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"time"
)

//go:embed catalog.json
var raw []byte

type Product struct {
	Slug            string   `json:"slug"`
	Title           string   `json:"title"`
	Subtitle        string   `json:"subtitle"`
	Description     string   `json:"description"`
	Category        string   `json:"category"`
	ProductType     string   `json:"productType"`
	Platform        string   `json:"platform"`
	Region          string   `json:"region"`
	Genre           string   `json:"genre"`
	Developer       string   `json:"developer"`
	Publisher       string   `json:"publisher"`
	ReleaseDate     string   `json:"releaseDate"`
	Rating          float64  `json:"rating"`
	RatingCount     int      `json:"ratingCount"`
	Badge           string   `json:"badge"`
	IsNew           bool     `json:"isNew"`
	Featured        bool     `json:"featured"`
	BasePriceCents  int      `json:"basePriceCents"`
	CashbackPercent int      `json:"cashbackPercent"`
	Features        []string `json:"features"`
	// GiftValueCents is the face value of a currency gift card (0 for other
	// products). GiftCurrency is the currency the face value is expressed in.
	// Every denomination is its own catalogue product, so this never represents
	// a choice the shopper can change on the product page.
	GiftValueCents int    `json:"giftValueCents"`
	GiftCurrency   string `json:"giftCurrency"`
	// RegularPrice keeps a generated gift-card denomination at its normal price
	// instead of carrying the base card's discount badge.
	RegularPrice bool `json:"regularPrice"`
}

type Section struct {
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle"`
	Layout    string `json:"layout"`
	Source    string `json:"source"`
	CTALabel  string `json:"ctaLabel"`
	CTAHref   string `json:"ctaHref"`
	MaxItems  int    `json:"maxItems"`
	SortOrder int    `json:"sortOrder"`
}

type Banner struct {
	ID         string `json:"id"`
	Slot       string `json:"slot"`
	Eyebrow    string `json:"eyebrow"`
	Title      string `json:"title"`
	Subtitle   string `json:"subtitle"`
	CTALabel   string `json:"ctaLabel"`
	CTAHref    string `json:"ctaHref"`
	Image      string `json:"image"`
	Theme      string `json:"theme"`
	EndsInDays int    `json:"endsInDays"`
	SortOrder  int    `json:"sortOrder"`
}

type Category struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
	Icon string `json:"icon"`
	Href string `json:"href"`
}

type Seller struct {
	Name     string  `json:"name"`
	Rating   float64 `json:"rating"`
	Reviews  int     `json:"reviews"`
	Official bool    `json:"official"`
}

type Data struct {
	Products   []Product  `json:"products"`
	Sections   []Section  `json:"sections"`
	Banners    []Banner   `json:"banners"`
	Categories []Category `json:"categories"`
	Sellers    []Seller   `json:"sellers"`
}

func Load() (Data, error) {
	var data Data
	if err := json.Unmarshal(raw, &data); err != nil {
		return Data{}, fmt.Errorf("decode catalog seed: %w", err)
	}
	if len(data.Products) == 0 {
		return Data{}, fmt.Errorf("catalog seed is empty")
	}
	return data, nil
}

// BannerEndsAt turns the seed's relative date into a stable per-install offer end.
func BannerEndsAt(days int, installedAt time.Time) string {
	if days <= 0 {
		return ""
	}
	return installedAt.AddDate(0, 0, days).UTC().Format(time.RFC3339)
}
