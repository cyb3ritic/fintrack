import Database from 'better-sqlite3-multiple-ciphers';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

function migratePlaintextToEncrypted(dbPath: string, key: string): void {
  if (!fs.existsSync(dbPath)) {
    return;
  }

  let isPlaintext = false;
  let tempDb: Database.Database | null = null;
  try {
    // Try to open the database file without any encryption key
    tempDb = new Database(dbPath);
    // Execute a query to see if we can read the schema
    tempDb.prepare("SELECT name FROM sqlite_master LIMIT 1").get();
    isPlaintext = true;
  } catch (err) {
    // If it throws an error (e.g. "file is not a database"), it is already encrypted or corrupt
    isPlaintext = false;
  } finally {
    if (tempDb) {
      tempDb.close();
    }
  }

  if (isPlaintext) {
    console.log("Detecting unencrypted v1.0.0 database. Upgrading to encrypted v2.0.0...");
    const tempEncryptedPath = dbPath + '_encrypted';

    if (fs.existsSync(tempEncryptedPath)) {
      fs.unlinkSync(tempEncryptedPath);
    }

    try {
      const plaintextDb = new Database(dbPath);
      // Flush WAL journal into the main DB file and delete log files cleanly before migration
      plaintextDb.pragma('journal_mode = DELETE');

      const escapedEncryptedPath = tempEncryptedPath.replace(/'/g, "''");
      const escapedKey = key.replace(/'/g, "''");

      plaintextDb.exec(`ATTACH DATABASE '${escapedEncryptedPath}' AS encrypted KEY '${escapedKey}'`);
      plaintextDb.exec("SELECT sqlcipher_export('encrypted')");
      plaintextDb.exec("DETACH DATABASE encrypted");
      plaintextDb.close();

      // Replace the plaintext database with the new encrypted version
      fs.unlinkSync(dbPath);
      fs.renameSync(tempEncryptedPath, dbPath);
      console.log("Database encryption migration completed successfully.");
    } catch (migrationError) {
      console.error("Failed to migrate unencrypted database to SQLCipher:", migrationError);
      if (fs.existsSync(tempEncryptedPath)) {
        try { fs.unlinkSync(tempEncryptedPath); } catch {}
      }
      throw migrationError;
    }
  }
}

export function openSecureDatabase(key: string) {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'tracker.db');

  // Ensure directories exist
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // Handle unencrypted database upgrade if necessary
  migratePlaintextToEncrypted(dbPath, key);

  // Open the database using the multiple ciphers library
  db = new Database(dbPath, { verbose: console.log });

  // Apply the database encryption key
  db.pragma(`key = '${key}'`);
  db.pragma('journal_mode = WAL');

  // Initialize table schema and seeds
  initializeTables();
}

export function isDatabaseUnlocked(): boolean {
  return !!db;
}

function initializeTables() {
  // 1. Transactions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment')),
      category TEXT NOT NULL,
      subcategory TEXT,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Investments Table (tracks assets and current valuations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_name TEXT NOT NULL UNIQUE,
      asset_type TEXT NOT NULL CHECK(asset_type IN ('Stocks', 'Mutual Funds', 'Fixed Deposits', 'Crypto', 'Gold')),
      invested_amount REAL NOT NULL,
      current_value REAL NOT NULL,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);

  // Populate Default Categories if empty
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare(`
      INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)
    `);

    const defaultCategories = [
      // Income
      ['Salary', 'income', 'Briefcase', '#6366f1'],
      ['Freelance/Bounty Income', 'income', 'Terminal', '#10b981'],
      ['Investments Returns', 'income', 'TrendingUp', '#059669'],
      
      // Expense
      ['Food', 'expense', 'Utensils', '#f43f5e'],
      ['Rent', 'expense', 'Home', '#e11d48'],
      ['Utilities', 'expense', 'Zap', '#d97706'],
      ['Subscriptions', 'expense', 'Tv', '#8b5cf6'],
      ['Shopping', 'expense', 'ShoppingBag', '#ec4899'],
      ['Travel/Transport', 'expense', 'Car', '#0ea5e9'],
      ['Health/Medical', 'expense', 'HeartPulse', '#10b981'],
      
      // Investment type transactions (buying assets)
      ['Stocks Purchase', 'investment', 'TrendingUp', '#3b82f6'],
      ['Mutual Funds Purchase', 'investment', 'Layers', '#06b6d4'],
      ['Fixed Deposits Deposit', 'investment', 'Lock', '#f59e0b'],
      ['Crypto Purchase', 'investment', 'Coins', '#f59e0b'],
      ['Gold Purchase', 'investment', 'CircleDot', '#fbbf24']
    ];

    const transaction = db.transaction(() => {
      for (const cat of defaultCategories) {
        insertCategory.run(cat[0], cat[1], cat[2], cat[3]);
      }
    });
    transaction();
  }
}

// Get the raw DB path for backup/restore purposes
export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'tracker.db');
}

// Back up live database safely to a target file path
export async function backupDatabase(destPath: string): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  await db.backup(destPath);
}

// Close the DB connection (important during restore)
export function closeDatabase() {
  if (db) {
    db.close();
  }
}

// ----------------------------------------------------
// TRANSACTIONS CRUD
// ----------------------------------------------------

