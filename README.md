# Student Expense Tracker (SET)

A fully client-side student expense tracker built with vanilla HTML, CSS, and JavaScript. Log daily expenses, visualise spending with charts and progress bars, and track how your habits measure up against the budget you set yourself.

## Features

- Log and categorise daily expenses
- Per-category monthly budgets with editable budget table
- SVG donut chart showing spending breakdown by category
- SVG line graph with animated draw-in and monthly budget limit line
- Category progress bars (blue under-budget, red over-budget)
- Timeline picker: Past Week, Past Month, Past 90 Days, This Year, All Time
- Regex-powered transaction search with match highlighting
- Multi-column sorting (date, description, amount)
- Multi-currency conversion (EUR, GBP, RWF + custom)
- JSON import/export and seed data loader
- Auto-formatting of amounts (100 → 100.00)
- "Other" as permanent catch-all category for unbudgeted expenses

## How to Run

1. Clone or download this repository
2. Open `index.html` in a browser, or use VS Code Live Server

## Dashboard

### Donut Chart
Pure SVG donut with arc-path slices coloured by category. Centre shows total spent. Legend lists each category with amount. Hover/focus scales slices.

### Line Graph
Pure SVG line graph with data points, area fill, and animated polyline. X-axis buckets adapt to the selected timeline (days, weeks, months, years). Dashed red line shows monthly budget limit.

### Category Progress Bars
One bar per category. Blue fill shows spent portion against budget. Red extension appears when over budget (capped at 130% width). Categories without budgets show "(no limit)".

### Timeline Picker
Segmented control filtering all dashboard panels. Budget remaining card always shows current month regardless of timeline.

## Regex Patterns

| Pattern | Purpose | Where Used |
|---|---|---|
| `/^\S(?:.*\S)?$/` | No leading/trailing spaces | Description field |
| `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Valid amount format | Amount, Budget fields |
| `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | YYYY-MM-DD date | Date field |
| `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, spaces, hyphens | Category field |
| `/\b(\w+)\s+\1\b/i` | Duplicate consecutive words | Description warning |
| `/^(0\|[1-9]\d*)(\.\d{1,6})?$/` | Valid exchange rate | Currency rate field |
| User-typed patterns | Live regex search | Transaction search bar |

## Data Model

```json
{
  "id": "txn_0001",
  "description": "Lunch at cafeteria",
  "amount": 12.50,
  "category": "Food",
  "date": "2025-09-25",
  "createdAt": "2025-09-25T12:00:00.000Z",
  "updatedAt": "2025-09-25T12:00:00.000Z"
}
```

Settings (`set:settings`):
```json
{
  "baseCurrency": "USD",
  "currencies": [
    { "code": "EUR", "rate": 0.92 },
    { "code": "GBP", "rate": 0.79 },
    { "code": "RWF", "rate": 1465.54 }
  ],
  "monthlyBudget": 640,
  "categoryBudgets": {
    "Food": 150, "Books": 100, "Transport": 80,
    "Entertainment": 60, "Fees": 200, "Other": 50
  },
  "categories": ["Food", "Books", "Transport", "Entertainment", "Fees", "Other"]
}
```

## Accessibility

- WCAG AA colour contrast verified (primary text #F0F4FF on #0A0F1E ≥ 7:1)
- Skip-to-content link as first focusable element
- Full keyboard navigation with visible `:focus-visible` ring
- ARIA live regions for announcements (polite for saves, assertive for over-budget)
- All form inputs have associated labels
- Table has `<caption>` with count
- Sort buttons have `aria-pressed` and `aria-label` with direction
- Donut slices and line graph points are focusable with `aria-label`
- `prefers-reduced-motion` suppresses all animations

## Project Structure

```
student-finance-tracker/
├── index.html
├── tests.html
├── seed.json
├── README.md
├── SPEC.md
├── DECISIONS.md
├── styles/
│   ├── base.css          ← reset, custom properties, typography
│   ├── layout.css        ← nav, shell, breakpoints
│   ├── components.css    ← cards, table, form, badge, charts, progress bars
│   └── animations.css    ← keyframes, transitions
└── scripts/
    ├── main.js           ← entry point, bootstraps app
    ├── state.js          ← single source of truth + pub/sub
    ├── storage.js        ← localStorage + JSON import/export
    ├── validators.js     ← all regex rules + compileRegex + formatters
    ├── search.js         ← live regex search + highlight
    ├── ui.js             ← DOM renderers (table, stats, dashboard)
    ├── charts.js         ← donut chart + line graph (pure SVG)
    ├── forms.js          ← add/edit form logic
    └── settings.js       ← budget table, currency, import/export
```

## Milestones

- [x] M1 — Spec, Wireframes & Project Scaffold
- [x] M2 — Semantic HTML & Base CSS
- [x] M3 — Forms & Regex Validation
- [x] M4 — Records Table, Sorting & Regex Search
- [x] M5 — Stats Dashboard & Budget Visualisations
- [x] M6 — Persistence, Import/Export & Settings
- [x] M7 — Polish, Accessibility Audit & README
