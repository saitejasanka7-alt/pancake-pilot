import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney } from '../../shared/currencies';
import { budgetSchema } from '../../shared/schemas';
import type { BudgetPeriod } from '../../shared/types';

export function BudgetsPage() {
  const {
    dataset,
    reportingCurrency,
    budgetStatuses,
    forecast,
    addBudget,
    updateBudget,
    deleteBudget,
  } = useFinance();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('overall');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [limitAmount, setLimitAmount] = useState('');
  const [thresholds, setThresholds] = useState<number[]>([50, 75, 90, 100]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');

  const toggleThreshold = (th: number) => {
    setThresholds((prev) =>
      prev.includes(th) ? prev.filter((x) => x !== th) : [...prev, th].sort((a, b) => a - b)
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = budgetSchema.safeParse({
      name,
      categoryId: categoryId === 'overall' ? null : categoryId,
      period,
      limitAmount: parseFloat(limitAmount),
      currency: reportingCurrency,
      alertThresholds: thresholds.length ? thresholds : [75, 100],
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid budget parameters.');
      return;
    }
    addBudget(parsed.data);
    setName('');
    setLimitAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Smart Budgets</h1>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
            Track monthly &amp; weekly limits with automated 50% / 75% / 90% / 100% overrun alerts.
          </p>
        </div>
        <Link
          to="/app/pip-ai"
          className="px-4 py-2 rounded-xl border border-[#A46BFF]/40 text-[#8156F8] dark:text-[#A46BFF] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#A46BFF]/10"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask Pip for Budget Advice
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Create Budget Form */}
        <form onSubmit={handleCreate} className="lg:col-span-4 p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">Create Budget Limit</h2>
          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Budget Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Food & Dining Monthly"
              className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Scope
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option value="overall">Overall Total</option>
                {dataset.categories
                  .filter((c) => c.id !== 'cat-salary')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Limit Amount ({reportingCurrency})
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="10000"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mb-1.5">
              Alert Thresholds
            </p>
            <div className="flex flex-wrap gap-2">
              {[50, 75, 90, 100].map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => toggleThreshold(th)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer border ${
                    thresholds.includes(th)
                      ? 'bg-[#8156F8] text-white border-[#8156F8]'
                      : 'border-slate-200 dark:border-white/10 text-slate-500'
                  }`}
                >
                  {th}%
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Budget
          </button>

          {/* Historical Pip Recommendation */}
          {forecast.categoryPredictions[0] && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] text-xs space-y-1">
              <p className="font-semibold text-[#43D9E8]">Pip Historical Suggestion</p>
              <p className="text-slate-600 dark:text-[#9BA6C0]">
                Based on your 3-month average, consider setting{' '}
                <strong>{forecast.categoryPredictions[0].categoryName}</strong> near{' '}
                <span className="font-mono">
                  {formatMoney(forecast.categoryPredictions[0].historicalAvg * 1.05, reportingCurrency)}
                </span>
                .
              </p>
            </div>
          )}
        </form>

        {/* Budget Progress Cards */}
        <div className="lg:col-span-8 space-y-4">
          {budgetStatuses.length === 0 ? (
            <div className="p-10 rounded-2xl pp-surface text-center text-xs text-slate-500 dark:text-[#9BA6C0]">
              No active budgets yet. Create your first monthly or weekly cap on the left.
            </div>
          ) : (
            budgetStatuses.map((bs) => {
              const isAlert = bs.triggeredThreshold !== null;
              const barColor =
                bs.percentUsed >= 100
                  ? 'bg-rose-500'
                  : bs.percentUsed >= 75
                  ? 'bg-amber-500'
                  : 'bg-[#40D99A]';

              return (
                <div key={bs.budget.id} className="p-5 rounded-2xl pp-surface space-y-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-display font-semibold">{bs.budget.name}</h3>
                        <span className="text-xs text-slate-500 dark:text-[#9BA6C0] capitalize">
                          · {bs.budget.period}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
                        Projected period-end spend:{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(bs.projectedMonthEnd, reportingCurrency)}
                        </span>
                        {bs.willExceed && (
                          <span className="text-rose-500 font-medium ml-2">
                            (Likely overrun at current pace)
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingId === bs.budget.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            className="w-24 px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-[#0B0F1E] border border-[#A46BFF] font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(editLimit);
                              if (val > 0) updateBudget(bs.budget.id, { limitAmount: val });
                              setEditingId(null);
                            }}
                            className="text-xs font-semibold text-[#40D99A] cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(bs.budget.id);
                            setEditLimit(String(bs.budget.limitAmount));
                          }}
                          className="text-xs text-[#8156F8] dark:text-[#43D9E8] hover:underline cursor-pointer"
                        >
                          Edit Limit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteBudget(bs.budget.id)}
                        aria-label={`Delete ${bs.budget.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Budget</p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5">
                        {formatMoney(bs.limitConverted, reportingCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Spent</p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5">
                        {formatMoney(bs.spentConverted, reportingCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Remaining</p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5 text-[#40D99A]">
                        {formatMoney(bs.remainingConverted, reportingCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Used</p>
                      <p className="font-mono tabular-nums font-semibold mt-0.5">
                        {bs.percentUsed}%
                      </p>
                    </div>
                  </div>

                  <div className="h-2.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, bs.percentUsed)}%` }}
                    />
                  </div>

                  {isAlert ? (
                    <p
                      className={`text-xs flex items-center gap-1.5 ${
                        bs.percentUsed >= 90 ? 'text-rose-500' : 'text-amber-500'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Warning: You have used {bs.percentUsed}% of your {bs.budget.name} (crossed{' '}
                      {bs.triggeredThreshold}% threshold).
                    </p>
                  ) : (
                    <p className="text-xs text-[#16A34A] dark:text-[#40D99A] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      On track — well within configured alert thresholds.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
