import React, { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { useFinance } from '../context/FinanceContext';
import { ChartCanvas } from '../components/charts/ChartCanvas';
import { formatCurrency } from '../utils/format';

const CAT_COLORS = ['#10B981', '#38BDF8', '#6366F1', '#F59E0B', '#F43F5E', '#14B8A6', '#8B5CF6', '#64748B'];

export const AnalyticsView: React.FC = () => {
  const { state, metrics } = useFinance();

  // Interactive Wealth Compounding Simulator controls
  const [monthlyContribution, setMonthlyContribution] = useState(5000);
  const [annualReturn, setAnnualReturn] = useState(8.0);
  const [horizonYears, setHorizonYears] = useState(15);

  const isDark = state.settings.theme === 'dark';
  const currency = state.settings.currency;
  const masked = state.settings.privacyMode;

  // Monthly Income vs Expense grouped bar chart
  const cashflowBarConfig = useMemo<ChartConfiguration<'bar'>>(() => {
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const tickColor = isDark ? '#94A3B8' : '#64748B';
    const history = state.history.slice(-12);

    return {
      type: 'bar',
      data: {
        labels: history.map((h) => h.label),
        datasets: [
          {
            label: 'Inflow',
            data: history.map((h) => h.income),
            backgroundColor: '#10B981',
            borderRadius: 5,
            barPercentage: 0.72,
          },
          {
            label: 'Outflow',
            data: history.map((h) => h.expenses),
            backgroundColor: isDark ? '#334155' : '#94A3B8',
            borderRadius: 5,
            barPercentage: 0.72,
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
  }, [state.history, isDark, currency, masked]);

  // Spending by category breakdown
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    state.transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });
    const list = Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const grandTotal = list.reduce((s, x) => s + x.amount, 0);
    return { list, grandTotal };
  }, [state.transactions]);

  const categoryChartConfig = useMemo<ChartConfiguration<'doughnut'>>(() => {
    return {
      type: 'doughnut',
      data: {
        labels: categoryBreakdown.list.map((c) => c.category),
        datasets: [
          {
            data: categoryBreakdown.list.map((c) => c.amount),
            backgroundColor: categoryBreakdown.list.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]),
            borderColor: isDark ? '#11161F' : '#FFFFFF',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#0B0F15' : '#0F172A',
            bodyColor: '#F8FAFC',
            padding: 10,
            cornerRadius: 8,
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            callbacks: {
              label: (ctx) =>
                ` ${ctx.label}: ${formatCurrency(Number(ctx.parsed ?? 0), currency, { masked, whole: true })}`,
            },
          },
        },
      },
    };
  }, [categoryBreakdown, isDark, currency, masked]);

  // Wealth Compounding Projection Engine (100% deterministic local math)
  const projection = useMemo(() => {
    const startPrincipal = Math.max(0, metrics.netWorth);
    const labels: string[] = [];
    const baseSeries: number[] = [];
    const conservativeSeries: number[] = [];
    const growthSeries: number[] = [];
    const contributionsSeries: number[] = [];

    const calcFuture = (principal: number, monthly: number, ratePct: number, years: number) => {
      const r = ratePct / 100 / 12;
      const n = years * 12;
      if (n === 0) return principal;
      if (r <= 0) return principal + monthly * n;
      const compoundPrincipal = principal * Math.pow(1 + r, n);
      const compoundSeries = monthly * ((Math.pow(1 + r, n) - 1) / r);
      return compoundPrincipal + compoundSeries;
    };

    const currentYear = new Date().getFullYear();
    for (let y = 0; y <= horizonYears; y++) {
      labels.push(String(currentYear + y));
      baseSeries.push(Math.round(calcFuture(startPrincipal, monthlyContribution, annualReturn, y)));
      conservativeSeries.push(
        Math.round(calcFuture(startPrincipal, monthlyContribution, Math.max(2, annualReturn - 2.5), y))
      );
      growthSeries.push(
        Math.round(calcFuture(startPrincipal, monthlyContribution, annualReturn + 2.5, y))
      );
      contributionsSeries.push(Math.round(startPrincipal + monthlyContribution * 12 * y));
    }

    const finalBase = baseSeries[baseSeries.length - 1] ?? startPrincipal;
    const totalInvested = contributionsSeries[contributionsSeries.length - 1] ?? startPrincipal;
    const compoundedYield = Math.max(0, finalBase - totalInvested);

    return {
      labels,
      baseSeries,
      conservativeSeries,
      growthSeries,
      contributionsSeries,
      finalBase,
      totalInvested,
      compoundedYield,
    };
  }, [metrics.netWorth, monthlyContribution, annualReturn, horizonYears]);

  const projectionConfig = useMemo<ChartConfiguration<'line'>>(() => {
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const tickColor = isDark ? '#94A3B8' : '#64748B';

    return {
      type: 'line',
      data: {
        labels: projection.labels,
        datasets: [
          {
            label: `Growth (+${(annualReturn + 2.5).toFixed(1)}%)`,
            data: projection.growthSeries,
            borderColor: '#38BDF8',
            backgroundColor: 'transparent',
            borderWidth: 1.75,
            borderDash: [4, 4],
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: `Base Case (${annualReturn.toFixed(1)}%)`,
            data: projection.baseSeries,
            borderColor: '#10B981',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 6,
          },
          {
            label: 'Total Principal',
            data: projection.contributionsSeries,
            borderColor: isDark ? '#64748B' : '#94A3B8',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
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
            padding: 12,
            cornerRadius: 10,
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
            ticks: { color: tickColor, font: { family: "'JetBrains Mono', monospace", size: 11 } },
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
  }, [projection, annualReturn, isDark, currency, masked]);

  return (
    <div className="space-y-6">
      {/* Interactive Wealth Compounding Simulator */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <div className="pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Wealth Compounding Projection
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Client-side deterministic projection modeled from your current net worth of{' '}
            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
              {formatCurrency(metrics.netWorth, currency, { whole: true, masked })}
            </span>
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Sliders */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <label htmlFor="sim-monthly" className="font-medium text-slate-600 dark:text-slate-400">
                  Monthly Allocation
                </label>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(monthlyContribution, currency, { whole: true, masked })}
                </span>
              </div>
              <input
                id="sim-monthly"
                type="range"
                min={500}
                max={25000}
                step={500}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <label htmlFor="sim-return" className="font-medium text-slate-600 dark:text-slate-400">
                  Expected Annual Yield
                </label>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {annualReturn.toFixed(1)}%
                </span>
              </div>
              <input
                id="sim-return"
                type="range"
                min={3}
                max={14}
                step={0.5}
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <label htmlFor="sim-horizon" className="font-medium text-slate-600 dark:text-slate-400">
                  Compounding Horizon
                </label>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {horizonYears} Years
                </span>
              </div>
              <input
                id="sim-horizon"
                type="range"
                min={3}
                max={30}
                step={1}
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Projected Base Value</span>
                <span className="font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(projection.finalBase, currency, { compact: true, masked })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Principal Invested</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(projection.totalInvested, currency, { compact: true, masked })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Compounded Market Gain</span>
                <span className="font-mono font-medium text-sky-600 dark:text-sky-400">
                  +{formatCurrency(projection.compoundedYield, currency, { compact: true, masked })}
                </span>
              </div>
            </div>
          </div>

          {/* Projection Line Chart */}
          <div className="lg:col-span-8 h-[280px] sm:h-[310px]">
            <ChartCanvas
              config={projectionConfig}
              ariaLabel="Multi-scenario wealth compounding projection chart"
            />
          </div>
        </div>
      </section>

      {/* Bottom Analytics Split: 12-Month Cash Flow + Category Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              12-Month Inflow vs. Outflow
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly surplus velocity across trailing fiscal periods
            </p>
          </div>
          <div className="mt-5 flex-1 min-h-[250px]">
            {state.history.length > 0 ? (
              <ChartCanvas
                config={cashflowBarConfig}
                ariaLabel="12-month inflow versus outflow bar chart"
                className="w-full h-[250px]"
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-xs text-slate-500">
                No monthly history available.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col">
          <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Expense Concentration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Distribution of recorded ledger outflows
            </p>
          </div>

          {categoryBreakdown.list.length > 0 ? (
            <>
              <div className="my-5 h-[170px] relative">
                <ChartCanvas config={categoryChartConfig} ariaLabel="Expense category doughnut chart" />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Outflow</span>
                  <span className="text-base font-mono font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(categoryBreakdown.grandTotal, currency, { compact: true, masked })}
                  </span>
                </div>
              </div>
              <div className="space-y-2.5 mt-auto">
                {categoryBreakdown.list.slice(0, 5).map((item, idx) => {
                  const pct =
                    categoryBreakdown.grandTotal > 0
                      ? (item.amount / categoryBreakdown.grandTotal) * 100
                      : 0;
                  return (
                    <div key={item.category} className="flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }}
                        />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{item.category}</span>
                      </div>
                      <span className="font-mono text-slate-900 dark:text-slate-100 shrink-0">
                        {formatCurrency(item.amount, currency, { whole: true, masked })} · {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center py-10 text-xs text-slate-500">
              Record expense transactions to inspect category concentration.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
