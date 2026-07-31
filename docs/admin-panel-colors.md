# IICA Admin Panel — Colour Reference

Audited directly from the codebase (no values estimated from screenshots).

Sources:
- `tailwind.config.js` — custom colour tokens (`magenta`, `charcoal`, `cream`) + shadows
- `src/index.css` — base layer, scrollbar
- `src/components/ui/Badge.tsx`, `StatusBadge.tsx`, `Button.tsx` — status/semantic classes (Tailwind defaults)
- `src/features/dashboard/sections/DashboardCharts.tsx` — chart palette + chart chrome
- `src/config/bannerLabels.ts` — banner gradient presets
- `src/features/events/TicketOrderDrawer.tsx` — printed-ticket inline HTML

"Occurrences" = literal hex/rgba occurrences found in source. Tokens used through
Tailwind utility classes (e.g. `bg-magenta-500`) are marked **class (many)** because
they resolve at build time and appear hundreds of times as class names.

---

## Brand

| Semantic name | HEX | RGB | Token / class | UI usage | Example screen | Occurrences |
|---|---|---|---|---|---|---|
| Primary (IICA magenta) | `#C2186B` | `rgb(194,24,107)` | `magenta.500` / `bg/text-magenta-500` | Primary buttons, active nav highlight, links, focus ring, progress bars, chart primary | Sidebar active item, Dashboard bars, primary buttons | class (many) + 4 literal (chart `MAGENTA`, `PALETTE[0]`, ticket border/text) |
| Primary 50 | `#fdf2f8` | `rgb(253,242,248)` | `magenta.50` | Badge tint, hover backgrounds, chips | Filter chips, magenta badges | class (many) |
| Primary 100 | `#fce7f1` | `rgb(252,231,241)` | `magenta.100` | Hover states, badge border | Chip hover | class (many) |
| Primary 200 | `#fbcfe3` | `rgb(251,207,227)` | `magenta.200` | Badge borders | Magenta badge | class (few) |
| Primary 300 | `#f9a8cd` | `rgb(249,168,205)` | `magenta.300` | Scale (no direct use) | — | 0 |
| Primary 400 | `#f472ad` | `rgb(244,114,173)` | `magenta.400` | Scale (no direct use) | — | 0 |
| Primary 600 (hover) | `#a8145d` | `rgb(168,20,93)` | `magenta.600` | Primary button hover/active, emphasised text | Button `:hover` | class (many) |
| Primary 700 | `#8a1049` | `rgb(138,16,73)` | `magenta.700` | Badge text, link hover | Magenta badge text | class (many) |
| Primary 800 | `#6f0e3c` | `rgb(111,14,60)` | `magenta.800` | Scale (no direct use) | — | 0 |
| Primary 900 | `#5c0d33` | `rgb(92,13,51)` | `magenta.900` | Scale (no direct use) | — | 0 |
| Primary tint (chart) | `#E9A5C6` | `rgb(233,165,198)` | `MAGENTA_LIGHT` / `PALETTE[1]` | Secondary bar in Commerce Snapshot, location bars | Dashboard charts | 2 literal |

---

## Backgrounds and surfaces

| Semantic name | HEX | RGB | Token / class | UI usage | Example screen | Occurrences |
|---|---|---|---|---|---|---|
| Page background | `#FAF8F5` | `rgb(250,248,245)` | `cream.DEFAULT` / `bg-cream` | App shell background | All admin pages | class (many) + 1 literal (ticket print) |
| Surface / card hover | `#F4F1EC` | `rgb(244,241,236)` | `cream.100` / `bg-cream-100` | Card sub-surfaces, row hover, inputs | Table row hover, panels | class (many) + 2 literal (chart tooltip cursor) |
| Card surface | `#ffffff` | `rgb(255,255,255)` | `bg-white` (Tailwind) | `.card` background, inputs, modals, dropdowns | Every card/table/modal | class (many) |

`.card` (index.css `@layer components`) = `bg-white` + `border-cream-200` + `shadow-card`.

---

## Text

