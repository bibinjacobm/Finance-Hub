import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Download,
  Plus,
  Search,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { CategoryName, Transaction, TransactionType } from '../types/finance';
import {
  ALL_CATEGORIES,
  exportTransactionsCSV,
  formatCurrency,
  formatShortDate,
} from '../utils/format';

interface LedgerViewProps {
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const { state, showToast } = useFinance();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryName>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const currency = state.settings.currency;
  const masked = state.settings.privacyMode;

  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    state.accounts.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [state.accounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;
        if (q) {
          const hay = `${tx.merchant} ${tx.category} ${tx.notes || ''} ${accountMap[tx.accountId] || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp =
          sortBy === 'date'
            ? a.date.localeCompare(b.date)
            : a.amount - b.amount;
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [state.transactions, search, typeFilter, categoryFilter, accountFilter, sortBy, sortDir, accountMap]);

  const summary = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filtered.forEach((tx) => {
      if (tx.type === 'income') inflow += tx.amount;
      else if (tx.type === 'expense') outflow += tx.amount;
    });
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

  const toggleSort = (col: 'date' | 'amount') => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const handleExportCSV = () => {
    exportTransactionsCSV(filtered, accountMap);
    showToast(`Exported ${filtered.length} entries to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtered Inflow</span>
          <p className="mt-2 text-xl font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.inflow, currency, { signed: true, masked })}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtered Outflow</span>
          <p className="mt-2 text-xl font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(-summary.outflow, currency, { masked })}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Net Position · {filtered.length} entries
          </span>
          <p
            className={`mt-2 text-xl font-mono font-semibold ${
              summary.net >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(summary.net, currency, { signed: true, masked })}
          </p>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant, memo, or account..."
                aria-label="Search transactions"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F15] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161D29] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Segmented Type Filter */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#090C10] border border-slate-200/70 dark:border-slate-800 self-start">
              {(['all', 'income', 'expense', 'transfer'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'all' | CategoryName)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F15] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by account"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F15] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="all">All Accounts</option>
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Data Grid */}
        {filtered.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-6">
                      <button
                        type="button"
                        onClick={() => toggleSort('date')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <span>Date</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-4">Merchant & Memo</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('amount')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer ml-auto"
                      >
                        <span>Amount</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
                  {filtered.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => onEditTransaction(tx)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-6 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatShortDate(tx.date)}
                        </td>
                        <td className="py-3.5 px-4 max-w-[280px]">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {tx.merchant}
                          </p>
                          {tx.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {tx.category}
                          {tx.recurring ? ' · Recurring' : ''}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {accountMap[tx.accountId] || 'Local'}
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <span
                            className={
                              tx.status === 'cleared'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {tx.status === 'cleared' ? 'Cleared' : 'Pending'}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-6 text-right font-mono font-semibold whitespace-nowrap ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isTransfer
                                ? 'text-sky-600 dark:text-sky-400'
                                : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {formatCurrency(isIncome ? tx.amount : isTransfer ? tx.amount : -tx.amount, currency, {
                            signed: !isTransfer,
                            masked,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Native Mobile Tap List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/70">
              {filtered.map((tx) => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="w-full min-h-[64px] px-4 py-3.5 flex items-center justify-between gap-3 text-left active:bg-slate-100 dark:active:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isTransfer
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {tx.merchant}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tx.category} · {formatShortDate(tx.date)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-mono font-semibold ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isTransfer
                              ? 'text-sky-600 dark:text-sky-400'
                              : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatCurrency(isIncome ? tx.amount : isTransfer ? tx.amount : -tx.amount, currency, {
                          signed: !isTransfer,
                          masked,
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                        {tx.status}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-14 px-6 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {state.transactions.length === 0
                ? 'No transactions recorded yet'
                : 'No transactions match your current filters'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {state.transactions.length === 0
                ? 'Start recording cash flow to unlock live analytics and budget tracking.'
                : 'Clear search or adjust category and account filters to inspect more records.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {state.transactions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setAccountFilter('all');
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenNewTransaction}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Add First Transaction
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
