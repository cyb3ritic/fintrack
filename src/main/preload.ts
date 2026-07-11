import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Transactions
  getTransactions: (filters?: any) => ipcRenderer.invoke('db:get-transactions', filters),
  addTransaction: (tx: any) => ipcRenderer.invoke('db:add-transaction', tx),
  updateTransaction: (id: number, tx: any) => ipcRenderer.invoke('db:update-transaction', id, tx),
  deleteTransaction: (id: number) => ipcRenderer.invoke('db:delete-transaction', id),

  // Investments
  getInvestments: () => ipcRenderer.invoke('db:get-investments'),
  addInvestment: (inv: any) => ipcRenderer.invoke('db:add-investment', inv),
  updateInvestment: (id: number, inv: any) => ipcRenderer.invoke('db:update-investment', id, inv),
  deleteInvestment: (id: number) => ipcRenderer.invoke('db:delete-investment', id),

  // Categories & Stats
  getCategories: () => ipcRenderer.invoke('db:get-categories'),
  addCategory: (cat: any) => ipcRenderer.invoke('db:add-category', cat),
  updateCategory: (id: number, cat: any) => ipcRenderer.invoke('db:update-category', id, cat),
  deleteCategory: (id: number) => ipcRenderer.invoke('db:delete-category', id),
  getStats: () => ipcRenderer.invoke('db:get-stats'),

  // Backup & Restore
  backupDatabase: (password: string) => ipcRenderer.invoke('sys:backup', password),
  restoreDatabase: (filePath: string, password: string) => ipcRenderer.invoke('sys:restore', filePath, password),
  selectBackupFile: () => ipcRenderer.invoke('sys:select-backup-file'),

  // Software Updates
  checkForUpdates: () => ipcRenderer.invoke('sys:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('sys:download-update'),
  quitAndInstall: () => ipcRenderer.invoke('sys:quit-and-install'),
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
