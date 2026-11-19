import React, { useMemo, useState } from 'react';
import { CalendarClock, Pause, Play, Plus, Trash2, XCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney } from '../../shared/currencies';
import { getSubscriptionMonthlyEquivalent, toIsoDate } from '../../shared/financeEngine';
import { subscriptionSchema } from '../../shared/schemas';
import type { BillingCycle, ExpenseScope } from '../../shared/types';

export function SubscriptionsPage() {
  const {
    dataset,
    reportingCurrency,
    rates,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  } = useFinance();

  const [name, setName] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('Software');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(toIsoDate(new Date()));
  const [scope, setScope] = useState<ExpenseScope>('personal');
  const [accountId, setAccountId] = useState(dataset.accounts[0]?.id || '');
  const [error, setError] = useState('');

  const subs = dataset.subscriptions.filter((s) => !s.deletedAt);

  const totals = useMemo(() => {
    const active = subs.filter((s) => s.status === 'active');
    const monthly = active.reduce(
      (sum, s) => sum + getSubscriptionMonthlyEquivalent(s, reportingCurrency, rates),
      0
    );
    return {
      activeCount: active.length,
      monthly: Math.round(monthly * 100) / 100,
      annual: Math.round(monthly * 12 * 100) / 100,
    };
  }, [rates, reportingCurrency, subs]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = subscriptionSchema.safeParse({
      name,
      categoryLabel,
      amount: parseFloat(amount),
      currency: reportingCurrency,
      cycle,
      nextPaymentDate,
      status: 'active',
      accountId: accountId || dataset.accounts[0]?.id || 'acc-cash',
      scope,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check subscription details.');
      return;
    }
    addSubscription(parsed.data);
    setName('');
    setAmount('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Subscription Manager</h1>
        <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
          Monitor recurring SaaS, streaming, internet, and membership commitments without duplicate charges.
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Active Subscriptions</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums mt-1">
            {totals.activeCount}
          </p>
        </div>
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Monthly Equivalent</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums mt-1 text-[#A46BFF]">
            {formatMoney(totals.monthly, reportingCurrency)}
          </p>
        </div>
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Annual Expenditure</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums mt-1 text-[#43D9E8]">
            {formatMoney(totals.annual, reportingCurrency)}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleCreate} className="lg:col-span-4 p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">Add Subscription</h2>
          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Service Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Notion Plus"
              className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Category
              </label>
              <select
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option>Streaming</option>
                <option>Software</option>
                <option>Membership</option>
                <option>Internet</option>
                <option>Insurance</option>
                <option>Rent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Billing Cycle
              </label>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as BillingCycle)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Amount ({reportingCurrency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="499"
                className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Next Payment
              </label>
              <input
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ExpenseScope)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {dataset.accounts
                  .filter((a) => !a.deletedAt)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Track Subscription
          </button>
        </form>

        <div className="lg:col-span-8 space-y-3">
          {subs.map((sub) => {
            const monthlyEq = getSubscriptionMonthlyEquivalent(sub, reportingCurrency, rates);
            return (
              <div
                key={sub.id}
                className="p-5 rounded-2xl pp-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-display font-semibold">{sub.name}</h3>
                    <span className="text-xs text-slate-500 dark:text-[#9BA6C0] capitalize">
                      · {sub.categoryLabel} · {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#9BA6C0] flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-[#43D9E8]" />
                    Next payment: <span className="font-mono">{sub.nextPaymentDate}</span> ({sub.cycle})
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-base font-mono font-bold tabular-nums">
                      {formatMoney(sub.amount, sub.currency)}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-[#9BA6C0]">
                      ~{formatMoney(monthlyEq, reportingCurrency)}/mo
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {sub.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSubscription(sub.id, {
                            status: sub.status === 'active' ? 'paused' : 'active',
                          })
                        }
                        title={sub.status === 'active' ? 'Pause tracking' : 'Resume tracking'}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs cursor-pointer"
                      >
                        {sub.status === 'active' ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-[#40D99A]" />
                        )}
                      </button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => updateSubscription(sub.id, { status: 'cancelled' })}
                        title="Cancel subscription (preserves history)"
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs hover:text-amber-500 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteSubscription(sub.id)}
                      aria-label={`Delete ${sub.name}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
