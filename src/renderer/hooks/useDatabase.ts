import { useState, useEffect, useCallback } from 'react';

// TypeScript Interfaces for DB entities
export interface Transaction {
  id: number;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  category: string;
  subcategory?: string;
  note?: string;
  created_at: string;
}

export interface Investment {
  id: number;
  asset_name: string;
  asset_type: 'Stocks' | 'Mutual Funds' | 'Fixed Deposits' | 'Crypto' | 'Gold';
  invested_amount: number;
  current_value: number;
  last_updated: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'investment';
  icon: string;
  color: string;
}

export interface DashboardStats {
  netWorth: number;
  cash: number;
  totalInvested: number;
  currentInvestmentValue: number;
  categoryExpenses: { category: string; value: number }[];
  monthlyTrends: { month: string; income: number; expense: number }[];
  assetAllocation: { type: string; value: number }[];
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
      
      getInvestments: () => Promise<Investment[]>;
      addInvestment: (inv: Omit<Investment, 'id' | 'last_updated'>) => Promise<Investment>;
      updateInvestment: (id: number, inv: Omit<Investment, 'id' | 'last_updated'>) => Promise<Investment>;
      deleteInvestment: (id: number) => Promise<{ id: number }>;
      
      getCategories: () => Promise<Category[]>;
      getStats: () => Promise<DashboardStats>;
      
      backupDatabase: (password: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      selectBackupFile: () => Promise<{ canceled: boolean; filePath?: string }>;
      restoreDatabase: (filePath: string, password: string) => Promise<{ success: boolean; error?: string }>;
      
      authenticate: () => Promise<{ success: boolean; error?: string }>;
      isDatabaseLocked: () => Promise<boolean>;
      
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall: () => Promise<void>;
      onUpdateStatus: (callback: (status: string) => void) => () => void;
      onUpdateAvailable: (callback: (available: boolean, version?: string) => void) => () => void;
      onUpdateDownloaded: (callback: (ready: boolean) => void) => () => void;
    };
  }
}

export function useDatabase() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
  }>({});

  const refreshData = useCallback(async () => {
    try {
      const isLocked = await window.api.isDatabaseLocked();
      if (isLocked) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [txData, invData, catData, statsData] = await Promise.all([
        window.api.getTransactions(filters),
        window.api.getInvestments(),
        window.api.getCategories(),
        window.api.getStats()
      ]);
      setTransactions(txData);
      setInvestments(invData);
      setCategories(catData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load database content:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Transaction mutations
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

  // Investment mutations
  const addInvestment = async (inv: Omit<Investment, 'id' | 'last_updated'>) => {
    const result = await window.api.addInvestment(inv);
    await refreshData();
    return result;
  };

  const updateInvestment = async (id: number, inv: Omit<Investment, 'id' | 'last_updated'>) => {
    const result = await window.api.updateInvestment(id, inv);
    await refreshData();
    return result;
  };

  const deleteInvestment = async (id: number) => {
    const result = await window.api.deleteInvestment(id);
    await refreshData();
    return result;
  };

  return {
    transactions,
    investments,
    categories,
    stats,
    loading,
    filters,
    setFilters,
    refreshData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInvestment,
    updateInvestment,
    deleteInvestment
  };
}
