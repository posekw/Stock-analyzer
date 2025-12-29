# Stock Valuation Web Application - Implementation Plan

> **Version:** 1.0  
> **Created:** 2025-12-26  
> **Status:** In Progress

---

## 1. Executive Summary

This document outlines the complete implementation plan for a **high-performance Stock Valuation Web Application**. The application provides investors with powerful, interactive tools to analyze stocks using multiple valuation models, technical indicators, and sentiment analysis—all within a stunning, modern UI.

---

## 2. Current State Analysis

### ✅ Completed Features

| Feature | Status | Location |
|---------|--------|----------|
| Next.js 15 Project Setup | ✅ Complete | `/` |
| Advanced DCF Calculation Engine | ✅ Complete | `src/lib/valuation.ts` |
| **Reverse DCF Analysis** | ✅ Complete | `src/app/reverse-dcf/page.tsx` |
| **Earnings Power Value (EPV)** | ✅ Complete | `src/app/epv/page.tsx` |
| Valuation State Management (Zustand) | ✅ Complete | `src/stores/valuationStore.ts` |
| Dashboard State Management | ✅ Complete | `src/stores/dashboardStore.ts` |
| Type Definitions | ✅ Complete | `src/types/valuation.ts` |
| Yahoo Finance API Integration | ✅ Complete | `src/app/api/stock/route.ts` |
| Navigation with Multiple Pages | ✅ Complete | `src/components/layout/Navigation.tsx` |
| Relative Valuation Page | ✅ Complete | `src/app/relative/page.tsx` |
| Technical Analysis Page | ✅ Complete | `src/app/technicals/page.tsx` |
| News Page | ✅ Complete | `src/app/news/page.tsx` |
| Main Page Layout | ✅ Complete | `src/app/page.tsx` |
| Dark Theme with Glassmorphism | ✅ Complete | `src/app/globals.css` |

### 🚧 Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Ticker Search | 🚧 Partial | Input exists, no API integration |
| Model Selection (DCF/DDM) | 🚧 Partial | Type defined, UI not implemented |
| Verdict System | 🚧 Partial | Store exists, no calculation logic |

### ❌ Not Yet Implemented

| Feature | Priority | Complexity |
|---------|----------|------------|
| Real-time Stock Data API | High | Medium |
| Interactive Charts (Recharts) | High | Medium |
| Technical Analysis Module | Medium | High |
| Sentiment Analysis Dashboard | Medium | Medium |
| DDM (Dividend Discount Model) | Medium | Low |
| Watchlist & Portfolio | Low | Medium |
| Export/Share Functionality | Low | Low |
| Monte Carlo Simulation | Low | High |

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Dashboard  │  │  Valuation   │  │  Technical Analysis  │   │
│  │    View      │  │    View      │  │        View          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      STATE MANAGEMENT                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Dashboard   │  │  Valuation   │  │      Settings        │   │
│  │    Store     │  │    Store     │  │       Store          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                       BUSINESS LOGIC                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │     DCF      │  │     DDM      │  │   Technical Calcs    │   │
│  │   Engine     │  │    Engine    │  │      (RSI, MACD)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Stock API   │  │   News API   │  │    Local Storage     │   │
│  │  (FMP/Alpha) │  │  (Optional)  │  │     (Watchlist)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Implementation Phases

### Phase 1: Core Enhancement (Priority: HIGH)

#### 1.1 Enhanced Valuation Panel
**Goal:** Improve the existing valuation experience

- [ ] **Task 1.1.1:** Add model selector (DCF | DDM toggle)
  - Location: `src/components/valuation/ModelSelector.tsx`
  - Update ValuationControls to conditionally render inputs

- [ ] **Task 1.1.2:** Implement Dividend Discount Model (DDM)
  - Location: `src/lib/ddm.ts`
  - Inputs: Current Dividend, Dividend Growth Rate, Required Return
  - Formula: `P = D₁ / (r - g)`

- [ ] **Task 1.1.3:** Create Sensitivity Analysis Table
  - Location: `src/components/valuation/SensitivityTable.tsx`
  - Display fair value across WACC/Growth rate combinations
  - Visual heatmap coloring

- [ ] **Task 1.1.4:** Add FCF Projection Chart
  - Location: `src/components/charts/FCFProjectionChart.tsx`
  - Show 5-year projected free cash flows + terminal value
  - Use Recharts library

#### 1.2 Stock Data Integration
**Goal:** Connect to real stock data

- [ ] **Task 1.2.1:** Create API service layer
  - Location: `src/services/stockApi.ts`
  - Support: Financial Modeling Prep API (free tier)
  - Cache responses with SWR or React Query

