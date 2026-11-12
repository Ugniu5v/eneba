CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    product_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    region TEXT NOT NULL,
    genre TEXT NOT NULL,
    developer TEXT NOT NULL DEFAULT '',
    publisher TEXT NOT NULL DEFAULT '',
    release_date TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    badge TEXT NOT NULL DEFAULT '',
    is_new INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    cover_image TEXT NOT NULL,
    hero_image TEXT NOT NULL DEFAULT '',
    cashback_percent INTEGER NOT NULL DEFAULT 0,
    features_json TEXT NOT NULL DEFAULT '[]',
    gift_value_cents INTEGER NOT NULL DEFAULT 0,
    gift_currency TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
CREATE INDEX IF NOT EXISTS idx_products_region ON products(region);

CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    seller_name TEXT NOT NULL,
    seller_rating REAL NOT NULL DEFAULT 0,
    seller_reviews INTEGER NOT NULL DEFAULT 0,
    price_cents INTEGER NOT NULL,
    original_price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    region TEXT NOT NULL,
    platform TEXT NOT NULL,
    delivery TEXT NOT NULL DEFAULT 'Instant',
    stock INTEGER NOT NULL DEFAULT 0,
    is_official INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_product_price ON offers(product_id, price_cents);
CREATE INDEX IF NOT EXISTS idx_offers_stock ON offers(stock);

CREATE TABLE IF NOT EXISTS product_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    is_sold INTEGER NOT NULL DEFAULT 0,
    sold_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_product_keys_offer ON product_keys(offer_id, is_sold);

CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    slot TEXT NOT NULL,
    eyebrow TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    cta_label TEXT NOT NULL DEFAULT '',
    cta_href TEXT NOT NULL DEFAULT '/store',
    image TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'dark',
    ends_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    href TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS home_sections (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    layout TEXT NOT NULL DEFAULT 'cards',
    source TEXT NOT NULL,
    cta_label TEXT NOT NULL DEFAULT '',
    cta_href TEXT NOT NULL DEFAULT '/store',
    max_items INTEGER NOT NULL DEFAULT 5,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id),
    subtotal_cents INTEGER NOT NULL,
    fee_cents INTEGER NOT NULL DEFAULT 0,
    cashback_used_cents INTEGER NOT NULL DEFAULT 0,
    cashback_earned_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_ref TEXT NOT NULL,
    card_last4 TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    keys_confirmed_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    offer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    product_slug TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    region TEXT NOT NULL,
    platform TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL,
    line_no INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS digital_keys (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_digital_keys_order ON digital_keys(order_id);

CREATE TABLE IF NOT EXISTS cashback_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cashback_user ON cashback_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashback_order ON cashback_entries(order_id);
