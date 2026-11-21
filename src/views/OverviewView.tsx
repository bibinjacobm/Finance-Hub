import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ChartConfiguration } from 'chart.js';
import { useFinance } from '../context/FinanceContext';
import { ChartCanvas } from '../components/charts/ChartCanvas';
import type { NavTab, Timeframe, Transaction } from '../types/finance';
import { formatCurrency, formatPercent, formatShortDate } from '../utils/format';

interface OverviewViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

const TIMEFRAMES: Timeframe[] = ['30D', '90D', '6M', '1Y'];

const ALLOCATION_COLORS = ['#10B981', '#38BDF8', '#6366F1', '#F59E0B', '#64748B'];

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const { state, metrics } = useFinance();
  const [timeframe, setTimeframe] = useState<Timeframe>('6M');
  const [chartMode, setChartMode] = useState<'networth' | 'cashflow'>('networth');

  const isDark = state.settings.theme === 'dark';
  const currency = state.settings.currency;
  const masked = state.settings.privacyMode;

  const accountMap = useMemo(() => {
    const map: Record<string, string> = {};
    state.accounts.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [state.accounts]);

  // Slice history according to selected timeframe
  const visibleHistory = useMemo(() => {
    const base = [...state.history];
    if (base.length === 0) return [];
    // Sync final month point with live computed net worth
    const last = {
      ...base[base.length - 1],
      assets: metrics.totalAssets,
      liabilities: metrics.totalLiabilities,
      netWorth: metrics.netWorth,
      income: metrics.monthlyIncome || base[base.length - 1].income,
      expenses: metrics.monthlyExpenses || base[base.length - 1].expenses,
    };
    base[base.length - 1] = last;

    const count = timeframe === '30D' ? 3 : timeframe === '90D' ? 4 : timeframe === '6M' ? 6 : 12;
    return base.slice(-count);
  }, [state.history, timeframe, metrics]);

  // Primary Chart.js configuration
  const trajectoryConfig = useMemo<ChartConfiguration<'line'>>(() => {
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const tickColor = isDark ? '#94A3B8' : '#64748B';
    const labels = visibleHistory.map((h) => h.label);

    const datasets =
      chartMode === 'networth'
        ? [
            {
              label: 'Net Worth',
              data: visibleHistory.map((h) => h.netWorth),
              borderColor: '#10B981',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.12)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 6,
              pointBackgroundColor: '#10B981',
              pointBorderColor: isDark ? '#11161F' : '#FFFFFF',
              pointBorderWidth: 2,
            },
            {
              label: 'Total Assets',
              data: visibleHistory.map((h) => h.assets),
              borderColor: '#38BDF8',
              backgroundColor: 'transparent',
              borderWidth: 1.75,
              borderDash: [5, 5],
              fill: false,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 5,
            },
          ]
        : [
            {
              label: 'Monthly Inflow',
              data: visibleHistory.map((h) => h.income),
              borderColor: '#10B981',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2.25,
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
            {
              label: 'Monthly Outflow',
              data: visibleHistory.map((h) => h.expenses),
              borderColor: '#F43F5E',
              backgroundColor: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.06)',
              borderWidth: 2,
              fill: true,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
          ];

    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: tickColor,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 6,
              boxHeight: 6,
              padding: 16,
              font: { family: "'DM Sans', sans-serif", size: 12 },
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#0B0F15' : '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#CBD5E1',
            borderColor: isDark ? '#1E293B' : '#334155',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: 'bold' },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            callbacks: {
              label: (ctx) => {
                const v = Number(ctx.parsed.y ?? 0);
                return ` ${ctx.dataset.label}: ${formatCurrency(v, currency, { masked, whole: true })}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: tickColor,
              font: { family: "'DM Sans', sans-serif", size: 12 },
            },
          },
          y: {
            grid: { color: gridColor },
            border: { display: false },
            ticks: {
              color: tickColor,
              maxTicksLimit: 5,
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (val) =>
                masked
                  ? '•••'
                  : formatCurrency(Number(val), currency, { compact: true, whole: true }),
            },
          },
        },
      },
    };
  }, [visibleHistory, chartMode, isDark, currency, masked]);

  // Asset Allocation Doughnut Data
  const allocationData = useMemo(() => {
    const groups: { label: string; value: number }[] = [
      {
        label: 'Equities & ETFs',
        value: state.accounts
          .filter((a) => a.type === 'brokerage' && a.balance > 0)
          .reduce((s, a) => s + a.balance, 0),
      },
      {
        label: 'Treasury & Yield',
        value: state.accounts
          .filter((a) => a.type === 'treasury' && a.balance > 0)
          .reduce((s, a) => s + a.balance, 0),
      },
      {
        label: 'Private & Venture',
        value: state.accounts
          .filter((a) => a.type === 'private' && a.balance > 0)
          .reduce((s, a) => s + a.balance, 0),
      },
      {
        label: 'Operating Cash',
        value: state.accounts
          .filter((a) => a.type === 'checking' && a.balance > 0)
          .reduce((s, a) => s + a.balance, 0),
      },
    ].filter((g) => g.value > 0);

    return groups;
  }, [state.accounts]);

  const allocationConfig = useMemo<ChartConfiguration<'doughnut'>>(() => {
    return {
      type: 'doughnut',
      data: {
        labels: allocationData.map((d) => d.label),
        datasets: [
          {
            data: allocationData.map((d) => d.value),
            backgroundColor: ALLOCATION_COLORS.slice(0, allocationData.length),
            borderColor: isDark ? '#11161F' : '#FFFFFF',
            borderWidth: 3,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#0B0F15' : '#0F172A',
            bodyColor: '#F8FAFC',
            padding: 10,
            cornerRadius: 8,
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            callbacks: {
              label: (ctx) => {
                const val = Number(ctx.parsed ?? 0);
                const pct = metrics.totalAssets > 0 ? (val / metrics.totalAssets) * 100 : 0;
                return ` ${ctx.label}: ${formatCurrency(val, currency, { masked, whole: true })} (${pct.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    };
  }, [allocationData, isDark, currency, masked, metrics.totalAssets]);

  // Budget utilization summary (top 4 categories)
  const budgetSnapshot = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return state.budgets.slice(0, 4).map((b) => {
      const spent = state.transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && t.date >= cutoffStr)
        .reduce((sum, t) => sum + t.amount, 0);
      const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      return { ...b, spent, pct };
    });
  }, [state.budgets, state.transactions]);

  const recentTransactions = state.transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 4-Column Executive KPI Strip */}
      <section aria-label="Key Financial Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Net Worth</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${
                metrics.netWorthDeltaPct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {metrics.netWorthDeltaPct >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {formatPercent(metrics.netWorthDeltaPct, true)}
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-[26px] font-mono font-semibold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(metrics.netWorth, currency, { masked, whole: true })}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            Assets {formatCurrency(metrics.totalAssets, currency, { compact: true, masked })} · Debt{' '}
            {formatCurrency(metrics.totalLiabilities, currency, { compact: true, masked })}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">30-Day Net Cash Flow</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${
                metrics.netCashFlow >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {metrics.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-[26px] font-mono font-semibold tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(metrics.netCashFlow, currency, { masked, signed: true, whole: true })}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            In {formatCurrency(metrics.monthlyIncome, currency, { compact: true, masked })} · Out{' '}
            {formatCurrency(metrics.monthlyExpenses, currency, { compact: true, masked })}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Savings Rate</span>
            <span className="text-xs font-mono font-medium text-sky-600 dark:text-sky-400">
              Target 40.0%
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-[26px] font-mono font-semibold tracking-tight text-slate-900 dark:text-white">
            {masked ? '••.%' : formatPercent(metrics.savingsRate)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {metrics.savingsRate >= 40 ? 'Exceeding executive benchmark' : 'Below monthly target rate'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Liquid Runway</span>
            <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
              {metrics.runwayMonths >= 12 ? 'Resilient' : 'Monitor'}
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-[26px] font-mono font-semibold tracking-tight text-slate-900 dark:text-white">
            {masked ? '•• mo' : `${metrics.runwayMonths.toFixed(1)} mo`}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            Liquid cash {formatCurrency(metrics.liquidCash, currency, { compact: true, masked })}
          </p>
        </div>
      </section>

      {/* Primary Focal Anchor + Asset Allocation Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Net Worth / Cash Flow Trajectory Chart */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {chartMode === 'networth' ? 'Net Worth Trajectory' : 'Cash Flow Velocity'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {chartMode === 'networth'
                  ? 'Consolidated net worth vs. gross assets across all local accounts'
                  : 'Monthly inflow compared against operating outflow'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-[#090C10] border border-slate-200/70 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setChartMode('networth')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    chartMode === 'networth'
                      ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Net Worth
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('cashflow')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    chartMode === 'cashflow'
                      ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Cash Flow
                </button>
              </div>

              <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-[#090C10] border border-slate-200/70 dark:border-slate-800">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      timeframe === tf
                        ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex-1 min-h-[260px] sm:min-h-[300px]">
            {visibleHistory.length > 0 ? (
              <ChartCanvas
                config={trajectoryConfig}
                ariaLabel="Net worth and cash flow line chart"
                className="w-full h-[260px] sm:h-[300px]"
              />
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No historical snapshots recorded yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add accounts or restore sample executive data from the Privacy Vault.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Asset Allocation Doughnut Card */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Asset Allocation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Distribution by asset class</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Accounts
            </button>
          </div>

          {allocationData.length > 0 ? (
            <>
              <div className="relative my-5 h-[180px] flex items-center justify-center">
                <ChartCanvas
                  config={allocationConfig}
                  ariaLabel="Asset allocation doughnut chart"
                  className="w-full h-[180px]"
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Gross Assets
                  </span>
                  <span className="text-lg font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(metrics.totalAssets, currency, { compact: true, masked })}
                  </span>
                </div>
              </div>

              <div className="mt-auto space-y-2.5 pt-2">
                {allocationData.map((item, idx) => {
                  const pct = metrics.totalAssets > 0 ? (item.value / metrics.totalAssets) * 100 : 0;
                  return (
                    <div key={item.label} className="flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }}
                        />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono shrink-0">
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {formatCurrency(item.value, currency, { compact: true, masked })}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 w-10 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <p className="text-sm text-slate-600 dark:text-slate-400">No asset accounts added</p>
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="mt-3 min-h-[40px] px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Add First Account
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Split: Recent Ledger Activity + Budget Envelopes */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Transactions */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Ledger Activity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tap any entry to inspect or adjust details
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="inline-flex items-center gap-1 min-h-[36px] text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              <span>Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="w-full min-h-[60px] px-5 sm:px-6 py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
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
                          {tx.category} · {accountMap[tx.accountId] || 'Local'} · {formatShortDate(tx.date)}
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
          ) : (
            <div className="py-12 px-6 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Your transaction ledger is empty
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Log your first income or expense entry to track live cash flow.
              </p>
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Entry</span>
              </button>
            </div>
          )}
        </div>

        {/* Spending Limits & Goals Snapshot */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Monthly Budget Pulse</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rolling 30-day envelope utilization</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap cursor-pointer"
            >
              Manage
            </button>
          </div>

          {budgetSnapshot.length > 0 ? (
            <div className="space-y-4">
              {budgetSnapshot.map((item) => {
                const over = item.pct > 100;
                const warn = item.pct >= 80 && item.pct <= 100;
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.category}
                      </span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 shrink-0">
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                          {formatCurrency(item.spent, currency, { whole: true, masked })}
                        </span>{' '}
                        / {formatCurrency(item.monthlyLimit, currency, { whole: true, masked })}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          over ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.pct)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span
                        className={
                          over
                            ? 'text-rose-600 dark:text-rose-400 font-medium'
                            : warn
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {over ? 'Over limit' : warn ? 'Near cap' : 'On track'}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {item.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">No spending limits configured</p>
              <button
                type="button"
                onClick={() => onNavigate('budgets')}
                className="mt-3 min-h-[40px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Create Budget Envelope
              </button>
            </div>
          )}

          {/* Top Active Goal Preview */}
          {state.goals.length > 0 && (
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-500 dark:text-slate-400">Priority Goal</span>
                <button
                  type="button"
                  onClick={() => onNavigate('goals')}
                  className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
                >
                  All Goals ({state.goals.length})
                </button>
              </div>
              {(() => {
                const topGoal = state.goals[0];
                const pct =
                  topGoal.targetAmount > 0
                    ? Math.min(100, (topGoal.currentAmount / topGoal.targetAmount) * 100)
                    : 0;
                return (
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {topGoal.name}
                      </p>
                      <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                      {formatCurrency(topGoal.currentAmount, currency, { whole: true, masked })} of{' '}
                      {formatCurrency(topGoal.targetAmount, currency, { whole: true, masked })} · Target{' '}
                      {formatShortDate(topGoal.targetDate)}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
