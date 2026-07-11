# FinTrack 📊

FinTrack is a secure, local-first, offline-first desktop application designed for personal finance tracking and budgeting. Developed by **cyb3ritic**, it combines the security of fully offline SQLite database vaults with modern visual analytics, automated software updates via GitHub, and encrypted data backups.

---

## ✨ Key Features

- **📊 Comprehensive Financial Dashboard**: Visual analytics showing real-time cash flow, monthly trends, and expense breakdowns utilizing dynamic charts.
- **💸 Ledger Transaction Tracking**: Track and categorize transactions across income and expenses with advanced filtering (by type, category, date).
- **🔒 AES-256-GCM Encrypted Backups**: Export your offline vault into a secure, password-encrypted archive (`.enc`) and restore it seamlessly at any time.
- **🚀 GitHub Auto-Updates**: Integrated updater that checks for remote versions on GitHub, downloads releases in the background, and prompts for seamless, automated installs.
- **🎨 Premium Dark Theme**: A responsive user interface featuring glassmorphic layout components, custom calendars, and clean visual indicators.

---

## 🛠️ Technology Stack

- **Core Framework**: [Electron](https://www.electronjs.org/) (for packaging native desktop applications)
- **Frontend Architecture**: [React](https://react.dev/), TypeScript, [Vite](https://vite.dev/) (renderer module)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (fluid layouts and responsive styles)
- **Database Engine**: [SQLite](https://sqlite.org/) via `better-sqlite3` (configured with Write-Ahead Logging for high durability)
- **Data Compression & Encryption**: `adm-zip` and Node's native `crypto` modules
- **Visualizations**: [Recharts](https://recharts.org/) (for interactive financial graphs)
- **Packaging/Installer compilation**: `electron-builder` with customized NSIS script templates

---

## 🚀 Getting Started

### Prerequisites

To set up and run FinTrack locally, make sure you have [Node.js](https://nodejs.org/) (v18+) installed.

### Installation & Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/cyb3ritic/fintrack.git
   cd fintrack
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   This command starts the local Vite dev server and launches the Electron application with hot-reloading:
   ```bash
   npm run dev
   ```

---

## 📦 Packaging & Standalone Executables

FinTrack builds an interactive installer setup executable (`.exe`) for Windows using `electron-builder` and custom NSIS macros.

### Build and Package:
- **Compile and package the standalone setup installer**:
  ```bash
  npm run dist
  ```
  The installer will be generated inside the `dist-pack` folder:
  - Output binary: `dist-pack/FinTrack Setup 1.0.0.exe`

- **Build and package raw unpacked files (local debug executable)**:
  ```bash
  npm run pack
  ```
  The unpacked executables will be generated under `dist-pack/win-unpacked/FinTrack.exe`.

---

## 🛡️ Security & Privacy

FinTrack operates under a **local-first philosophy**:
- **Zero Cloud Storage**: All records of your cash flow, categories, transactions, and portfolio valuations are written directly to a local database file (`tracker.db`) on your physical device.
- **Encryption Standards**: Database backups are compressed into a ZIP buffer in memory, encrypted using **AES-256-GCM** key derivation via PBKDF2 with a user-defined password, and saved directly to the chosen storage directory.
- **No Residual Mismatch**: Database restoration automatically purges transient SQLite WAL and SHM journal files before applying the clean restore state to prevent internal recovery corruption.

---

## 👥 Authors

- **cyb3ritic** - *Developer & Creator* - [GitHub](https://github.com/cyb3ritic)
