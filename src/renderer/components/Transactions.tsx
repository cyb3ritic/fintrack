import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Briefcase, Tag, Briefcase as Terminal, TrendingUp, Utensils, Home, 
  Zap, Tv, ShoppingBag, Car, HeartPulse, Layers, Lock, Coins, 
  CircleDot, FolderOpen, Edit2, Trash2, ChevronDown, AlertCircle, Eye, EyeOff, X
} from 'lucide-react';
import { Transaction, Category } from '../hooks/useDatabase';
import { formatDate } from '../utils/format';
import { useToast } from './Toast';
import { useCurrency } from '../context/CurrencyContext';

interface TransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  filters: any;
  setFilters: (filters: any) => void;
  addTransaction: (tx: any) => Promise<any>;
  updateTransaction: (id: number, tx: any) => Promise<any>;
  deleteTransaction: (id: number) => Promise<any>;
}

export default function Transactions({
  transactions,
  categories,
  filters,
  setFilters,
  addTransaction,
  updateTransaction,
  deleteTransaction,
}: TransactionsProps) {
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search text filter (applied client-side for ultra-fast responsive feedback)
  const [search, setSearch] = useState('');

  const renderCategoryIcon = (iconName: string, color: string) => {
    const iconComponents: Record<string, any> = {
      Tag, Briefcase, Terminal, TrendingUp, Utensils, Home, 
      Zap, Tv, ShoppingBag, Car, HeartPulse, Layers, 
      Lock, Coins, CircleDot, FolderOpen
    };
    const Component = iconComponents[iconName] || Tag;
    return <Component className="w-3.5 h-3.5 animate-pulse" style={{ color }} />;
  };

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    date: new Date().toISOString().substring(0, 10),
    category: '',
    subcategory: '',
    note: '',
  });

  const [isAmountMasked, setIsAmountMasked] = useState<boolean>(() => {
    const stored = sessionStorage.getItem('mask_ledger_amounts');
    return stored === null ? true : stored === 'true';
  });

  const toggleAmountMask = () => {
    setIsAmountMasked((prev) => {
      const next = !prev;
      sessionStorage.setItem('mask_ledger_amounts', String(next));
      return next;
    });
  };

  // Automatically select a matching category when the type changes
  useEffect(() => {
    const filteredCats = categories.filter((c) => c.type === formData.type);
    if (filteredCats.length > 0 && !filteredCats.some(c => c.name === formData.category)) {
      setFormData((prev) => ({ ...prev, category: filteredCats[0].name }));
    }
  }, [formData.type, categories]);

  // Open modal for editing
  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({
      type: tx.type,
      amount: tx.amount.toString(),
      date: tx.date,
      category: tx.category,
      subcategory: tx.subcategory || '',
      note: tx.note || '',
    });
    setIsModalOpen(true);
  };

  // Open modal for adding
  const handleAddClick = () => {
    setEditingTransaction(null);
    const firstExpenseCat = categories.find((c) => c.type === 'expense')?.name || '';
    setFormData({
      type: 'expense',
      amount: '',
      date: new Date().toISOString().substring(0, 10),
      category: firstExpenseCat,
      subcategory: '',
      note: '',
    });
    setIsModalOpen(true);
  };

  // Form Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountVal = parseFloat(formData.amount);
    
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid amount greater than zero', 'error');
      return;
    }

    const payload = {
      ...formData,
      amount: amountVal,
    };

    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
        showToast('Transaction updated successfully', 'success');
      } else {
        await addTransaction(payload);
        showToast('Transaction added successfully', 'success');
      }
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (err: any) {
      showToast(`Operation failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete transaction handler
  const handleDeleteClick = async (id: number) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      setIsSubmitting(true);
      try {
        await deleteTransaction(Number(id));
        showToast('Transaction deleted successfully', 'success');
      } catch (err: any) {
        showToast(`Deletion failed: ${err.message}`, 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Local filter calculations (search)
  const filteredTransactions = transactions.filter((tx) => {
    const term = search.toLowerCase();
    const noteMatch = tx.note?.toLowerCase().includes(term);
    const catMatch = tx.category.toLowerCase().includes(term);
    const subMatch = tx.subcategory?.toLowerCase().includes(term);
    return term === '' || noteMatch || catMatch || subMatch;
  });

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden pr-2">
      {/* Title Bar */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Ledger</h1>
          <p className="text-sm text-gray-500 font-medium">Record and filter your cash flows.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-indigo text-white font-semibold text-sm shadow-glow-indigo transition-shadow duration-300"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </motion.button>
      </div>

      {/* Filter and Query controls */}
      <div className="p-4 rounded-2xl border border-border bg-card/20 flex flex-col gap-4 flex-shrink-0">
        <div className="grid grid-cols-12 gap-4">
          {/* Quick Search */}
          <div className="relative col-span-12 sm:col-span-6 lg:col-span-3">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search note or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="flex bg-card/50 rounded-xl border border-border p-1 col-span-12 sm:col-span-6 lg:col-span-4 min-w-0">
            {['all', 'income', 'expense'].map((t) => (
              <button
                key={t}
                onClick={() => setFilters({ ...filters, type: t })}
                className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-1.5 px-1 rounded-lg transition-colors capitalize whitespace-nowrap ${
                  (filters.type || 'all') === t
                    ? 'bg-accent-indigo/20 text-accent-indigo'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="relative col-span-12 sm:col-span-6 lg:col-span-2">
            <select
              value={filters.category || 'all'}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full appearance-none bg-card/50 border border-border rounded-xl pl-3 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors"
            >
              <option value="all" className="bg-[#161920] text-gray-200">All Categories</option>
              {categories
                .filter((c) => filters.type === 'all' || !filters.type || c.type === filters.type)
                .map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-[#161920] text-gray-200">
                    {cat.name}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* Date Picker trigger */}
          <div className="flex gap-2 col-span-12 sm:col-span-6 lg:col-span-3">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              className="w-1/2 bg-card/50 border border-border rounded-xl px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-accent-indigo"
              style={{ colorScheme: 'dark' }}
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              className="w-1/2 bg-card/50 border border-border rounded-xl px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-accent-indigo"
              style={{ colorScheme: 'dark' }}
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-grow overflow-y-auto border border-border rounded-2xl bg-card/10 backdrop-blur-md">
        {filteredTransactions.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 py-16">
            <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-semibold">No records found matching filters</p>
          </div>
        ) : (
          <div className="min-w-full divide-y divide-border">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider bg-card/30">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Category</div>
              <div className="col-span-3">Note</div>
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <span className="text-right">Amount</span>
                <button
                  onClick={() => toggleAmountMask()}
                  className="p-1 rounded hover:bg-gray-800/40 text-gray-500 hover:text-white transition-colors flex items-center justify-center"
                  title={isAmountMasked ? 'Reveal amounts' : 'Hide amounts'}
                >
                  {isAmountMasked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
            
            {/* Rows with staggered animation */}
            <motion.div
              layout
              initial="hidden"
              animate="show"
              variants={{
                show: {
                  transition: {
                    staggerChildren: 0.015,
                  },
                },
              }}
              className="divide-y divide-border"
            >
              {filteredTransactions.map((tx) => (
                <motion.div
                  key={tx.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center text-sm font-medium hover:bg-card/20 transition-colors group select-text"
                >
                  <div className="col-span-2 text-gray-400 text-xs">{formatDate(tx.date)}</div>
                  <div className="col-span-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        tx.type === 'income'
                          ? 'bg-accent-emerald/10 text-accent-emerald'
                          : 'bg-accent-rose/10 text-accent-rose'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </div>
                  {(() => {
                    const catObj = categories.find((c) => c.name === tx.category);
                    return (
                      <div className="col-span-3 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-gray-900/40 flex items-center justify-center flex-shrink-0">
                          {renderCategoryIcon(catObj?.icon || 'Tag', catObj?.color || '#64748b')}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-gray-200 truncate">{tx.category}</span>
                          {tx.subcategory && (
                            <span className="text-[10px] text-gray-500 font-semibold truncate">{tx.subcategory}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="col-span-3 text-gray-400 text-xs truncate max-w-[200px]" title={tx.note}>
                    {tx.note || '-'}
                  </div>
                  
                  {/* Actions & Amount col */}
                  <div className="col-span-2 flex justify-end items-center gap-4">
                    {/* Hover actions */}
                    <div className="flex gap-2.5 transition-opacity pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => handleEditClick(tx)}
                        disabled={isSubmitting}
                        className="text-gray-500 hover:text-accent-indigo p-1 rounded hover:bg-gray-800/40 transition-colors disabled:opacity-50"
                        aria-label={`Edit ${tx.category} transaction`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(tx.id)}
                        disabled={isSubmitting}
                        className="text-gray-500 hover:text-accent-rose p-1 rounded hover:bg-gray-800/40 transition-colors disabled:opacity-50"
                        aria-label={`Delete ${tx.category} transaction`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span
                      className={`font-bold select-all ${
                        tx.type === 'income'
                          ? 'text-accent-emerald'
                          : 'text-accent-rose'
                      } ${isAmountMasked ? 'blur-md select-none transition-all duration-300' : ''}`}
                    >
                      {tx.type === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Transaction Add/Edit Modal overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5 z-10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-200">
                  {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800/45 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Segments: Type */}
                <div className="flex bg-card/60 rounded-xl border border-border p-1 w-full">
                  {['income', 'expense'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        type: t as any
                      })}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors capitalize ${
                        formData.type === t
                          ? t === 'income'
                            ? 'bg-accent-emerald/20 text-accent-emerald'
                            : 'bg-accent-rose/20 text-accent-rose'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400">Amount (INR)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="₹ 0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo focus:ring-1 focus:ring-accent-indigo transition-all font-semibold"
                    />
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo focus:ring-1 focus:ring-accent-indigo transition-all"
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400">Category</label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full appearance-none bg-card/50 border border-border rounded-xl pl-3 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                      >
                        {categories
                          .filter((c) => c.type === formData.type)
                          .map((cat) => (
                            <option key={cat.id} value={cat.name} className="bg-[#161920] text-gray-200">
                              {cat.name}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Subcategory */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400">Sub-category (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Dinner, Drinks"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo focus:ring-1 focus:ring-accent-indigo"
                    />
                  </div>


                </div>

                {/* Note */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Note / Description</label>
                  <textarea
                    placeholder="Provide details about transaction..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={2}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo focus:ring-1 focus:ring-accent-indigo resize-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTransaction(null);
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-gray-800/40 text-gray-400 hover:text-gray-200 font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-accent-indigo text-white font-semibold text-sm shadow-glow-indigo disabled:opacity-60"
                  >
                    {isSubmitting ? 'Working...' : (editingTransaction ? 'Save Changes' : 'Record')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
