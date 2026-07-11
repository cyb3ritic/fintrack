import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, Eye, EyeOff, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import StatCard from './StatCard';
import { DashboardStats } from '../hooks/useDatabase';
import { useCurrency } from '../context/CurrencyContext';

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  range: string;
  setRange: (range: string) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#f43f5e', '#14b8a6', '#64748b'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 22 }
  }
};

export default function Dashboard({ stats, isLoading, range, setRange }: DashboardProps) {
  const { formatCurrency, currency } = useCurrency();

  const [isChartMasked, setIsChartMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_chart') === null ? true : sessionStorage.getItem('mask_dashboard_chart') === 'true'
  );
  const [isExpensesMasked, setIsExpensesMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_expenses') === null ? true : sessionStorage.getItem('mask_dashboard_expenses') === 'true'
  );
  const [isCashFlowMasked, setIsCashFlowMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_cashflow') === null ? true : sessionStorage.getItem('mask_dashboard_cashflow') === 'true'
  );
  const [isBalanceTrendMasked, setIsBalanceTrendMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_balance_trend') === null ? true : sessionStorage.getItem('mask_dashboard_balance_trend') === 'true'
  );

  const toggleChartMask = () => setIsChartMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_chart', String(next)); return next; });
  const toggleExpensesMask = () => setIsExpensesMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_expenses', String(next)); return next; });
  const toggleCashFlowMask = () => setIsCashFlowMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_cashflow', String(next)); return next; });
  const toggleBalanceTrendMask = () => setIsBalanceTrendMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_balance_trend', String(next)); return next; });

  const getSymbol = () => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '₹';
    }
  };

  const liquidBalance = stats?.liquidBalance ?? 0;
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;
  const categoryExpenses = stats?.categoryExpenses ?? [];
  const monthlyTrends = stats?.monthlyTrends ?? [];
  const liquidBalanceTrends = stats?.liquidBalanceTrends ?? [];

  const totalOutflow = totalExpense;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-card border border-border rounded-xl shadow-2xl">
          <p className="text-xs font-semibold text-gray-400 mb-1.5">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                <span className="text-gray-300">{p.name}:</span>
              </span>
              <span className={`text-gray-100 ${isChartMasked ? 'blur-sm select-none' : ''}`}>{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="p-3 bg-card border border-border rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.fill }} />
            <span className="text-gray-300">{data.name}:</span>
          </span>
          <span className={`text-gray-100 ${isExpensesMasked ? 'blur-sm select-none' : ''}`}>{formatCurrency(data.value)}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6"
    >
      {/* Dashboard Greeting Header */}
      <motion.div variants={itemVariants} className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 font-medium">Here's your cash snapshot.</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-card/40 border border-border rounded-xl text-xs font-semibold text-gray-400">
          <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          Offline Vault Secured
        </div>
      </motion.div>

      {/* Main KPI Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Liquid Balance"
          value={liquidBalance}
          icon={Wallet}
          colorClass="text-accent-indigo bg-accent-indigo"
          isLoading={isLoading}
          subtitle="Income - Outflows"
        />
        <StatCard
          title="Total Income"
          value={totalIncome}
          icon={TrendingUp}
          colorClass="text-accent-emerald bg-accent-emerald"
          isLoading={isLoading}
          subtitle="All earnings"
        />
        <StatCard
          title="Total Expenses"
          value={totalExpense}
          icon={ArrowDownRight}
          colorClass="text-accent-rose bg-accent-rose"
          isLoading={isLoading}
          subtitle="Spending"
        />
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4 relative group">
          <button
            onClick={() => toggleChartMask()}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 transition-all opacity-60 hover:opacity-100 flex items-center justify-center"
            title={isChartMasked ? 'Reveal values' : 'Hide values'}
          >
            {isChartMasked ? <EyeOff className="w-3.5 h-3.5 text-accent-rose" /> : <Eye className="w-3.5 h-3.5 text-accent-emerald" />}
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none pr-8">
            <div>
              <h3 className="text-base font-bold text-gray-200">Income vs Outflow</h3>
              <p className="text-xs text-gray-500">Income compared to expenses</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-card rounded-lg border border-border p-1">
                {['1M', '3M', '6M', '1Y', 'ALL'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`text-[9px] font-extrabold uppercase py-1.5 px-2.5 rounded-md transition-colors ${
                      range === r ? 'bg-accent-indigo/20 text-accent-indigo' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`h-72 w-full transition-all duration-300 ${isChartMasked ? 'blur-md select-none' : 'blur-none'}`}>
            {isLoading ? (
              <div className="w-full h-full bg-gray-900/50 animate-pulse rounded-lg" />
            ) : monthlyTrends.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-gray-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">Not enough historical transaction data</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b202c" />
                  <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${getSymbol()}${v >= 1000 ? `${v/1000}k` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area name="Income" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area name="Outflow" type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expenses Donut Chart */}
        <div className="p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4 relative group">
          <button
            onClick={() => toggleExpensesMask()}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 transition-all opacity-60 hover:opacity-100 flex items-center justify-center"
            title={isExpensesMasked ? 'Reveal values' : 'Hide values'}
          >
            {isExpensesMasked ? <EyeOff className="w-3.5 h-3.5 text-accent-rose" /> : <Eye className="w-3.5 h-3.5 text-accent-emerald" />}
          </button>

          <div className="pr-8">
            <h3 className="text-base font-bold text-gray-200">Category Breakdown</h3>
            <p className="text-xs text-gray-500">Expenses distributed by category</p>
          </div>

          <div className={`h-72 w-full flex items-center justify-center relative transition-all duration-300 ${isExpensesMasked ? 'blur-md select-none' : 'blur-none'}`}>
            {isLoading ? (
              <div className="w-full h-full bg-gray-900/50 animate-pulse rounded-lg" />
            ) : categoryExpenses.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-gray-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">No recorded expenses</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Pie
                      data={categoryExpenses}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categoryExpenses.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#161920" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute flex flex-col items-center justify-center select-none pointer-events-none">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Total Expense</span>
                  <span className={`text-xl font-extrabold text-white transition-all duration-300 ${isExpensesMasked ? 'blur-md select-none' : ''}`}>
                    {formatCurrency(categoryExpenses.reduce((sum, item) => sum + item.value, 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Cash Flow Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4 relative group">
          <button
            onClick={() => toggleCashFlowMask()}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 transition-all opacity-60 hover:opacity-100 flex items-center justify-center"
            title={isCashFlowMasked ? 'Reveal values' : 'Hide values'}
          >
            {isCashFlowMasked ? <EyeOff className="w-3.5 h-3.5 text-accent-rose" /> : <Eye className="w-3.5 h-3.5 text-accent-emerald" />}
          </button>

          <div className="pr-8">
            <h3 className="text-base font-bold text-gray-200">Cash Flow Summary</h3>
            <p className="text-xs text-gray-500">Lifetime income, outflow, and available cash</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <div className="p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-accent-emerald uppercase tracking-wider">Total Income</span>
              <span className={`text-lg font-extrabold text-white transition-all duration-300 ${isCashFlowMasked ? 'blur-md select-none' : ''}`}>{formatCurrency(totalIncome)}</span>
            </div>
            <div className="p-4 rounded-xl bg-accent-rose/5 border border-accent-rose/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-accent-rose uppercase tracking-wider">Total Outflow</span>
              <span className={`text-lg font-extrabold text-white transition-all duration-300 ${isCashFlowMasked ? 'blur-md select-none' : ''}`}>{formatCurrency(totalOutflow)}</span>
              <div className="flex gap-2 text-[10px] text-gray-400">
                <span className={`transition-all duration-300 ${isCashFlowMasked ? 'blur-sm select-none' : ''}`}>Expenses: {formatCurrency(totalExpense)}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-accent-indigo/5 border border-accent-indigo/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-accent-indigo uppercase tracking-wider">Liquid Balance</span>
              <span className={`text-lg font-extrabold transition-all duration-300 ${liquidBalance >= 0 ? 'text-accent-emerald' : 'text-accent-rose'} ${isCashFlowMasked ? 'blur-md select-none' : ''}`}>
                {formatCurrency(liquidBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Liquid Balance Trend miniature */}
        <div className="p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4 relative group">
          <button
            onClick={() => toggleBalanceTrendMask()}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 transition-all opacity-60 hover:opacity-100 flex items-center justify-center"
            title={isBalanceTrendMasked ? 'Reveal values' : 'Hide values'}
          >
            {isBalanceTrendMasked ? <EyeOff className="w-3.5 h-3.5 text-accent-rose" /> : <Eye className="w-3.5 h-3.5 text-accent-emerald" />}
          </button>

          <div className="pr-8">
            <h3 className="text-base font-bold text-gray-200">Balance Trend</h3>
            <p className="text-xs text-gray-500">Liquid balance over time</p>
          </div>

          {isLoading ? (
            <div className="h-36 bg-gray-900/50 animate-pulse rounded-lg" />
          ) : liquidBalanceTrends.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-gray-500">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm font-medium">No historical data</span>
            </div>
          ) : (
            <div className={`h-36 w-full transition-all duration-300 ${isBalanceTrendMasked ? 'blur-md select-none' : 'blur-none'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liquidBalanceTrends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b202c" />
                  <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area name="Balance" type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
