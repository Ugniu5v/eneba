export interface Offer {
  id: string;
  sellerName: string;
  sellerRating: number;
  sellerReviews: number;
  priceCents: number;
  originalPriceCents: number;
  currency: string;
  region: string;
  platform: string;
  delivery: string;
  stock: number;
  isOfficial: boolean;
}

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  productType: string;
  platform: string;
  region: string;
  genre: string;
  releaseDate: string;
  coverImage: string;
  rating: number;
  ratingCount: number;
  badge: string;
  isNew: boolean;
  featured: boolean;
  cashbackPercent: number;
  giftValueCents: number;
  giftCurrency: string;
  lowestOffer: Offer;
  offerCount: number;
  discountPercent: number;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  developer: string;
  publisher: string;
  features: string[];
  offers: Offer[];
}

export interface ProductPageResponse {
  product: ProductDetail;
  related: ProductSummary[];
  /** Every denomination of the same gift card; each one is a separate product. */
  variants: ProductSummary[];
}

export interface Banner {
  id: string;
  slot: "hero" | "side";
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  theme: "dark" | "light";
  endsAt?: string;
}

export interface Category {
  name: string;
  slug: string;
  icon: string;
  href: string;
}

export interface HomeSection {
  slug: string;
  title: string;
  subtitle: string;
  layout: "cards" | "deals" | string;
  source: string;
  ctaLabel: string;
  ctaHref: string;
  maxItems: number;
  sortOrder: number;
  apiPath: string;
}

export interface HomeSectionResponse {
  section: HomeSection;
  products: ProductSummary[];
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface SortOption {
  value: SortValue;
  label: string;
}

export type SortValue =
  | "relevance"
  | "popular"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "newest"
  | "discount";

export interface FilterOptions {
  platforms: Facet[];
  regions: Facet[];
  types: Facet[];
  genres: Facet[];
  categories: Facet[];
  price: { minCents: number; maxCents: number };
  sortOptions: SortOption[];
  totalProducts: number;
  matchingProducts: number;
}

export interface CatalogResponse {
  products: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  query: string;
  suggestion: string;
}

export interface SearchResponse {
  products: ProductSummary[];
  total: number;
  query: string;
  suggestion: string;
}

export interface SearchSuggestResponse {
  suggestions: ProductSummary[];
  suggestion: string;
  query: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User | null;
}

export interface DigitalKey {
  code: string;
  createdAt: string;
}

export interface OrderItem {
  productTitle: string;
  productSlug: string;
  sellerName: string;
  region: string;
  platform: string;
  coverImage: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  keys: DigitalKey[];
}

export interface Order {
  number: string;
  status: string;
  createdAt: string;
  subtotalCents: number;
  feeCents: number;
  /** Cashback redeemed against this order. */
  cashbackUsedCents: number;
  /** Cashback credited after this order was delivered. */
  cashbackEarnedCents: number;
  totalCents: number;
  currency: string;
  paymentMethod: string;
  cardLast4: string;
  itemCount: number;
  /** Digital keys are only included after the buyer confirms region/platform. */
  keysConfirmed: boolean;
  items: OrderItem[];
}

export interface OrderResponse {
  order: Order;
}

export interface OrdersResponse {
  orders: Order[];
}

export interface CashbackEntry {
  id: string;
  kind: "earned" | "redeemed" | string;
  /** Signed: positive for earned cashback, negative for a redemption. */
  amountCents: number;
  description: string;
  orderNumber?: string;
  createdAt: string;
}

export interface CashbackSummary {
  balanceCents: number;
  earnedCents: number;
  redeemedCents: number;
  entries: CashbackEntry[];
}

export interface CashbackResponse {
  cashback: CashbackSummary;
}

export interface CheckoutResponse {
  order: Order;
  payment: {
    status: string;
    ref: string;
    last4: string;
    test: boolean;
  };
}

export interface ApiFailure {
  error?: {
    code?: string;
    message?: string;
  };
}