| Semantic name | HEX | RGB | Token / class | UI usage | Example screen | Occurrences |
|---|---|---|---|---|---|---|
| Text primary | `#211E1D` | `rgb(33,30,29)` | `charcoal.DEFAULT` / `text-charcoal` | Headings, primary body, table values | All pages | class (many) + 1 literal (ticket) |
| Text strong | `#3a3634` | `rgb(58,54,52)` | `charcoal.light` / `text-charcoal-light` | Slightly softened body / nav labels | Sidebar labels, chart Y-axis | class (many) + 1 literal (location chart tick) |
| Text muted | `#6b6560` | `rgb(107,101,96)` | `charcoal.muted` / `text-charcoal-muted` | Secondary text, labels, captions, placeholders | Table sub-text, descriptions, chart ticks | class (many) + 4 literal (charts + ticket) |

---

## Borders and dividers

| Semantic name | HEX | RGB | Token / class | UI usage | Example screen | Occurrences |
|---|---|---|---|---|---|---|
| Border / divider | `#ECE7DF` | `rgb(236,231,223)` | `cream.200` / `border-cream-200` | Card borders, table row dividers, input borders, chart grid/axis | Every table & card; global `* { @apply border-cream-200 }` | class (many) + 4 literal (chart grid/axis stroke) |

Global default: `index.css` sets `* { @apply border-cream-200; }`.

---

## Buttons and navigation

| Semantic name | HEX | Token / class | UI usage | Example | Occurrences |
|---|---|---|---|---|---|
| Button primary bg | `#C2186B` | `bg-magenta-500` | `Button` variant `primary` | "Add Admin User" | class |
| Button primary hover | `#a8145d` | `hover:bg-magenta-600` | primary hover | — | class |
| Button primary active | `#8a1049` | `active:bg-magenta-700` | primary active | — | class |
| Button primary disabled | `#f9a8cd` | `disabled:bg-magenta-300` | disabled primary | — | class |
| Button secondary bg | `#ffffff` | `bg-white` + `border-cream-200` | `Button` variant `secondary` | "View Portfolio" | class |
| Button secondary hover | `#F4F1EC` | `hover:bg-cream-100` | secondary hover | — | class |
| Button ghost hover | `#F4F1EC` / `#ECE7DF` | `hover:bg-cream-100` / `active:bg-cream-200` | ghost buttons | Icon buttons | class |
| Nav active bg | `#fdf2f8` | `bg-magenta-50` | Active sidebar item | Sidebar | class |
| Nav active text/marker | `#C2186B` / `#8a1049` | `text-magenta-700`, marker `bg-magenta-500` | Active sidebar item + left marker | Sidebar | class |
| Nav idle text | `#3a3634` | `text-charcoal-light` | Idle sidebar items | Sidebar | class |
| Focus ring | `#C2186B` | `ring-magenta-500` | `:focus-visible` global | All focusable elements | class (index.css) |

---

## Status colours (Tailwind defaults via `Badge`/`StatusBadge`/`Button`)

Badge tones: `neutral | magenta | green | amber | red | blue`.

| Semantic | Role | HEX (bg / fg / border) | Classes | UI usage | Occurrences |
|---|---|---|---|---|---|
| Success | green | `#ecfdf5` / `#047857` / `#d1fae5` | `emerald-50 / emerald-700 / emerald-100` | Active, Published, Visible, Paid, Completed badges | class (many) |
| Success solid | check icon | `#10b981` (`emerald-500`), `#059669` (`emerald-600`) | `bg-emerald-500`, `text-emerald-600` | Completion-checklist tick, eligibility icon | class |
| Info | blue | `#f0f9ff` / `#0369a1` / `#e0f2fe` | `sky-50 / sky-700 / sky-100` | Draft, Form Submitted, IICA ID Generated, Purchase Link Sent | class (many) |
| Warning | amber | `#fffbeb` / `#b45309` / `#fef3c7` | `amber-50 / amber-700 / amber-100` | Purchase Pending, Renewal Due, Hidden, On Hold | class (many) |
| Warning text (notes) | — | `#92400e` | `text-amber-800` | Commission / prototype notices | class |
| Warning icon | — | `#d97706` | `text-amber-600` | Eligibility warning icon | class |
| Danger | red | `#fef2f2` / `#b91c1c` / `#fee2e2` | `red-50 / red-700 / red-100` | Cancelled, Failed, Suspended, Blocked | class (many) |
| Danger solid | button | `#dc2626` → `#b91c1c` → `#991b1b` | `bg-red-600 / hover:red-700 / active:red-800` | `Button` variant `danger` | class |
| Danger disabled | — | `#fca5a5` | `disabled:bg-red-300` | disabled danger button | class |
| Neutral | grey | `#F4F1EC` / `#6b6560` / `#ECE7DF` | `cream-100 / charcoal-muted / cream-200` | Not Applicable, Not Started, Guest, Inactive | class (many) |

