# FinanceHub

**FinanceHub** is a privacy-first, executive-grade personal wealth and cash flow platform engineered purely with modern frontend technologies. Built as an installable Progressive Web App (PWA) with zero backend dependencies, FinanceHub stores all financial records exclusively inside your device's browser storage while delivering high-density analytics, interactive Chart.js visualizations, and native-feeling mobile ergonomics.

---

## Key Features

### 1. Executive Overview
- **Real-Time Financial KPIs**: Live Net Worth, 30-Day Net Cash Flow, Savings Rate (vs. target benchmark), and Liquid Runway in months — formatted with tabular monospace numerals (`JetBrains Mono`) and Indian Rupee (`₹` / `INR`) as the default reporting currency with Lakhs (`L`) and Crores (`Cr`) compact notation.
- **Net Worth & Cash Flow Trajectory**: Interactive **Chart.js** multi-series area/line chart with instant `Net Worth` vs. `Cash Flow` mode switching and `30D`, `90D`, `6M`, and `1Y` timeframes.
- **Asset Allocation Doughnut**: Live distribution across Equities & ETFs, Treasury & Yield, Private & Venture, and Operating Cash.
- **Recent Ledger & Budget Pulse**: Quick-tap transaction inspection and rolling 30-day category envelope utilization.

### 2. Cash Flow Ledger
- Full **CRUD** transaction management (Income, Expense, Transfer) that automatically reconciles linked account balances in real time.
- **Live Filtering & Sorting**: Search by merchant, memo, or account; filter by transaction type, category, and account; sort by Date or Amount.
- **Native Mobile Entry Sheet**: Slide-up bottom sheet on mobile (`>= 44px` touch targets, quick-amount presets) and centered modal on desktop.
- **One-Click CSV Export**: Generates and downloads clean `.csv` ledger exports client-side.

### 3. Budgets & Spending Limits
- Rolling 30-day actual spend computed live from recorded ledger entries.
- **Chart.js Planned vs. Actual Bar Chart** highlighting status thresholds (`Within Limit`, `Approaching Limit`, `Over Budget`).
- Create, edit, and remove monthly category spending envelopes effortlessly.

### 4. Accounts & Wealth Goals
- **Local Accounts**: Track Checking, Treasury, Brokerage, Private Capital, and Credit Liabilities with optional APY tracking.
- **Wealth Milestones**: Track capital accumulation targets with estimated completion timelines and a one-tap **+ Contribute** workflow that updates progress and logs the transfer.

### 5. Analytics & Wealth Compounding Simulator
- **Interactive Compounding Model**: Adjust Monthly Allocation, Expected Annual Yield (%), and Compounding Horizon (years) to simulate Conservative, Base Case, and Growth trajectories live on a **Chart.js** curve.
- **12-Month Inflow vs. Outflow Bar Chart** and **Expense Concentration Doughnut** for deeper fiscal visibility.

### 6. Privacy Vault & PWA Capabilities
- **100% Local-First Privacy**: Zero cloud databases, zero third-party APIs, zero authentication gates, and zero telemetry. Displays real-time `localStorage` footprint in KB.
- **Data Portability**: Full JSON vault export, schema-validated JSON backup restore, executive sample dataset reset, and confirmed local wipe.
- **Executive Privacy Mask**: One-tap balance obfuscation (`₹••••••`) for viewing finances in public spaces.
- **Multi-Currency & Dual-Theme**: Defaults to **Indian Rupee (`INR ₹`)** with instant switching across `USD`, `EUR`, `GBP`, `CHF`, and `JPY`, plus **Obsidian Dark** and **Porcelain Light** themes.
- **Installable Offline PWA**: Complete Web App Manifest, Workbox service worker precaching, PNG & maskable app icons (including iOS `apple-touch-icon`), in-app **Install App** prompt (with iOS Safari instructions), and automatic **Offline Mode** status indicator.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **UI Framework** | React 19 + TypeScript |
| **Build & Bundling** | Vite 8 with `React.lazy` route-level code splitting & isolated `chart-vendor` chunking |
| **Styling** | Tailwind CSS v4 (`@custom-variant dark`), Plus Jakarta Sans + DM Sans + JetBrains Mono |
| **Data Visualization** | Chart.js (tree-shaken module registration) |
| **Persistence** | Browser `localStorage` (`financehub_v1_state`) with portable JSON & CSV import/export |
| **Offline & Installability** | `vite-plugin-pwa` (Workbox `generateSW`, runtime Google Fonts caching, Web App Manifest) |
| **Icons** | Lucide React + custom vector PNG/SVG app icons |

