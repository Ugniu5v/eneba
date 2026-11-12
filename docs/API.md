# REST API reference

Base URL in local development: `http://localhost:8080/api`.
The frontend calls the same paths on its own origin; the Next.js BFF proxy
forwards `/api/*` to `BACKEND_URL`.

All responses are JSON, UTF-8, and are sent with `Cache-Control: no-store`.
Errors use:

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Email or password is incorrect."
  }
}
```

Authentication uses the HTTP-only `eneba_session` cookie. Send
`credentials: "include"` / a cookie jar on protected requests. Sessions last 30
days and only a SHA-256 hash of the token is stored in the database.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Service health, including a database ping |
| `GET` | `/api/storefront/home/banners` | — | Independent promo banner block |
| `GET` | `/api/storefront/home/categories` | — | Category rail |
| `GET` | `/api/storefront/home/sections` | — | Homepage block descriptors |
| `GET` | `/api/storefront/home/sections/{slug}` | — | Products for one homepage block |
| `GET` | `/api/storefront/catalog` | — | Filtered, sorted, paginated catalog |
| `GET` | `/api/storefront/filters` | — | Facets, counts, price range, sort options |
| `GET` | `/api/storefront/products/{slug}` | — | Product detail + seller offers + related |
| `GET` | `/api/search?q=` | — | Fuzzy product-name search |
| `GET` | `/api/search/suggest?q=` | — | Header autocomplete |
| `POST` | `/api/auth/register` | — | Create account and session |
| `POST` | `/api/auth/login` | — | Sign in |
| `POST` | `/api/auth/logout` | — | Clear session |
| `GET` | `/api/auth/me` | optional | Current session user or `null` |
| `PATCH` | `/api/account/profile` | required | Update the signed-in user's display name |
| `GET` | `/api/account/cashback` | required | Cashback balance and ledger |
| `POST` | `/api/checkout` | required | Simulated payment and order (keys withheld) |
| `GET` | `/api/orders` | required | Current user's order history (keys withheld until confirmed) |
| `GET` | `/api/orders/{number}` | required | One owned order (keys withheld until confirmed) |
| `POST` | `/api/orders/{number}/confirm` | required | Confirm region/platform and receive the keys |

### GET /api/storefront/catalog

Query parameters:

| Parameter | Format | Notes |
| --- | --- | --- |
| `q` | string | Fuzzy name search. Also searchable through `/api/search`. |
| `platform` | repeated or comma-separated | e.g. `platform=Steam,Windows` |
| `region` | repeated or comma-separated | `Global`, `Europe`, `United States` |
| `type` | repeated or comma-separated | `Game`, `DLC`, `Gift Card`, `Gaming eCard`, `Subscription`, `Software` |
| `genre` | repeated or comma-separated | `Action`, `RPG`, etc. |
| `category` | repeated or comma-separated | `Games`, `Gift Cards`, `Software` |
| `minPrice` | EUR decimal | Applies to the lowest **stocked** offer |
| `maxPrice` | EUR decimal | Minimum > maximum returns `400` |
| `sort` | enum | `relevance`, `popular`, `price_asc`, `price_desc`, `rating`, `newest`, `discount` |
| `page` | positive integer | Default `1` |
| `limit` | 1–48 | Default `12` |

Example:

```bash
curl 'http://localhost:8080/api/storefront/catalog?platform=Steam&sort=price_asc&minPrice=10&limit=4'
```

```json
{
  "products": [
    {
      "id": "prd_…",
      "slug": "pixel-ranch",
      "title": "Pixel Ranch",
      "platform": "Steam",
      "region": "Global",
      "productType": "Game",
      "coverImage": "/assets/covers/pixel-ranch.svg",
      "rating": 4.8,
      "discountPercent": 45,
      "offerCount": 4,
      "lowestOffer": {
        "id": "off_…",
        "sellerName": "Eneba Official",
        "sellerRating": 4.9,
        "priceCents": 714,
        "originalPriceCents": 1299,
        "currency": "EUR",
        "stock": 8,
        "delivery": "Instant delivery"
      }
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 4,
  "pageCount": 3,
  "query": "",
  "suggestion": ""
}
```

### GET /api/search?q=neon%20drfit

Response shape:

```json
{
  "products": [ /* ProductSummary[] */ ],
  "total": 1,
  "query": "neon drfit",
  "suggestion": "Neon Drift 2088"
}
```

Search only reads product names. Partial words, missing letters, extra letters and
transpositions within bounded edit distance are tolerated. A blank query returns
`400 missing_query`. Suggestions are also accepted from a near match when there
are zero exact results.

### GET /api/storefront/filters

Returns the filter sidebar metadata. All filter parameters from the catalog
endpoint (`q`, `platform`, `region`, `type`, `genre`, `category`, `minPrice`,
`maxPrice`) are accepted. Counts are computed with every active filter **except
the group being counted**, so each option answers “how many products would remain
if I picked this?”.

Response fields:

| Field | Meaning |
| --- | --- |
| `platforms`, `regions`, `types`, `genres`, `categories` | `{ value, label, count }[]` facets |
| `price` | `{ minCents, maxCents }` from the whole catalog |
| `sortOptions` | Sort labels for the store menu |
| `totalProducts` | Products in the whole catalog |
| `matchingProducts` | Products matching all active filters |

```bash
curl 'http://localhost:8080/api/storefront/filters?platform=Steam'
```

### PATCH /api/account/profile

Requires the session cookie. Body: `{ "displayName": "New name" }`.
The name must be 2–50 characters. Returns `{ "user": { … } }`.

### GET /api/storefront/products/{slug}

Returns:

```json
{
  "product": {
    "slug": "neon-drift-2088",
    "title": "Neon Drift 2088",
    "description": "A neon-soaked open-world action RPG…",
    "features": ["…"],
    "developer": "Northlight Collective",
    "publisher": "Afterglow Interactive",
    "giftValueCents": 0,
    "giftCurrency": "",
    "offers": [
      {
        "id": "off_…",
        "sellerName": "KeyNest",
        "sellerRating": 4.8,
        "sellerReviews": 12040,
        "priceCents": 2319,
        "originalPriceCents": 3999,
        "currency": "EUR",
        "region": "Global",
        "platform": "Steam",
        "delivery": "Instant delivery",
        "stock": 5,
        "isOfficial": false
      }
    ]
  },
  "related": [ /* ProductSummary[] */ ],
  "variants": [ /* ProductSummary[]; empty for non-gift products */ ]
}
```

Offers are sorted by ascending price and filtered to in-stock inventory.

Currency gift cards carry their face value in `giftValueCents` (cents, e.g.
`5000` for a 50 EUR card) and `giftCurrency` (e.g. `EUR`); other products return
`0` and `""`. Each denomination is a separate product with its own slug and
seller offers, for example `steam-wallet-5-eur`, `steam-wallet-50-eur` and
`steam-wallet-100-eur`. A gift-card page therefore always describes exactly one
amount, and every amount is independently searchable through `/api/search` and
`/api/storefront/catalog`. Only the brand's original denomination keeps the
sale marker; generated denominations are regular-priced.

For a currency gift card, `variants` contains every denomination in the same
family, sorted by `giftValueCents` and including the current product. Each entry
is a full `ProductSummary`, so the client can render the amount grid with the
live lowest price per tile; each tile links to `/product/{variant.slug}` and is
therefore a normal product page, not a value selector. Non-gift products return
`[]`.

### POST /api/auth/register

```json
{
  "email": "buyer@example.com",
  "password": "TestPass123!",
  "displayName": "Test Buyer"
}
```

Returns `201` with `{ "user": {…} }` and sets the session cookie.
Validation: valid email, display name 2–50 characters, password 8–72 bytes.
Duplicate emails return `409 email_taken`.

### POST /api/auth/login

```json
{ "email": "demo@eneba.test", "password": "Demo1234!" }
```

Returns `200` with the user and a fresh session cookie. Invalid credentials return
`401 invalid_credentials`.

### GET /api/auth/me

Always returns `200`:

```json
{ "user": null }
```

or the current user. This endpoint intentionally does not produce a 401, so the
UI can restore auth state without logging errors.

### POST /api/checkout

```json
{
  "items": [
    { "offerId": "off_…", "quantity": 1 },
    { "offerId": "off_…", "quantity": 1 }
  ],
  "cashbackCents": 150,
  "payment": {
    "method": "card",
    "card": {
      "number": "4242 4242 4242 4242",
      "cardholder": "Alex Morgan",
      "expiry": "12/30",
      "cvc": "123"
    }
  }
}
```

Requirements and behaviour:

- Authentication required (`401` otherwise).
- Duplicate lines for the same offer are merged server-side; quantities are
  capped at 5 each.
- A gift card is identified by the offer's product, so a 5 EUR card and a 50 EUR
  card are two offers in the cart and two distinct order lines. Prices are
  resolved from the database.
- Payment uses a simulated processor and validates:
  - 16 digits and Luhn checksum
  - a non-empty cardholder name
  - future `MM/YY` expiry
  - 3–4 digit CVC
  - test card ending `0002` returns `402 payment_declined`
- Prices come from the database, not the request.
- `cashbackCents` is optional and defaults to `0`. It must not exceed the
  user's current balance (`409 cashback_insufficient`). An amount larger than
  the order subtotal is capped at the subtotal, so cashback can cover a whole
  order but the total never goes below zero.
- Cashback is credited automatically from each product's `cashbackPercent` on
  every delivered order, including orders paid partly with cashback. Both the
  redemption and the new credit are written to `cashback_entries`.
- A single database transaction:
  - validates stock,
  - creates the order and line items,
  - reserves unique unsold keys,
  - marks keys sold and decrements seller stock,
  - debits redeemed cashback and credits newly earned cashback.
- Returns `201` with the order and test-payment metadata. Key codes are **not**
  included yet: they are released only after the buyer confirms the platform
  and region (see below).
- Returns `409 out_of_stock` if inventory changed.

Successful response (abridged):

```json
{
  "order": {
    "number": "ENB-26-ABC12",
    "status": "Delivered",
    "createdAt": "2026-11-10T12:33:37Z",
    "subtotalCents": 2319,
    "feeCents": 0,
    "cashbackUsedCents": 150,
    "cashbackEarnedCents": 116,
    "totalCents": 2169,
    "currency": "EUR",
    "paymentMethod": "card",
    "cardLast4": "4242",
    "itemCount": 1,
    "keysConfirmed": false,
    "items": [
      {
        "productTitle": "Neon Drift 2088",
        "sellerName": "KeyNest",
        "unitPriceCents": 2319,
        "quantity": 1,
        "lineTotalCents": 2319,
        "keys": []
      }
    ]
  },
  "payment": {
    "status": "simulated",
    "ref": "SIM-…",
    "last4": "4242",
    "test": true
  }
}
```

### GET /api/account/cashback

```json
{
  "cashback": {
    "balanceCents": 388,
    "earnedCents": 538,
    "redeemedCents": 150,
    "entries": [
      {
        "id": "cbk_…",
        "kind": "redeemed",
        "amountCents": -150,
        "description": "Cashback applied to order ENB-26-ABC12",
        "orderNumber": "ENB-26-ABC12",
        "createdAt": "2026-11-10T12:33:37Z"
      },
      {
        "id": "cbk_…",
        "kind": "earned",
        "amountCents": 538,
        "description": "Cashback earned on order ENB-DEMO-26",
        "orderNumber": "ENB-DEMO-26",
        "createdAt": "2026-11-05T12:33:37Z"
      }
    ]
  }
}
```

`balanceCents` is the sum of every signed `amountCents`. `earnedCents` and
`redeemedCents` are lifetime positives for display. History is newest first.

### POST /api/orders/{number}/confirm

```json
{ "regionConfirmed": true, "platformConfirmed": true }
```

Records that the buyer checked the platform and region against their account and
returns the order **with its digital keys**. Both flags are required (`400`
otherwise); the operation is idempotent. This is the only endpoint that returns
key codes for an order, so dismissing the confirmation dialog on the client
cannot reveal them.

### GET /api/orders and GET /api/orders/{number}

Both require authentication and only read orders whose `user_id` matches the
session. Another user's order, or an unknown order number, returns `404` rather
than leaking existence. Until the order has been confirmed through the endpoint
above, every item's `keys` array is empty and `keysConfirmed` is `false`.

## Status codes

| Code | Meaning |
| --- | --- |
| `200` | OK |
| `201` | Created (registration, order) |
| `400` | Invalid request, filters, query or payment fields |
| `401` | Missing/invalid session or invalid credentials |
| `402` | Simulated payment declined |
| `404` | Unknown product, order or homepage block |
| `409` | Duplicate account, stock conflict or insufficient cashback |
| `500` | Unexpected server error |

## Data model

- `users` — account identity and bcrypt password hash
- `sessions` — hashed session token, expiry, user reference
- `products` — catalogue content, metadata, cover images and features JSON
- `offers` — seller-specific price, region, delivery, stock and rating
- `product_keys` — unique sellable inventory per offer
- `banners`, `categories`, `home_sections` — merchandising content served by
  independent homepage endpoints
- `orders` / `order_items` — private purchase records with price snapshots and
  the cashback applied to and earned by each order
- `digital_keys` — delivered codes attached to each order item
- `cashback_entries` — append-only cashback ledger (positive credits, negative
  redemptions); balances are derived from it

The schema is created automatically at startup by
`backend/internal/database/schema.sql`; the first launch is seeded from
`backend/internal/catalog/catalog.json`.
