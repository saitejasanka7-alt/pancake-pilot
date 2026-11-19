import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PiggyBank, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney } from '../../shared/currencies';
import { toIsoDate } from '../../shared/financeEngine';
import { savingsGoalSchema } from '../../shared/schemas';

export function SavingsGoalsPage() {
  const {
    dataset,
    reportingCurrency,
    addGoal,
    deleteGoal,
    addGoalContribution,
  } = useFinance();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('0');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return toIsoDate(d);
  });
  const [categoryLabel, setCategoryLabel] = useState('Emergency Fund');
  const [error, setError] = useState('');

  const [contribGoalId, setContribGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');

  const activeGoals = dataset.goals.filter((g) => !g.deletedAt);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = savingsGoalSchema.safeParse({
      name,
      targetAmount: parseFloat(targetAmount),
      savedAmount: parseFloat(savedAmount) || 0,
      currency: reportingCurrency,
      targetDate,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      categoryLabel,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check goal details.');
      return;
    }
    addGoal(parsed.data);
    setName('');
    setTargetAmount('');
    setSavedAmount('0');
    setMonthlyContribution('');
  };

  const handleContribute = (goalId: string) => {
    const amt = parseFloat(contribAmount);
    if (Number.isNaN(amt) || amt <= 0) return;
    addGoalContribution(goalId, amt, contribNote);
    setContribGoalId(null);
    setContribAmount('');
    setContribNote('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Savings Goals</h1>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
            Track milestones separately from expenses. Contributions preserve accurate spending rates.
          </p>
        </div>
        <Link
          to="/app/pip-ai"
          className="px-4 py-2 rounded-xl border border-[#A46BFF]/40 text-[#8156F8] dark:text-[#A46BFF] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#A46BFF]/10"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask Pip How to Reach Goals Faster
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleCreate} className="lg:col-span-4 p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">New Savings Goal</h2>
          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Goal Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Runway"
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
                <option>Emergency Fund</option>
                <option>Education</option>
                <option>Equipment</option>
                <option>Vacation</option>
                <option>Vehicle</option>
                <option>Personal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Target Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Target ({reportingCurrency})
              </label>
              <input
                type="number"
                required
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="150000"
                className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Saved So Far
              </label>
              <input
                type="number"
                min="0"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Planned Monthly Contribution
            </label>
            <input
              type="number"
              min="0"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="10000"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Goal
          </button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {activeGoals.length === 0 ? (
            <div className="p-10 rounded-2xl pp-surface text-center space-y-2 text-xs text-slate-500 dark:text-[#9BA6C0]">
              <PiggyBank className="w-8 h-8 mx-auto text-[#40D99A]" />
              <p>No savings goals yet. Start your first emergency or milestone fund on the left.</p>
            </div>
          ) : (
            activeGoals.map((goal) => {
              const pct = Math.min(
                100,
                Math.round((goal.savedAmount / Math.max(1, goal.targetAmount)) * 1000) / 10
              );
              const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
              const monthsLeft = Math.max(
                1,
                Math.ceil(
                  (new Date(goal.targetDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
                )
              );
              const requiredMonthly = Math.round(remaining / monthsLeft);

              return (
                <div key={goal.id} className="p-5 rounded-2xl pp-surface space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#43D9E8] font-medium">
                        {goal.categoryLabel} · Target {goal.targetDate}
                      </p>
                      <h3 className="text-lg font-display font-bold mt-0.5">{goal.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setContribGoalId(contribGoalId === goal.id ? null : goal.id)
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#40D99A]/15 text-[#16A34A] dark:text-[#40D99A] text-xs font-semibold cursor-pointer"
                      >
                        + Add Contribution
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGoal(goal.id)}
                        aria-label={`Delete ${goal.name}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Saved</p>
                      <p className="font-mono font-semibold text-sm mt-0.5 text-[#40D99A]">
                        {formatMoney(goal.savedAmount, goal.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Target</p>
                      <p className="font-mono font-semibold text-sm mt-0.5">
                        {formatMoney(goal.targetAmount, goal.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#9BA6C0]">Required Monthly</p>
                      <p className="font-mono font-semibold text-sm mt-0.5">
                        {formatMoney(requiredMonthly, goal.currency)}/mo
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Completion</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#8156F8] via-[#A46BFF] to-[#40D99A] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {contribGoalId === goal.id && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101426] flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        placeholder="Contribution amount"
                        className="w-40 px-3 py-1.5 rounded-lg text-xs font-mono bg-white dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                      />
                      <input
                        type="text"
                        value={contribNote}
                        onChange={(e) => setContribNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => handleContribute(goal.id)}
                        className="px-4 py-1.5 rounded-lg bg-[#8156F8] text-white text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
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
