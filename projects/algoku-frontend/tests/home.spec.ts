import { expect, Locator, Page, test } from "@playwright/test"

const cellLocator = (page: Page) => page.getByRole("button", { name: /^cell row/ })
const numberPad = (page: Page, n: number) => page.getByRole("button", { name: String(n), exact: true })

const firstEmptyIndex = async (cells: Locator): Promise<number> => {
  const labels = await Promise.all(Array.from({ length: 81 }, (_, i) => cells.nth(i).getAttribute("aria-label")))
  const idx = labels.findIndex((l) => l?.endsWith(", empty"))
  if (idx < 0) throw new Error("no empty cell found in seed")
  return idx
}

test.describe("algoku home (no wallet)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "algoku" })).toBeVisible()
  })

  test("renders an 81-cell board and the connect-wallet hint", async ({ page }) => {
    await expect(page.getByRole("grid", { name: "sudoku board" })).toBeVisible()
    await expect(cellLocator(page)).toHaveCount(81)
    await expect(page.getByText("connect a wallet to enable minting.")).toBeVisible()
  })

  test("number pad is disabled until a cell is selected", async ({ page }) => {
    await expect(numberPad(page, 1)).toBeDisabled()
    const cells = cellLocator(page)
    const idx = await firstEmptyIndex(cells)
    await cells.nth(idx).click()
    await expect(numberPad(page, 1)).toBeEnabled()
  })

  test("entering a number fills the selected cell", async ({ page }) => {
    const cells = cellLocator(page)
    const idx = await firstEmptyIndex(cells)
    await cells.nth(idx).click()
    await numberPad(page, 5).click()
    await expect(cells.nth(idx)).toHaveAttribute("aria-label", /value 5$/)
  })

  test("reset clears entered values", async ({ page }) => {
    const cells = cellLocator(page)
    const idx = await firstEmptyIndex(cells)
    await cells.nth(idx).click()
    await numberPad(page, 5).click()
    await expect(cells.nth(idx)).toHaveAttribute("aria-label", /value 5$/)

    await page.getByRole("button", { name: "reset", exact: true }).click()
    await expect(cells.nth(idx)).toHaveAttribute("aria-label", /, empty$/)
  })

  test("new puzzle reshuffles the givens", async ({ page }) => {
    const cells = cellLocator(page)
    const before = await Promise.all(Array.from({ length: 81 }, (_, i) => cells.nth(i).getAttribute("aria-label")))
    await page.getByRole("button", { name: "new puzzle", exact: true }).click()
    const after = await Promise.all(Array.from({ length: 81 }, (_, i) => cells.nth(i).getAttribute("aria-label")))
    expect(after).not.toEqual(before)
  })

  test("conflict detection highlights duplicated cells on check", async ({ page }) => {
    // Find two empty cells in the same row (1..9) by parsing aria-labels.
    const cells = cellLocator(page)
    const labels = await Promise.all(Array.from({ length: 81 }, (_, i) => cells.nth(i).getAttribute("aria-label")))
    const empties = labels.map((l, i) => ({ l, i })).filter((c) => c.l?.endsWith(", empty"))

    const byRow = new Map<string, number[]>()
    for (const { l, i } of empties) {
      const m = l!.match(/^cell row (\d+)/)
      if (!m) continue
      const row = m[1]
      const list = byRow.get(row) ?? []
      list.push(i)
      byRow.set(row, list)
    }
    const pair = [...byRow.values()].find((v) => v.length >= 2)
    expect(pair, "expected at least one row to have two empties; rerun if seed unlucky").toBeDefined()

    const [a, b] = pair!
    await cells.nth(a).click()
    await numberPad(page, 5).click()
    await cells.nth(b).click()
    await numberPad(page, 5).click()
    await page.getByRole("button", { name: "check", exact: true }).click()

    await expect(cells.nth(a)).toHaveClass(/text-destructive/)
    await expect(cells.nth(b)).toHaveClass(/text-destructive/)
  })

  test("dev-mode auto-solve + check surfaces the connect-a-wallet mint hint", async ({ page }) => {
    // Cmd/Ctrl+Enter is wired in Home.tsx for dev only; vite dev server enables it.
    await page.keyboard.press("ControlOrMeta+Enter")
    // After auto-solve every cell should report a value (no ", empty" labels).
    await expect(page.getByRole("button", { name: /, empty$/ })).toHaveCount(0)
    await page.getByRole("button", { name: "check", exact: true }).click()
    await expect(page.getByText("looks good — connect a wallet to mint.")).toBeVisible()
  })
})