- [ ] **Task 1.2.2:** Build Ticker Search with Autocomplete
  - Location: `src/components/layout/TickerSearch.tsx`
  - Debounced search (300ms)
  - Display: Symbol, Name, Exchange

- [ ] **Task 1.2.3:** Fetch & Display Key Metrics
  - Location: `src/components/dashboard/KeyMetrics.tsx`
  - Metrics: P/E, P/B, EV/EBITDA, Market Cap, 52-Week Range
  - Auto-populate FCF per share from API

---

### Phase 2: Charts & Visualization (Priority: HIGH)

#### 2.1 Interactive Price Chart
**Goal:** Rich, interactive stock price visualization

- [ ] **Task 2.1.1:** Install and configure Recharts
  ```bash
  npm install recharts
  ```

- [ ] **Task 2.1.2:** Build Price History Chart
  - Location: `src/components/charts/PriceChart.tsx`
  - Features: Line/Candlestick toggle, Zoom, Pan
  - Timeframes: 1D, 1W, 1M, 3M, 1Y, 5Y

- [ ] **Task 2.1.3:** Add Volume Bars
  - Overlay volume data below price chart
  - Color-coded by price movement

- [ ] **Task 2.1.4:** Fair Value Overlay Line
  - Draw horizontal line at calculated intrinsic value
  - Show "undervalued zone" shading

#### 2.2 Valuation Breakdown Charts

- [ ] **Task 2.2.1:** DCF Waterfall Chart
  - Location: `src/components/charts/DCFWaterfall.tsx`
  - Show: Base FCF → Growth → Terminal Value → Fair Value

- [ ] **Task 2.2.2:** Assumption Impact Tornado Chart
  - Location: `src/components/charts/TornadoChart.tsx`
  - Sensitivity of fair value to each assumption

---

### Phase 3: Technical Analysis Module (Priority: MEDIUM)

#### 3.1 Technical Indicators

- [ ] **Task 3.1.1:** Create Technical Calculations Library
  - Location: `src/lib/technicals.ts`
  - Implement: RSI, MACD, SMA (20, 50, 200), Bollinger Bands

- [ ] **Task 3.1.2:** Technical Indicator Panel
  - Location: `src/components/technicals/IndicatorPanel.tsx`
  - Toggle visibility of indicators on main chart

- [ ] **Task 3.1.3:** Technical Analysis Summary
  - Location: `src/components/technicals/TechnicalSummary.tsx`
  - Aggregate signal: Buy/Sell/Neutral based on indicators

#### 3.2 Pattern Recognition (Optional/Advanced)

- [ ] **Task 3.2.1:** Support/Resistance Line Detection
- [ ] **Task 3.2.2:** Moving Average Crossover Alerts

---

### Phase 4: Sentiment & News (Priority: MEDIUM)

#### 4.1 Sentiment Dashboard

- [ ] **Task 4.1.1:** Create Sentiment Score Component
  - Location: `src/components/sentiment/SentimentScore.tsx`
  - Visual gauge: -100 (Very Bearish) to +100 (Very Bullish)

- [ ] **Task 4.1.2:** News Feed Integration (Optional)
  - Location: `src/components/sentiment/NewsFeed.tsx`
  - API: NewsAPI, Finnhub, or similar
  - Display recent headlines with sentiment tags

- [ ] **Task 4.1.3:** Social Sentiment Indicators
  - Show trending mentions, analyst ratings summary

---

### Phase 5: UX Polish & Performance (Priority: MEDIUM)

#### 5.1 Navigation & Layout

- [ ] **Task 5.1.1:** Create Tab-Based Navigation
  - Location: `src/components/layout/ViewTabs.tsx`
  - Tabs: Valuation | Charts | Technicals | Sentiment

- [ ] **Task 5.1.2:** Responsive Design Audit
  - Ensure all components work on mobile (320px+)
  - Collapsible sidebar for advanced options

- [ ] **Task 5.1.3:** Loading States & Skeletons
  - Add skeleton loaders for API-dependent components

#### 5.2 Animations & Micro-interactions

- [ ] **Task 5.2.1:** Add number counter animations
  - Fair value should animate when assumptions change

- [ ] **Task 5.2.2:** Smooth chart transitions
  - Animate data point changes

- [ ] **Task 5.2.3:** Hover tooltips with detailed info

---

### Phase 6: Advanced Features (Priority: LOW)

#### 6.1 Watchlist & Portfolio

- [ ] **Task 6.1.1:** Local Storage Watchlist
  - Location: `src/stores/watchlistStore.ts`
  - Add/remove tickers, persist to localStorage

- [ ] **Task 6.1.2:** Watchlist Dashboard Component
  - Location: `src/components/dashboard/Watchlist.tsx`
  - Quick-view of all watched stocks with mini metrics

