import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'tracker.db');

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Drop legacy investment tables if they exist
  db.exec(`DROP TABLE IF EXISTS investment_history`);
  db.exec(`DROP TABLE IF EXISTS investments`);

  // 1. Transactions Table (cleansed: no linked_asset_id, no activity_type)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      subcategory TEXT,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Remove legacy columns if they exist (safe no-op if absent)
  const txColumns = db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[];
  if (txColumns.some(col => col.name === 'asset_id')) {
    db.exec(`
      CREATE TABLE transactions_new AS SELECT id, date, amount, type, category, subcategory, note, created_at FROM transactions;
      DROP TABLE transactions;
      ALTER TABLE transactions_new RENAME TO transactions;
    `);
  }

  // 2. Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL
    )
  `);

  // 3. Financial Goals Table (cleansed: no linked_asset_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_allocated REAL DEFAULT 0,
      target_date TEXT
    )
  `);

  // Remove linked_asset_id from goals if present
  const goalColumns = db.prepare("PRAGMA table_info(financial_goals)").all() as { name: string }[];
  if (goalColumns.some(col => col.name === 'linked_asset_id')) {
    db.exec(`
      CREATE TABLE goals_new AS SELECT id, title, target_amount, current_allocated, target_date FROM financial_goals;
      DROP TABLE financial_goals;
      ALTER TABLE goals_new RENAME TO financial_goals;
    `);
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

      // Expense
      ['Food', 'expense', 'Utensils', '#f43f5e'],
      ['Rent', 'expense', 'Home', '#e11d48'],
      ['Utilities', 'expense', 'Zap', '#d97706'],
      ['Subscriptions', 'expense', 'Tv', '#8b5cf6'],
      ['Shopping', 'expense', 'ShoppingBag', '#ec4899'],
      ['Travel/Transport', 'expense', 'Car', '#0ea5e9'],
      ['Health/Medical', 'expense', 'HeartPulse', '#10b981'],
    ];

    const transaction = db.transaction(() => {
      for (const cat of defaultCategories) {
        insertCategory.run(cat[0], cat[1], cat[2], cat[3]);
      }
    });
    transaction();
  }
}

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'tracker.db');
}

export async function backupDatabase(destPath: string): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  await db.backup(destPath);
}

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
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  note?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO transactions (date, amount, type, category, subcategory, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    tx.date,
    tx.amount,
    tx.type,
    tx.category,
    tx.subcategory || null,
    tx.note || null
  );

  return { id: Number(result.lastInsertRowid), ...tx };
}

export function updateTransaction(
  id: number,
  tx: {
    date: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    subcategory?: string;
    note?: string;
  }
) {
  db.prepare(`
    UPDATE transactions
    SET date = ?, amount = ?, type = ?, category = ?, subcategory = ?, note = ?
    WHERE id = ?
  `).run(
    tx.date,
    tx.amount,
    tx.type,
    tx.category,
    tx.subcategory || null,
    tx.note || null,
    id
  );

  return { id, ...tx };
}

export function deleteTransaction(id: number) {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return { id };
}

// ----------------------------------------------------
// CATEGORIES CRUD
// ----------------------------------------------------

export function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
}

export function addCategory(cat: {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO categories (name, type, icon, color)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(cat.name, cat.type, cat.icon, cat.color);
  return { id: Number(result.lastInsertRowid), ...cat };
}

export function updateCategory(
  id: number,
  cat: {
    name: string;
    type: 'income' | 'expense';
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
// FINANCIAL GOALS CRUD (manual allocation only)
// ----------------------------------------------------

export function getGoals() {
  const goals = db.prepare('SELECT * FROM financial_goals ORDER BY target_date ASC, id ASC').all() as any[];

  return goals.map((goal) => {
    const isCompleted = goal.current_allocated >= goal.target_amount;
    return { ...goal, isCompleted };
  });
}

export function addGoal(goal: {
  title: string;
  target_amount: number;
  current_allocated: number;
  target_date?: string | null;
}) {
  const stmt = db.prepare(`
    INSERT INTO financial_goals (title, target_amount, current_allocated, target_date)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    goal.title,
    goal.target_amount,
    goal.current_allocated || 0,
    goal.target_date || null
  );
  return { id: Number(result.lastInsertRowid), ...goal };
}

export function updateGoal(
  id: number,
  goal: {
    title: string;
    target_amount: number;
    current_allocated: number;
    target_date?: string | null;
  }
) {
  db.prepare(`
    UPDATE financial_goals
    SET title = ?, target_amount = ?, current_allocated = ?, target_date = ?
    WHERE id = ?
  `).run(
    goal.title,
    goal.target_amount,
    goal.current_allocated || 0,
    goal.target_date || null,
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
        SELECT MIN(date) as oldestDate FROM transactions
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
  // Liquid Balance = Total Income - Total Expenses
  const cashFlow = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
    FROM transactions
  `).get() as { totalIncome: number | null; totalExpense: number | null };

  const income = cashFlow.totalIncome || 0;
  const expense = cashFlow.totalExpense || 0;
  const liquidBalance = income - expense;

  // Category distribution (Expenses only, for Donut Chart)
  const categoryExpenses = db.prepare(`
    SELECT category, SUM(amount) as value
    FROM transactions
    WHERE type = 'expense'
    GROUP BY category
    ORDER BY value DESC
  `).all() as { category: string; value: number }[];

  // Monthly trends (Income vs Outflow)
  const specs = getRangeSpecs(range);
  const monthlyTrends: { month: string; income: number; outflow: number }[] = [];

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
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as out
        FROM transactions
        WHERE date = ?
      `).get(dateStr) as { inc: number | null; out: number | null };

      monthlyTrends.push({
        month: displayLabel,
        income: dayData.inc || 0,
        outflow: dayData.out || 0
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
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as out
        FROM transactions
        WHERE date LIKE ?
      `).get(`${monthStr}%`) as { inc: number | null; out: number | null };

      monthlyTrends.push({
        month: displayMonth,
        income: monthData.inc || 0,
        outflow: monthData.out || 0
      });
    }
  }

  return {
    liquidBalance,
    totalIncome: income,
    totalExpense: expense,
    categoryExpenses,
    monthlyTrends,
    liquidBalanceTrends: getHistoricLiquidBalance(range)
  };
}

export function getHistoricLiquidBalanceAtDate(dateStr: string): number {
  const cashData = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as cumulativeBalance
    FROM transactions
    WHERE date <= ?
  `).get(dateStr) as { cumulativeBalance: number | null };

  return cashData?.cumulativeBalance || 0;
}

export function getHistoricLiquidBalance(range = '6M'): { month: string; value: number }[] {
  const specs = getRangeSpecs(range);
  const trends: { month: string; value: number }[] = [];

  if (specs.type === 'daily') {
    for (let i = specs.count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const displayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const balance = getHistoricLiquidBalanceAtDate(dateStr);
      trends.push({ month: displayLabel, value: balance });
    }
  } else {
    for (let i = specs.count - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const dateStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const displayMonth = lastDay.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const balance = getHistoricLiquidBalanceAtDate(dateStr);
      trends.push({ month: displayMonth, value: balance });
    }
  }
  return trends;
}
