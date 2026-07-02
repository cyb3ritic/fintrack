import { LayoutDashboard, Receipt, BarChart3, Settings, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabId = 'dashboard' | 'transactions' | 'investments' | 'settings';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as TabId, label: 'Transactions', icon: Receipt },
    { id: 'investments' as TabId, label: 'Investments', icon: BarChart3 },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-card/40 border-r border-border h-screen flex flex-col justify-between p-6 flex-shrink-0">
      <div className="flex flex-col gap-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-accent-indigo to-accent-emerald text-white shadow-glow-indigo">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-none tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
              FINTRACK
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-accent-emerald font-semibold">
              cyb3ritic
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col gap-1.5 relative">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors select-none group w-full text-left ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {/* Active Indicator Slide Overlay */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-accent-indigo/20 to-accent-indigo/5 border-l-2 border-accent-indigo rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <Icon className={`w-5 h-5 z-10 transition-transform group-hover:scale-105 duration-200 ${isActive ? 'text-accent-indigo' : 'text-gray-500 group-hover:text-gray-400'}`} />
                <span className="z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Meta Details */}
      <div className="px-2 text-[11px] text-gray-600 flex flex-col gap-1">
        <p className="font-medium">100% Offline Vault</p>
        <p>© 2026 AntiGravity Lab</p>
      </div>
    </aside>
  );
}
