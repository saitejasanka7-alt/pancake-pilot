import React, { useState } from 'react';
import { Award, CheckCircle2, Plus } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export function ChallengesPage() {
  const { dataset, checkInChallenge, addChallenge } = useFinance();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDays, setTargetDays] = useState('7');
  const [badgeLabel, setBadgeLabel] = useState('Discipline Badge');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addChallenge({
      title: title.trim(),
      description: description.trim() || 'Personal savings and mindful spending habit.',
      targetDays: Math.max(1, parseInt(targetDays, 10) || 7),
      badgeLabel: badgeLabel.trim() || 'Achiever',
    });
    setTitle('');
    setDescription('');
  };

  const completedBadges = dataset.challenges.filter((c) => c.status === 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Financial Challenges</h1>
        <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
          Positive, pressure-free milestones to strengthen everyday saving and tracking habits.
        </p>
      </div>

      {completedBadges.length > 0 && (
        <div className="p-5 rounded-2xl pp-surface flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[#40D99A] text-sm font-semibold">
            <Award className="w-5 h-5" />
            <span>Earned Badges:</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            {completedBadges.map((b) => (
              <span key={b.id} className="text-[#43D9E8]">
                ★ {b.badgeLabel} ({b.title})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleCreate} className="lg:col-span-4 p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">Start a Custom Challenge</h2>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 7-Day Zero Delivery"
            className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
          />
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Goal description"
            className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Target Days</label>
              <input
                type="number"
                min="1"
                value={targetDays}
                onChange={(e) => setTargetDays(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Badge Title</label>
              <input
                type="text"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Challenge
          </button>
        </form>

        <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
          {dataset.challenges.map((ch) => {
            const pct = Math.min(100, Math.round((ch.completedDays / ch.targetDays) * 100));
            return (
              <div key={ch.id} className="p-5 rounded-2xl pp-surface space-y-4 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#43D9E8] font-medium">{ch.badgeLabel}</span>
                    <span className="font-mono">
                      {ch.completedDays} / {ch.targetDays} days
                    </span>
                  </div>
                  <h3 className="text-base font-display font-semibold">{ch.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-[#9BA6C0]">{ch.description}</p>
                </div>

                <div className="space-y-3">
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        ch.status === 'completed' ? 'bg-[#40D99A]' : 'bg-[#A46BFF]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {ch.status === 'completed' ? (
                    <p className="text-xs font-semibold text-[#40D99A] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed! Badge Unlocked
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => checkInChallenge(ch.id, ch.targetAmount ? 100 : undefined)}
                      className="w-full py-2 rounded-xl bg-[#8156F8]/15 hover:bg-[#8156F8]/25 text-[#8156F8] dark:text-[#A46BFF] text-xs font-semibold cursor-pointer"
                    >
                      Check In Today (+1 Day)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
