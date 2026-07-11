import { useState } from 'react';
import Sidebar, { TabId } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Investments from './components/Investments';
import Settings from './components/Settings';
import { useDatabase } from './hooks/useDatabase';
import { ToastProvider } from './components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  
  const {
    transactions,
    investments,
    categories,
    stats,
    loading,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useDatabase();

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
                  investments={investments}
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
                <Settings
                  categories={categories}
                  addCategory={addCategory}
                  updateCategory={updateCategory}
                  deleteCategory={deleteCategory}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
}
