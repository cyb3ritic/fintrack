import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Remove after 3.5 seconds automatically
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto flex items-center gap-3 p-4 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-2xl min-w-[320px] max-w-[400px]"
            >
              {toast.type === 'success' && (
                <div className="p-1 rounded-lg bg-accent-emerald/10 text-accent-emerald">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="p-1 rounded-lg bg-accent-rose/10 text-accent-rose">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="p-1 rounded-lg bg-accent-indigo/10 text-accent-indigo">
                  <Info className="w-5 h-5 flex-shrink-0" />
                </div>
              )}
              
              <div className="flex-grow pr-2">
                <p className="text-sm font-medium text-gray-200">{toast.message}</p>
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-500 hover:text-gray-300 p-0.5 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
