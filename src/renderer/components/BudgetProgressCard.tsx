import { motion } from 'framer-motion';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { Budget } from '../hooks/useDatabase';

interface BudgetProgressCardProps {
  budget: Budget;
  formatCurrency: (value: number) => string;
}

const SAFE_COLOR = '#6366f1';
const WARNING_COLOR = '#f59e0b';
const EXCEEDED_COLOR = '#ef4444';

function getBudgetState(percentage: number) {
  if (percentage >= 100) {
    return { level: 'exceeded' as const, color: EXCEEDED_COLOR, label: 'Exceeded' };
  }
  if (percentage >= 80) {
    return { level: 'warning' as const, color: WARNING_COLOR, label: 'Near limit' };
  }
  return { level: 'safe' as const, color: SAFE_COLOR, label: 'On track' };
}

export default function BudgetProgressCard({ budget, formatCurrency }: BudgetProgressCardProps) {
  const budgetAmount = budget.budget_amount ?? 0;
  const actualAmount = budget.actual_amount ?? 0;
  const percentage = budgetAmount > 0 ? Math.min(100, (actualAmount / budgetAmount) * 100) : 0;
  const state = getBudgetState(percentage);
  const remaining = budgetAmount > 0 ? budgetAmount - actualAmount : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border/80 bg-card/40 p-4 shadow-[0_8px_30px_rgba(2,6,23,0.2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: budget.color }} />
            <h4 className="text-sm font-semibold text-gray-100">{budget.category_name}</h4>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {budgetAmount > 0 ? `${formatCurrency(actualAmount)} of ${formatCurrency(budgetAmount)} used` : 'No monthly budget set'}
          </p>
        </div>
        <div className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: state.color, borderColor: `${state.color}40` }}>
          {state.label}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-gray-400">
          <span>Consumption</span>
          <span style={{ color: state.color }}>{Math.round(percentage)}%</span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-gray-800/70">
          <motion.div
            initial={{ width: 0 }}
            animate={state.level === 'exceeded'
              ? { width: `${Math.min(100, percentage)}%`, scaleX: [1, 1.01, 1], opacity: [0.92, 1, 0.92] }
              : { width: `${Math.min(100, percentage)}%` }}
            transition={state.level === 'exceeded' ? { duration: 1.25, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: state.color }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          {state.level === 'exceeded' ? <AlertCircle className="h-3.5 w-3.5" style={{ color: state.color }} /> : <ArrowUpRight className="h-3.5 w-3.5" style={{ color: state.color }} />}
          {budgetAmount > 0 ? `${remaining >= 0 ? 'Remaining' : 'Over'} ${formatCurrency(Math.abs(remaining))}` : 'Set a budget to track progress'}
        </span>
        <span className="font-semibold" style={{ color: state.color }}>{budgetAmount > 0 ? `${budget.actual_amount.toFixed(0)} / ${(budget.budget_amount ?? 0).toFixed(0)}` : '—'}</span>
      </div>
    </motion.div>
  );
}
