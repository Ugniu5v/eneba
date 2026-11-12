export function formatPrice(
  cents: number,
  currency = "EUR",
  locale = "en-IE",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IE").format(value);
}

export function formatDate(value: string, locale = "en-GB"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string, locale = "en-GB"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function discountPercent(priceCents: number, originalCents: number): number {
  if (!originalCents || originalCents <= priceCents) return 0;
  return Math.round(((originalCents - priceCents) / originalCents) * 100);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function classNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function stars(rating: number): string {
  const rounded = Math.round(rating);
  return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
}
