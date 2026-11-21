import React, { useState } from 'react';
import { Building2, CreditCard, Landmark, Pencil, Plus, Trash2, TrendingUp, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Account, AccountType, Goal } from '../types/finance';
import { formatCurrency, formatShortDate } from '../utils/format';

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: 'Operating Cash',
  treasury: 'Treasury & Yield',
  brokerage: 'Brokerage Equities',
  private: 'Private Capital',
  credit: 'Credit Liability',
};

export const GoalsView: React.FC = () => {
  const {
    state,
    metrics,
    addAccount,
    updateAccount,
    deleteAccount,
    addGoal,
    contributeToGoal,
    deleteGoal,
  } = useFinance();

  const currency = state.settings.currency;
  const masked = state.settings.privacyMode;

  // Account modal state
  const [accModal, setAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accInstitution, setAccInstitution] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accMask, setAccMask] = useState('4021');
  const [accBalance, setAccBalance] = useState('');
  const [accApy, setAccApy] = useState('');

  // Goal modal state
  const [goalModal, setGoalModal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState<Goal['category']>('Liquidity');
  const [goalTarget, setGoalTarget] = useState('50000');
  const [goalCurrent, setGoalCurrent] = useState('10000');
  const [goalMonthly, setGoalMonthly] = useState('2500');
  const [goalDate, setGoalDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  // Contribute sheet state
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState('1000');
  const [contribAccount, setContribAccount] = useState(state.accounts[0]?.id ?? '');

  const openNewAccount = () => {
    setEditingAcc(null);
    setAccName('');
    setAccInstitution('');
    setAccType('checking');
    setAccMask(String(Math.floor(1000 + Math.random() * 9000)));
    setAccBalance('');
    setAccApy('');
    setAccModal(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAcc(acc);
    setAccName(acc.name);
    setAccInstitution(acc.institution);
    setAccType(acc.type);
    setAccMask(acc.mask);
    setAccBalance(String(Math.abs(acc.balance)));
    setAccApy(acc.apy ? String(acc.apy) : '');
    setAccModal(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const rawBal = parseFloat(accBalance);
    if (!accName.trim() || Number.isNaN(rawBal)) return;
    const signedBal = accType === 'credit' ? -Math.abs(rawBal) : Math.abs(rawBal);
    const parsedApy = accApy ? parseFloat(accApy) : undefined;

    if (editingAcc) {
      updateAccount({
        ...editingAcc,
        name: accName.trim(),
        institution: accInstitution.trim() || 'Private Institution',
        type: accType,
        mask: accMask.slice(0, 4) || '0000',
        balance: Number(signedBal.toFixed(2)),
        apy: parsedApy && !Number.isNaN(parsedApy) ? parsedApy : undefined,
      });
    } else {
      addAccount({
        name: accName.trim(),
        institution: accInstitution.trim() || 'Private Institution',
        type: accType,
        mask: accMask.slice(0, 4) || '0000',
        balance: Number(signedBal.toFixed(2)),
        apy: parsedApy && !Number.isNaN(parsedApy) ? parsedApy : undefined,
      });
    }
    setAccModal(false);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(goalTarget);
    const c = parseFloat(goalCurrent) || 0;
    const m = parseFloat(goalMonthly) || 0;
    if (!goalName.trim() || Number.isNaN(t) || t <= 0) return;

    addGoal({
      name: goalName.trim(),
      category: goalCategory,
      targetAmount: t,
      currentAmount: c,
      monthlyAutoSave: m,
      targetDate: goalDate,
    });
    setGoalName('');
    setGoalModal(false);
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    const amt = parseFloat(contribAmount);
    if (Number.isNaN(amt) || amt <= 0) return;
    contributeToGoal(contributingGoal.id, amt, contribAccount || undefined);
    setContributingGoal(null);
  };

  const renderAccountIcon = (type: AccountType) => {
    if (type === 'credit') return <CreditCard className="w-4 h-4" />;
    if (type === 'brokerage' || type === 'private') return <TrendingUp className="w-4 h-4" />;
    if (type === 'treasury') return <Landmark className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  return (
    <div className="space-y-8">
      {/* Portfolio Accounts Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Accounts & Balances
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Net Position {formatCurrency(metrics.netWorth, currency, { whole: true, masked })} ·{' '}
              {state.accounts.length} local accounts
            </p>
          </div>
          <button
            type="button"
            onClick={openNewAccount}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>

        {state.accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {state.accounts.map((acc) => {
              const isLiability = acc.balance < 0;
              return (
                <div
                  key={acc.id}
                  className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isLiability
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {renderAccountIcon(acc.type)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {acc.institution} · •••• {acc.mask}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditAccount(acc)}
                      aria-label={`Edit ${acc.name}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {ACCOUNT_TYPE_LABEL[acc.type]}
                      {acc.apy ? ` · ${acc.apy}% APY` : ''}
                    </span>
                    <span
                      className={`text-lg font-mono font-semibold ${
                        isLiability
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatCurrency(acc.balance, currency, { whole: true, masked })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 py-10 px-6 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No accounts tracked yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add checking, treasury, brokerage, or credit accounts to calculate live net worth.
            </p>
          </div>
        )}
      </section>

      {/* Wealth Goals Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Wealth Milestones & Reserves
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track capital accumulation targets and allocate contributions directly
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGoalModal(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>

        {state.goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.goals.map((goal) => {
              const pct =
                goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
              const monthsLeft =
                goal.monthlyAutoSave > 0 ? Math.ceil(remaining / goal.monthlyAutoSave) : null;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {goal.category} · Target {formatShortDate(goal.targetDate)}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                        {goal.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      aria-label={`Delete ${goal.name}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-xl font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(goal.currentAmount, currency, { whole: true, masked })}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        of {formatCurrency(goal.targetAmount, currency, { whole: true, masked })}
                      </span>
                    </div>

                    <div className="mt-3 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {pct.toFixed(1)}% funded
                        {monthsLeft !== null && remaining > 0 ? ` · ~${monthsLeft} mo at current pace` : ''}
                        {remaining === 0 ? ' · Target reached' : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setContributingGoal(goal);
                          setContribAmount(String(goal.monthlyAutoSave || 1000));
                          setContribAccount(state.accounts[0]?.id ?? '');
                        }}
                        className="min-h-[38px] px-3.5 rounded-lg border border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        + Contribute
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#11161F] border border-slate-200 dark:border-slate-800/90 py-10 px-6 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No wealth goals defined
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create liquidity, property, or capital allocation milestones to track progress.
            </p>
          </div>
        )}
      </section>

      {/* Account Modal */}
      {accModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setAccModal(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11161F] border-t sm:border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editingAcc ? 'Edit Account' : 'Add Local Account'}
              </h3>
              <button
                type="button"
                onClick={() => setAccModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g., High-Yield Treasury"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={accInstitution}
                    onChange={(e) => setAccInstitution(e.target.value)}
                    placeholder="Fidelity / Mercury"
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={accMask}
                    onChange={(e) => setAccMask(e.target.value.replace(/\D/g, ''))}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Account Class
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3 text-sm text-slate-900 dark:text-white"
                  >
                    {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((k) => (
                      <option key={k} value={k}>
                        {ACCOUNT_TYPE_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Yield / APY % (opt)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={accApy}
                    onChange={(e) => setAccApy(e.target.value)}
                    placeholder="4.85"
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Current Balance ({currency}) {accType === 'credit' ? '— recorded as liability' : ''}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={accBalance}
                  onChange={(e) => setAccBalance(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-4 text-lg font-mono font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2 pb-safe">
                {editingAcc && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteAccount(editingAcc.id);
                      setAccModal(false);
                    }}
                    className="min-h-[44px] px-4 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-sm font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
                >
                  {editingAcc ? 'Save Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Goal Modal */}
      {goalModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setGoalModal(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11161F] border-t sm:border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create Wealth Goal</h3>
              <button
                type="button"
                onClick={() => setGoalModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g., Sovereign Reserve Fund"
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as Goal['category'])}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Liquidity">Liquidity</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Capital">Capital</option>
                    <option value="Sabbatical">Sabbatical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Target ({currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Saved So Far
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Planned Monthly Allocation
                </label>
                <input
                  type="number"
                  min="0"
                  value={goalMonthly}
                  onChange={(e) => setGoalMonthly(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer pb-safe"
              >
                Create Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Sheet */}
      {contributingGoal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setContributingGoal(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#11161F] border-t sm:border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Allocate Contribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {contributingGoal.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContributingGoal(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Contribution Amount ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="50"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-4 text-xl font-mono font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>
              {state.accounts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Log Transfer Against Account
                  </label>
                  <select
                    value={contribAccount}
                    onChange={(e) => setContribAccount(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0F15] px-3 text-sm text-slate-900 dark:text-white"
                  >
                    {state.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
              >
                Confirm Contribution
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
