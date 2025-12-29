# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StockVal is a Next.js 16 stock valuation and analysis application. It provides investors with interactive tools to analyze stocks using multiple valuation models, technical indicators, and news sentiment.

## Commands

```bash
npm run dev       # Start development server at http://localhost:3000
npm run build     # Build for production
npm run lint      # Run ESLint
npm run sync:app  # Sync assets from companion WordPress plugin (../stock-valuation-plugin)
```

## Architecture

### Core Stack
- **Next.js 16** with App Router (`src/app/`)
- **React 19** with TypeScript
- **Zustand + Immer** for state management (`src/stores/`)
- **Tailwind CSS 4** for styling
- **Yahoo Finance API** via `yahoo-finance2` for market data

### Data Flow

```
User Input → Zustand Store → Valuation Engines → UI Components
                  ↑
            API Routes (Yahoo Finance)
```

### Key Directories

- `src/app/api/` - Next.js API routes
  - `stock/route.ts` - Main stock data endpoint, returns comprehensive valuation
  - `technicals/route.ts` - Technical analysis data
  - `news/route.ts` - News feed
  - `fmp/route.ts` - Financial Modeling Prep integration

- `src/lib/` - Core business logic
  - `comprehensive-valuation.ts` - All valuation models (DCF, Graham, Lynch, EPV, DDM, RIM, Rule of 40)
  - `valuation.ts` - Simple DCF engine used by Zustand store
  - `relative-valuation.ts` - Peer comparison logic
  - `data-transformer.ts` - API response normalization

- `src/stores/` - Zustand state stores
  - `valuationStore.ts` - DCF assumptions and fair value calculation
  - `dashboardStore.ts` - Dashboard UI state
  - `settingsStore.ts` - User preferences (API keys)

- `src/types/` - TypeScript type definitions
  - `valuation.ts` - Core valuation types
  - `fmp.ts` - Financial Modeling Prep API types

- `src/reference/` - Reference PHP code from WordPress plugin version (read-only)

### Valuation Models

The app implements multiple valuation methodologies in `src/lib/comprehensive-valuation.ts`:

1. **DCF (FCFF)** - Two-stage discounted cash flow with growth fade
2. **Graham Number** - √(22.5 × EPS × BVPS) for defensive value
3. **Lynch Fair Value** - PEG-based valuation (P/E = Growth Rate)
4. **EPV** - Earnings Power Value (zero-growth floor)
5. **DDM** - Dividend Discount Model (Gordon Growth)
6. **Reverse DCF** - Solve for market-implied growth rate
7. **RIM** - Residual Income Model (for banks/financials)
8. **Rule of 40** - For SaaS companies (Growth% + Margin% > 40)

Fair values are synthesized using weighted averages: DCF (40%), Lynch (35%), Graham (15%), EPV (10%).

### State Management Pattern

```typescript
// Zustand store with Immer for immutable updates
const useValuationStore = create<ValuationStore>()(
    immer((set, get) => ({
        assumptions: { revenueGrowth: 8, terminalGrowth: 2.5, wacc: 10, ... },
        setAssumption: (key, value) => set((state) => {
            state.assumptions[key] = value;
            state.fairValue = calculateFullDCF(state.assumptions, get().fundamentals);
        }),
    }))
);
```

### API Route Pattern

Stock data endpoint (`src/app/api/stock/route.ts`) fetches from Yahoo Finance, calculates all valuation models, and returns:
- Current price and company info
- All valuation fair values with verdicts
- Historical financials (income, balance, cashflow)
- Suggested assumptions based on historical data

### CSS Architecture

- `src/app/globals.css` - Global styles and dark theme
- `src/styles/plugin-frontend.css` - Synced from WordPress plugin
- Components use `svp-*` class prefix from plugin CSS
