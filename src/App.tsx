import React, { Suspense, lazy, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Eye,
  EyeOff,
  LayoutDashboard,
  Moon,
  PieChart,
  Plus,
  Shield,
  Sun,
  Target,
} from 'lucide-react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { OverviewView } from './views/OverviewView';
import { TransactionSheet } from './components/modals/TransactionSheet';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import type { NavTab, Transaction } from './types/finance';

// Lazy-loaded secondary views for fast initial bundle & code splitting
const LedgerView = lazy(() =>
  import('./views/LedgerView').then((m) => ({ default: m.LedgerView }))
);
const BudgetsView = lazy(() =>
  import('./views/BudgetsView').then((m) => ({ default: m.BudgetsView }))
);
const GoalsView = lazy(() =>
  import('./views/GoalsView').then((m) => ({ default: m.GoalsView }))
);
const AnalyticsView = lazy(() =>
  import('./views/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);
const VaultView = lazy(() =>
  import('./views/VaultView').then((m) => ({ default: m.VaultView }))
);

interface NavItem {
  id: NavTab;
  label: string;
  shortLabel: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    title: 'Executive Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'ledger',
    label: 'Ledger',
    shortLabel: 'Ledger',
    title: 'Cash Flow Ledger',
    icon: ArrowLeftRight,
  },
  {
    id: 'budgets',
    label: 'Budgets',
    shortLabel: 'Budgets',
    title: 'Budgets & Limits',
    icon: PieChart,
  },
  {
    id: 'goals',
    label: 'Accounts & Goals',
    shortLabel: 'Goals',
    title: 'Accounts & Wealth Goals',
    icon: Target,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: 'Analytics',
    title: 'Analytics & Projections',
    icon: BarChart3,
  },
  {
    id: 'vault',
    label: 'Privacy Vault',
    shortLabel: 'Vault',
    title: 'Privacy Vault & Preferences',
    icon: Shield,
  },
];

const MOBILE_BOTTOM_TABS: NavTab[] = ['overview', 'ledger', 'budgets', 'goals', 'analytics'];

const ViewSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse" aria-label="Loading view">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/50" />
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/50" />
      <div className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800/50" />
    </div>
    <div className="h-80 rounded-2xl bg-slate-200/70 dark:bg-slate-800/50" />
  </div>
);

const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-[#161D29]" />
    <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" className="stroke-slate-700/60" strokeWidth="1.5" />
    <path d="M8.5 22.5V9.5H21.5V12.8H12.2V14.9H19.4V18.1H12.2V22.5H8.5Z" fill="#F8FAFC" />
    <path d="M17.2 22.5L23.2 16.2" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="23.2" cy="16.2" r="1.8" fill="#10B981" />
  </svg>
);

const FinanceShell: React.FC = () => {
  const { state, updateSettings, toastMessage } = useFinance();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [txSheetOpen, setTxSheetOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  const handleOpenNewTx = () => {
    setEditingTx(null);
    setTxSheetOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxSheetOpen(true);
  };

  const toggleTheme = () => {
    updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const togglePrivacy = () => {
    updateSettings({ privacyMode: !state.settings.privacyMode });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090C10] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white dark:bg-[#0C1017] border-r border-slate-200 dark:border-slate-800/80 z-30">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <BrandMark className="w-8 h-8 shrink-0" />
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            FinanceHub
          </span>
        </div>

        <nav aria-label="Primary Navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[42px] px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-100 dark:bg-[#161D29] text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
          <PWAInstallButton variant="full" />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              aria-label={state.settings.privacyMode ? 'Show balances' : 'Mask balances'}
              className="min-h-[40px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#11161F] text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {state.settings.privacyMode ? (
                <EyeOff className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>{state.settings.privacyMode ? 'Hidden' : 'Mask'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="min-h-[40px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#11161F] text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {state.settings.theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Desktop Top Header Bar (Strict Breadcrumb + Primary Action Contract) */}
        <header className="hidden lg:flex sticky top-0 z-20 h-16 px-8 items-center justify-between gap-8 bg-[#F8FAFC]/90 dark:bg-[#090C10]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">FinanceHub</span>
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
              /
            </span>
            <h1 className="font-display font-semibold text-slate-900 dark:text-white truncate">
              {currentNav.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTx}
              className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Transaction</span>
            </button>
          </div>
        </header>

        {/* Compact Mobile Top App Bar (52px height, respecting 15% mobile sticky cap) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 flex items-center justify-between gap-3 bg-[#F8FAFC]/92 dark:bg-[#090C10]/92 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 pt-safe">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark className="w-7 h-7 shrink-0" />
            <h1 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
              {activeTab === 'overview' ? 'FinanceHub' : currentNav.shortLabel}
            </h1>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={togglePrivacy}
              aria-label="Toggle privacy mask"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 active:bg-slate-200/60 dark:active:bg-slate-800 cursor-pointer"
            >
              {state.settings.privacyMode ? (
                <EyeOff className="w-[18px] h-[18px] text-emerald-500" />
              ) : (
                <Eye className="w-[18px] h-[18px]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              aria-label="Privacy Vault and Settings"
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:bg-slate-200/60 dark:active:bg-slate-800 cursor-pointer ${
                activeTab === 'vault'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Shield className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={handleOpenNewTx}
              aria-label="Add transaction"
              className="min-h-[38px] px-3 ml-1 rounded-xl bg-emerald-600 active:scale-[0.97] text-white text-xs font-semibold inline-flex items-center gap-1 transition-transform whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-10">
          {activeTab === 'overview' && (
            <OverviewView
              onNavigate={setActiveTab}
              onOpenNewTransaction={handleOpenNewTx}
              onEditTransaction={handleEditTx}
            />
          )}

          {activeTab !== 'overview' && (
            <Suspense fallback={<ViewSkeleton />}>
              {activeTab === 'ledger' && (
                <LedgerView
                  onOpenNewTransaction={handleOpenNewTx}
                  onEditTransaction={handleEditTx}
                />
              )}
              {activeTab === 'budgets' && <BudgetsView />}
              {activeTab === 'goals' && <GoalsView />}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'vault' && <VaultView />}
            </Suspense>
          )}
        </main>
      </div>

      {/* Native Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0C1017]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 pb-safe"
      >
        <div className="grid grid-cols-5 h-16">
          {MOBILE_BOTTOM_TABS.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors cursor-pointer ${
                  active
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-[21px] h-[21px]" />
                <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Transaction Add/Edit Bottom Sheet / Modal */}
      <TransactionSheet
        open={txSheetOpen}
        editing={editingTx}
        onClose={() => setTxSheetOpen(false)}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Subtle Action Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-xs font-semibold shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <FinanceShell />
    </FinanceProvider>
  );
}
