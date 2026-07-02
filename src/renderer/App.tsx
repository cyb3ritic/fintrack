import { useState, useEffect } from 'react';
import Sidebar, { TabId } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Investments from './components/Investments';
import Settings from './components/Settings';
import { useDatabase } from './hooks/useDatabase';
import { ToastProvider } from './components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isLocked, setIsLocked] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  
  const {
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
    deleteInvestment,
  } = useDatabase();

  useEffect(() => {
    const checkLockStatus = async () => {
      const locked = await window.api.isDatabaseLocked();
      setIsLocked(locked);
      if (locked) {
        triggerAutoUnlock();
      } else {
        refreshData();
      }
    };
    checkLockStatus();
  }, []);

  const triggerAutoUnlock = async () => {
    setAuthenticating(true);
    setAuthError(null);
    try {
      const result = await window.api.authenticate();
      if (result.success) {
        setIsLocked(false);
        await refreshData();
      } else {
        setAuthError(result.error || 'Unlock authentication failed.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Unlock error occurred.');
    } finally {
      setAuthenticating(false);
    }
  };

  if (isLocked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-gray-100 font-sans p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-card/10">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-accent-indigo/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-accent-rose/10 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md bg-card/45 border border-border/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center gap-6"
        >
          {/* Animated fingerprint/lock icon container */}
          <div className="relative group">
            <div className="absolute inset-0 bg-accent-indigo/20 blur-xl rounded-full scale-110 group-hover:scale-125 transition-all duration-500" />
            <div className="w-20 h-20 rounded-2xl bg-card border border-border/80 shadow-glow-indigo flex items-center justify-center text-accent-indigo relative z-10">
              {authenticating ? (
                <RefreshCw className="w-9 h-9 animate-spin text-accent-indigo" />
              ) : (
                <Fingerprint className="w-10 h-10 animate-pulse text-accent-indigo" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-gray-100 via-gray-300 to-gray-400 bg-clip-text text-transparent">
              Vault Locked
            </h1>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              FinTrack is protected by your system security credentials. Verify your identity to decrypt database key and unlock your vault.
            </p>
          </div>

          {authError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-semibold text-accent-rose bg-accent-rose/10 px-4 py-2.5 rounded-xl border border-accent-rose/25 w-full leading-normal"
            >
              {authError}
            </motion.div>
          )}

          <button
            onClick={triggerAutoUnlock}
            disabled={authenticating}
            className="w-full py-3.5 mt-2 rounded-2xl bg-accent-indigo text-white hover:bg-accent-indigo/90 text-sm font-bold shadow-glow-indigo transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {authenticating ? 'Verifying Identity...' : 'Unlock FinTrack'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-gray-100 font-sans">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Main Content Pane */}
        <main className="flex-1 h-screen overflow-hidden p-8 flex flex-col relative bg-gradient-to-br from-background via-background to-card/10">
          
          {/* Animated Page Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="w-full h-full flex-grow overflow-hidden"
            >
              {activeTab === 'dashboard' && (
                <Dashboard stats={stats} isLoading={loading} />
              )}
              
              {activeTab === 'transactions' && (
                <Transactions
                  transactions={transactions}
                  categories={categories}
                  filters={filters}
                  setFilters={setFilters}
                  addTransaction={addTransaction}
                  updateTransaction={updateTransaction}
                  deleteTransaction={deleteTransaction}
                />
              )}
              
              {activeTab === 'investments' && (
                <Investments
                  investments={investments}
                  addInvestment={addInvestment}
                  updateInvestment={updateInvestment}
                  deleteInvestment={deleteInvestment}
                />
              )}
              
              {activeTab === 'settings' && (
                <Settings />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
}
