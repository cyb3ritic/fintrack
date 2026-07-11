import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Eye, EyeOff } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  isLoading: boolean;
  subtitle?: string;
}

export function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    const start = prevValueRef.current;
    const end = value;
    const duration = 800; // ms
    const startTime = performance.now();
    let animationFrameId: number;

    const updateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * (end - start) + start);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateNumber);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(updateNumber);

    return () => {
      cancelAnimationFrame(animationFrameId);
      prevValueRef.current = end;
    };
  }, [value]);

  return (
    <span>
      {formatCurrency(displayValue)}
    </span>
  );
}

export default function StatCard({ title, value, icon: Icon, colorClass, isLoading, subtitle }: StatCardProps) {
  const [isMasked, setIsMasked] = useState<boolean>(() => {
    const key = `mask_stat_card_${title.toLowerCase().replace(/\s+/g, '_')}`;
    const stored = sessionStorage.getItem(key);
    return stored === null ? true : stored === 'true';
  });

  const toggleMask = () => {
    setIsMasked((prev) => {
      const next = !prev;
      const key = `mask_stat_card_${title.toLowerCase().replace(/\s+/g, '_')}`;
      sessionStorage.setItem(key, String(next));
      return next;
    });
  };

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

      {/* Eye Toggle in Top-Right Corner */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleMask();
        }}
        className="absolute top-3 right-3 z-20 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 transition-all opacity-60 hover:opacity-100 flex items-center justify-center"
        title={isMasked ? 'Reveal value' : 'Hide value'}
      >
        {isMasked ? <EyeOff className="w-3.5 h-3.5 text-accent-rose" /> : <Eye className="w-3.5 h-3.5 text-accent-emerald" />}
      </button>

      <div className="flex justify-between items-start pr-6">
        <span className="text-sm font-semibold text-gray-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 shadow-sm flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <h2 className={`text-3xl font-extrabold tracking-tight text-white select-text ${isMasked ? 'blur-md select-none transition-all duration-300' : ''}`}>
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
