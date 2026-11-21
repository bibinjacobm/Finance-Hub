import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { CategoryName, Transaction, TransactionType } from '../../types/finance';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/format';

interface TransactionSheetProps {
  open: boolean;
  editing?: Transaction | null;
  onClose: () => void;
}

const QUICK_AMOUNTS = [50, 250, 1000, 5000];

export const TransactionSheet: React.FC<TransactionSheetProps> = ({ open, editing, onClose }) => {
  const { state, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryName>('Dining & Hospitality');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'cleared' | 'pending'>('cleared');
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setType(editing.type);
      setMerchant(editing.merchant);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setAccountId(editing.accountId);
      setDate(editing.date);
      setStatus(editing.status);
      setRecurring(Boolean(editing.recurring));
      setNotes(editing.notes ?? '');
    } else {
      setType('expense');
      setMerchant('');
      setAmount('');
      setCategory('Dining & Hospitality');
      setAccountId(state.accounts[0]?.id ?? '');
      setDate(new Date().toISOString().slice(0, 10));
      setStatus('cleared');
      setRecurring(false);
      setNotes('');
    }
  }, [open, editing, state.accounts]);

  if (!open) return null;

  const availableCategories: CategoryName[] =
    type === 'income'
      ? INCOME_CATEGORIES
      : type === 'transfer'
        ? ['Transfer', 'Investments']
        : EXPENSE_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    if (nextType === 'income') setCategory('Compensation');
    else if (nextType === 'transfer') setCategory('Transfer');
    else setCategory('Dining & Hospitality');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!merchant.trim()) {
      setError('Enter a merchant or counterparty name.');
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }

    const payload = {
      merchant: merchant.trim(),
      amount: Number(numericAmount.toFixed(2)),
      type,
      category,
      accountId: accountId || state.accounts[0]?.id || 'acc_manual',
      date,
      status,
      recurring,
      notes: notes.trim() || undefined,
    };

    if (editing) {
      updateTransaction({ ...payload, id: editing.id });
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-sheet-title"
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11161F] border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#11161F]/95 backdrop-blur-md px-6 pt-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between gap-4">
            <h2 id="tx-sheet-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editing ? 'Edit Transaction' : 'New Transaction'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Segmented Type Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#090C10] border border-slate-200/80 dark:border-slate-800">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  type === t
                    ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount Input + Quick Tap Presets */}
          <div>
            <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Amount ({state.settings.currency})
            </label>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F15] px-4 py-2.5 text-2xl font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              autoFocus
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161D29] text-xs font-mono text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label htmlFor="tx-merchant" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Merchant / Counterparty
            </label>
            <input
              id="tx-merchant"
              type="text"
              placeholder="e.g., Stripe Payout, Whole Foods, Delta Air Lines"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-category" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryName)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Account + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-account" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Account
              </label>
              <select
                id="tx-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {state.accounts.length === 0 ? (
                  <option value="acc_manual">Unassigned Local Ledger</option>
                ) : (
                  state.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (•••• {acc.mask})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="tx-status" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Settlement Status
              </label>
              <select
                id="tx-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'cleared' | 'pending')}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="cleared">Cleared</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Notes & Recurring */}
          <div>
            <label htmlFor="tx-notes" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Memo (optional)
            </label>
            <input
              id="tx-notes"
              type="text"
              placeholder="Internal reference or tax note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-emerald-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Mark as recurring monthly commitment
            </span>
          </label>

          {error && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2 pb-safe">
            {editing && (
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(editing.id);
                  onClose();
                }}
                className="min-h-[46px] px-4 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            <button
              type="submit"
              className="flex-1 min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold active:scale-[0.99] transition-all cursor-pointer"
            >
              {editing ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