#### 6.2 Export & Share

- [ ] **Task 6.2.1:** Export Valuation to PDF
  - Use html2canvas + jsPDF

- [ ] **Task 6.2.2:** Copy Shareable Link
  - Encode assumptions in URL query params

#### 6.3 Monte Carlo Simulation (Advanced)

- [ ] **Task 6.3.1:** Web Worker for Simulation
  - Location: `src/workers/monteCarloWorker.ts`
  - Run 10,000 simulations with random assumption variations

- [ ] **Task 6.3.2:** Probability Distribution Chart
  - Show likelihood distribution of fair values

---

## 5. File Structure (Target)

```
src/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── charts/
│   │   ├── PriceChart.tsx
│   │   ├── FCFProjectionChart.tsx
│   │   ├── DCFWaterfall.tsx
│   │   └── TornadoChart.tsx
│   ├── dashboard/
│   │   ├── KeyMetrics.tsx
│   │   └── Watchlist.tsx
│   ├── layout/
│   │   ├── TickerSearch.tsx
│   │   └── ViewTabs.tsx
│   ├── sentiment/
│   │   ├── SentimentScore.tsx
│   │   └── NewsFeed.tsx
│   ├── technicals/
│   │   ├── IndicatorPanel.tsx
│   │   └── TechnicalSummary.tsx
│   ├── valuation/
│   │   ├── ModelSelector.tsx
│   │   └── SensitivityTable.tsx
│   ├── TickerHeader.tsx
│   ├── ValuationControls.tsx
│   └── ValuationResult.tsx
├── hooks/
│   ├── useStockData.ts
│   └── useDebounce.ts
├── lib/
│   ├── valuation.ts           # DCF engine (existing)
│   ├── ddm.ts                 # DDM engine
│   └── technicals.ts          # Technical indicators
├── services/
│   └── stockApi.ts            # API integration
├── stores/
│   ├── dashboardStore.ts      # (existing)
│   ├── valuationStore.ts      # (existing)
│   └── watchlistStore.ts
├── types/
│   └── valuation.ts           # (existing)
└── workers/
    └── monteCarloWorker.ts
```

---

## 6. Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 15 | React framework with App Router |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **State** | Zustand + Immer | Lightweight state management |
| **Charts** | Recharts | React charting library |
| **Data Fetching** | SWR or TanStack Query | Caching & revalidation |
| **API** | Financial Modeling Prep | Stock data (free tier) |
| **Animations** | Framer Motion (optional) | Micro-animations |

---

## 7. API Integration Plan

### Primary: Financial Modeling Prep (FMP)

**Free Tier Limits:** 250 requests/day

| Endpoint | Purpose |
|----------|---------|
| `/api/v3/quote/{symbol}` | Real-time quote |
| `/api/v3/profile/{symbol}` | Company profile |
| `/api/v3/income-statement/{symbol}` | Revenue, Net Income |
| `/api/v3/cash-flow-statement/{symbol}` | Free Cash Flow |
| `/api/v3/historical-price-full/{symbol}` | Historical prices |
| `/api/v3/search?query={term}` | Ticker search |

### Alternative: Alpha Vantage (Backup)

---

## 8. Milestones & Timeline

| Milestone | Target | Deliverables |
|-----------|--------|--------------|
| **M1: Core Valuation Complete** | Week 1 | DDM model, Model selector, Sensitivity table |
| **M2: Charts Integrated** | Week 2 | Price chart, FCF projection, Volume bars |
| **M3: API Connected** | Week 3 | Live stock data, Ticker search |
| **M4: Technical Analysis** | Week 4 | RSI, MACD, Moving averages |
| **M5: Polish & Launch** | Week 5 | Animations, Mobile responsive, Error handling |

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | High | Implement caching, fallback to demo data |
| Chart performance | Medium | Use virtualization, limit data points |
| Mobile UX | Medium | Progressive enhancement, priority features |
| Scope creep | High | Strict adherence to phase priorities |

---

## 10. Success Metrics

- [ ] **Performance:** Lighthouse score > 90
- [ ] **Responsiveness:** Works on 320px+ screens
- [ ] **Accuracy:** DCF/DDM calculations verified against Excel model
- [ ] **Usability:** New user can calculate fair value in < 30 seconds

---

## 11. Next Immediate Actions

1. **Install Recharts** for charting capabilities
2. **Create ModelSelector component** to switch between DCF and DDM
3. **Implement DDM calculation** in `src/lib/ddm.ts`
4. **Build SensitivityTable** to show WACC vs Growth matrix

---

*This plan is a living document and will be updated as development progresses.*
