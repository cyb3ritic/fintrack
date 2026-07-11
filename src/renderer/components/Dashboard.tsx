import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, AlertCircle, Eye, EyeOff, ArrowDownRight, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import StatCard from './StatCard';
import BudgetProgressCard from './BudgetProgressCard';
import { Budget, DashboardStats, Transaction } from '../hooks/useDatabase';
import { useCurrency } from '../context/CurrencyContext';

interface DashboardProps {
  stats: DashboardStats | null;
  transactions: Transaction[];
  budgets: Budget[];
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

export default function Dashboard({ stats, transactions, budgets, isLoading, range, setRange }: DashboardProps) {
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
  const [isBudgetOverviewMasked, setIsBudgetOverviewMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_budget_overview') === null ? true : sessionStorage.getItem('mask_dashboard_budget_overview') === 'true'
  );
  const [isForecastMasked, setIsForecastMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_forecast') === null ? true : sessionStorage.getItem('mask_dashboard_forecast') === 'true'
  );
  const [isSavingsMasked, setIsSavingsMasked] = useState<boolean>(() =>
    sessionStorage.getItem('mask_dashboard_savings') === null ? true : sessionStorage.getItem('mask_dashboard_savings') === 'true'
  );

  const toggleChartMask = () => setIsChartMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_chart', String(next)); return next; });
  const toggleExpensesMask = () => setIsExpensesMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_expenses', String(next)); return next; });
  const toggleCashFlowMask = () => setIsCashFlowMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_cashflow', String(next)); return next; });
  const toggleBalanceTrendMask = () => setIsBalanceTrendMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_balance_trend', String(next)); return next; });
  const toggleBudgetOverviewMask = () => setIsBudgetOverviewMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_budget_overview', String(next)); return next; });
  const toggleForecastMask = () => setIsForecastMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_forecast', String(next)); return next; });
  const toggleSavingsMask = () => setIsSavingsMasked((prev) => { const next = !prev; sessionStorage.setItem('mask_dashboard_savings', String(next)); return next; });

  const isInvestmentTransaction = (tx: Transaction) => {
    const category = tx.category?.toLowerCase() || '';
    const subcategory = tx.subcategory?.toLowerCase() || '';
    const note = tx.note?.toLowerCase() || '';
    return category.includes('investment') || subcategory.includes('investment') || note.includes('investment');
  };

  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = currentDate.getDate();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const currentMonthExpenses = useMemo(() => transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonthKey) && !isInvestmentTransaction(tx)), [transactions, currentMonthKey]);
  const currentMonthSpend = currentMonthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const dailyBurnRate = currentMonthSpend / Math.max(currentDay, 1);
  const projectedSpending = dailyBurnRate * daysInMonth;
  const budgetPool = budgets.reduce((sum, budget) => sum + (budget.budget_amount ?? 0), 0);
  const projectedOverage = projectedSpending > budgetPool && budgetPool > 0 ? projectedSpending - budgetPool : 0;
  const isForecastWarning = projectedOverage > 0;

  const savingsRateSeries = useMemo(() => {
    const series: { month: string; savingsRate: number }[] = [];

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthIncome = transactions
        .filter((tx) => tx.type === 'income' && tx.date.startsWith(monthKey))
        .reduce((sum, tx) => sum + tx.amount, 0);
      const monthExpenses = transactions
        .filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthKey) && !isInvestmentTransaction(tx))
        .reduce((sum, tx) => sum + tx.amount, 0);
      const monthInvestments = transactions
        .filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthKey) && isInvestmentTransaction(tx))
        .reduce((sum, tx) => sum + tx.amount, 0);

      const savingsRate = monthIncome > 0 ? ((monthIncome - (monthExpenses + monthInvestments)) / monthIncome) * 100 : 0;
      series.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        savingsRate: Number(savingsRate.toFixed(1)),
      });
    }

    return series;
  }, [transactions, currentDate]);

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

      {/* Budget Overview */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-5">
        <div className="rounded-2xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-200">Budget Overview</h3>
              <p className="text-xs text-gray-500">Current month spending against your set monthly limits.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleBudgetOverviewMask()}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800/40 hover:text-white"
                title={isBudgetOverviewMasked ? 'Reveal values' : 'Hide values'}
              >
                {isBudgetOverviewMasked ? <EyeOff className="h-3.5 w-3.5 text-accent-rose" /> : <Eye className="h-3.5 w-3.5 text-accent-emerald" />}
              </button>
              <div className="rounded-full border border-accent-indigo/30 bg-accent-indigo/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-indigo">
                Live
              </div>
            </div>
          </div>

          <div className={`transition-all duration-300 ${isBudgetOverviewMasked ? 'blur-md select-none' : 'blur-none'}`}>
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-2xl bg-gray-900/50" />
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-gray-500">
                No budgets set for this month yet. Open the budget manager to start tracking your spending limits.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {budgets.map((budget) => (
                  <BudgetProgressCard key={budget.category_id} budget={budget} formatCurrency={formatCurrency} />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Forecast & Savings Analytics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-5">
        <div className="rounded-2xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-200">Spending Forecast</h3>
              <p className="text-xs text-gray-500">Linear projection for this month based on your daily burn rate.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleForecastMask()}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800/40 hover:text-white"
                title={isForecastMasked ? 'Reveal values' : 'Hide values'}
              >
                {isForecastMasked ? <EyeOff className="h-3.5 w-3.5 text-accent-rose" /> : <Eye className="h-3.5 w-3.5 text-accent-emerald" />}
              </button>
              <div className="rounded-full border border-accent-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Predictive
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border border-border/70 bg-background/30 p-4 transition-all duration-300 ${isForecastMasked ? 'blur-md select-none' : 'blur-none'}`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Projected End-of-Month Spend</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{formatCurrency(projectedSpending)}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Current month spend</p>
                <p className="mt-1 text-sm font-semibold text-gray-300">{formatCurrency(currentMonthSpend)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span className="rounded-full bg-accent-indigo/10 px-2.5 py-1 text-[11px] font-semibold text-accent-indigo">Daily burn rate: {formatCurrency(dailyBurnRate)}</span>
              <span className="rounded-full bg-gray-800/70 px-2.5 py-1 text-[11px] font-semibold">{currentDay}/{daysInMonth} days elapsed</span>
            </div>

            {isForecastWarning && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-300 shadow-[0_0_30px_rgba(239,68,68,0.12)]"
              >
                Warning: Projected to exceed total monthly budget by {formatCurrency(projectedOverage)}
              </motion.div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/25 p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-200">Savings Rate Tracker</h3>
              <p className="text-xs text-gray-500">A rolling view of how much of your income you’re keeping each month.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSavingsMask()}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800/40 hover:text-white"
                title={isSavingsMasked ? 'Reveal values' : 'Hide values'}
              >
                {isSavingsMasked ? <EyeOff className="h-3.5 w-3.5 text-accent-rose" /> : <Eye className="h-3.5 w-3.5 text-accent-emerald" />}
              </button>
              <div className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-emerald">
                6-Month Trend
              </div>
            </div>
          </div>

          <div className={`h-56 w-full transition-all duration-300 ${isSavingsMasked ? 'blur-md select-none' : 'blur-none'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsRateSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b202c" />
                <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161920', border: '1px solid #222733', borderRadius: '0.75rem' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Savings Rate']}
                />
                <Area type="monotone" dataKey="savingsRate" stroke="#10b981" strokeWidth={2.2} fillOpacity={1} fill="url(#savingsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
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
