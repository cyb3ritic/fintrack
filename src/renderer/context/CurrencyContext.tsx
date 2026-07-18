import React, { createContext, useContext, useState } from 'react';

export type CurrencyCode = 'INR';

interface CurrencyContextType {
  currency: CurrencyCode;
  formatCurrency: (value: number, includeDecimals?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency] = useState<CurrencyCode>('INR');

  const formatCurrency = (value: number, includeDecimals = false) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
