import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  isLoading: boolean;
  subtitle?: string;
}

export function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 800; // ms
    const startTime = performance.now();

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * (end - start) + start);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(updateNumber);
  }, [value]);

  return (
    <span>
      {new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(displayValue)}
    </span>
  );
}

export default function StatCard({ title, value, icon: Icon, colorClass, isLoading, subtitle }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl border border-border bg-card/50 flex flex-col gap-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-800 rounded w-24"></div>
          <div className="w-10 h-10 rounded-xl bg-gray-800"></div>
        </div>
        <div className="h-8 bg-gray-800 rounded w-36"></div>
        <div className="h-3 bg-gray-800 rounded w-16"></div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="p-6 rounded-2xl border border-border bg-card/30 backdrop-blur-md flex flex-col justify-between h-40 relative overflow-hidden group"
    >
      {/* Background Subtle Gradient Glow */}
      <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-5 blur-3xl transition-opacity duration-300 group-hover:opacity-10 bg-current ${colorClass}`} />

      <div className="flex justify-between items-start">
        <span className="text-sm font-semibold text-gray-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 shadow-sm flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-white select-text">
          <AnimatedNumber value={value} />
        </h2>
        {subtitle && (
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </motion.div>
  );
}