---

## Icons

Icons are `lucide-react` and inherit `currentColor`. Common colour classes:
- `text-charcoal-muted` `#6b6560` — default/idle icons (table actions, inputs)
- `text-magenta-500/600/700` `#C2186B / #a8145d / #8a1049` — active/brand icons, activity gauge
- `text-emerald-600` `#059669` — success/eligible
- `text-amber-600` `#d97706` — warnings
- `text-red-600` `#dc2626` — destructive
- `text-white` `#ffffff` — icons on primary buttons / avatar initials

No hardcoded icon hex values; all via classes.

---

## Charts — `DashboardCharts.tsx` (hardcoded literals)

Categorical palette `PALETTE[]`:

| Index | HEX | RGB | Usage | Occurrences | Suggested name |
|---|---|---|---|---|---|
| 0 | `#C2186B` | `194,24,107` | primary series (dup of `magenta.500`) | 2 | `--chart-1` |
| 1 | `#E9A5C6` | `233,165,198` | primary tint series | 2 | `--chart-2` |
| 2 | `#3a6ea5` | `58,110,165` | Revenue "Event Tickets" area+stroke | 3 | `--chart-blue` |
| 3 | `#c9a227` | `201,162,39` | Revenue "Memberships" | 3 | `--chart-gold` |
| 4 | `#3c7a52` | `60,122,82` | Collaboration "Completed" bar | 2 | `--chart-green` |
| 5 | `#6a3fa0` | `106,63,160` | palette | 1 | `--chart-violet` |
| 6 | `#b8577f` | `184,87,127` | palette | 1 | `--chart-rose` |
| 7 | `#7ec8e3` | `126,200,227` | palette | 1 | `--chart-sky` |
| 8 | `#e0a96d` | `224,169,109` | palette | 1 | `--chart-tan` |
| 9 | `#9fd8a0` | `159,216,160` | palette | 1 | `--chart-mint` |
| 10 | `#c7a6e8` | `199,166,232` | palette | 1 | `--chart-lilac` |
| 11 | `#9aa0a6` | `154,160,166` | palette | 1 | `--chart-grey` |

Collaboration-progress bars — primary at rising opacity:
`rgba(194,24,107,0.45)`, `0.6`, `0.78`, `0.95` (4 literals); Completed row `#3c7a52`.

Chart chrome (hardcoded, all duplicate existing tokens):
- Grid / axis stroke `#ECE7DF` (= `cream.200`) ×4
- Tooltip cursor fill `#F4F1EC` (= `cream.100`) ×2
- Axis tick fill `#6b6560` (= `charcoal.muted`) ×3
- Location Y tick `#3a3634` (= `charcoal.light`) ×1
- Revenue gradient stops: `#3a6ea5` @0.18, `#c9a227` @0.18, `#C2186B` @0.2 (defs `rev-e`, `rev-m`, `rev-p`)

---

## Overlays and shadows

| Semantic name | Value | Token / class | UI usage | Occurrences |
|---|---|---|---|---|
| Shadow soft | `0 1px 2px rgba(33,30,29,0.04), 0 1px 3px rgba(33,30,29,0.06)` | `shadow-soft` | Buttons, small elevation | config |
| Shadow card | `0 1px 3px rgba(33,30,29,0.05), 0 4px 12px rgba(33,30,29,0.04)` | `shadow-card` | `.card` | config |
| Shadow drawer | `0 10px 40px rgba(33,30,29,0.12)` | `shadow-drawer` | Modals, dropdowns, mobile drawer | config |
| Modal overlay | `rgba(33,30,29,0.40)` | `bg-charcoal/40` | Modal/drawer backdrop | `Modal.tsx`, mobile Sidebar |
| Scrollbar thumb | `#d9d3ca` | — (index.css) | Custom scrollbar | 1 |
| Scrollbar thumb hover | `#c4bdb2` | — (index.css) | Custom scrollbar hover | 1 |

