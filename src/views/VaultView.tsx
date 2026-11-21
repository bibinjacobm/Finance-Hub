import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PWAInstallButton } from '../components/pwa/PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { CurrencyCode } from '../types/finance';
import { CURRENCY_OPTIONS, downloadFile } from '../utils/format';

export const VaultView: React.FC = () => {
  const {
    state,
    storageBytes,
    updateSettings,
    exportBackupJSON,
    importBackupJSON,
    resetDemoData,
    clearAllData,
    showToast,
  } = useFinance();

  const { isInstalled, isInstallable, isIOS } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleExportJSON = () => {
    const json = exportBackupJSON();
    downloadFile(
      json,
      `financehub-vault-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    showToast('Encrypted-ready JSON vault exported');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const result = importBackupJSON(text);
      if (!result.ok) {
        setImportError(result.error || 'Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Privacy-First Architecture Summary */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Local-First Privacy Architecture
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              FinanceHub operates strictly inside your browser. Zero cloud databases, zero third-party
              telemetry, and zero external API calls. All ledger records, accounts, and budgets remain exclusively
              in your device&apos;s LocalStorage vault.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>Footprint {(storageBytes / 1024).toFixed(2)} KB</span>
              <span aria-hidden="true">·</span>
              <span>{state.accounts.length} accounts</span>
              <span aria-hidden="true">·</span>
              <span>{state.transactions.length} transactions</span>
              <span aria-hidden="true">·</span>
              <span>{isOnline ? 'Network ready' : 'Offline active'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Display, Currency & Privacy Preferences */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 divide-y divide-slate-200/80 dark:divide-slate-800/80">
        {/* Theme Selector */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Interface Theme</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch between Obsidian Dark and Porcelain Light modes
            </p>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#090C10] border border-slate-200/70 dark:border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                state.settings.theme === 'dark'
                  ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                state.settings.theme === 'light'
                  ? 'bg-white dark:bg-[#1A2230] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Currency Selector */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reporting Currency</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Applied instantaneously across all KPIs, ledgers, and Chart.js visualizations
            </p>
          </div>
          <select
            aria-label="Reporting currency"
            value={state.settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] text-sm text-slate-900 dark:text-white sm:w-64"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Privacy Mask Toggle */}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Executive Privacy Mask</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Obfuscate balances and transaction figures when viewing in public environments
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ privacyMode: !state.settings.privacyMode })}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer ${
              state.settings.privacyMode
                ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {state.settings.privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{state.settings.privacyMode ? 'Balances Masked' : 'Balances Visible'}</span>
          </button>
        </div>
      </section>

      {/* PWA Installation & Native App Capability */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Progressive Web App (PWA)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isInstalled
                  ? 'FinanceHub is installed in standalone native mode with offline caching active.'
                  : 'Install FinanceHub on your home screen or desktop for instant offline launch.'}
              </p>
            </div>
          </div>

          <div className="sm:w-44 shrink-0">
            {isInstalled ? (
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Installed</span>
              </div>
            ) : isInstallable || isIOS ? (
              <PWAInstallButton variant="full" />
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ready via browser menu
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Data Portability & Vault Controls */}
      <section className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Local Backup & Data Controls
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export your complete portfolio as portable JSON, restore a previous snapshot, or reset the vault
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {importError && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
            {importError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#161D29] text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#161D29] text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={resetDemoData}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#161D29] text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Load Sample Data</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe Local Vault</span>
          </button>
        </div>
      </section>

      {/* In-App Confirmation Dialog for Wiping Data */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11161F] border-t sm:border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Wipe all local financial records?
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This removes all accounts, transactions, budgets, and goals from this browser&apos;s LocalStorage.
              Export a JSON backup first if you want to keep your records.
            </p>
            <div className="mt-5 flex items-center gap-3 pb-safe">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllData();
                  setConfirmClear(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Wipe Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
