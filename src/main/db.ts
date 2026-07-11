import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'tracker.db');

  // Ensure directories exist
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Migration 1: Remove UNIQUE constraint from investments.asset_name if present
  const investmentsTableCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='investments'").get() as { sql: string } | undefined;
  if (investmentsTableCheck && investmentsTableCheck.sql.includes('UNIQUE')) {
    console.log('Running migration: Removing UNIQUE constraint from investments.asset_name');
    db.pragma('foreign_keys = OFF');
    db.exec(`
      ALTER TABLE investments RENAME TO investments_old;
      
      CREATE TABLE investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_name TEXT NOT NULL,
        asset_type TEXT NOT NULL CHECK(asset_type IN ('Stocks', 'Mutual Funds', 'Fixed Deposits', 'Crypto', 'Gold')),
        invested_amount REAL NOT NULL,
        current_value REAL NOT NULL,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      INSERT INTO investments (id, asset_name, asset_type, invested_amount, current_value, last_updated)
      SELECT id, asset_name, asset_type, invested_amount, current_value, last_updated FROM investments_old;
      
      DROP TABLE investments_old;
    `);
    db.pragma('foreign_keys = ON');
  }

  // Migration 2: Add asset_id column to transactions if missing
  const transactionsTableCheck = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'").get() as { sql: string } | undefined;
  if (transactionsTableCheck) {
    const txColumns = db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[];
    if (!txColumns.some(col => col.name === 'asset_id')) {
      console.log('Running migration: Adding asset_id column to transactions');
      db.exec(`
        ALTER TABLE transactions ADD COLUMN asset_id INTEGER REFERENCES investments(id) ON DELETE SET NULL;
      `);
    }
    if (!txColumns.some(col => col.name === 'activity_type')) {
      console.log('Running migration: Adding activity_type column to transactions');
      db.exec(`
        ALTER TABLE transactions ADD COLUMN activity_type TEXT DEFAULT 'none';
      `);
      db.exec(`
        UPDATE transactions SET activity_type = 'buy' WHERE type = 'investment';
      `);
    }
  }

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
      asset_id INTEGER REFERENCES investments(id) ON DELETE SET NULL,
      activity_type TEXT CHECK(activity_type IN ('buy', 'sell', 'dividend', 'none')) DEFAULT 'none',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Investments Table (tracks assets and current valuations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_name TEXT NOT NULL,
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

  // 4. Investment History Table (tracks valuation history)
  db.exec(`
    CREATE TABLE IF NOT EXISTS investment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investment_id INTEGER REFERENCES investments(id) ON DELETE CASCADE,
      invested_amount REAL NOT NULL,
      current_value REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Financial Goals Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_allocated REAL DEFAULT 0,
      target_date TEXT,
      linked_asset_id INTEGER REFERENCES investments(id) ON DELETE SET NULL
    )
  `);

  // Seeding: if history table is empty but investments has records, seed initial values
  const historyCount = db.prepare('SELECT COUNT(*) as count FROM investment_history').get() as { count: number };
  if (historyCount.count === 0) {
    const activeInvestments = db.prepare('SELECT id, invested_amount, current_value FROM investments').all() as { id: number; invested_amount: number; current_value: number }[];
    if (activeInvestments.length > 0) {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const insertHistory = db.prepare(`
        INSERT INTO investment_history (investment_id, invested_amount, current_value, date)
        VALUES (?, ?, ?, ?)
      `);
      const trans = db.transaction(() => {
        for (const inv of activeInvestments) {
          insertHistory.run(inv.id, inv.invested_amount, inv.current_value, todayStr);
        }
      });
      trans();
    }
  }

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

// Helper to resolve transaction asset balance multipliers
export function getInvestmentMultiplier(type: string, activityType?: string): number {
  if (type !== 'investment') return 0;
  const act = activityType || 'buy';
  if (act === 'buy') return 1;
  if (act === 'sell') return -1;
  return 0; // dividend or none
}

// Helper to record investment history with daily local calendar day idempotency (check-then-write/upsert)
export function recordInvestmentHistory(investmentId: number, investedAmount: number, currentValue: number, customDate?: string) {
  let dateStr: string;
  if (customDate) {
    dateStr = customDate;
  } else {
    const d = new Date();
    dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const checkStmt = db.prepare('SELECT id FROM investment_history WHERE investment_id = ? AND date = ?');
  const existing = checkStmt.get(investmentId, dateStr) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE investment_history SET invested_amount = ?, current_value = ? WHERE id = ?')
      .run(investedAmount, currentValue, existing.id);
  } else {
    db.prepare('INSERT INTO investment_history (investment_id, invested_amount, current_value, date) VALUES (?, ?, ?, ?)')
      .run(investmentId, investedAmount, currentValue, dateStr);
  }
}

// Helper to update investment valuations and track its history in one atomic go
export function adjustAssetAndRecordHistory(assetId: number, investedDelta: number, valueDelta: number, customDate?: string) {
  db.prepare(`
    UPDATE investments
    SET invested_amount = invested_amount + ?,
        current_value = current_value + ?,
        last_updated = datetime('now')
    WHERE id = ?
  `).run(investedDelta, valueDelta, assetId);

  const updated = db.prepare('SELECT invested_amount, current_value FROM investments WHERE id = ?').get(assetId) as { invested_amount: number; current_value: number } | undefined;
  if (updated) {
    recordInvestmentHistory(assetId, updated.invested_amount, updated.current_value, customDate);
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
  asset_id?: number | null;
  activity_type?: 'buy' | 'sell' | 'dividend' | 'none';
}) {
  const stmt = db.prepare(`
    INSERT INTO transactions (date, amount, type, category, subcategory, note, asset_id, activity_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const execute = db.transaction(() => {
    const actType = tx.type === 'investment' ? (tx.activity_type || 'buy') : 'none';
    const result = stmt.run(
      tx.date,
      tx.amount,
      tx.type,
      tx.category,
      tx.subcategory || null,
      tx.note || null,
      tx.asset_id || null,
      actType
    );

    const mult = getInvestmentMultiplier(tx.type, actType);
    const delta = tx.amount * mult;
    if (tx.asset_id && delta !== 0) {
      adjustAssetAndRecordHistory(tx.asset_id, delta, delta, tx.date);
    } else if (tx.asset_id) {
      const asset = db.prepare('SELECT invested_amount, current_value FROM investments WHERE id = ?').get(tx.asset_id) as { invested_amount: number; current_value: number } | undefined;
      if (asset) {
        recordInvestmentHistory(tx.asset_id, asset.invested_amount, asset.current_value, tx.date);
      }
    }
    return result.lastInsertRowid;
  });

  const lastId = execute();
  return { id: lastId, ...tx };
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
    asset_id?: number | null;
    activity_type?: 'buy' | 'sell' | 'dividend' | 'none';
  }
) {
  const getTx = db.prepare('SELECT date, amount, type, asset_id, activity_type FROM transactions WHERE id = ?');
  const updateTx = db.prepare(`
    UPDATE transactions
    SET date = ?, amount = ?, type = ?, category = ?, subcategory = ?, note = ?, asset_id = ?, activity_type = ?
    WHERE id = ?
  `);

  const execute = db.transaction(() => {
    const oldTx = getTx.get(id) as { date: string; amount: number; type: string; asset_id: number | null; activity_type: string } | undefined;
    const actType = tx.type === 'investment' ? (tx.activity_type || 'buy') : 'none';

    if (oldTx) {
      const oldAssetId = oldTx.asset_id;
      const newAssetId = tx.asset_id || null;

      // 1. Revert old asset adjustment
      if (oldAssetId) {
        const oldMult = getInvestmentMultiplier(oldTx.type, oldTx.activity_type);
        const oldDelta = oldTx.amount * oldMult;
        if (oldDelta !== 0) {
          adjustAssetAndRecordHistory(oldAssetId, -oldDelta, -oldDelta, oldTx.date);
        }
      }

      // 2. Apply new asset adjustment
      if (newAssetId) {
        const newMult = getInvestmentMultiplier(tx.type, actType);
        const newDelta = tx.amount * newMult;
        if (newDelta !== 0) {
          adjustAssetAndRecordHistory(newAssetId, newDelta, newDelta, tx.date);
        } else {
          const asset = db.prepare('SELECT invested_amount, current_value FROM investments WHERE id = ?').get(newAssetId) as { invested_amount: number; current_value: number } | undefined;
          if (asset) {
            recordInvestmentHistory(newAssetId, asset.invested_amount, asset.current_value, tx.date);
          }
        }
      }

      // 3. Keep histories aligned in case of Date shifts
      if (oldTx.date !== tx.date && oldAssetId && oldAssetId === newAssetId) {
        const asset = db.prepare('SELECT invested_amount, current_value FROM investments WHERE id = ?').get(oldAssetId) as { invested_amount: number; current_value: number } | undefined;
        if (asset) {
          recordInvestmentHistory(oldAssetId, asset.invested_amount, asset.current_value, oldTx.date);
        }
      }
    }

    updateTx.run(
      tx.date,
      tx.amount,
      tx.type,
      tx.category,
      tx.subcategory || null,
      tx.note || null,
      tx.asset_id || null,
      actType,
      id
    );
  });

  execute();
  return { id, ...tx };
}

export function deleteTransaction(id: number) {
  const getTx = db.prepare('SELECT date, amount, type, asset_id, activity_type FROM transactions WHERE id = ?');
  const deleteTx = db.prepare('DELETE FROM transactions WHERE id = ?');

  const execute = db.transaction(() => {
    const oldTx = getTx.get(id) as { date: string; amount: number; type: string; asset_id: number | null; activity_type: string } | undefined;
    if (oldTx && oldTx.asset_id) {
      const oldMult = getInvestmentMultiplier(oldTx.type, oldTx.activity_type);
      const oldDelta = oldTx.amount * oldMult;
      if (oldDelta !== 0) {
        adjustAssetAndRecordHistory(oldTx.asset_id, -oldDelta, -oldDelta, oldTx.date);
      } else {
        const asset = db.prepare('SELECT invested_amount, current_value FROM investments WHERE id = ?').get(oldTx.asset_id) as { invested_amount: number; current_value: number } | undefined;
        if (asset) {
          recordInvestmentHistory(oldTx.asset_id, asset.invested_amount, asset.current_value, oldTx.date);
        }
      }
    }
    deleteTx.run(id);
  });

  execute();
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
  
  const execute = db.transaction(() => {
    const result = stmt.run(inv.asset_name, inv.asset_type, inv.invested_amount, inv.current_value);
    const lastId = result.lastInsertRowid;
    recordInvestmentHistory(Number(lastId), inv.invested_amount, inv.current_value);
    return lastId;
  });

  const lastId = execute();
  return { id: lastId, ...inv };
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

  const execute = db.transaction(() => {
    stmt.run(inv.asset_name, inv.asset_type, inv.invested_amount, inv.current_value, id);
    recordInvestmentHistory(id, inv.invested_amount, inv.current_value);
  });

  execute();
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

export function addCategory(cat: {
  name: string;
  type: 'income' | 'expense' | 'investment';
  icon: string;
  color: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO categories (name, type, icon, color)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(cat.name, cat.type, cat.icon, cat.color);
  return { id: result.lastInsertRowid, ...cat };
}

export function updateCategory(
  id: number,
  cat: {
    name: string;
    type: 'income' | 'expense' | 'investment';
    icon: string;
    color: string;
  }
) {
  const getCategory = db.prepare('SELECT name FROM categories WHERE id = ?');
  const oldCat = getCategory.get(id) as { name: string } | undefined;

  const execute = db.transaction(() => {
    if (oldCat && oldCat.name !== cat.name) {
      db.prepare('UPDATE transactions SET category = ? WHERE category = ?').run(cat.name, oldCat.name);
    }
    db.prepare(`
      UPDATE categories
      SET name = ?, type = ?, icon = ?, color = ?
      WHERE id = ?
    `).run(cat.name, cat.type, cat.icon, cat.color, id);
  });

  execute();
  return { id, ...cat };
}

export function deleteCategory(id: number) {
  const getCategory = db.prepare('SELECT name, type FROM categories WHERE id = ?');
  const cat = getCategory.get(id) as { name: string; type: string } | undefined;
  
  if (cat) {
    const execute = db.transaction(() => {
      db.prepare("UPDATE transactions SET category = 'Uncategorized' WHERE category = ?").run(cat.name);
      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    });
    execute();
  }
  return { id };
}

// ----------------------------------------------------
// FINANCIAL GOALS CRUD
// ----------------------------------------------------

export function getGoals() {
  const goals = db.prepare('SELECT * FROM financial_goals ORDER BY target_date ASC, id ASC').all() as any[];
  
  return goals.map((goal) => {
    let current_allocated = goal.current_allocated;
    
    if (goal.linked_asset_id) {
      const asset = db.prepare('SELECT current_value FROM investments WHERE id = ?').get(goal.linked_asset_id) as { current_value: number } | undefined;
      if (asset) {
        current_allocated = asset.current_value;
      }
    }
    
    const isCompleted = current_allocated >= goal.target_amount;
    
    return {
      ...goal,
      current_allocated,
      isCompleted,
    };
  });
}

export function addGoal(goal: {
  title: string;
  target_amount: number;
  current_allocated: number;
  target_date?: string | null;
  linked_asset_id?: number | null;
}) {
  const stmt = db.prepare(`
    INSERT INTO financial_goals (title, target_amount, current_allocated, target_date, linked_asset_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    goal.title,
    goal.target_amount,
    goal.current_allocated || 0,
    goal.target_date || null,
    goal.linked_asset_id || null
  );
  return { id: result.lastInsertRowid, ...goal };
}

export function updateGoal(
  id: number,
  goal: {
    title: string;
    target_amount: number;
    current_allocated: number;
    target_date?: string | null;
    linked_asset_id?: number | null;
  }
) {
  const stmt = db.prepare(`
    UPDATE financial_goals
    SET title = ?, target_amount = ?, current_allocated = ?, target_date = ?, linked_asset_id = ?
    WHERE id = ?
  `);
  stmt.run(
    goal.title,
    goal.target_amount,
    goal.current_allocated || 0,
    goal.target_date || null,
    goal.linked_asset_id || null,
    id
  );
  return { id, ...goal };
}

export function deleteGoal(id: number) {
  db.prepare('DELETE FROM financial_goals WHERE id = ?').run(id);
  return { id };
}

// ----------------------------------------------------
// STATISTICS & DASHBOARD DATA
// ----------------------------------------------------

export function getRangeSpecs(range: string = '6M'): {
  type: 'daily' | 'monthly';
  count: number;
} {
  switch (range) {
    case '1M':
      return { type: 'daily', count: 30 };
    case '3M':
      return { type: 'monthly', count: 3 };
    case '6M':
      return { type: 'monthly', count: 6 };
    case '1Y':
      return { type: 'monthly', count: 12 };
    case 'ALL': {
      const oldestData = db.prepare(`
        SELECT MIN(date) as oldestDate FROM (
          SELECT MIN(date) as date FROM transactions
          UNION
          SELECT MIN(date) as date FROM investment_history
        )
      `).get() as { oldestDate: string | null };
      
      let months = 6;
      if (oldestData?.oldestDate) {
        const oldest = new Date(oldestData.oldestDate);
        const today = new Date();
        months = (today.getFullYear() - oldest.getFullYear()) * 12 + (today.getMonth() - oldest.getMonth()) + 1;
      }
      return { type: 'monthly', count: Math.max(1, months) };
    }
    default:
      return { type: 'monthly', count: 6 };
  }
}

export function getStats(range = '6M') {
  // 1. Calculate Cash Flow
  // Cash = Income - Expense - Investment (outflows)
  const cashFlow = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense,
      SUM(CASE WHEN type = 'investment' AND activity_type = 'buy' THEN amount 
               WHEN type = 'investment' AND activity_type = 'sell' THEN -amount
               ELSE 0 END) as totalInvestmentOutflow
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

  // 4. Monthly trends (Income vs Expense) based on range selection
  const specs = getRangeSpecs(range);
  const monthlyTrends: { month: string; income: number; expense: number }[] = [];

  if (specs.type === 'daily') {
    for (let i = specs.count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const displayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      
      const dayData = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as inc,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as exp
        FROM transactions
        WHERE date = ?
      `).get(dateStr) as { inc: number | null; exp: number | null };

      monthlyTrends.push({
        month: displayLabel,
        income: dayData.inc || 0,
        expense: dayData.exp || 0
      });
    }
  } else {
    for (let i = specs.count - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;
      
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
    assetAllocation,
    netWorthTrends: getHistoricNetWorth(range)
  };
}

export function getHistoricNetWorthAtDate(dateStr: string): number {
  // 1. Calculate cumulative cash at dateStr
  const cashData = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) -
      SUM(CASE WHEN type = 'investment' AND activity_type = 'buy' THEN amount 
               WHEN type = 'investment' AND activity_type = 'sell' THEN -amount
               ELSE 0 END) as cumulativeCash
    FROM transactions
    WHERE date <= ?
  `).get(dateStr) as { cumulativeCash: number | null };
  const cumulativeCash = cashData?.cumulativeCash || 0;

  // 2. Calculate cumulative current valuation of all investments at dateStr
  const activeInvestments = db.prepare('SELECT id FROM investments').all() as { id: number }[];
  let totalInvestmentValue = 0;
  for (const inv of activeInvestments) {
    const hist = db.prepare(`
      SELECT current_value 
      FROM investment_history 
      WHERE investment_id = ? AND date <= ?
      ORDER BY date DESC, id DESC 
      LIMIT 1
    `).get(inv.id, dateStr) as { current_value: number } | undefined;
    if (hist) {
      totalInvestmentValue += hist.current_value;
    }
  }

  return cumulativeCash + totalInvestmentValue;
}

export function getHistoricNetWorth(range = '6M'): { month: string; value: number }[] {
  const specs = getRangeSpecs(range);
  const netWorthTrends: { month: string; value: number }[] = [];

  if (specs.type === 'daily') {
    for (let i = specs.count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const displayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const netWorth = getHistoricNetWorthAtDate(dateStr);
      netWorthTrends.push({ month: displayLabel, value: netWorth });
    }
  } else {
    for (let i = specs.count - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const dateStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      
      const displayMonth = lastDay.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const netWorth = getHistoricNetWorthAtDate(dateStr);
      netWorthTrends.push({ month: displayMonth, value: netWorth });
    }
  }
  return netWorthTrends;
}
