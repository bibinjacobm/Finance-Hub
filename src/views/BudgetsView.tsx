import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ChartConfiguration } from 'chart.js';
import { useFinance } from '../context/FinanceContext';
import { ChartCanvas } from '../components/charts/ChartCanvas';
import type { Budget, CategoryName } from '../types/finance';
import { EXPENSE_CATEGORIES, formatCurrency } from '../utils/format';

export const BudgetsView: React.FC = () => {
  const { state, upsertBudget, deleteBudget } = useFinance();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [category, setCategory] = useState<CategoryName>('Housing & Office');
  const [limit, setLimit] = useState('');

  const isDark = state.settings.theme === 'dark';
  const currency = state.settings.currency;
  const masked = state.settings.privacyMode;

  const budgetRows = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return state.budgets.map((b) => {
      const spent = state.transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && t.date >= cutoffStr)
        .reduce((sum, t) => sum + t.amount, 0);
      const remaining = b.monthlyLimit - spent;
      const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      return { ...b, spent, remaining, pct };
    });
  }, [state.budgets, state.transactions]);

  const totals = useMemo(() => {
    const totalLimit = budgetRows.reduce((s, r) => s + r.monthlyLimit, 0);
    const totalSpent = budgetRows.reduce((s, r) => s + r.spent, 0);
    const pct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { totalLimit, totalSpent, remaining: totalLimit - totalSpent, pct };
  }, [budgetRows]);

  const barConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const tickColor = isDark ? '#94A3B8' : '#64748B';

    return {
      type: 'bar',
      data: {
        labels: budgetRows.map((r) => r.category.split(' & ')[0]),
        datasets: [
          {
            label: '30-Day Spend',
            data: budgetRows.map((r) => r.spent),
            backgroundColor: budgetRows.map((r) =>
              r.pct > 100 ? '#F43F5E' : r.pct >= 80 ? '#F59E0B' : '#10B981'
            ),
            borderRadius: 6,
            barPercentage: 0.65,
          },
          {
            label: 'Monthly Cap',
            data: budgetRows.map((r) => r.monthlyLimit),
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.1)',
            borderRadius: 6,
            barPercentage: 0.65,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: tickColor,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 6,
              boxHeight: 6,
              font: { family: "'DM Sans', sans-serif", size: 12 },
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#0B0F15' : '#0F172A',
            bodyColor: '#F8FAFC',
            padding: 10,
            cornerRadius: 8,
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y ?? 0), currency, { masked, whole: true })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: tickColor, font: { family: "'DM Sans', sans-serif", size: 11 } },
          },
          y: {
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              color: tickColor,
              maxTicksLimit: 5,
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (v) =>
                masked ? '•••' : formatCurrency(Number(v), currency, { compact: true, whole: true }),
            },
          },
        },
      },
    };
  }, [budgetRows, isDark, currency, masked]);

  const openAdd = () => {
    const unused = EXPENSE_CATEGORIES.find((c) => !state.budgets.some((b) => b.category === c));
    setEditing(null);
    setCategory(unused ?? EXPENSE_CATEGORIES[0]);
    setLimit('1000');
    setModalOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditing(b);
    setCategory(b.category);
    setLimit(String(b.monthlyLimit));
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(limit);
    if (Number.isNaN(num) || num <= 0) return;
    upsertBudget({ id: editing?.id, category, monthlyLimit: Number(num.toFixed(2)) });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Allocation Cap</span>
          <p className="mt-2 text-2xl font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(totals.totalLimit, currency, { whole: true, masked })}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            30-Day Utilized · {totals.pct.toFixed(0)}%
          </span>
          <p className="mt-2 text-2xl font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(totals.totalSpent, currency, { whole: true, masked })}
          </p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Remaining Headroom</span>
          <p
            className={`mt-2 text-2xl font-mono font-semibold ${
              totals.remaining >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(totals.remaining, currency, { whole: true, signed: true, masked })}
          </p>
        </div>
      </section>

      {/* Planned vs Actual Bar Chart */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Planned vs. Actual Spend</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live comparison computed from your 30-day ledger entries
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Set Envelope</span>
          </button>
        </div>

        <div className="mt-5 h-[260px]">
          {budgetRows.length > 0 ? (
            <ChartCanvas config={barConfig} ariaLabel="Planned versus actual budget bar chart" />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">No budget envelopes configured yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Category Envelope Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetRows.map((row) => {
          const over = row.pct > 100;
          const warn = row.pct >= 80 && row.pct <= 100;
          return (
            <div
              key={row.id}
              className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{row.category}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {over
                      ? `Exceeded by ${formatCurrency(Math.abs(row.remaining), currency, { whole: true, masked })}`
                      : `${formatCurrency(row.remaining, currency, { whole: true, masked })} remaining`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  aria-label={`Edit ${row.category} budget`}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between font-mono text-xs mb-2">
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">
                    {formatCurrency(row.spent, currency, { whole: true, masked })}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Cap {formatCurrency(row.monthlyLimit, currency, { whole: true, masked })}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      over ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span
                    className={
                      over
                        ? 'text-rose-600 dark:text-rose-400 font-medium'
                        : warn
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : 'text-emerald-600 dark:text-emerald-400 font-medium'
                    }
                  >
                    {over ? 'Over Budget' : warn ? 'Approaching Limit' : 'Within Limit'}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {row.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Budget Modal / Bottom Sheet */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11161F] border-t sm:border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between gap-4 mb-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editing ? 'Update Budget Envelope' : 'Configure Budget Envelope'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Expense Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryName)}
                  disabled={Boolean(editing)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-60"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Monthly Cap ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-4 text-lg font-mono font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2 pb-safe">
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteBudget(editing.id);
                      setModalOpen(false);
                    }}
                    className="min-h-[44px] px-4 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
                >
                  Save Cap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
