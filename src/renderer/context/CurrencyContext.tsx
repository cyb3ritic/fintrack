import React, { createContext, useContext, useState } from 'react';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatCurrency: (value: number, includeDecimals?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const localeMap: Record<CurrencyCode, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem('fintrack_currency');
    return (stored as CurrencyCode) || 'INR';
  });

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('fintrack_currency', code);
  };

  const formatCurrency = (value: number, includeDecimals = false) => {
    const locale = localeMap[currency] || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: includeDecimals ? 2 : 0,
      maximumFractionDigits: includeDecimals ? 2 : 0,
    }).format(value);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
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
