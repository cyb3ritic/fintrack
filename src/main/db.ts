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

  // 3. Budgeting & Recurring Bill Tables
  const schemaTransaction = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        month_year TEXT NOT NULL,
        UNIQUE(category_id, month_year)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS recurring_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        frequency TEXT CHECK(frequency IN ('monthly', 'yearly', 'weekly')) DEFAULT 'monthly',
        is_paid INTEGER DEFAULT 0
      )
    `);
  });
  schemaTransaction();

  // 4. Financial Goals Table (cleansed: no linked_asset_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_allocated REAL DEFAULT 0,
      target_date TEXT,
      hyperlink TEXT
    )
  `);

  // Remove linked_asset_id from goals if present and ensure hyperlink column exists
  let goalColumns = db.prepare("PRAGMA table_info(financial_goals)").all() as { name: string }[];
  if (goalColumns.some(col => col.name === 'linked_asset_id')) {
    db.exec(`
      CREATE TABLE goals_new AS SELECT id, title, target_amount, current_allocated, target_date, NULL as hyperlink FROM financial_goals;
      DROP TABLE financial_goals;
      ALTER TABLE goals_new RENAME TO financial_goals;
    `);
    goalColumns = db.prepare("PRAGMA table_info(financial_goals)").all() as { name: string }[];
  }

  if (!goalColumns.some(col => col.name === 'hyperlink')) {
    db.exec(`ALTER TABLE financial_goals ADD COLUMN hyperlink TEXT;`);
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
// BUDGETS CRUD
// ----------------------------------------------------

export function getBudgets(monthYear?: string) {
  const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

  return db.prepare(`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.type AS category_type,
      c.icon,
      c.color,
      b.id AS budget_id,
      b.amount AS budget_amount,
      b.month_year,
      COALESCE(actual.actual_amount, 0) AS actual_amount,
      CASE
        WHEN b.amount IS NULL THEN 0
        ELSE b.amount - COALESCE(actual.actual_amount, 0)
      END AS remaining_amount,
      CASE
        WHEN b.amount IS NULL THEN 0
        ELSE CASE WHEN COALESCE(actual.actual_amount, 0) > b.amount THEN 1 ELSE 0 END
      END AS is_over_budget
    FROM categories c
    LEFT JOIN budgets b
      ON b.category_id = c.id AND b.month_year = ?
    LEFT JOIN (
      SELECT category, SUM(amount) AS actual_amount
      FROM transactions
      WHERE type = 'expense' AND substr(date, 1, 7) = ?
      GROUP BY category
    ) actual ON actual.category = c.name
    WHERE c.type = 'expense'
    ORDER BY c.name ASC
  `).all(targetMonth, targetMonth) as Array<{
    category_id: number;
    category_name: string;
    category_type: string;
    icon: string;
    color: string;
    budget_id: number | null;
    budget_amount: number | null;
    month_year: string;
    actual_amount: number;
    remaining_amount: number;
    is_over_budget: number;
  }>;
}

export function setBudget(categoryId: number, amount: number, monthYear?: string) {
  const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

  const execute = db.transaction(() => {
    const existing = db.prepare('SELECT id FROM budgets WHERE category_id = ? AND month_year = ?').get(categoryId, targetMonth) as { id: number } | undefined;

    if (existing) {
      db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(amount, existing.id);
    } else {
      db.prepare('INSERT INTO budgets (category_id, amount, month_year) VALUES (?, ?, ?)').run(categoryId, amount, targetMonth);
    }

    return db.prepare('SELECT * FROM budgets WHERE category_id = ? AND month_year = ?').get(categoryId, targetMonth) as { id: number; category_id: number; amount: number; month_year: string };
  });

  return execute();
}

// ----------------------------------------------------
// RECURRING BILLS CRUD
// ----------------------------------------------------

export function getRecurringBills() {
  return db.prepare('SELECT * FROM recurring_bills ORDER BY due_date ASC, id ASC').all() as Array<{
    id: number;
    title: string;
    amount: number;
    due_date: string;
    frequency: string;
    is_paid: number;
  }>;
}

export function addRecurringBill(bill: {
  title: string;
  amount: number;
  due_date: string;
  frequency?: 'monthly' | 'yearly' | 'weekly';
  is_paid?: boolean;
}) {
  const stmt = db.prepare(`
    INSERT INTO recurring_bills (title, amount, due_date, frequency, is_paid)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    bill.title,
    bill.amount,
    bill.due_date,
    bill.frequency || 'monthly',
    bill.is_paid ? 1 : 0
  );

  return { id: Number(result.lastInsertRowid), ...bill, is_paid: Boolean(bill.is_paid) };
}

export function toggleBillPaidStatus(id: number) {
  const existing = db.prepare('SELECT * FROM recurring_bills WHERE id = ?').get(id) as { id: number; is_paid: number } | undefined;

  if (!existing) {
    return null;
  }

  const nextStatus = existing.is_paid === 1 ? 0 : 1;
  db.prepare('UPDATE recurring_bills SET is_paid = ? WHERE id = ?').run(nextStatus, id);

  return { id, is_paid: nextStatus === 1 };
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
  hyperlink?: string | null;
}) {
  const stmt = db.prepare(`
    INSERT INTO financial_goals (title, target_amount, current_allocated, target_date, hyperlink)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    goal.title,
    goal.target_amount,
    goal.current_allocated || 0,
    goal.target_date || null,
    goal.hyperlink || null
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
    hyperlink?: string | null;
  }
) {
  db.prepare(`
    UPDATE financial_goals
    SET title = ?, target_amount = ?, current_allocated = ?, target_date = ?, hyperlink = ?
    WHERE id = ?
  `).run(
    goal.title,
    goal.target_amount,
    goal.current_allocated || 0,
    goal.target_date || null,
    goal.hyperlink || null,
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
  const currentMonthYear = new Date().toISOString().slice(0, 7);

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

  const budgetSummary = db.prepare(`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.type AS category_type,
      c.icon,
      c.color,
      b.amount AS budget_amount,
      COALESCE(actual.actual_amount, 0) AS actual_amount,
      CASE
        WHEN b.amount IS NULL THEN NULL
        ELSE b.amount - COALESCE(actual.actual_amount, 0)
      END AS remaining_amount,
      CASE
        WHEN b.amount IS NULL THEN 0
        ELSE CASE WHEN COALESCE(actual.actual_amount, 0) > b.amount THEN 1 ELSE 0 END
      END AS is_over_budget
    FROM categories c
    LEFT JOIN budgets b
      ON b.category_id = c.id AND b.month_year = ?
    LEFT JOIN (
      SELECT category, SUM(amount) AS actual_amount
      FROM transactions
      WHERE type = 'expense' AND substr(date, 1, 7) = ?
      GROUP BY category
    ) actual ON actual.category = c.name
    WHERE c.type = 'expense'
    ORDER BY c.name ASC
  `).all(currentMonthYear, currentMonthYear) as Array<{
    category_id: number;
    category_name: string;
    category_type: string;
    icon: string;
    color: string;
    budget_amount: number | null;
    actual_amount: number;
    remaining_amount: number | null;
    is_over_budget: number;
  }>;

  return {
    liquidBalance,
    totalIncome: income,
    totalExpense: expense,
    categoryExpenses,
    monthlyTrends,
    liquidBalanceTrends: getHistoricLiquidBalance(range),
    budgetSummary
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