Shadow rgb `33,30,29` = `charcoal.DEFAULT`. Overlay `charcoal/40` = same token @ 40%.

---

## Gradients — `bannerLabels.ts` (banner preset backgrounds)

| Name | CSS | Stops | Occurrences |
|---|---|---|---|
| Sunset | `linear-gradient(135deg,#f6a5c0,#a64d79)` | `#f6a5c0`, `#a64d79` | 1 |
| Ocean | `linear-gradient(135deg,#7ec8e3,#3a6ea5)` | `#7ec8e3`, `#3a6ea5` | 1 |
| Gold | `linear-gradient(135deg,#f5d76e,#c9a227)` | `#f5d76e`, `#c9a227` | 1 |
| Forest | `linear-gradient(135deg,#9fd8a0,#3c7a52)` | `#9fd8a0`, `#3c7a52` | 1 |
| Violet | `linear-gradient(135deg,#c7a6e8,#6a3fa0)` | `#c7a6e8`, `#6a3fa0` | 1 |
| Charcoal | `linear-gradient(135deg,#6b7280,#1f2937)` | `#6b7280`, `#1f2937` | 1 |

Gradient-only hues (not used elsewhere): `#f6a5c0`, `#a64d79`, `#f5d76e`, `#6b7280`, `#1f2937`.
The rest (`#7ec8e3`, `#3a6ea5`, `#c9a227`, `#9fd8a0`, `#3c7a52`, `#c7a6e8`, `#6a3fa0`) duplicate the chart palette.

---

## Hardcoded colours (raw hex/rgba that should use existing tokens)

| Hex/value | File | = existing token |
|---|---|---|
| `#C2186B` | DashboardCharts (`MAGENTA`, `PALETTE[0]`), TicketOrderDrawer | `magenta.500` |
| `rgba(194,24,107,*)` | DashboardCharts (collab bars, gradient) | `magenta.500` @ opacity |
| `#ECE7DF` ×4 | DashboardCharts (grid/axis) | `cream.200` |
| `#F4F1EC` ×2 | DashboardCharts (cursor) | `cream.100` |
| `#6b6560` ×3, ×1 | DashboardCharts, TicketOrderDrawer | `charcoal.muted` |
| `#3a3634` | DashboardCharts | `charcoal.light` |
| `#211E1D` | TicketOrderDrawer | `charcoal.DEFAULT` |
| `#FAF8F5` | TicketOrderDrawer | `cream.DEFAULT` |

Note: chart libs (Recharts) require literal colour strings, so some hardcoding is expected —
but they should reference shared JS constants, not re-typed hexes.

---

## Duplicate or near-duplicate colours

**Exact duplicates (same hex, defined/typed more than once):**
- `#C2186B` — 5 definitions: `magenta.500`, `MAGENTA`, `PALETTE[0]`, `rgba(194,24,107,*)`, ticket.
- `#ECE7DF`, `#F4F1EC`, `#6b6560`, `#3a3634`, `#211E1D`, `#FAF8F5` — each = a `cream`/`charcoal` token but re-typed as literals in charts/ticket.
- Chart↔gradient overlap: `#3a6ea5`, `#c9a227`, `#3c7a52`, `#6a3fa0`, `#7ec8e3`, `#9fd8a0`, `#c7a6e8` typed in both `PALETTE` and banner presets.

**Near-identical (different hex, same intent):**
- Greens: `#3c7a52` (chart) vs `#059669`/`#047857` (emerald success) vs `#9fd8a0` (mint).
- Blues: `#3a6ea5` (chart) vs `#0369a1` (sky info) vs `#7ec8e3` (sky tint).
- Pinks: `#E9A5C6` (chart) vs `#f9a8cd` (`magenta.300`) vs `#fbcfe3` (`magenta.200`) vs `#f6a5c0` (banner).
- Golds: `#c9a227` (chart) vs `#f5d76e` (banner gold light).
- Greys: `#6b6560` (`charcoal.muted`) vs `#6b7280` (banner) vs `#9aa0a6` (chart grey).

---

## Inconsistent usage

