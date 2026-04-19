# Sidebar redesign — scaffold from shadcn `dashboard-01`

## Context

The current "my assets" feature lives in a side-sheet (`AssetsPanel`) that feels like a modal popover. We want a persistent, toggleable sidebar with two sections — **my algoku nfts** and **leaderboard** — and each NFT rendered as a `Collapsible` card (mini-grid + asset id + mint date + lora link). The user's wallet button moves into the sidebar footer (and also stays in the header, so it's reachable when the sidebar is collapsed).

We'll scaffold from shadcn's `dashboard-01` block (`npx shadcn@latest add dashboard-01`), keep its sidebar chassis (`app-sidebar`, `site-header`, `nav-user`, plus the `ui/sidebar`, `ui/collapsible`, `ui/card`, `ui/tooltip` primitives), gut the dashboard-specific widgets, and drop the sudoku game in where the dashboard content was.

## Plan

### 1. Install the block + prune

`npx shadcn@latest add dashboard-01` inside `projects/algoku-frontend/`.

**Keep**: `components/ui/sidebar.tsx`, `collapsible.tsx`, `card.tsx`, `tooltip.tsx`; `components/app-sidebar.tsx`, `site-header.tsx`, `nav-user.tsx`.

**Delete**: `components/section-cards.tsx`, `chart-area-interactive.tsx`, `data-table.tsx`, `data.json`, `nav-main.tsx`, `nav-documents.tsx`, `nav-secondary.tsx`, and whatever `app/` or `page.tsx` file the block scaffolds (we don't use Next.js routing — our entry is `Home.tsx`).

### 2. Extract `WalletButton`

New: `src/components/WalletButton.tsx`. Absorbs the wallet-modal open/close state + label logic from `Home.tsx` (currently at `Home.tsx:25, 119-121, 168`). Accepts `variant` / `className` so it styles correctly in header vs footer. One component, two call sites.

### 3. Rewrite `AppSidebar`

Two `SidebarGroup`s inside `SidebarContent`:
- **my algoku nfts** → `AssetCollapsibleList` (uses `useOwnedAlgokuAssets`), empty state "no nfts yet".
- **leaderboard** → "coming soon" placeholder card.

`SidebarHeader`: "algoku" wordmark.
`SidebarFooter`: `<WalletButton />` (replaces the block's `nav-user` avatar+email chip).

### 4. `AssetCollapsible`

New: `src/components/AssetCollapsible.tsx`. Replaces the inline `AssetCard` from `AssetsPanel`. Uses `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `Card`, `CardContent`. Proposed split (if you want it inverted, say so in plan-approval):
- **Trigger (always visible)**: `asset {id}` · `{formattedDate}` + rotating chevron.
- **Expanded content**: `<SudokuMini puzzle solution />` + lora link row.

Pure function of `AlgokuAsset` + `network`. Reuses existing `SudokuMini`.

### 5. `SiteHeader` adaptation

Rework the block's `site-header.tsx` to contain: `SidebarTrigger`, `ModeToggle`, `WalletButton`. Remove any block default nav/search UI.

### 6. Refactor `Home.tsx`

```tsx
<SidebarProvider>
  <AppSidebar variant="inset" />
  <SidebarInset>
    <SiteHeader />
    <main>…existing sudoku game UI…</main>
  </SidebarInset>
</SidebarProvider>
```

Remove `assetsOpen` state and `<AssetsPanel>` mount. All game state/handlers (`useSudokuState`, `useAlgoku`, `handleCheck`, `handleMint`, `queryClient.invalidateQueries` after mint) stay.

### 7. Enhance asset fetching + pure mapper

- `src/lib/assets.ts` — add `createdAtUnix: number | null` to `AlgokuAsset` and `NormalizedAssetParams`; `tryParseAlgokuAsset` passes it through.
- `src/lib/assets.test.ts` — update fixtures to include `createdAtUnix`.
- `src/hooks/useOwnedAlgokuAssets.ts` — for each holding, fire `indexer.searchForTransactions().assetID(id).txType('acfg').limit(1).do()` in parallel with `lookupAssetByID`; read `roundTime` (unix seconds). Sort returned array by `createdAtUnix DESC`.

### 8. Date formatting util (pure)

New: `src/utils/formatMintDate.ts`
```ts
export function formatMintDate(unix: number | null): string {
  if (unix === null) return ""
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(unix * 1000))
}
```
Testable. Uses browser's current locale (what the user asked for).

### 9. Cleanup

Delete:
- `src/components/AssetsPanel.tsx`
- `src/components/ui/sheet.tsx` (only used by `AssetsPanel`)
- Dashboard block leftovers per step 1

### 10. Verify

- `npm run typecheck`
- `npx vitest run` — existing 83 + updated asset mapper fixtures
- `npx vite build`
- Manual browser: sidebar toggle, collapsible expand, date renders in your locale, wallet button works from header AND sidebar footer, mint flow invalidates the sidebar list.

## Critical files

**New**: `WalletButton.tsx`, `AssetCollapsible.tsx`, `utils/formatMintDate.ts` (+ tests).
**Installed then adapted**: `app-sidebar.tsx`, `site-header.tsx`, `nav-user.tsx`, `ui/sidebar.tsx`, `ui/collapsible.tsx`, `ui/card.tsx`, `ui/tooltip.tsx`.
**Modified**: `Home.tsx`, `useOwnedAlgokuAssets.ts`, `lib/assets.ts`, `lib/assets.test.ts`.
**Deleted**: `AssetsPanel.tsx`, `ui/sheet.tsx`, dashboard block's chart/table/section-cards/nav-\* + any page file.

## Reusable utilities already present (no new code needed)

- `parseAssetUrl` in `src/lib/sudoku.ts` — decodes the 92-byte ASA URL (used by `tryParseAlgokuAsset`).
- `SudokuMini` in `src/components/SudokuMini.tsx` — already pure and sized right for collapsible content.
- `loraAssetUrl` in `src/utils/lora.ts` — asset explorer link.
- `ellipseAddress` in `src/utils/ellipseAddress.ts` — address formatting for the wallet button label.
- `CHIP_CLASS` in `Home.tsx` — emerald-chip override; worth relocating to `src/lib/buttonStyles.ts` if multiple components start using it (minor; can defer).

## Risks / open decisions

1. **Collapsible trigger/content split** (§4): my default is trigger = compact, content = visual+link. Inversion (trigger = full card, content = extra detail like mint tx link) is also reasonable. Say in plan approval if you want the inversion.
2. **Block installation paths**: shadcn `dashboard-01` may scaffold at Next.js-style paths. If so, move files into `src/components/` to match our Vite layout — trivial.
3. **`nav-user.tsx` fate**: likely deleted outright (the block's avatar+email pattern doesn't match a wallet). We can reuse it as a shell if its styling is useful; otherwise straight-delete in favor of `<WalletButton />`.
