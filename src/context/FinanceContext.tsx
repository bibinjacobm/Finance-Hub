import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createSeedState } from '../data/seedData';
import type {
  Account,
  AppSettings,
  Budget,
  FinanceState,
  Goal,
  Transaction,
} from '../types/finance';

const STORAGE_KEY = 'financehub_v1_state';

function loadInitialState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<FinanceState>;
    if (
      parsed &&
      Array.isArray(parsed.accounts) &&
      Array.isArray(parsed.transactions) &&
      Array.isArray(parsed.budgets) &&
      Array.isArray(parsed.goals) &&
      parsed.settings
    ) {
      const seed = createSeedState();
      const migratedSettings = { ...seed.settings, ...parsed.settings };
      // Seamlessly adopt new INR default for prior 1.0.0 seed states
      if (parsed.version === '1.0.0' && parsed.settings.currency === 'USD') {
        migratedSettings.currency = 'INR';
      }
      return {
        version: '1.1.0',
        accounts: parsed.accounts,
        transactions: parsed.transactions,
        budgets: parsed.budgets,
        goals: parsed.goals,
        history: Array.isArray(parsed.history) && parsed.history.length > 0 ? parsed.history : seed.history,
        settings: migratedSettings,
      };
    }
  } catch {
    // Fall back to clean seed state if storage is corrupted
  }
  return createSeedState();
}

export interface DerivedMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  runwayMonths: number;
  netWorthDeltaPct: number;
}

