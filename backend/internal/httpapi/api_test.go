package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"eneba-market/backend/internal/database"
	"eneba-market/backend/internal/httpapi"
	"eneba-market/backend/internal/store"
)

type testEnv struct {
	server *httptest.Server
	client *http.Client
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	db, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	ctx := context.Background()
	if err := database.Migrate(ctx, db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if _, err := database.Seed(ctx, db); err != nil {
		t.Fatalf("seed: %v", err)
	}
	api := httpapi.New(store.New(db), httpapi.Config{FrontendURL: "http://localhost:3000"})
	server := httptest.NewServer(api.Handler())
	t.Cleanup(server.Close)
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	return &testEnv{
		server: server,
		client: &http.Client{Jar: jar},
	}
}

func (e *testEnv) do(t *testing.T, method, path string, body any) (*http.Response, []byte) {
	t.Helper()
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request: %v", err)
		}
		reader = bytes.NewReader(payload)
	}
	req, err := http.NewRequest(method, e.server.URL+path, reader)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := e.client.Do(req)
	if err != nil {
		t.Fatalf("request %s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return res, data
}

func TestMarketplaceAPIFlow(t *testing.T) {
	env := newTestEnv(t)

	t.Run("health and storefront data", func(t *testing.T) {
		res, body := env.do(t, http.MethodGet, "/api/health", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), `"status":"ok"`) {
			t.Fatalf("unexpected health response %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/storefront/home/banners", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "hero-mega-sale") {
			t.Fatalf("banners not returned: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/storefront/home/sections", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "recommended") {
			t.Fatalf("sections not returned: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/storefront/home/sections/recommended", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), `"products"`) {
			t.Fatalf("section products not returned: %d %s", res.StatusCode, body)
		}
	})

	t.Run("fuzzy search and catalog filters", func(t *testing.T) {
		res, body := env.do(t, http.MethodGet, "/api/search?q=neon%20drfit", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "Neon Drift 2088") {
			t.Fatalf("typo search failed: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/storefront/catalog?platform=Steam&platform=Windows&sort=price_asc&limit=48", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("catalog failed: %d %s", res.StatusCode, body)
		}
		var catalog struct {
			Products []store.ProductSummary `json:"products"`
			Total    int                    `json:"total"`
		}
		if err := json.Unmarshal(body, &catalog); err != nil {
			t.Fatalf("decode catalog: %v", err)
		}
		if len(catalog.Products) == 0 {
			t.Fatal("expected filtered products")
		}
		for _, product := range catalog.Products {
			if product.Platform != "Steam" && product.Platform != "Windows" {
				t.Fatalf("unexpected platform in filtered results: %s", product.Platform)
			}
		}
		res, body = env.do(t, http.MethodGet, "/api/storefront/catalog?minPrice=100&maxPrice=10", nil)
		if res.StatusCode != http.StatusBadRequest {
			t.Fatalf("invalid price range should be rejected: %d %s", res.StatusCode, body)
		}
	})

	t.Run("faceted filter counts adapt", func(t *testing.T) {
		res, body := env.do(t, http.MethodGet, "/api/storefront/filters", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("filters failed: %d %s", res.StatusCode, body)
		}
		var all struct {
			TotalProducts    int `json:"totalProducts"`
			MatchingProducts int `json:"matchingProducts"`
			Categories       []struct {
				Value string `json:"value"`
				Count int    `json:"count"`
			} `json:"categories"`
		}
		if err := json.Unmarshal(body, &all); err != nil {
			t.Fatalf("decode filters: %v", err)
		}
		if all.TotalProducts == 0 || all.MatchingProducts != all.TotalProducts {
			t.Fatalf("unfiltered matching count should equal total: %+v", all)
		}

		res, body = env.do(t, http.MethodGet, "/api/storefront/filters?platform=Steam", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("filtered facets failed: %d %s", res.StatusCode, body)
		}
		var steam struct {
			MatchingProducts int `json:"matchingProducts"`
			Categories       []struct {
				Value string `json:"value"`
				Count int    `json:"count"`
			} `json:"categories"`
		}
		if err := json.Unmarshal(body, &steam); err != nil {
			t.Fatalf("decode filtered facets: %v", err)
		}
		if steam.MatchingProducts <= 0 || steam.MatchingProducts >= all.TotalProducts {
			t.Fatalf("expected Steam to narrow the catalog: %+v", steam)
		}
		categoryCount := func(items []struct {
			Value string `json:"value"`
			Count int    `json:"count"`
		}, value string) int {
			for _, item := range items {
				if item.Value == value {
					return item.Count
				}
			}
			return -1
		}
		games := categoryCount(steam.Categories, "Games")
		if games <= 0 || games > steam.MatchingProducts {
			t.Fatalf("Games count should reflect the Steam filter: %d of %d", games, steam.MatchingProducts)
		}
		if software := categoryCount(steam.Categories, "Software"); software != 0 {
			t.Fatalf("Software should be 0 when only Steam is selected, got %d", software)
		}
	})

	t.Run("auth and checkout", func(t *testing.T) {
		res, body := env.do(t, http.MethodGet, "/api/orders", nil)
		if res.StatusCode != http.StatusUnauthorized {
			t.Fatalf("orders should require auth: %d %s", res.StatusCode, body)
		}

		res, body = env.do(t, http.MethodPost, "/api/auth/register", map[string]string{
			"email":       "flow-test@example.com",
			"password":    "TestPass123!",
			"displayName": "Flow Tester",
		})
		if res.StatusCode != http.StatusCreated {
			t.Fatalf("register failed: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/auth/me", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "flow-test@example.com") {
			t.Fatalf("session was not created: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodPatch, "/api/account/profile", map[string]string{
			"displayName": "Flow Renamed",
		})
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "Flow Renamed") {
			t.Fatalf("profile update failed: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodPatch, "/api/account/profile", map[string]string{
			"displayName": "x",
		})
		if res.StatusCode != http.StatusBadRequest {
			t.Fatalf("short display name should be rejected: %d %s", res.StatusCode, body)
		}

		res, body = env.do(t, http.MethodGet, "/api/storefront/products/neon-drift-2088", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("product fetch failed: %d %s", res.StatusCode, body)
		}
		var productPage struct {
			Product store.ProductDetail `json:"product"`
		}
		if err := json.Unmarshal(body, &productPage); err != nil {
			t.Fatalf("decode product: %v", err)
		}
		if len(productPage.Product.Offers) < 2 {
			t.Fatalf("expected multiple offers, got %d", len(productPage.Product.Offers))
		}
		offer := productPage.Product.Offers[0]

		declinePayload := map[string]any{
			"items": []map[string]any{{"offerId": offer.ID, "quantity": 1}},
			"payment": map[string]any{
				"method": "card",
				"card": map[string]string{
					"number":     "4000 0000 0000 0002",
					"cardholder": "Flow Tester",
					"expiry":     "12/30",
					"cvc":        "123",
				},
			},
		}
		res, body = env.do(t, http.MethodPost, "/api/checkout", declinePayload)
		if res.StatusCode != http.StatusPaymentRequired {
			t.Fatalf("declined card should return 402: %d %s", res.StatusCode, body)
		}

		payload := declinePayload
		payload["payment"] = map[string]any{
			"method": "card",
			"card": map[string]string{
				"number":     "4242 4242 4242 4242",
				"cardholder": "Flow Tester",
				"expiry":     "12/30",
				"cvc":        "123",
			},
		}
		res, body = env.do(t, http.MethodPost, "/api/checkout", payload)
		if res.StatusCode != http.StatusCreated {
			t.Fatalf("checkout failed: %d %s", res.StatusCode, body)
		}
		var checkout struct {
			Order   store.Order `json:"order"`
			Payment struct {
				Test bool `json:"test"`
			} `json:"payment"`
		}
		if err := json.Unmarshal(body, &checkout); err != nil {
			t.Fatalf("decode checkout: %v", err)
		}
		if checkout.Order.Number == "" || len(checkout.Order.Items) != 1 {
			t.Fatalf("order missing fields: %+v", checkout.Order)
		}
		if !checkout.Payment.Test {
			t.Fatal("checkout should identify test mode")
		}
		if checkout.Order.KeysConfirmed {
			t.Fatal("a new order must not be marked as region/platform confirmed")
		}
		if len(checkout.Order.Items[0].Keys) != 0 {
			t.Fatalf("checkout leaked keys before confirmation: %+v", checkout.Order.Items[0])
		}

		res, body = env.do(t, http.MethodGet, "/api/orders", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), checkout.Order.Number) {
			t.Fatalf("order not in history: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/orders/"+checkout.Order.Number, nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("order detail failed: %d %s", res.StatusCode, body)
		}
		var pending struct {
			Order store.Order `json:"order"`
		}
		if err := json.Unmarshal(body, &pending); err != nil {
			t.Fatalf("decode pending order: %v", err)
		}
		if pending.Order.KeysConfirmed || len(pending.Order.Items[0].Keys) != 0 {
			t.Fatalf("order detail leaked keys before confirmation: %+v", pending.Order.Items[0])
		}

		// The keys stay hidden until both confirmations are sent explicitly.
		res, body = env.do(t, http.MethodPost, "/api/orders/"+checkout.Order.Number+"/confirm", map[string]bool{
			"regionConfirmed": true,
		})
		if res.StatusCode != http.StatusBadRequest {
			t.Fatalf("partial confirmation should be rejected: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/orders/"+checkout.Order.Number, nil)
		if strings.Contains(string(body), `"code":"`) {
			t.Fatalf("keys became visible after a rejected confirmation: %s", body)
		}

		res, body = env.do(t, http.MethodPost, "/api/orders/"+checkout.Order.Number+"/confirm", map[string]bool{
			"regionConfirmed":   true,
			"platformConfirmed": true,
		})
		if res.StatusCode != http.StatusOK {
			t.Fatalf("confirm keys failed: %d %s", res.StatusCode, body)
		}
		var confirmed struct {
			Order store.Order `json:"order"`
		}
		if err := json.Unmarshal(body, &confirmed); err != nil {
			t.Fatalf("decode confirmed order: %v", err)
		}
		if !confirmed.Order.KeysConfirmed {
			t.Fatal("confirmation was not persisted")
		}
		if len(confirmed.Order.Items[0].Keys) != 1 || confirmed.Order.Items[0].Keys[0].Code == "" {
			t.Fatalf("digital key was not delivered after confirmation: %+v", confirmed.Order.Items[0])
		}
		keyCode := confirmed.Order.Items[0].Keys[0].Code

		res, body = env.do(t, http.MethodGet, "/api/orders/"+checkout.Order.Number, nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), keyCode) {
			t.Fatalf("confirmed order detail missing key: %d %s", res.StatusCode, body)
		}

		// Completing an order credits cashback based on each product's rate.
		if checkout.Order.CashbackEarnedCents <= 0 {
			t.Fatalf("expected cashback on the order: %+v", checkout.Order)
		}
		res, body = env.do(t, http.MethodGet, "/api/account/cashback", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("cashback summary failed: %d %s", res.StatusCode, body)
		}
		var cashback struct {
			Cashback store.CashbackSummary `json:"cashback"`
		}
		if err := json.Unmarshal(body, &cashback); err != nil {
			t.Fatalf("decode cashback: %v", err)
		}
		if cashback.Cashback.BalanceCents != checkout.Order.CashbackEarnedCents {
			t.Fatalf("unexpected cashback balance: got %d want %d",
				cashback.Cashback.BalanceCents, checkout.Order.CashbackEarnedCents)
		}
		if len(cashback.Cashback.Entries) != 1 ||
			cashback.Cashback.Entries[0].OrderNumber != checkout.Order.Number {
			t.Fatalf("cashback history missing the order: %+v", cashback.Cashback.Entries)
		}

		// Cashback is spent through the same checkout. Asking for more than the
		// balance is rejected instead of silently charging the card full price.
		payload["cashbackCents"] = cashback.Cashback.BalanceCents + 1
		res, body = env.do(t, http.MethodPost, "/api/checkout", payload)
		if res.StatusCode != http.StatusConflict || !strings.Contains(string(body), "cashback_insufficient") {
			t.Fatalf("over-balance cashback should be rejected: %d %s", res.StatusCode, body)
		}

		payload["cashbackCents"] = cashback.Cashback.BalanceCents
		res, body = env.do(t, http.MethodPost, "/api/checkout", payload)
		if res.StatusCode != http.StatusCreated {
			t.Fatalf("cashback checkout failed: %d %s", res.StatusCode, body)
		}
		var cashbackOrder struct {
			Order store.Order `json:"order"`
		}
		if err := json.Unmarshal(body, &cashbackOrder); err != nil {
			t.Fatalf("decode cashback checkout: %v", err)
		}
		if cashbackOrder.Order.CashbackUsedCents != cashback.Cashback.BalanceCents {
			t.Fatalf("cashback was not applied: got %d want %d",
				cashbackOrder.Order.CashbackUsedCents, cashback.Cashback.BalanceCents)
		}
		wantTotal := cashbackOrder.Order.SubtotalCents - cashback.Cashback.BalanceCents
		if cashbackOrder.Order.TotalCents != wantTotal {
			t.Fatalf("cashback should reduce the total: got %d want %d",
				cashbackOrder.Order.TotalCents, wantTotal)
		}

		res, body = env.do(t, http.MethodGet, "/api/account/cashback", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("cashback summary after redemption failed: %d %s", res.StatusCode, body)
		}
		if err := json.Unmarshal(body, &cashback); err != nil {
			t.Fatalf("decode redeemed cashback: %v", err)
		}
		if cashback.Cashback.BalanceCents != cashbackOrder.Order.CashbackEarnedCents {
			t.Fatalf("unexpected balance after redemption: got %d want %d",
				cashback.Cashback.BalanceCents, cashbackOrder.Order.CashbackEarnedCents)
		}
		if cashback.Cashback.RedeemedCents != cashbackOrder.Order.CashbackUsedCents {
			t.Fatalf("redemption missing from history: %+v", cashback.Cashback)
		}
	})

	t.Run("login and isolation", func(t *testing.T) {
		res, body := env.do(t, http.MethodPost, "/api/auth/login", map[string]string{
			"email":    database.DemoEmail,
			"password": database.DemoPassword,
		})
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "demo@eneba.test") {
			t.Fatalf("demo login failed: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/orders", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "ENB-DEMO-26") {
			t.Fatalf("demo order history missing: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/account/cashback", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "ENB-DEMO-26") {
			t.Fatalf("demo cashback history missing: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/orders/ENB-DOES-NOT-EXIST", nil)
		if res.StatusCode != http.StatusNotFound {
			t.Fatalf("unknown order should be 404: %d %s", res.StatusCode, body)
		}
	})

	t.Run("gift card denominations are separate products", func(t *testing.T) {
		// A specific amount is its own searchable catalogue item, not a value
		// selected inside one multi-value product.
		res, body := env.do(t, http.MethodGet, "/api/search?q=steam%20wallet%205", nil)
		if res.StatusCode != http.StatusOK || !strings.Contains(string(body), "steam-wallet-5-eur") {
			t.Fatalf("denomination search failed: %d %s", res.StatusCode, body)
		}
		res, body = env.do(t, http.MethodGet, "/api/search?q=steam%20wallet", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("gift card family search failed: %d %s", res.StatusCode, body)
		}
		var family struct {
			Products []store.ProductSummary `json:"products"`
			Total    int                    `json:"total"`
		}
		if err := json.Unmarshal(body, &family); err != nil {
			t.Fatalf("decode gift card search: %v", err)
		}
		if family.Total < 20 {
			t.Fatalf("expected at least 20 Steam denominations, got %d", family.Total)
		}
		seen := map[string]bool{}
		for _, product := range family.Products {
			if seen[product.Slug] {
				t.Fatalf("duplicate gift card result: %s", product.Slug)
			}
			seen[product.Slug] = true
		}

		res, body = env.do(t, http.MethodGet, "/api/storefront/products/steam-wallet-5-eur", nil)
		if res.StatusCode != http.StatusOK {
			t.Fatalf("gift card fetch failed: %d %s", res.StatusCode, body)
		}
		var page struct {
			Product  store.ProductDetail    `json:"product"`
			Variants []store.ProductSummary `json:"variants"`
		}
		if err := json.Unmarshal(body, &page); err != nil {
			t.Fatalf("decode gift card: %v", err)
		}
		if page.Product.GiftValueCents != 500 || page.Product.GiftCurrency != "EUR" {
			t.Fatalf("unexpected gift card metadata: %d %q", page.Product.GiftValueCents, page.Product.GiftCurrency)
		}
		if len(page.Variants) != 20 {
			t.Fatalf("expected 20 denominations in the value grid, got %d", len(page.Variants))
		}
		for i, variant := range page.Variants {
			wantValue := (i + 1) * 500
			if variant.GiftValueCents != wantValue {
				t.Fatalf("variant %d has value %d, want %d", i, variant.GiftValueCents, wantValue)
			}
			if variant.Slug != "steam-wallet-"+strconv.Itoa(wantValue/100)+"-eur" {
				t.Fatalf("unexpected variant slug: %s", variant.Slug)
			}
		}
		if page.Product.Title != "Steam Wallet Card 5 EUR" {
			t.Fatalf("unexpected gift card title: %q", page.Product.Title)
		}
		if len(page.Product.Offers) == 0 {
			t.Fatal("gift card has no offers")
		}
		for _, offer := range page.Product.Offers {
			if offer.OriginalPriceCents != offer.PriceCents {
				t.Fatalf("denomination should be regular-priced: %d vs %d", offer.PriceCents, offer.OriginalPriceCents)
			}
		}
		offer := page.Product.Offers[0]

		payment := map[string]any{
			"method": "card",
			"card": map[string]string{
				"number":     "4242 4242 4242 4242",
				"cardholder": "Gift Tester",
				"expiry":     "12/30",
				"cvc":        "123",
			},
		}
		payload := map[string]any{
			"items": []map[string]any{{
				"offerId":  offer.ID,
				"quantity": 1,
			}},
			"payment": payment,
		}
		res, body = env.do(t, http.MethodPost, "/api/checkout", payload)
		if res.StatusCode != http.StatusCreated {
			t.Fatalf("gift card checkout failed: %d %s", res.StatusCode, body)
		}
		var checkout struct {
			Order store.Order `json:"order"`
		}
		if err := json.Unmarshal(body, &checkout); err != nil {
			t.Fatalf("decode gift checkout: %v", err)
		}
		if len(checkout.Order.Items) != 1 {
			t.Fatalf("expected one gift card line, got %d", len(checkout.Order.Items))
		}
		item := checkout.Order.Items[0]
		if item.ProductTitle != "Steam Wallet Card 5 EUR" {
			t.Fatalf("unexpected gift card title: %q", item.ProductTitle)
		}
		if item.UnitPriceCents != offer.PriceCents {
			t.Fatalf("unexpected gift card price: got %d want %d", item.UnitPriceCents, offer.PriceCents)
		}
	})
}
