import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  DownloadCloud, 
  UploadCloud, 
  RefreshCw, 
  Globe, 
  ChevronDown, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Tag, 
  Settings as SettingsIcon,
  Briefcase,
  Terminal,
  TrendingUp,
  Utensils,
  Home,
  Zap,
  Tv,
  ShoppingBag,
  Car,
  HeartPulse,
  Layers,
  Lock,
  Coins,
  CircleDot,
  FolderOpen
} from 'lucide-react';
import { useToast } from './Toast';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { Category } from '../hooks/useDatabase';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsProps {
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: number, cat: Omit<Category, 'id'>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<{ id: number }>;
}

const COLOR_OPTIONS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#fbbf24', // Gold
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#0ea5e9', // Sky
  '#8b5cf6', // Purple
  '#64748b'  // Slate
];

const ICON_OPTIONS = [
  'Tag', 'Briefcase', 'Terminal', 'TrendingUp', 'Utensils', 'Home', 
  'Zap', 'Tv', 'ShoppingBag', 'Car', 'HeartPulse', 'Layers', 
  'Lock', 'Coins', 'CircleDot', 'FolderOpen'
];

export default function Settings({ categories, addCategory, updateCategory, deleteCategory }: SettingsProps) {
  const { showToast } = useToast();
  const { currency, setCurrency } = useCurrency();

  const [activeSubTab, setActiveSubTab] = useState<'preferences' | 'categories'>('preferences');

  // Backup states
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Restore states
  const [restorePassword, setRestorePassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Update states
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Category Manager states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense' | 'investment',
    icon: 'Tag',
    color: '#6366f1',
  });

  useEffect(() => {
    // Listeners
    const removeStatusListener = window.api.onUpdateStatus((status: string) => {
      if (status === 'checking') {
        setUpdateStatus('Checking for updates...');
      } else if (status === 'available') {
        setUpdateStatus('Update available!');
      } else if (status === 'up-to-date') {
        setUpdateStatus('App is up to date.');
        setIsCheckingUpdate(false);
      } else if (status === 'error') {
        setUpdateStatus('Error checking for updates.');
        setIsCheckingUpdate(false);
      } else if (status.startsWith('downloading:')) {
        const pct = status.split(':')[1];
        setUpdateStatus(`Downloading update: ${pct}%`);
      } else if (status === 'downloaded') {
        setUpdateStatus('Update downloaded. Ready to install.');
        setIsCheckingUpdate(false);
      }
    });

    const removeAvailableListener = window.api.onUpdateAvailable((available: boolean, version?: string) => {
      if (available && version) {
        setNewVersion(version);
        setShowUpdatePrompt(true);
      }
    });

    const removeDownloadedListener = window.api.onUpdateDownloaded((ready: boolean) => {
      if (ready) {
        setIsUpdateReady(true);
      }
    });

    return () => {
      removeStatusListener();
      removeAvailableListener();
      removeDownloadedListener();
    };
  }, []);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('Checking for updates...');
    const result = await window.api.checkForUpdates();
    if (!result.success) {
      setUpdateStatus(`Update check failed: ${result.error}`);
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    await window.api.quitAndInstall();
  };

  const handleStartDownload = async () => {
    setShowUpdatePrompt(false);
    setUpdateStatus('Downloading update...');
    try {
      const result = await window.api.downloadUpdate();
      if (!result.success) {
        setUpdateStatus(`Download failed: ${result.error}`);
        showToast(`Download failed: ${result.error}`, 'error');
      }
    } catch (err: any) {
      setUpdateStatus(`Download error: ${err.message}`);
      showToast(`Download error: ${err.message}`, 'error');
    }
  };

  const handleBackupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!backupPassword) {
      showToast('Please enter a password to encrypt your backup', 'error');
      return;
    }

    if (backupPassword !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    if (backupPassword.length < 4) {
      showToast('Security password should be at least 4 characters long', 'error');
      return;
    }

    try {
      setIsBackingUp(true);
      const result = await window.api.backupDatabase(backupPassword);
      if (result.success) {
        showToast('Local database compressed and encrypted successfully!', 'success');
        setBackupPassword('');
        setConfirmPassword('');
      } else {
        if (result.error !== 'Canceled by user') {
          showToast(`Backup failed: ${result.error}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Backup error: ${err.message}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSelectBackupAndOpenRestore = async () => {
    try {
      const selectResult = await window.api.selectBackupFile();
      if (selectResult.canceled || !selectResult.filePath) {
        return;
      }
      setSelectedBackupPath(selectResult.filePath);
      setRestorePassword('');
      setShowRestoreModal(true);
    } catch (err: any) {
      showToast(`Error selecting backup file: ${err.message}`, 'error');
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restorePassword) {
      showToast('Please enter the decryption password for the backup file', 'error');
      return;
    }

    if (!selectedBackupPath) {
      showToast('No backup file selected', 'error');
      return;
    }

    try {
      setIsRestoring(true);
      const result = await window.api.restoreDatabase(selectedBackupPath, restorePassword);
      if (result.success) {
        showToast('Vault restored successfully!', 'success');
        setShowRestoreModal(false);
        setSelectedBackupPath(null);
        setRestorePassword('');
      } else {
        if (result.error === 'WRONG_PASSWORD') {
          showToast('Failed to decrypt: Incorrect password entered.', 'error');
          setRestorePassword('');
          setTimeout(() => {
            passwordInputRef.current?.focus();
          }, 50);
        } else {
          showToast(`Restore failed: ${result.error}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Restore error: ${err.message}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Category CRUD Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      type: 'expense',
      icon: 'Tag',
      color: '#6366f1',
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
    });
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('Please enter a category name', 'error');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          type: categoryForm.type,
          icon: categoryForm.icon,
          color: categoryForm.color,
        });
        showToast('Category updated successfully!', 'success');
      } else {
        // Prevent duplicate names in categories
        if (categories.some(c => c.name.toLowerCase() === categoryForm.name.trim().toLowerCase())) {
          showToast('A category with this name already exists', 'error');
          return;
        }
        await addCategory({
          name: categoryForm.name.trim(),
          type: categoryForm.type,
          icon: categoryForm.icon,
          color: categoryForm.color,
        });
        showToast('New category added successfully!', 'success');
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      showToast(`Operation failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteCategoryClick = async (cat: Category) => {
    if (cat.name === 'Uncategorized') {
      showToast('The fallback Uncategorized category cannot be deleted.', 'error');
      return;
    }
    
    if (confirm(`Are you sure you want to delete category "${cat.name}"? Active transactions using it will be re-assigned to "Uncategorized".`)) {
      try {
        await deleteCategory(cat.id);
        showToast('Category deleted successfully.', 'success');
      } catch (err: any) {
        showToast(`Deletion failed: ${err.message}`, 'error');
      }
    }
  };

  // Helper to resolve icon by string representation
  const renderCategoryIcon = (iconName: string, color: string) => {
    const iconComponents: Record<string, any> = {
      Tag, Briefcase, Terminal, TrendingUp, Utensils, Home, 
      Zap, Tv, ShoppingBag, Car, HeartPulse, Layers, 
      Lock, Coins, CircleDot, FolderOpen
    };
    const Component = iconComponents[iconName] || Tag;
    return <Component className="w-4 h-4" style={{ color }} />;
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden pr-2 pb-2 select-none">
      {/* Title */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Configuration</h1>
        <p className="text-sm text-gray-500 font-medium">Manage preferences, dynamic categories, and vault backup files.</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-border flex-shrink-0 gap-6">
        <button
          onClick={() => setActiveSubTab('preferences')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'preferences'
              ? 'border-accent-indigo text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Preferences & Security</span>
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'categories'
              ? 'border-accent-indigo text-white'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Category Manager</span>
        </button>
      </div>

      {/* Sub Tab Panes */}
      <div className="flex-grow overflow-y-auto pb-6">
        <AnimatePresence mode="wait">
          {activeSubTab === 'preferences' ? (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-w-4xl"
            >
              {/* Global Currency Selector */}
              <div className="p-6 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-indigo/10 text-accent-indigo">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Global Currency</h3>
                    <p className="text-xs text-gray-500">Select display-only formatting currency across the ledger and overview dashboard.</p>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full appearance-none bg-card/50 border border-border rounded-xl pl-3 pr-10 py-3 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                  >
                    <option value="INR" className="bg-[#161920] text-gray-200">INR (₹) - Indian Rupee (Default)</option>
                    <option value="USD" className="bg-[#161920] text-gray-200">USD ($) - United States Dollar</option>
                    <option value="EUR" className="bg-[#161920] text-gray-200">EUR (€) - Euro</option>
                    <option value="GBP" className="bg-[#161920] text-gray-200">GBP (£) - British Pound Sterling</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Encryption Backup Box */}
              <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-emerald/10 text-accent-emerald">
                    <DownloadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Encrypted Backup</h3>
                    <p className="text-xs text-gray-500">Securely export your vault transactions and valuations.</p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-gray-400 bg-gray-900/30 p-3 rounded-xl border border-border/50 flex gap-2.5 leading-relaxed">
                  <ShieldCheck className="w-5 h-5 text-accent-emerald flex-shrink-0" />
                  <span>
                    Backup files are compressed and encrypted using **AES-256-GCM** via your password. Stored locally without cloud uploads.
                  </span>
                </div>

                <form onSubmit={handleBackupSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500">Create Encryption Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter password..."
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500">Confirm Encryption Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat password..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isBackingUp}
                    className="mt-2 w-full py-3 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 text-white font-semibold text-sm shadow-glow-indigo transition-all disabled:opacity-50"
                  >
                    {isBackingUp ? 'Processing Backup...' : 'Generate Encrypted Backup (.enc)'}
                  </button>
                </form>
              </div>

              {/* Restore Backup Box */}
              <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col gap-5 h-full">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-rose/10 text-accent-rose">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Decrypt & Restore</h3>
                    <p className="text-xs text-gray-500">Restore your financial logs from an encrypted file.</p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-accent-rose bg-accent-rose/10 p-3 rounded-xl border border-accent-rose/20 flex gap-2.5 leading-relaxed">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-accent-rose" />
                  <span>
                    **WARNING**: Restoring from a backup replaces your current offline database entirely. Any unbacked-up data in the vault will be lost.
                  </span>
                </div>

                <div className="flex flex-col gap-4 mt-auto">
                  <button
                    type="button"
                    onClick={handleSelectBackupAndOpenRestore}
                    disabled={isRestoring}
                    className="w-full py-3 rounded-xl border border-accent-rose text-accent-rose hover:bg-accent-rose/10 font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    {isRestoring ? 'Restoring Vault...' : 'Select Backup File & Restore'}
                  </button>
                </div>
              </div>

              {/* Software Updates Box */}
              <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col gap-5 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-accent-indigo/10 text-accent-indigo">
                    <RefreshCw className={`w-5 h-5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Software Updates</h3>
                    <p className="text-xs text-gray-500">Check for updates and download standalone releases from GitHub.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/30 p-4 rounded-xl border border-border/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 font-semibold">Update Status</span>
                    <span className="text-sm font-bold text-gray-200">
                      {updateStatus === 'idle' ? 'No updates checked yet.' : updateStatus}
                    </span>
                    {newVersion && (
                      <span className="text-[10px] font-extrabold text-accent-indigo bg-accent-indigo/10 px-2 py-0.5 rounded w-max mt-1">
                        Version {newVersion} Available
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3 w-full sm:w-auto">
                    {isUpdateReady ? (
                      <button
                        onClick={handleInstallUpdate}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-emerald text-white font-semibold text-sm shadow-glow-emerald transition-all animate-pulse"
                      >
                        Restart App to Load Update
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckUpdates}
                        disabled={isCheckingUpdate}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-indigo hover:bg-accent-indigo/90 text-white font-semibold text-sm shadow-glow-indigo transition-all disabled:opacity-50"
                      >
                        {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-5 max-w-4xl"
            >
              {/* Category Header */}
              <div className="flex justify-between items-center select-none bg-card/20 border border-border p-5 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-gray-200 font-sans">Dynamic Categories</h3>
                  <p className="text-xs text-gray-500">Define custom categories to tag your ledger flows.</p>
                </div>
                <button
                  onClick={handleOpenAddCategory}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-indigo text-white font-semibold text-xs shadow-glow-indigo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </div>

              {/* Grouped Category Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Income Categories */}
                <div className="p-5 rounded-2xl border border-border bg-card/15 flex flex-col gap-4">
                  <div className="border-b border-border pb-2.5 flex justify-between items-center">
                    <span className="text-xs font-bold text-accent-emerald uppercase tracking-wider">Income Categories</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-accent-emerald/10 text-accent-emerald">
                      {categories.filter(c => c.type === 'income').length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                    {categories.filter(c => c.type === 'income').map(cat => (
                      <div key={cat.id} className="p-3 rounded-xl border border-border/40 bg-card/30 flex items-center justify-between hover:bg-card/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-900/40">
                            {renderCategoryIcon(cat.icon, cat.color)}
                          </div>
                          <span className="text-sm font-medium text-gray-200 truncate max-w-[130px]" title={cat.name}>{cat.name}</span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditCategory(cat)}
                            className="p-1 rounded text-gray-500 hover:text-accent-indigo hover:bg-gray-800/40 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategoryClick(cat)}
                            className="p-1 rounded text-gray-500 hover:text-accent-rose hover:bg-gray-800/40 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense Categories */}
                <div className="p-5 rounded-2xl border border-border bg-card/15 flex flex-col gap-4">
                  <div className="border-b border-border pb-2.5 flex justify-between items-center">
                    <span className="text-xs font-bold text-accent-rose uppercase tracking-wider">Expense Categories</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-accent-rose/10 text-accent-rose">
                      {categories.filter(c => c.type === 'expense').length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                    {categories.filter(c => c.type === 'expense').map(cat => (
                      <div key={cat.id} className="p-3 rounded-xl border border-border/40 bg-card/30 flex items-center justify-between hover:bg-card/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-900/40">
                            {renderCategoryIcon(cat.icon, cat.color)}
                          </div>
                          <span className="text-sm font-medium text-gray-200 truncate max-w-[130px]" title={cat.name}>{cat.name}</span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditCategory(cat)}
                            className="p-1 rounded text-gray-500 hover:text-accent-indigo hover:bg-gray-800/40 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategoryClick(cat)}
                            className="p-1 rounded text-gray-500 hover:text-accent-rose hover:bg-gray-800/40 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Investment Categories */}
                <div className="p-5 rounded-2xl border border-border bg-card/15 flex flex-col gap-4">
                  <div className="border-b border-border pb-2.5 flex justify-between items-center">
                    <span className="text-xs font-bold text-accent-indigo uppercase tracking-wider">Investment Categories</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-accent-indigo/10 text-accent-indigo">
                      {categories.filter(c => c.type === 'investment').length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                    {categories.filter(c => c.type === 'investment').map(cat => (
                      <div key={cat.id} className="p-3 rounded-xl border border-border/40 bg-card/30 flex items-center justify-between hover:bg-card/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-900/40">
                            {renderCategoryIcon(cat.icon, cat.color)}
                          </div>
                          <span className="text-sm font-medium text-gray-200 truncate max-w-[130px]" title={cat.name}>{cat.name}</span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditCategory(cat)}
                            className="p-1 rounded text-gray-500 hover:text-accent-indigo hover:bg-gray-800/40 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategoryClick(cat)}
                            className="p-1 rounded text-gray-500 hover:text-accent-rose hover:bg-gray-800/40 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Creation / Edit Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5 z-10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-200">
                  {editingCategory ? 'Edit Category' : 'Create Custom Category'}
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800/45 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="flex flex-col gap-4">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Category Name</label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    placeholder="e.g. Health, Gifting"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors"
                  />
                </div>

                {/* Type */}
                <div className="flex bg-card/60 rounded-xl border border-border p-1 w-full">
                  {['income', 'expense', 'investment'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!!editingCategory} // Lock type for editing to prevent mismatch
                      onClick={() => setCategoryForm({ ...categoryForm, type: t as any })}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors capitalize ${
                        categoryForm.type === t
                          ? t === 'income'
                            ? 'bg-accent-emerald/20 text-accent-emerald'
                            : t === 'expense'
                            ? 'bg-accent-rose/20 text-accent-rose'
                            : 'bg-accent-indigo/20 text-accent-indigo'
                          : 'text-gray-400 hover:text-gray-200'
                      } disabled:opacity-60`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Icon selection */}
                <div className="flex flex-col gap-1.5 font-sans">
                  <label className="text-xs font-semibold text-gray-400">Select Icon</label>
                  <div className="grid grid-cols-8 gap-2 p-2.5 rounded-xl bg-gray-900/25 border border-border/60">
                    {ICON_OPTIONS.map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, icon: ico })}
                        className={`p-2 rounded-lg flex items-center justify-center border transition-all hover:scale-105 ${
                          categoryForm.icon === ico
                            ? 'bg-accent-indigo/15 border-accent-indigo text-accent-indigo'
                            : 'bg-card/30 border-border/40 text-gray-500 hover:text-gray-300 hover:border-border'
                        }`}
                        title={ico}
                      >
                        {renderCategoryIcon(ico, categoryForm.icon === ico ? categoryForm.color : '#64748b')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 font-sans">Pick Color Accent</label>
                  <div className="flex gap-2.5 flex-wrap p-2 rounded-xl bg-gray-900/25 border border-border/60">
                    {COLOR_OPTIONS.map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, color: col })}
                        className="w-7 h-7 rounded-full border border-black/40 transition-transform relative hover:scale-105 active:scale-95"
                        style={{ backgroundColor: col }}
                      >
                        {categoryForm.color === col && (
                          <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-white rounded-full shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-gray-800/40 text-gray-400 hover:text-gray-200 font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-accent-indigo text-white font-semibold text-sm shadow-glow-indigo"
                  >
                    {editingCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decryption Password Modal Overlay */}
      {showRestoreModal && selectedBackupPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card/95 border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-rose/10 text-accent-rose">
                <KeyRound className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-200">Vault Decryption & Restore</h3>
                <p className="text-xs text-gray-500">Provide password to decrypt and restore data.</p>
              </div>
            </div>

            {/* RESTORE WARNING PANEL */}
            <div className="text-xs font-semibold text-accent-rose bg-accent-rose/10 p-3.5 rounded-xl border border-accent-rose/25 flex gap-2.5 leading-normal">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-accent-rose animate-bounce" />
              <div>
                <span className="font-extrabold uppercase tracking-wide">Restore Hazard:</span>
                <p className="mt-0.5 text-gray-400 font-medium">
                  This will permanently delete and overwrite all current transactions and assets in this vault. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-400 bg-gray-900/40 p-3 rounded-xl border border-border/50 break-all leading-normal flex flex-col gap-1">
              <span className="font-semibold text-gray-300">File Selected:</span>
              <div className="text-[11px] font-mono text-gray-400 bg-card/50 p-1.5 rounded border border-border/30">
                {selectedBackupPath.split(/[\\/]/).pop()}
              </div>
            </div>

            <form onSubmit={handleRestoreSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Decryption Password</label>
                <input
                  ref={passwordInputRef}
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter backup password..."
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                />
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setSelectedBackupPath(null);
                    setRestorePassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-gray-400 hover:text-gray-200 hover:bg-card text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestoring}
                  className="flex-1 py-2.5 rounded-xl bg-accent-rose text-white hover:bg-accent-rose/90 text-sm font-semibold shadow-glow-rose transition-all disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Decrypt & Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Available Prompt Modal */}
      {showUpdatePrompt && newVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card/95 border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-indigo/10 text-accent-indigo">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-200">New Update Available</h3>
                <p className="text-xs text-gray-500">Version {newVersion} is now available.</p>
              </div>
            </div>

            <div className="text-xs text-gray-400 bg-gray-900/40 p-4 rounded-xl border border-border/50 leading-relaxed flex flex-col gap-2.5">
              <span className="font-semibold text-gray-300">Update Details:</span>
              <p>
                FinTrack will download the latest update files automatically. The installation will run seamlessly in the background.
              </p>
              <div className="text-[11px] text-accent-indigo font-semibold bg-accent-indigo/10 p-2 rounded border border-accent-indigo/20">
                ⚠️ Secure Local Storage: All vault transactions and assets will be fully preserved during this update. No data is lost.
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpdatePrompt(false);
                  setIsCheckingUpdate(false);
                  setUpdateStatus(`Update available (v${newVersion})`);
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-gray-400 hover:text-gray-200 hover:bg-card text-sm font-semibold transition-all"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                className="flex-1 py-2.5 rounded-xl bg-accent-indigo text-white hover:bg-accent-indigo/90 text-sm font-semibold shadow-glow-indigo transition-all"
              >
                Download & Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