interface FinanceContextValue {
  state: FinanceState;
  metrics: DerivedMetrics;
  storageBytes: number;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (acc: Omit<Account, 'id' | 'updatedAt'>) => void;
  updateAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;
  upsertBudget: (budget: Omit<Budget, 'id'> & { id?: string }) => void;
  deleteBudget: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (goal: Goal) => void;
  contributeToGoal: (goalId: string, amount: number, sourceAccountId?: string) => void;
  deleteGoal: (id: string) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  exportBackupJSON: () => string;
  importBackupJSON: (rawJson: string) => { ok: boolean; error?: string };
  resetDemoData: () => void;
  clearAllData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinanceState>(loadInitialState);
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Persist to LocalStorage whenever state changes
  useEffect(() => {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
      setStorageBytes(new Blob([serialized]).size);
    } catch {
      // Storage quota exceeded or unavailable
    }
  }, [state]);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.settings.theme]);

  const metrics = useMemo<DerivedMetrics>(() => {
    const totalAssets = state.accounts
      .filter((a) => a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = state.accounts
      .filter((a) => a.balance < 0)
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const netWorth = totalAssets - totalLiabilities;

    const liquidCash = state.accounts
      .filter((a) => a.type === 'checking' || a.type === 'treasury')
      .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

    // Compute 30-day rolling income & expenses from live transactions
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const recentTx = state.transactions.filter((t) => t.date >= cutoffStr);
    const monthlyIncome = recentTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = recentTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? Math.max(-100, (netCashFlow / monthlyIncome) * 100) : 0;
    const avgBurn = monthlyExpenses > 0 ? monthlyExpenses : 1;
    const runwayMonths = liquidCash > 0 ? Math.min(99, liquidCash / avgBurn) : 0;

    const prevSnapshot = state.history.length >= 2 ? state.history[state.history.length - 2] : null;
    const netWorthDeltaPct =
      prevSnapshot && prevSnapshot.netWorth > 0
        ? ((netWorth - prevSnapshot.netWorth) / prevSnapshot.netWorth) * 100
        : 0;

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidCash,
      monthlyIncome,
      monthlyExpenses,
      netCashFlow,
      savingsRate,
      runwayMonths,
      netWorthDeltaPct,
    };
  }, [state.accounts, state.transactions, state.history]);

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setState((prev) => {
        const delta = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0;
        const accounts = prev.accounts.map((acc) =>
          acc.id === tx.accountId
            ? { ...acc, balance: Number((acc.balance + delta).toFixed(2)), updatedAt: new Date().toISOString() }
            : acc
        );
        const transactions = [{ ...tx, id }, ...prev.transactions].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
        return { ...prev, accounts, transactions };
      });
      showToast('Transaction recorded locally');
    },
    [showToast]
  );

  const updateTransaction = useCallback(
    (updated: Transaction) => {
      setState((prev) => {
        const existing = prev.transactions.find((t) => t.id === updated.id);
        let accounts = prev.accounts;

        if (existing) {
          const oldDelta =
            existing.type === 'income' ? existing.amount : existing.type === 'expense' ? -existing.amount : 0;
          const newDelta =
            updated.type === 'income' ? updated.amount : updated.type === 'expense' ? -updated.amount : 0;

          accounts = prev.accounts.map((acc) => {
            let bal = acc.balance;
            if (acc.id === existing.accountId) bal -= oldDelta;
            if (acc.id === updated.accountId) bal += newDelta;
            if (bal !== acc.balance) {
              return { ...acc, balance: Number(bal.toFixed(2)), updatedAt: new Date().toISOString() };
            }
            return acc;
          });
        }

        const transactions = prev.transactions
          .map((t) => (t.id === updated.id ? updated : t))
          .sort((a, b) => b.date.localeCompare(a.date));

        return { ...prev, accounts, transactions };
      });
      showToast('Transaction updated');
    },
    [showToast]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setState((prev) => {
        const existing = prev.transactions.find((t) => t.id === id);
        let accounts = prev.accounts;
        if (existing) {
          const delta =
            existing.type === 'income' ? existing.amount : existing.type === 'expense' ? -existing.amount : 0;
          accounts = prev.accounts.map((acc) =>
            acc.id === existing.accountId
              ? { ...acc, balance: Number((acc.balance - delta).toFixed(2)), updatedAt: new Date().toISOString() }
              : acc
          );
        }
        return {
          ...prev,
          accounts,
          transactions: prev.transactions.filter((t) => t.id !== id),
        };
      });
      showToast('Transaction removed');
    },
    [showToast]
  );

  const addAccount = useCallback(
    (acc: Omit<Account, 'id' | 'updatedAt'>) => {
      const id = `acc_${Date.now()}`;
      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, { ...acc, id, updatedAt: new Date().toISOString() }],
      }));
      showToast('Account added');
    },
    [showToast]
  );

  const updateAccount = useCallback(
    (acc: Account) => {
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === acc.id ? { ...acc, updatedAt: new Date().toISOString() } : a
        ),
      }));
      showToast('Account balance updated');
    },
    [showToast]
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== id),
      }));
      showToast('Account removed');
    },
    [showToast]
  );

  const upsertBudget = useCallback(
    (budget: Omit<Budget, 'id'> & { id?: string }) => {
      setState((prev) => {
        const exists = prev.budgets.find(
          (b) => b.id === budget.id || b.category === budget.category
        );
        if (exists) {
          return {
            ...prev,
            budgets: prev.budgets.map((b) =>
              b.id === exists.id ? { ...b, monthlyLimit: budget.monthlyLimit } : b
            ),
          };
        }
        return {
          ...prev,
          budgets: [
            ...prev.budgets,
            {
              id: `bud_${Date.now()}`,
              category: budget.category,
              monthlyLimit: budget.monthlyLimit,
            },
          ],
        };
      });
      showToast('Budget envelope saved');
    },
    [showToast]
  );

  const deleteBudget = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        budgets: prev.budgets.filter((b) => b.id !== id),
      }));
      showToast('Budget envelope removed');
    },
    [showToast]
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id'>) => {
      setState((prev) => ({
        ...prev,
        goals: [...prev.goals, { ...goal, id: `goal_${Date.now()}` }],
      }));
      showToast('Wealth goal created');
    },
    [showToast]
  );

  const updateGoal = useCallback(
    (goal: Goal) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === goal.id ? goal : g)),
      }));
      showToast('Goal updated');
    },
    [showToast]
  );

  const contributeToGoal = useCallback(
    (goalId: string, amount: number, sourceAccountId?: string) => {
      if (amount <= 0) return;
      setState((prev) => {
        const goal = prev.goals.find((g) => g.id === goalId);
        if (!goal) return prev;

        const goals = prev.goals.map((g) =>
          g.id === goalId
            ? { ...g, currentAmount: Number((g.currentAmount + amount).toFixed(2)) }
            : g
        );

        let transactions = prev.transactions;
        if (sourceAccountId) {
          const tx: Transaction = {
            id: `tx_goal_${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            merchant: `Goal Contribution: ${goal.name}`,
            category: 'Transfer',
            type: 'transfer',
            amount,
            accountId: sourceAccountId,
            notes: 'Allocated toward wealth target',
            status: 'cleared',
          };
          transactions = [tx, ...prev.transactions];
        }

        return { ...prev, goals, transactions };
      });
      showToast('Contribution allocated to goal');
    },
    [showToast]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
      }));
      showToast('Goal removed');
    },
    [showToast]
  );

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  }, []);

  const exportBackupJSON = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importBackupJSON = useCallback(
    (rawJson: string): { ok: boolean; error?: string } => {
      try {
        const parsed = JSON.parse(rawJson) as Partial<FinanceState>;
        if (
          !parsed ||
          !Array.isArray(parsed.accounts) ||
          !Array.isArray(parsed.transactions) ||
          !Array.isArray(parsed.budgets) ||
          !Array.isArray(parsed.goals)
        ) {
          return { ok: false, error: 'Invalid FinanceHub backup structure.' };
        }
        const seed = createSeedState();
        setState({
          version: parsed.version || '1.0.0',
          accounts: parsed.accounts,
          transactions: parsed.transactions,
          budgets: parsed.budgets,
          goals: parsed.goals,
          history: Array.isArray(parsed.history) ? parsed.history : seed.history,
          settings: { ...seed.settings, ...(parsed.settings || {}) },
        });
        showToast('Backup restored to local storage');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Unable to parse JSON file.' };
      }
    },
    [showToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createSeedState();
    setState((prev) => ({
      ...fresh,
      settings: { ...fresh.settings, theme: prev.settings.theme, currency: prev.settings.currency },
    }));
    showToast('Executive sample dataset restored');
  }, [showToast]);

  const clearAllData = useCallback(() => {
    setState((prev) => ({
      version: '1.0.0',
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
      history: [],
      settings: prev.settings,
    }));
    showToast('All local financial records cleared');
  }, [showToast]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      metrics,
      storageBytes,
      toastMessage,
      showToast,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      upsertBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      contributeToGoal,
      deleteGoal,
      updateSettings,
      exportBackupJSON,
      importBackupJSON,
      resetDemoData,
      clearAllData,
    }),
    [
      state,
      metrics,
      storageBytes,
      toastMessage,
      showToast,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addAccount,
      updateAccount,
      deleteAccount,
      upsertBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      contributeToGoal,
      deleteGoal,
      updateSettings,
      exportBackupJSON,
      importBackupJSON,
      resetDemoData,
      clearAllData,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
