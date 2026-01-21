import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type CurrencyMode = 'INR' | 'EUR';

interface CurrencyContextType {
  currencyMode: CurrencyMode;
  eurRate: number;
  isViewOnly: boolean;
  toggleCurrency: () => void;
  formatAmount: (amount: number) => string;
  getCurrencySymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('INR');
  const [eurRate, setEurRate] = useState<number>(106);

  useEffect(() => {
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    const { data } = await supabase
      .from('foreign_exchange_rates')
      .select('inr_per_unit')
      .eq('currency_code', 'EUR')
      .maybeSingle();

    if (data) {
      setEurRate(data.inr_per_unit);
    }
  };

  const toggleCurrency = () => {
    setCurrencyMode(prev => prev === 'INR' ? 'EUR' : 'INR');
  };

  const formatAmount = (amount: number): string => {
    if (currencyMode === 'EUR') {
      const eurAmount = amount / eurRate;
      return eurAmount.toFixed(2);
    }
    return amount.toFixed(2);
  };

  const getCurrencySymbol = (): string => {
    return currencyMode === 'INR' ? '₹' : '€';
  };

  const isViewOnly = currencyMode === 'EUR';

  return (
    <CurrencyContext.Provider value={{
      currencyMode,
      eurRate,
      isViewOnly,
      toggleCurrency,
      formatAmount,
      getCurrencySymbol,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
