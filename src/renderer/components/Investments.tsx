import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Pencil, Trash2, X, AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Investment } from '../hooks/useDatabase';
import { useToast } from './Toast';
import { useCurrency } from '../context/CurrencyContext';

interface InvestmentsProps {
  investments: Investment[];
  addInvestment: (inv: any) => Promise<any>;
  updateInvestment: (id: number, inv: any) => Promise<any>;
  deleteInvestment: (id: number) => Promise<any>;
}

export default function Investments({
  investments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
}: InvestmentsProps) {
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();
  
  const [isTotalValuationMasked, setIsTotalValuationMasked] = useState<boolean>(() => {
    return localStorage.getItem('mask_investments_valuation') === 'true';
  });

  const toggleValuationMask = () => {
    setIsTotalValuationMasked((prev) => {
      const next = !prev;
      localStorage.setItem('mask_investments_valuation', String(next));
      return next;
    });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    asset_name: '',
    asset_type: 'Stocks' as 'Stocks' | 'Mutual Funds' | 'Fixed Deposits' | 'Crypto' | 'Gold',
    invested_amount: '',
    current_value: '',
  });

  const handleEditClick = (inv: Investment) => {
    setEditingInvestment(inv);
    setFormData({
      asset_name: inv.asset_name,
      asset_type: inv.asset_type,
      invested_amount: inv.invested_amount.toString(),
      current_value: inv.current_value.toString(),
    });
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingInvestment(null);
    setFormData({
      asset_name: '',
      asset_type: 'Stocks',
      invested_amount: '',
      current_value: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const investedVal = parseFloat(formData.invested_amount);
    const currentVal = parseFloat(formData.current_value);

    if (isNaN(investedVal) || investedVal < 0 || isNaN(currentVal) || currentVal < 0) {
      showToast('Please enter positive numerical values for principal and valuations', 'error');
      return;
    }

    if (!formData.asset_name.trim()) {
      showToast('Please enter an asset name', 'error');
      return;
    }

    const payload = {
      asset_name: formData.asset_name.trim(),
      asset_type: formData.asset_type,
      invested_amount: investedVal,
      current_value: currentVal,
    };

    try {
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, payload);
        showToast('Asset valuation updated successfully', 'success');
      } else {
        await addInvestment(payload);
        showToast('New asset recorded in portfolio', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(`Operation failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (confirm('Are you sure you want to remove this asset? This will delete its entire valuation history.')) {
      try {
        await deleteInvestment(id);
        showToast('Asset removed from portfolio', 'success');
      } catch (err: any) {
        showToast(`Deletion failed: ${err.message}`, 'error');
      }
    }
  };

  // Portfolio Totals
  const totalPrincipal = investments.reduce((sum, item) => sum + item.invested_amount, 0);
  const totalCurrentValue = investments.reduce((sum, item) => sum + item.current_value, 0);
  const portfolioGain = totalCurrentValue - totalPrincipal;
  const portfolioGainPercent = totalPrincipal > 0 ? (portfolioGain / totalPrincipal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6">
      {/* Header Title */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Portfolio</h1>
          <p className="text-sm text-gray-500 font-medium">Track your assets valuation, allocation, and gains.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-indigo text-white font-semibold text-sm shadow-glow-indigo"
        >
          <Plus className="w-4 h-4" />
          <span>Add Asset</span>
        </motion.button>
      </div>

      {/* Portfolio Performance Summary Card */}
      {investments.length > 0 && (
        <div className="p-6 rounded-2xl border border-border bg-card/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 select-none relative overflow-hidden">
          <div className="flex flex-col gap-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Portfolio Valuation</span>
              <button
                onClick={() => toggleValuationMask()}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 transition-all flex items-center justify-center"
                title={isTotalValuationMasked ? 'Reveal values' : 'Hide values'}
              >
                {isTotalValuationMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-baseline gap-2.5">
              <h2 className={`text-3xl font-extrabold text-white tracking-tight select-text transition-all duration-300 ${isTotalValuationMasked ? 'blur-md select-none' : 'blur-none'}`}>
                {formatCurrency(totalCurrentValue)}
              </h2>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  portfolioGain >= 0 ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-rose/10 text-accent-rose'
                }`}
              >
                {portfolioGain >= 0 ? '+' : ''}
                {portfolioGainPercent.toFixed(1)}% All-Time
              </span>
            </div>
          </div>

          <div className="flex gap-10 z-10">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Principal</span>
              <span className={`text-lg font-bold text-gray-300 select-text transition-all duration-300 ${isTotalValuationMasked ? 'blur-md select-none' : 'blur-none'}`}>{formatCurrency(totalPrincipal)}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Wealth Gain</span>
              <span
                className={`text-lg font-extrabold select-text transition-all duration-300 ${
                  portfolioGain >= 0 ? 'text-accent-emerald' : 'text-accent-rose'
                } ${isTotalValuationMasked ? 'blur-md select-none' : 'blur-none'}`}
              >
                {portfolioGain >= 0 ? '+' : ''}
                {formatCurrency(portfolioGain)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid List of Investments */}
      {investments.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center border border-dashed border-border rounded-2xl py-20 text-gray-500">
          <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold">Your investment portfolio is currently empty</p>
          <span className="text-xs mt-1 max-w-sm text-center">Add stocks, mutual funds, gold, fixed deposits, or crypto to begin tracking wealth.</span>
        </div>
      ) : (
        <motion.div
          layout
          initial="hidden"
          animate="show"
          variants={{
            show: {
              transition: {
                staggerChildren: 0.04,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {investments.map((inv) => {
            const assetGain = inv.current_value - inv.invested_amount;
            const assetGainPercent = inv.invested_amount > 0 ? (assetGain / inv.invested_amount) * 100 : 0;
            const allocationWeight = totalCurrentValue > 0 ? (inv.current_value / totalCurrentValue) * 100 : 0;

            return (
              <motion.div
                key={inv.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.96, y: 15 },
                  show: { opacity: 1, scale: 1, y: 0 },
                }}
                className="p-5 rounded-2xl border border-border bg-card/25 hover:bg-card/45 transition-colors flex flex-col gap-4 relative group select-none"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded w-max ${
                        inv.asset_type === 'Stocks'
                          ? 'bg-blue-500/10 text-blue-500'
                          : inv.asset_type === 'Mutual Funds'
                          ? 'bg-teal-500/10 text-teal-500'
                          : inv.asset_type === 'Fixed Deposits'
                          ? 'bg-orange-500/10 text-orange-500'
                          : inv.asset_type === 'Crypto'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-yellow-600/10 text-yellow-600'
                      }`}
                    >
                      {inv.asset_type}
                    </span>
                    <h3 className="font-bold text-gray-200 text-sm select-text line-clamp-1" title={inv.asset_name}>
                      {inv.asset_name}
                    </h3>
                  </div>

                  {/* Actions (visible on hover) */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(inv)}
                      className="p-1 rounded text-gray-500 hover:text-accent-indigo hover:bg-gray-800/40 transition-colors"
                      title="Edit Asset"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(inv.id)}
                      className="p-1 rounded text-gray-500 hover:text-accent-rose hover:bg-gray-800/40 transition-colors"
                      title="Remove Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Valuations */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase">Invested</span>
                    <span className="text-sm font-bold text-gray-300 select-all">{formatCurrency(inv.invested_amount)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase">Current Value</span>
                    <span className="text-sm font-bold text-white select-all">{formatCurrency(inv.current_value)}</span>
                  </div>
                </div>

                {/* Gain Calculations */}
                <div className="flex justify-between items-center border-t border-border/50 pt-3 text-xs font-semibold select-none">
                  <span className="text-gray-500">Wealth Change</span>
                  <span className={assetGain >= 0 ? 'text-accent-emerald' : 'text-accent-rose'}>
                    {assetGain >= 0 ? '+' : ''}
                    {formatCurrency(assetGain)} ({assetGainPercent.toFixed(1)}%)
                  </span>
                </div>

                {/* Allocation Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                    <span>Portfolio Weight</span>
                    <span>{allocationWeight.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent-indigo rounded-full" style={{ width: `${allocationWeight}%` }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Asset Modal overlay */}
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
              className="relative w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-2xl flex flex-col gap-5 z-10"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-200">
                  {editingInvestment ? 'Edit Asset Valuation' : 'Record Asset'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800/45 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Asset Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Nifty 50 Index Fund"
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors"
                    disabled={!!editingInvestment} // Lock name for editing (standard security)
                  />
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Asset Type */}
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-xs font-semibold text-gray-400">Asset Class</label>
                    <div className="relative">
                      <select
                        value={formData.asset_type}
                        onChange={(e) => setFormData({ ...formData, asset_type: e.target.value as any })}
                        className="w-full appearance-none bg-card/50 border border-border rounded-xl pl-3 pr-10 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                        disabled={!!editingInvestment}
                      >
                        <option value="Stocks" className="bg-[#161920] text-gray-200">Stocks</option>
                        <option value="Mutual Funds" className="bg-[#161920] text-gray-200">Mutual Funds</option>
                        <option value="Fixed Deposits" className="bg-[#161920] text-gray-200">Fixed Deposits</option>
                        <option value="Crypto" className="bg-[#161920] text-gray-200">Crypto</option>
                        <option value="Gold" className="bg-[#161920] text-gray-200">Gold</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Invested Principal */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400">Invested Capital (INR)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="₹ 0.00"
                      value={formData.invested_amount}
                      onChange={(e) => setFormData({ ...formData, invested_amount: e.target.value })}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors font-semibold"
                    />
                  </div>

                  {/* Current Valuation */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400">Current Valuation (INR)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="₹ 0.00"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors font-semibold"
                    />
                  </div>
                </div>

                {/* Details indicator message */}
                {editingInvestment && (
                  <div className="text-[11px] font-medium text-accent-indigo bg-accent-indigo/10 p-2.5 rounded-xl flex gap-2 border border-accent-indigo/20 leading-relaxed">
                    <Sparkles className="w-5 h-5 flex-shrink-0" />
                    <span>To add capital injections to this asset, delete this asset and record it again with the aggregate totals.</span>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border hover:bg-gray-800/40 text-gray-400 hover:text-gray-200 font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-accent-indigo text-white font-semibold text-sm shadow-glow-indigo"
                  >
                    {editingInvestment ? 'Update Valuation' : 'Record Asset'}
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