---

## Project Structure

```text
├── public/
│   ├── icon.svg                     # Brand vector mark
│   ├── apple-touch-icon.png         # 180x180 iOS Safari home screen icon
│   ├── pwa-192x192.png              # Standard PWA icon (192x192)
│   ├── pwa-512x512.png              # High-res PWA icon (512x512)
│   └── pwa-maskable-512x512.png     # Android adaptive maskable icon (16% safe zone)
├── src/
│   ├── components/
│   │   ├── charts/ChartCanvas.tsx   # Tree-shaken Chart.js lifecycle wrapper
│   │   ├── modals/TransactionSheet.tsx # Mobile bottom sheet / desktop modal
│   │   └── pwa/
│   │       ├── PWAInstallButton.tsx # Chromium prompt + iOS Safari guide
│   │       └── OfflineIndicator.tsx # Non-intrusive offline connectivity banner
│   ├── context/FinanceContext.tsx   # LocalStorage state store, CRUD & derived KPIs
│   ├── data/seedData.ts             # Executive sample dataset (INR default)
│   ├── hooks/
│   │   ├── usePWAInstall.ts         # beforeinstallprompt & standalone mode hook
│   │   └── useOnlineStatus.ts       # Online/offline navigator hook
│   ├── types/finance.ts             # Domain TypeScript interfaces
│   ├── utils/format.ts              # Currency (INR Cr/L), date, and CSV utilities
│   ├── views/
│   │   ├── OverviewView.tsx         # Eagerly loaded executive command center
│   │   ├── LedgerView.tsx           # Lazy-loaded cash flow ledger
│   │   ├── BudgetsView.tsx          # Lazy-loaded budget envelopes & bar chart
│   │   ├── GoalsView.tsx            # Lazy-loaded accounts & wealth milestones
│   │   ├── AnalyticsView.tsx        # Lazy-loaded compounding simulator & analytics
│   │   └── VaultView.tsx            # Lazy-loaded privacy controls, backup & PWA settings
│   ├── App.tsx                      # Responsive shell (desktop sidebar + mobile bottom nav)
│   ├── index.css                    # Tailwind v4 dark custom variant & typography tokens
│   └── main.tsx                     # App entry & PWA service worker registration
├── index.html                       # SEO meta, PWA tags, fonts & flash-free theme script
├── vite.config.ts                   # VitePWA manifest, Workbox caching & chunk splitting
└── README.md                        # Project documentation & changelog
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation & Development
```bash
# Install dependencies
npm install

# Start the local development server on port 3000
npm run dev
```

### Production Build & Type Check
```bash
# Run TypeScript type checking
npm run lint

# Build optimized production bundle with PWA service worker
npm run build

# Preview production build locally
npm run preview
```

---

## Privacy & Local Storage Schema

All data is stored locally under the `financehub_v1_state` key in `window.localStorage`:
- `accounts`: Array of local accounts (Checking, Treasury, Brokerage, Private, Credit)
- `transactions`: Array of ledger entries linked to accounts
- `budgets`: Monthly spending envelope limits per expense category
- `goals`: Capital accumulation targets and contributions
- `history`: Monthly net worth and cash flow snapshots
- `settings`: Theme (`dark` / `light`), reporting currency (`INR` default), privacy mask toggle, and income target

Use **Privacy Vault → Export JSON** at any time to download a complete local backup, and **Import JSON** to restore across browsers or devices.

---

## Changelog

### Latest Update
- Removed the `v1.0` version suffix across branding, document titles, PWA manifest, and UI copy for continuous web app delivery.
- Set **Indian Rupee (`INR ₹`)** as the default reporting currency with native Lakhs (`L`) and Crores (`Cr`) compact notation and automatic migration for existing local sessions.
- Added comprehensive `README.md` documentation covering architecture, features, local storage schema, and workflows.

### Initial Release
- Launched **FinanceHub** with Executive Overview, Cash Flow Ledger, Budgets & Limits, Accounts & Wealth Goals, Analytics & Wealth Compounding Simulator, and Privacy Vault.
- Implemented native-feeling mobile bottom navigation, slide-up bottom sheets, dual Dark/Light themes, Chart.js data visualizations, LocalStorage persistence, and full offline PWA support.
