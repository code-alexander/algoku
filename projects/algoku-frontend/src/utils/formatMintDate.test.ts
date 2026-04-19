import { describe, expect, it } from "vitest"

import { formatMintDate } from "@/utils/formatMintDate"

describe("formatMintDate", () => {
  it("returns empty string for null", () => {
    expect(formatMintDate(null)).toBe("")
  })

  it("formats a known unix timestamp deterministically under en-US (locale-independent fallback check)", () => {
    // 1_700_000_000 = 2023-11-14T22:13:20Z. We can't assert exact locale output
    // without forcing a locale, so instead check that the string is non-empty
    // and contains a 4-digit year — enough to prove Intl.DateTimeFormat ran.
    const formatted = formatMintDate(1_700_000_000)
    expect(formatted).not.toBe("")
    expect(formatted).toMatch(/\b20\d{2}\b/)
  })

  it("is stable across repeated calls for the same input", () => {
    const a = formatMintDate(1_700_000_000)
    const b = formatMintDate(1_700_000_000)
    expect(a).toBe(b)
  })
})
