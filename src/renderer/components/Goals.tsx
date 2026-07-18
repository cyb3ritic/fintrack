import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Calendar, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { Goal } from '../hooks/useDatabase';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from './Toast';

interface GoalsProps {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'isCompleted'>) => Promise<any>;
  updateGoal: (id: number, goal: Omit<Goal, 'id' | 'isCompleted'>) => Promise<any>;
  deleteGoal: (id: number) => Promise<any>;
}

export default function Goals({ goals, addGoal, updateGoal, deleteGoal }: GoalsProps) {
  const { formatCurrency } = useCurrency();
  const { showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    current_allocated: '',
    target_date: '',
  });

  const handleEditClick = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      target_amount: goal.target_amount.toString(),
      current_allocated: goal.current_allocated.toString(),
      target_date: goal.target_date || '',
    });
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingGoal(null);
    setFormData({
      title: '',
      target_amount: '',
      current_allocated: '0',
      target_date: '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (confirm('Are you sure you want to delete this financial goal?')) {
      try {
        await deleteGoal(id);
        showToast('Goal deleted successfully', 'success');
      } catch (err: any) {
        showToast(`Failed to delete: ${err.message}`, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmt = parseFloat(formData.target_amount);
    const currAllocated = parseFloat(formData.current_allocated) || 0;

    if (isNaN(targetAmt) || targetAmt <= 0) {
      showToast('Please enter a valid target amount', 'error');
      return;
    }

    const payload = {
      title: formData.title,
      target_amount: targetAmt,
      current_allocated: currAllocated,
      target_date: formData.target_date || null,
    };

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
        showToast('Goal updated successfully', 'success');
      } else {
        await addGoal(payload);
        showToast('Goal added successfully', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(`Operation failed: ${err.message}`, 'error');
    }
  };

  // Categorize goals
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const categorizedGoals = goals.reduce(
    (acc, goal) => {
      const pct = goal.target_amount > 0 ? (goal.current_allocated / goal.target_amount) * 100 : 0;
      const isOverdue = goal.target_date && new Date(goal.target_date) < todayStart && pct < 100;

      if (isOverdue) {
        acc.overdue.push(goal);
      } else if (!goal.target_date) {
        acc.ongoing.push(goal);
      } else {
        const targetDate = new Date(goal.target_date);
        const diffTime = targetDate.getTime() - todayStart.getTime();
        const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);

        if (diffMonths < 12) {
          acc.shortTerm.push(goal);
        } else {
          acc.longTerm.push(goal);
        }
      }
      return acc;
    },
    { overdue: [] as Goal[], ongoing: [] as Goal[], shortTerm: [] as Goal[], longTerm: [] as Goal[] }
  );

  const renderGoalCard = (goal: Goal, isOverdue = false) => {
    const percent = Math.min(
      goal.target_amount > 0 ? Math.round((goal.current_allocated / goal.target_amount) * 100) : 0,
      100
    );
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
      <motion.div
        layout
        key={goal.id}
        whileHover={{ y: -3 }}
        className={`p-5 rounded-2xl border ${
          isOverdue 
            ? 'border-accent-rose/40 bg-accent-rose/5' 
            : percent >= 100
            ? 'border-accent-emerald/30 bg-accent-emerald/[0.02]'
            : 'border-border bg-card/25'
        } backdrop-blur-md flex flex-col justify-between gap-4`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex flex-col gap-1 select-text min-w-0 flex-1">
            <div className="flex items-center gap-2 max-w-full">
              {goal.title.startsWith('http') ? (
                <a
                  href={goal.title}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-accent-indigo hover:text-accent-indigo/80 hover:underline text-sm break-all line-clamp-2"
                  title={goal.title}
                >
                  {goal.title}
                </a>
              ) : (
                <h3 className="font-bold text-gray-200 text-sm break-words line-clamp-2" title={goal.title}>
                  {goal.title}
                </h3>
              )}
              {percent >= 100 && (
                <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0" />
              )}
            </div>
            {goal.target_date && (
              <span className={`text-[10px] flex items-center gap-1 font-semibold ${isOverdue ? 'text-accent-rose' : 'text-gray-500'}`}>
                <Calendar className="w-3 h-3" />
                {goal.target_date} {isOverdue && '(Overdue)'}
              </span>
            )}
            {!goal.target_date && (
              <span className="text-[10px] text-accent-indigo font-semibold">Ongoing Goal</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleEditClick(goal)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteClick(goal.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-accent-rose hover:bg-gray-800/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-1 border-t border-border/20 pt-3 select-text">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-500">Allocated</span>
            <span className="text-sm font-extrabold text-white">
              {formatCurrency(goal.current_allocated)}
            </span>
            <span className="text-[9px] text-gray-500">of {formatCurrency(goal.target_amount)}</span>
          </div>

          {/* SVG Circular Progress Meter */}
          <div className="relative w-20 h-20 flex items-center justify-center select-none flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-gray-800"
                strokeWidth="6"
                fill="transparent"
              />
              <motion.circle
                cx="40"
                cy="40"
                r={radius}
                className={isOverdue ? 'stroke-accent-rose' : 'stroke-accent-indigo'}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute text-xs font-black ${isOverdue ? 'text-accent-rose' : 'text-accent-indigo'}`}>
              {percent}%
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title: string, list: Goal[], isOverdue = false) => {
    if (list.length === 0) return null;
    return (
      <div className="flex flex-col gap-3">
        <h2 className={`text-xs uppercase font-extrabold tracking-wider ${isOverdue ? 'text-accent-rose' : 'text-gray-400'}`}>
          {title} ({list.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((g) => renderGoalCard(g, isOverdue))}
        </div>
      </div>
    );
  };

  const totalGoalCount = goals.length;

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Goals & Wishlist</h1>
          <p className="text-sm text-gray-500 font-medium">Track your targets and milestones side-by-side.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-gradient-to-r from-accent-indigo to-accent-indigo/80 hover:from-accent-indigo hover:to-accent-indigo text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Target</span>
        </motion.button>
      </div>

      {totalGoalCount === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl p-10 text-center select-none my-10">
          <Target className="w-12 h-12 text-gray-600 mb-3 animate-pulse" />
          <h3 className="font-bold text-gray-300 mb-1">No Targets Set Yet</h3>
          <p className="text-xs text-gray-500 max-w-[280px]">Define your wealth milestones or dream items and allocate funds manually.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {renderSection('⚠️ Overdue Targets', categorizedGoals.overdue, true)}
          {renderSection('📅 Short-Term Goals (< 12 Months)', categorizedGoals.shortTerm)}
          {renderSection('🚀 Long-Term Wealth Milestones', categorizedGoals.longTerm)}
          {renderSection('♾️ Ongoing Goals', categorizedGoals.ongoing)}
        </div>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0e14]/95 border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col gap-5"
            >
              <div className="flex justify-between items-center border-b border-border/50 pb-3 select-none">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-accent-indigo" />
                  {editingGoal ? 'Edit Goal Details' : 'Set New Financial Target'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors text-xs font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Goal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New Macbook, House Downpayment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                  />
                </div>

                {/* Target Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Target Amount (INR)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="₹ 0.00"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors font-semibold"
                  />
                </div>

                {/* Manually Allocated Capital */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Manually Allocated Capital (INR)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="₹ 0.00"
                    value={formData.current_allocated}
                    onChange={(e) => setFormData({ ...formData, current_allocated: e.target.value })}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo transition-colors font-semibold"
                  />
                </div>

                {/* Target Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400">Target Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-indigo"
                  />
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-accent-indigo to-accent-indigo/80 hover:from-accent-indigo hover:to-accent-indigo text-white text-xs font-bold py-3 rounded-xl transition-all duration-200 mt-2"
                >
                  {editingGoal ? 'Save Target Changes' : 'Create Financial Target'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
