import { useState, useEffect, useCallback, useRef } from 'react';

// TypeScript Interfaces for DB entities
export interface Transaction {
  id: number;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  note?: string;
  created_at: string;
}

export interface Goal {
  id: number;
  title: string;
  target_amount: number;
  current_allocated: number;
  target_date?: string | null;
  isCompleted: boolean;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface DashboardStats {
  liquidBalance: number;
  totalIncome: number;
  totalExpense: number;
  categoryExpenses: { category: string; value: number }[];
  monthlyTrends: { month: string; income: number; outflow: number }[];
  liquidBalanceTrends: { month: string; value: number }[];
  budgetSummary?: BudgetSummary[];
}

export interface BudgetSummary {
  category_id: number;
  category_name: string;
  category_type: string;
  icon: string;
  color: string;
  budget_amount: number | null;
  actual_amount: number;
  remaining_amount: number | null;
  is_over_budget: number;
}

export interface Budget {
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
}

export interface RecurringBill {
  id: number;
  title: string;
  amount: number;
  due_date: string;
  frequency: 'monthly' | 'yearly' | 'weekly';
  is_paid: boolean;
}

// Typing for the Electron contextBridge API
declare global {
  interface Window {
    api: {
      getTransactions: (filters?: {
        startDate?: string;
        endDate?: string;
        type?: string;
        category?: string;
      }) => Promise<Transaction[]>;
      addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
      updateTransaction: (id: number, tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
      deleteTransaction: (id: number) => Promise<{ id: number }>;

      getCategories: () => Promise<Category[]>;
      addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
      updateCategory: (id: number, cat: Omit<Category, 'id'>) => Promise<Category>;
      deleteCategory: (id: number) => Promise<{ id: number }>;
      getStats: (range?: string) => Promise<DashboardStats>;

      getBudgets: (monthYear?: string) => Promise<Budget[]>;
      setBudget: (categoryId: number, amount: number, monthYear?: string) => Promise<any>;
      getRecurringBills: () => Promise<RecurringBill[]>;
      addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => Promise<RecurringBill>;
      toggleBillPaidStatus: (id: number) => Promise<{ id: number; is_paid: boolean } | null>;

      getGoals: () => Promise<Goal[]>;
      addGoal: (goal: Omit<Goal, 'id' | 'isCompleted'>) => Promise<Goal>;
      updateGoal: (id: number, goal: Omit<Goal, 'id' | 'isCompleted'>) => Promise<Goal>;
      deleteGoal: (id: number) => Promise<{ id: number }>;

      backupDatabase: (password: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      selectBackupFile: () => Promise<{ canceled: boolean; filePath?: string }>;
      restoreDatabase: (filePath: string, password: string) => Promise<{ success: boolean; error?: string }>;

      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall: () => void;
      onUpdateStatus: (callback: (status: string) => void) => () => void;
      onUpdateAvailable: (callback: (available: boolean, version?: string) => void) => () => void;
      onUpdateDownloaded: (callback: (ready: boolean) => void) => () => void;
    };
  }
}

function getCurrentMonthYear() {
  return new Date().toISOString().slice(0, 7);
}

export function useDatabase() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>('6M');
  const [budgetMonthYear, setBudgetMonthYear] = useState<string>(getCurrentMonthYear());
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
  }>({});

  // Use refs to avoid stale closures in mutation functions
  const filtersRef = useRef(filters);
  const rangeRef = useRef(range);
  const budgetMonthYearRef = useRef(budgetMonthYear);
  const fetchVersionRef = useRef(0);

  // Keep refs in sync with state
  filtersRef.current = filters;
  rangeRef.current = range;
  budgetMonthYearRef.current = budgetMonthYear;

  const refreshData = useCallback(async () => {
    const version = ++fetchVersionRef.current;

    try {
      setLoading(true);

      // Fetch each dataset independently so one failure doesn't block all
      let txData: Transaction[] | null = null;
      let catData: Category[] | null = null;
      let statsData: DashboardStats | null = null;
      let goalsData: Goal[] | null = null;
      let budgetData: Budget[] | null = null;
      let recurringBillData: RecurringBill[] | null = null;

      try {
        txData = await window.api.getTransactions(filtersRef.current);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      }

      try {
        catData = await window.api.getCategories();
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }

      try {
        statsData = await window.api.getStats(rangeRef.current);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }

      try {
        goalsData = await window.api.getGoals();
      } catch (err) {
        console.error('Failed to fetch goals:', err);
      }

      try {
        budgetData = await window.api.getBudgets(budgetMonthYearRef.current);
      } catch (err) {
        console.error('Failed to fetch budgets:', err);
      }

      try {
        recurringBillData = await window.api.getRecurringBills();
      } catch (err) {
        console.error('Failed to fetch recurring bills:', err);
      }

      // Only apply state if this is still the latest fetch (prevents stale overwrites)
      if (version === fetchVersionRef.current) {
        if (txData !== null) setTransactions(txData);
        if (catData !== null) setCategories(catData);
        if (statsData !== null) setStats(statsData);
        if (goalsData !== null) setGoals(goalsData);
        if (budgetData !== null) setBudgets(budgetData);
        if (recurringBillData !== null) setRecurringBills(recurringBillData);
      }
    } finally {
      if (version === fetchVersionRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Re-fetch when filters or range change
  const prevFiltersRef = useRef(filters);
  const prevRangeRef = useRef(range);

  useEffect(() => {
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    const rangeChanged = prevRangeRef.current !== range;

    if (filtersChanged || rangeChanged) {
      prevFiltersRef.current = filters;
      prevRangeRef.current = range;
      refreshData();
    }
  }, [filters, range, refreshData]);

  // All mutations use refs to call the latest refreshData, avoiding stale closures
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const result = await window.api.addTransaction(tx);
    await refreshData();
    return result;
  };

  const updateTransaction = async (id: number, tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const result = await window.api.updateTransaction(id, tx);
    await refreshData();
    return result;
  };

  const deleteTransaction = async (id: number) => {
    const result = await window.api.deleteTransaction(id);
    await refreshData();
    return result;
  };

  const addCategory = async (cat: Omit<Category, 'id'>) => {
    const result = await window.api.addCategory(cat);
    await refreshData();
    return result;
  };

  const updateCategory = async (id: number, cat: Omit<Category, 'id'>) => {
    const result = await window.api.updateCategory(id, cat);
    await refreshData();
    return result;
  };

  const deleteCategory = async (id: number) => {
    const result = await window.api.deleteCategory(id);
    await refreshData();
    return result;
  };

  const setBudget = async (categoryId: number, amount: number, monthYear?: string) => {
    const result = await window.api.setBudget(categoryId, amount, monthYear || budgetMonthYearRef.current);
    await refreshData();
    return result;
  };

  const addRecurringBill = async (bill: Omit<RecurringBill, 'id'>) => {
    const result = await window.api.addRecurringBill(bill);
    await refreshData();
    return result;
  };

  const toggleBillPaidStatus = async (id: number) => {
    const result = await window.api.toggleBillPaidStatus(id);
    await refreshData();
    return result;
  };

  const addGoal = async (goal: Omit<Goal, 'id' | 'isCompleted'>) => {
    const result = await window.api.addGoal(goal);
    await refreshData();
    return result;
  };

  const updateGoal = async (id: number, goal: Omit<Goal, 'id' | 'isCompleted'>) => {
    const result = await window.api.updateGoal(id, goal);
    await refreshData();
    return result;
  };

  const deleteGoal = async (id: number) => {
    const result = await window.api.deleteGoal(id);
    await refreshData();
    return result;
  };

  return {
    transactions,
    categories,
    stats,
    goals,
    budgets,
    recurringBills,
    loading,
    filters,
    setFilters,
    refreshData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    setBudget,
    addRecurringBill,
    toggleBillPaidStatus,
    addGoal,
    updateGoal,
    deleteGoal,
    range,
    setRange,
    budgetMonthYear,
    setBudgetMonthYear
  };
}