export function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];

  if (filters?.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  if (filters?.type && filters.type !== 'all') {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters?.category && filters.category !== 'all') {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  query += ' ORDER BY date DESC, id DESC';
  return db.prepare(query).all(...params);
}

export function addTransaction(tx: {
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  category: string;
  subcategory?: string;
  note?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO transactions (date, amount, type, category, subcategory, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(tx.date, tx.amount, tx.type, tx.category, tx.subcategory || null, tx.note || null);
  return { id: result.lastInsertRowid, ...tx };
}

export function updateTransaction(
  id: number,
  tx: {
    date: string;
    amount: number;
    type: 'income' | 'expense' | 'investment';
    category: string;
    subcategory?: string;
    note?: string;
  }
) {
  const stmt = db.prepare(`
    UPDATE transactions
    SET date = ?, amount = ?, type = ?, category = ?, subcategory = ?, note = ?
    WHERE id = ?
  `);
  stmt.run(tx.date, tx.amount, tx.type, tx.category, tx.subcategory || null, tx.note || null, id);
  return { id, ...tx };
}

export function deleteTransaction(id: number) {
  const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
  stmt.run(id);
  return { id };
}

// ----------------------------------------------------
// INVESTMENTS CRUD
// ----------------------------------------------------

export function getInvestments() {
  return db.prepare('SELECT * FROM investments ORDER BY current_value DESC').all();
}

export function addInvestment(inv: {
  asset_name: string;
  asset_type: 'Stocks' | 'Mutual Funds' | 'Fixed Deposits' | 'Crypto' | 'Gold';
  invested_amount: number;
  current_value: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO investments (asset_name, asset_type, invested_amount, current_value, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(inv.asset_name, inv.asset_type, inv.invested_amount, inv.current_value);
  return { id: result.lastInsertRowid, ...inv };
}

export function updateInvestment(
  id: number,
  inv: {
    asset_name: string;
    asset_type: 'Stocks' | 'Mutual Funds' | 'Fixed Deposits' | 'Crypto' | 'Gold';
    invested_amount: number;
    current_value: number;
  }
) {
  const stmt = db.prepare(`
    UPDATE investments
    SET asset_name = ?, asset_type = ?, invested_amount = ?, current_value = ?, last_updated = datetime('now')
    WHERE id = ?
  `);
  stmt.run(inv.asset_name, inv.asset_type, inv.invested_amount, inv.current_value, id);
  return { id, ...inv };
}

export function deleteInvestment(id: number) {
  const stmt = db.prepare('DELETE FROM investments WHERE id = ?');
  stmt.run(id);
  return { id };
}

// ----------------------------------------------------
// CATEGORIES
// ----------------------------------------------------

export function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
}

// ----------------------------------------------------
// STATISTICS & DASHBOARD DATA
// ----------------------------------------------------

export function getStats() {
  // 1. Calculate Cash Flow
  // Cash = Income - Expense - Investment (outflows)
  const cashFlow = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense,
      SUM(CASE WHEN type = 'investment' THEN amount ELSE 0 END) as totalInvestmentOutflow
    FROM transactions
  `).get() as { totalIncome: number | null; totalExpense: number | null; totalInvestmentOutflow: number | null };

  const income = cashFlow.totalIncome || 0;
  const expense = cashFlow.totalExpense || 0;
  const invOutflow = cashFlow.totalInvestmentOutflow || 0;
  const cash = income - expense - invOutflow;

  // 2. Portfolio Valuation
  const portfolio = db.prepare(`
    SELECT 
      SUM(invested_amount) as totalInvested,
      SUM(current_value) as totalCurrentValue
    FROM investments
  `).get() as { totalInvested: number | null; totalCurrentValue: number | null };

  const totalInvested = portfolio.totalInvested || 0;
  const currentInvestmentValue = portfolio.totalCurrentValue || 0;

  // Total Net Worth = Cash + Current value of portfolio
  const netWorth = cash + currentInvestmentValue;

  // 3. Category distribution (Expenses only, for Donut Chart)
  const categoryExpenses = db.prepare(`
    SELECT category, SUM(amount) as value
    FROM transactions
    WHERE type = 'expense'
    GROUP BY category
    ORDER BY value DESC
  `).all() as { category: string; value: number }[];

  // 4. Monthly trends (Last 6 months Income vs Expense)
  // Let's generate a list of the last 6 months in format YYYY-MM
  const monthlyTrends: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().substring(0, 7); // 'YYYY-MM'
    
    // Format month for display (e.g. 'Jan 2026')
    const displayMonth = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    const monthData = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as inc,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as exp
      FROM transactions
      WHERE date LIKE ?
    `).get(`${monthStr}%`) as { inc: number | null; exp: number | null };

    monthlyTrends.push({
      month: displayMonth,
      income: monthData.inc || 0,
      expense: monthData.exp || 0
    });
  }

  // 5. Asset Allocation for investment widget (Stocks, Mutual Funds, FD, Crypto, Gold)
  const assetAllocation = db.prepare(`
    SELECT asset_type as type, SUM(current_value) as value
    FROM investments
    GROUP BY asset_type
  `).all() as { type: string; value: number }[];

  return {
    netWorth,
    cash,
    totalInvested,
    currentInvestmentValue,
    categoryExpenses,
    monthlyTrends,
    assetAllocation
  };
}
