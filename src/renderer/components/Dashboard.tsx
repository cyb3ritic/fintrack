import { motion } from 'framer-motion';
import { Wallet, Landmark, TrendingUp, CircleDollarSign, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import StatCard from './StatCard';
import { DashboardStats } from '../hooks/useDatabase';
import { formatINR } from '../utils/format';

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
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

export default function Dashboard({ stats, isLoading }: DashboardProps) {
  // Safe default calculations if stats are missing
  const netWorth = stats?.netWorth ?? 0;
  const cash = stats?.cash ?? 0;
  const totalInvested = stats?.totalInvested ?? 0;
  const currentInvestmentValue = stats?.currentInvestmentValue ?? 0;
  const categoryExpenses = stats?.categoryExpenses ?? [];
  const monthlyTrends = stats?.monthlyTrends ?? [];
  const assetAllocation = stats?.assetAllocation ?? [];

  // Net investment gains
  const investmentGain = currentInvestmentValue - totalInvested;
  const investmentGainPercent = totalInvested > 0 ? (investmentGain / totalInvested) * 100 : 0;

  // Custom tooltips for Recharts to preserve premium theme look
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
              <span className="text-gray-100">{formatINR(p.value)}</span>
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
          <span className="text-gray-100">{formatINR(data.value)}</span>
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
          <p className="text-sm text-gray-500 font-medium">Here's your local wealth snapshot.</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-card/40 border border-border rounded-xl text-xs font-semibold text-gray-400">
          <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          Offline Vault Secured
        </div>
      </motion.div>

      {/* Main KPI Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Net Worth"
          value={netWorth}
          icon={Wallet}
          colorClass="text-accent-indigo bg-accent-indigo"
          isLoading={isLoading}
          subtitle="Cash + Investments"
        />
        <StatCard
          title="Liquid Cash"
          value={cash}
          icon={CircleDollarSign}
          colorClass="text-accent-emerald bg-accent-emerald"
          isLoading={isLoading}
          subtitle="Income - Outflows"
        />
        <StatCard
          title="Invested Principal"
          value={totalInvested}
          icon={Landmark}
          colorClass="text-yellow-500 bg-yellow-500"
          isLoading={isLoading}
          subtitle="Total Capital Invested"
        />
        <StatCard
          title="Current Assets Value"
          value={currentInvestmentValue}
          icon={TrendingUp}
          colorClass="text-accent-indigo bg-accent-indigo"
          isLoading={isLoading}
          subtitle="Current Valuation"
        />
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-200">Income vs Expenses</h3>
            <p className="text-xs text-gray-500">6-Month financial trends</p>
          </div>
          
          <div className="h-72 w-full">
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
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b202c" />
                  <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area name="Income" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area name="Expense" type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expenses Donut Chart */}
        <div className="p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-200">Category Breakdown</h3>
            <p className="text-xs text-gray-500">Expenses distributed by category</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center relative">
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
                
                {/* Total Expense Label inside donut */}
                <div className="absolute flex flex-col items-center justify-center select-none pointer-events-none">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Total Expense</span>
                  <span className="text-xl font-extrabold text-white">
                    {formatINR(categoryExpenses.reduce((sum, item) => sum + item.value, 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Investment Portfolio Widget */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Asset Distribution */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col gap-4 justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-200">Portfolio Distribution</h3>
            <p className="text-xs text-gray-500">Asset classes current valuation details</p>
          </div>

          {isLoading ? (
            <div className="h-32 bg-gray-900/50 animate-pulse rounded-lg w-full" />
          ) : assetAllocation.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-gray-500">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm font-medium">No assets registered in portfolio</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {assetAllocation.map((asset) => {
                const totalVal = assetAllocation.reduce((acc, a) => acc + a.value, 0);
                const percent = totalVal > 0 ? (asset.value / totalVal) * 100 : 0;
                
                return (
                  <div key={asset.type} className="p-4 rounded-xl bg-card/50 border border-border flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 bg-accent-indigo" style={{ width: `${percent}%` }} />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">{asset.type}</span>
                      <span className="text-[10px] font-extrabold text-accent-indigo bg-accent-indigo/10 px-1.5 py-0.5 rounded">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-extrabold text-white">{formatINR(asset.value)}</span>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase">Current Value</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Investment Performance summary */}
        <div className="p-5 rounded-2xl border border-border bg-card/25 backdrop-blur-md flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-200">Portfolio Performance</h3>
            <p className="text-xs text-gray-500">Unrealized profit & loss calculation</p>
          </div>

          <div className="flex flex-col gap-5 my-2">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <span className="text-xs text-gray-400 font-semibold">Invested Principal</span>
              <span className="text-sm font-bold text-white">{formatINR(totalInvested)}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <span className="text-xs text-gray-400 font-semibold">Current Value</span>
              <span className="text-sm font-bold text-white">{formatINR(currentInvestmentValue)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 font-semibold">Total Gain / Loss</span>
              <div className={`flex items-center gap-1 font-bold text-sm ${investmentGain >= 0 ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                {investmentGain >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{formatINR(Math.abs(investmentGain))}</span>
                <span className="text-xs font-semibold">({investmentGainPercent.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-semibold text-gray-600 bg-gray-900/30 p-2.5 rounded-xl border border-border/40 leading-relaxed">
            * Valuations represent local entries only. Perform periodic asset manual re-valuations under the "Investments" tab.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
