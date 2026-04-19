// Pure — formats a unix-second timestamp using the browser's current locale.
// Returns empty string for null input so callers can render without a guard.
export function formatMintDate(unix: number | null): string {
  if (unix === null) return ""
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(unix * 1000))
}
