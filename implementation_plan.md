# Implementation Plan - Desktop Expense and Investment Tracker

We will build a high-performance, strictly local Desktop Expense and Investment Tracker using Electron, React, Vite, TypeScript, SQLite, Framer Motion, and Tailwind CSS. The app will default to Indian Rupees (INR - ₹) and include rich animations and charts.

---

## User Review Required

> [!IMPORTANT]
> **Native SQLite Compilation**
> We will use `better-sqlite3` as requested. Native modules require compilation for Electron. We will configure `electron-rebuild` to automate this process. If there are compile issues on Windows (due to missing build tools like MSVC/Python), we will fall back to standard `sqlite3` or troubleshoot dependencies.

> [!IMPORTANT]
> **Backup & Restore Reloading**
> When restoring database state from a ZIP archive, the frontend state must be hot-reloaded safely. We will implement an Electron application reload (`mainWindow.reload()`) after restoring the SQLite database file to reset the application state.

---

## Open Questions

- *Are there specific default categories or sub-categories you want pre-populated besides standard ones (Food, Rent, Salary, Stocks, Mutual Funds, etc.)?*
- *Do you want the Backup/Restore system to encrypt the ZIP archive with a password, or should it remain a simple, unencrypted ZIP for ease of migration?*

---

## Proposed Changes

### Project Structure

We will create a clean modular setup in the empty directory:

```
d:\Github\expense_tracker\
├── package.json                    # Project dependencies and script definitions
├── tsconfig.json                   # General TypeScript configurations
├── tsconfig.electron.json          # Main process TS compiler config
├── vite.config.ts                  # Vite config for compiling React code
├── postcss.config.js               # CSS processing
├── tailwind.config.js              # Theme and responsive dark mode config
├── index.html                      # Entry point for browser/renderer
└── src/
    ├── main/                       # Electron Main Process & Native Node
    │   ├── index.ts                # Main process bootstrapper
    │   ├── db.ts                   # SQLite manager (better-sqlite3 queries)
    │   └── preload.ts              # IPC Bridge definition
    └── renderer/                   # React Frontend
        ├── index.css               # Design system & dark variables
        ├── main.tsx                # React entry
        ├── App.tsx                 # Core UI Shell, Routing, and Page control
        ├── components/             # Components
        │   ├── Dashboard.tsx       # Live charts, animated net worth, cards
        │   ├── Transactions.tsx    # Transaction list, filter controls, CRUD modals
        │   ├── Investments.tsx     # Portfolio distribution, asset editor
        │   ├── Settings.tsx        # Data management (Backup / Restore)
        │   ├── Sidebar.tsx         # Sleek left sidebar navigation
        │   ├── StatCard.tsx        # Animated numerical value cards
        │   └── Toast.tsx           # Context-based custom toast provider
        ├── hooks/
        │   └── useDatabase.ts      # Abstracted database React state and hook
        └── utils/
            └── format.ts           # INR formatting, dates, math helper utilities
```

---

### Component Details

#### [NEW] [package.json](file:///d:/Github/expense_tracker/package.json)
Contains core dependencies.
- **Dependencies:** `react`, `react-dom`, `better-sqlite3`, `lucide-react`, `recharts`, `framer-motion`, `adm-zip`, `clsx`, `tailwind-merge`.
- **Dev Dependencies:** `electron`, `electron-rebuild`, `vite`, `@vitejs/plugin-react`, `typescript`, `concurrently`, `wait-on`, `tailwindcss`, `autoprefixer`, `postcss`, `@types/react`, `@types/react-dom`, `@types/better-sqlite3`, `@types/adm-zip`.

#### [NEW] [db.ts](file:///d:/Github/expense_tracker/src/main/db.ts)
Creates and manages the SQLite tables. It opens/stores the database file in standard local application data:
`path.join(app.getPath('userData'), 'tracker.db')`
Provides the following tables:
- **`transactions`**: `id`, `date`, `amount`, `type` (income/expense/investment), `category`, `subcategory`, `note`, `created_at`
- **`investments`**: `id`, `asset_name`, `asset_type` (Stocks/Mutual Funds/FD/Crypto/Gold), `invested_amount`, `current_value`, `last_updated`
- **`categories`**: `id`, `name`, `type` (income/expense/investment), `icon`, `color`

#### [NEW] [preload.ts](file:///d:/Github/expense_tracker/src/main/preload.ts)
Exposes the SQLite query interface and File System dialogs securely via `contextBridge`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // DB IPC calls
  getTransactions: (filters?: any) => ipcRenderer.invoke('db:get-transactions', filters),
  addTransaction: (tx: any) => ipcRenderer.invoke('db:add-transaction', tx),
  updateTransaction: (id: number, tx: any) => ipcRenderer.invoke('db:update-transaction', id, tx),
  deleteTransaction: (id: number) => ipcRenderer.invoke('db:delete-transaction', id),
  
  getInvestments: () => ipcRenderer.invoke('db:get-investments'),
  addInvestment: (inv: any) => ipcRenderer.invoke('db:add-investment', inv),
  updateInvestment: (id: number, inv: any) => ipcRenderer.invoke('db:update-investment', id, inv),
  deleteInvestment: (id: number) => ipcRenderer.invoke('db:delete-investment', id),
  
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  getStats: () => ipcRenderer.invoke('db:get-stats'),

  // Backup & Restore
  backupData: () => ipcRenderer.invoke('sys:backup'),
  restoreData: () => ipcRenderer.invoke('sys:restore')
});
```

#### [NEW] [index.css](file:///d:/Github/expense_tracker/src/renderer/index.css) & [tailwind.config.js](file:///d:/Github/expense_tracker/tailwind.config.js)
Sets up Tailwind dark mode design. Base background: `#0d0f12`, text color: `#f3f4f6`, accent: Emerald green (`#10b981`) and deep Indigo (`#6366f1`).
Includes custom animations for glassmorphic elements and buttons.

#### [NEW] [Dashboard.tsx](file:///d:/Github/expense_tracker/src/renderer/components/Dashboard.tsx)
Features:
- Staggered dashboard widgets (Framer Motion).
- Net Worth widget with rolling animation.
- Recharts animated Donut chart for categories.
- Recharts curved Line chart for Income vs Expense.
- Investment Asset Allocation details (visualizing split in mutual funds, stocks, crypto, cash).

#### [NEW] [Settings.tsx](file:///d:/Github/expense_tracker/src/renderer/components/Settings.tsx)
Features:
- "Backup Database" button: calls Electron save dialog, compresses `tracker.db` to `.zip` via `adm-zip`, saves it locally.
- "Restore Database" button: prompts for ZIP upload, extracts `.db`, replaces the SQLite file, triggers client window reload.

---

## Verification Plan

### Automated Tests
- Since this is a local desktop application, we will verify compiling and running it directly.
- Command to run in dev mode: `npm run dev`
- Verify compiling: `npm run build`

### Manual Verification
- **Aesthetics & Animations**: Launch application, verify Dark Mode colors, hover transitions, modal entry/exit, dashboard entry stagger.
- **Transaction CRUD**: Create an Income, an Expense, and an Investment transaction. Verify they appear in lists and charts immediately.
- **Portfolio tracking**: Create/edit assets and verify total Net Worth and asset distribution chart updates dynamically.
- **Backup & Restore**:
  1. Add transactions.
  2. Backup database via Settings and save ZIP to Desktop.
  3. Delete/add other records to change state.
  4. Restore database using the ZIP.
  5. Verify the state resets back to the original backup data after the automatic UI reload.
