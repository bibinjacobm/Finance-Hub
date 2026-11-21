import type { CategoryName, CurrencyCode } from '../types/finance';

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; symbol: string; decimals: number }> = {
  USD: { locale: 'en-US', symbol: '$', decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 2 },
  GBP: { locale: 'en-GB', symbol: '£', decimals: 2 },
  JPY: { locale: 'ja-JP', symbol: '¥', decimals: 0 },
  INR: { locale: 'en-IN', symbol: '₹', decimals: 0 },
  CHF: { locale: 'de-CH', symbol: 'CHF ', decimals: 2 },
};

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: 'INR', label: 'INR (₹) — Indian Rupee' },
  { code: 'USD', label: 'USD ($) — US Dollar' },
  { code: 'EUR', label: 'EUR (€) — Euro' },
  { code: 'GBP', label: 'GBP (£) — British Pound' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'JPY', label: 'JPY (¥) — Japanese Yen' },
];

export const EXPENSE_CATEGORIES: CategoryName[] = [
  'Housing & Office',
  'Dining & Hospitality',
  'Travel & Aviation',
  'Software & Cloud',
  'Wellness & Health',
  'Operations & Tax',
  'Lifestyle & Retail',
  'Investments',
];

export const INCOME_CATEGORIES: CategoryName[] = [
  'Compensation',
  'Advisory & Dividends',
];

export const ALL_CATEGORIES: CategoryName[] = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  'Transfer',
];

export function formatCurrency(
  value: number,
  currency: CurrencyCode = 'INR',
  options?: { compact?: boolean; signed?: boolean; masked?: boolean; whole?: boolean }
): string {
  if (options?.masked) {
    const sym = CURRENCY_CONFIG[currency]?.symbol ?? '₹';
    return `${sym}••••••`;
  }

  const cfg = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.INR;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : options?.signed && value > 0 ? '+' : '';

  if (options?.compact && currency === 'INR') {
    if (abs >= 10_000_000) {
      return `${sign}${cfg.symbol}${(abs / 10_000_000).toFixed(2)}Cr`;
    }
    if (abs >= 100_000) {
      return `${sign}${cfg.symbol}${(abs / 100_000).toFixed(2)}L`;
    }
    if (abs >= 10_000) {
      return `${sign}${cfg.symbol}${(abs / 1_000).toFixed(1)}k`;
    }
  } else {
    if (options?.compact && abs >= 1_000_000) {
      return `${sign}${cfg.symbol}${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (options?.compact && abs >= 10_000) {
      return `${sign}${cfg.symbol}${(abs / 1_000).toFixed(1)}k`;
    }
  }

  const maxFractionDigits = options?.whole ? 0 : cfg.decimals;
  const formatted = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options?.whole ? 0 : cfg.decimals,
    maximumFractionDigits: maxFractionDigits,
  }).format(abs);

  return `${sign}${formatted}`;
}

export function formatPercent(value: number, signed = false): string {
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(
  transactions: {
    date: string;
    merchant: string;
    category: string;
    type: string;
    amount: number;
    status: string;
    notes?: string;
  }[],
  accountMap: Record<string, string>
): void {
  const headers = ['Date', 'Merchant', 'Category', 'Type', 'Amount', 'Status', 'Notes'];
  const escape = (val: string | number | undefined) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map((t) => [
    escape(t.date),
    escape(t.merchant),
    escape(t.category),
    escape(t.type),
    escape(t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount)),
    escape(t.status),
    escape(t.notes || accountMap[t.merchant] || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `financehub-ledger-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}