- **Two "green" systems**: status success uses Tailwind `emerald-*`; charts/banner use custom `#3c7a52`/`#9fd8a0`. Same conceptual colour, two hues.
- **Two "blue" systems**: info badges use `sky-*`; charts/banner use `#3a6ea5`. No shared blue token.
- **Primary hardcoded in charts** as `#C2186B` and `rgba(194,24,107,*)` instead of the `magenta` token — a theme change to the brand colour would not propagate to charts.
- **Chart chrome re-types** cream/charcoal tokens as literals — theme changes won't propagate.
- **Neutral/grey drift**: three near-greys (`#6b6560`, `#6b7280`, `#9aa0a6`) for muted UI, banner, chart.

---

## Contrast concerns (WCAG, on stated background)

- **`charcoal.muted #6b6560` on `cream #FAF8F5`** ≈ 4.6:1 → passes AA for normal text, but it is used at `text-xs`/`11px` in dense tables and chart ticks where it is borderline; avoid for the smallest captions.
- **`magenta.700 #8a1049` on `magenta.50 #fdf2f8`** (badge text) ≈ 8:1 → fine.
- **Chart gold `#c9a227` on white** ≈ 2.0:1 → **fails** as text/thin strokes; acceptable only as a filled area/large mark, not for labels.
- **Chart sky `#7ec8e3` / mint `#9fd8a0` on white** ≈ 1.6–1.8:1 → **fail** for any text/legend text; fine as fills only. Legends rely on the (darker) `charcoal-muted` text, so OK, but the swatches themselves are low-contrast.
- **`amber-700 #b45309` on `amber-50 #fffbeb`** ≈ 4.7:1 → passes AA.
- **Primary button** `#ffffff` on `#C2186B` ≈ 5.3:1 → passes AA.
- **Disabled primary** text `#ffffff` on `magenta.300 #f9a8cd` ≈ 1.9:1 → fails, but it is a disabled state (exempt), acceptable.

---

## Suggested consolidated token list

One source of truth; charts/gradients reference these instead of re-typed hexes.

```
Brand
  --color-primary            #C2186B   (magenta.500)
  --color-primary-hover      #a8145d   (magenta.600)
  --color-primary-active     #8a1049   (magenta.700)
  --color-primary-soft       #fdf2f8   (magenta.50)
  --color-primary-tint       #E9A5C6   (chart secondary)

Surfaces / bg
  --color-page-background     #FAF8F5   (cream)
  --color-surface            #ffffff   (white)
  --color-surface-muted      #F4F1EC   (cream.100)

Text
  --color-text-primary       #211E1D   (charcoal)
  --color-text-strong        #3a3634   (charcoal.light)
  --color-text-secondary     #6b6560   (charcoal.muted)

Border
  --color-border             #ECE7DF   (cream.200)

Status
  --color-success            #047857   (emerald-700)   bg #ecfdf5  border #d1fae5
  --color-info               #0369a1   (sky-700)       bg #f0f9ff  border #e0f2fe
  --color-warning            #b45309   (amber-700)     bg #fffbeb  border #fef3c7
  --color-error              #b91c1c   (red-700)       bg #fef2f2  border #fee2e2

Overlay / shadow
  --color-overlay            rgba(33,30,29,0.40)
  --shadow-rgb               33,30,29

Charts (12-swatch categorical)
  --chart-1 #C2186B  --chart-2 #E9A5C6  --chart-blue #3a6ea5  --chart-gold #c9a227
  --chart-green #3c7a52  --chart-violet #6a3fa0  --chart-rose #b8577f  --chart-sky #7ec8e3
  --chart-tan #e0a96d  --chart-mint #9fd8a0  --chart-lilac #c7a6e8  --chart-grey #9aa0a6

Scrollbar
  --scrollbar-thumb          #d9d3ca
  --scrollbar-thumb-hover    #c4bdb2
```

See `src/styles/admin-colors.css` for the copy-paste token file.

---

## Note on the User App

The User App is **not part of this repository** (this project is the standalone IICA
Admin Panel — React + Vite + Tailwind). No user-app colours were audited, because the
instruction is to read exact values from code and not estimate. `user-app-colors.css`
and `user-app-colors.md` should be generated from inside the User App project.
