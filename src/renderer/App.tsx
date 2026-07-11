import { useState } from 'react';
import Sidebar, { TabId } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Settings from './components/Settings';
import Goals from './components/Goals';
import BillCalendar from './components/BillCalendar';
import { useDatabase } from './hooks/useDatabase';
import { ToastProvider } from './components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  
  const {
    transactions,
    categories,
    stats,
    budgets,
    recurringBills,
    loading,
    filters,
    setFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    setBudget,
    addRecurringBill,
    toggleBillPaidStatus,
    budgetMonthYear,
    setBudgetMonthYear,
    addGoal,
    updateGoal,
    deleteGoal,
    goals,
    range,
    setRange
  } = useDatabase();

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-gray-100 font-sans">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Main Content Pane */}
        <main className="flex-grow flex-1 h-screen overflow-hidden p-8 flex flex-col relative bg-gradient-to-br from-background via-background to-card/10">

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
                <Dashboard stats={stats} transactions={transactions} budgets={budgets} isLoading={loading} range={range} setRange={setRange} />
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

              {activeTab === 'calendar' && (
                <BillCalendar
                  recurringBills={recurringBills}
                  addRecurringBill={addRecurringBill}
                  toggleBillPaidStatus={toggleBillPaidStatus}
                />
              )}

              {activeTab === 'goals' && (
                <Goals
                  goals={goals}
                  addGoal={addGoal}
                  updateGoal={updateGoal}
                  deleteGoal={deleteGoal}
                />
              )}
              
              {activeTab === 'settings' && (
                <Settings
                  categories={categories}
                  addCategory={addCategory}
                  updateCategory={updateCategory}
                  deleteCategory={deleteCategory}
                  budgets={budgets}
                  setBudget={setBudget}
                  budgetMonthYear={budgetMonthYear}
                  setBudgetMonthYear={setBudgetMonthYear}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
}
