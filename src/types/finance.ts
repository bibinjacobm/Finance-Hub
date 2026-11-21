export type NavTab = 'overview' | 'ledger' | 'budgets' | 'goals' | 'analytics' | 'vault';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR' | 'CHF';

export type ThemeMode = 'dark' | 'light';

export type Timeframe = '30D' | '90D' | '6M' | '1Y';

export type AccountType = 'checking' | 'treasury' | 'brokerage' | 'private' | 'credit';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type CategoryName =
  | 'Compensation'
  | 'Advisory & Dividends'
  | 'Housing & Office'
  | 'Dining & Hospitality'
  | 'Travel & Aviation'
  | 'Software & Cloud'
  | 'Wellness & Health'
  | 'Investments'
  | 'Operations & Tax'
  | 'Lifestyle & Retail'
  | 'Transfer';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  mask: string;
  balance: number; // Negative for credit/liability balances
  apy?: number;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: CategoryName;
  type: TransactionType;
  amount: number; // Positive number; direction determined by type
  accountId: string;
  notes?: string;
  recurring?: boolean;
  status: 'cleared' | 'pending';
}

export interface Budget {
  id: string;
  category: CategoryName;
  monthlyLimit: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: 'Liquidity' | 'Real Estate' | 'Capital' | 'Sabbatical';
  monthlyAutoSave: number;
}

export interface NetWorthSnapshot {
  month: string; // e.g. '2026-01'
  label: string; // e.g. 'Jan'
  assets: number;
  liabilities: number;
  netWorth: number;
  income: number;
  expenses: number;
}

export interface AppSettings {
  theme: ThemeMode;
  currency: CurrencyCode;
  privacyMode: boolean; // Masks sensitive balances on screen
  monthlyIncomeTarget: number;
}

export interface FinanceState {
  version: string;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  history: NetWorthSnapshot[];
  settings: AppSettings;
}
