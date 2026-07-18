import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Transactions
  getTransactions: (filters?: any) => ipcRenderer.invoke('db:get-transactions', filters),
  addTransaction: (tx: any) => ipcRenderer.invoke('db:add-transaction', tx),
  updateTransaction: (id: number, tx: any) => ipcRenderer.invoke('db:update-transaction', id, tx),
  deleteTransaction: (id: number) => ipcRenderer.invoke('db:delete-transaction', id),

  // Categories & Stats
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  addCategory: (cat: any) => ipcRenderer.invoke('db:add-category', cat),
  updateCategory: (id: number, cat: any) => ipcRenderer.invoke('db:update-category', id, cat),
  deleteCategory: (id: number) => ipcRenderer.invoke('db:delete-category', id),
  getStats: (range?: string) => ipcRenderer.invoke('db:get-stats', range),

  // Budgets & Recurring Bills
  getBudgets: (monthYear?: string) => ipcRenderer.invoke('db:get-budgets', monthYear),
  setBudget: (categoryId: number, amount: number, monthYear?: string) => ipcRenderer.invoke('db:set-budget', categoryId, amount, monthYear),
  getRecurringBills: () => ipcRenderer.invoke('db:get-recurring-bills'),
  addRecurringBill: (bill: any) => ipcRenderer.invoke('db:add-recurring-bill', bill),
  toggleBillPaidStatus: (id: number) => ipcRenderer.invoke('db:toggle-bill-paid-status', id),

  // Goals & Wishlist
  getGoals: () => ipcRenderer.invoke('db:get-goals'),
  addGoal: (goal: any) => ipcRenderer.invoke('db:add-goal', goal),
  updateGoal: (id: number, goal: any) => ipcRenderer.invoke('db:update-goal', id, goal),
  deleteGoal: (id: number) => ipcRenderer.invoke('db:delete-goal', id),
  openExternalLink: (url: string) => ipcRenderer.invoke('sys:open-external-link', url),

  // Backup & Restore
  backupDatabase: (password: string) => ipcRenderer.invoke('sys:backup', password),
  restoreDatabase: (filePath: string, password: string) => ipcRenderer.invoke('sys:restore', filePath, password),
  selectBackupFile: () => ipcRenderer.invoke('sys:select-backup-file'),

  // Software Updates
  checkForUpdates: () => ipcRenderer.invoke('sys:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('sys:download-update'),
  quitAndInstall: () => ipcRenderer.send('sys:quit-and-install'),
  onUpdateStatus: (callback: (status: string) => void) => {
    const subscription = (_event: any, status: string) => callback(status);
    ipcRenderer.on('update:status', subscription);
    return () => ipcRenderer.off('update:status', subscription);
  },
  onUpdateAvailable: (callback: (available: boolean, version?: string) => void) => {
    const subscription = (_event: any, available: boolean, version?: string) => callback(available, version);
    ipcRenderer.on('update:available', subscription);
    return () => ipcRenderer.off('update:available', subscription);
  },
  onUpdateDownloaded: (callback: (ready: boolean) => void) => {
    const subscription = (_event: any, ready: boolean) => callback(ready);
    ipcRenderer.on('update:downloaded', subscription);
    return () => ipcRenderer.off('update:downloaded', subscription);
  }
});
