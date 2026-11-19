import React, { useMemo, useState } from 'react';
import { Check, Plus, Users } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney } from '../../shared/currencies';
import { calculateGroupSettlements, toIsoDate } from '../../shared/financeEngine';
import type { ExpenseGroup } from '../../shared/types';

export function SplitExpensesPage() {
  const { dataset, reportingCurrency, addGroup, addSharedExpense, recordSettlement } = useFinance();

  const [selectedGroupId, setSelectedGroupId] = useState(
    () => dataset.groups[0]?.id || ''
  );

  // New group form
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<ExpenseGroup['type']>('friends');
  const [membersCsv, setMembersCsv] = useState('You, Riya, Kabir');

  // New shared expense form
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const activeGroups = dataset.groups.filter((g) => !g.deletedAt);
  const activeGroup = activeGroups.find((g) => g.id === selectedGroupId) || activeGroups[0];

  const settlementSummary = useMemo(() => {
    if (!activeGroup) return null;
    return calculateGroupSettlements(activeGroup);
  }, [activeGroup]);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const names = membersCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!groupName.trim() || names.length < 2) return;
    addGroup({
      name: groupName.trim(),
      type: groupType,
      currency: reportingCurrency,
      members: names.map((n, idx) => ({ id: `m_${Date.now()}_${idx}`, name: n })),
    });
    setGroupName('');
  };

  const handleAddSharedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    const total = parseFloat(expAmt);
    if (!expDesc.trim() || Number.isNaN(total) || total <= 0) return;

    const payerId = paidBy || activeGroup.members[0]?.id;
    let splits = activeGroup.members.map((m) => ({
      memberId: m.id,
      amount: Math.round((total / activeGroup.members.length) * 100) / 100,
    }));

    if (splitMode === 'custom') {
      splits = activeGroup.members.map((m) => ({
        memberId: m.id,
        amount: parseFloat(customSplits[m.id] || '0') || 0,
      }));
    }

    addSharedExpense(activeGroup.id, {
      description: expDesc.trim(),
      amount: total,
      currency: activeGroup.currency,
      paidByMemberId: payerId,
      splitMode,
      splits,
      date: toIsoDate(new Date()),
    });
    setExpDesc('');
    setExpAmt('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Split Expenses &amp; Shared Wallets
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
          Track group tabs for roommates, travel, hostel, or family and record settlements cleanly.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Groups List + Create Group */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl pp-surface space-y-3">
            <h2 className="text-sm font-display font-semibold">Your Shared Groups</h2>
            {activeGroups.length === 0 ? (
              <p className="text-xs text-slate-500">No groups yet.</p>
            ) : (
              <div className="space-y-1.5">
                {activeGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                      activeGroup?.id === g.id
                        ? 'bg-[#8156F8]/15 text-[#8156F8] dark:text-white font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>{g.name}</span>
                    <span className="text-slate-400 capitalize">{g.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCreateGroup} className="p-5 rounded-2xl pp-surface space-y-3">
            <h2 className="text-sm font-display font-semibold">Create Group</h2>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (e.g. Flat 4B)"
              className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value as ExpenseGroup['type'])}
              className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            >
              <option value="friends">Friends</option>
              <option value="roommates">Roommates</option>
              <option value="hostel">Hostel</option>
              <option value="travel">Travel</option>
              <option value="family">Family</option>
            </select>
            <input
              type="text"
              required
              value={membersCsv}
              onChange={(e) => setMembersCsv(e.target.value)}
              placeholder="Participants comma-separated"
              className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Group
            </button>
          </form>
        </div>

        {/* Right: Active Group Ledger & Settlement Summary */}
        <div className="lg:col-span-8 space-y-5">
          {!activeGroup ? (
            <div className="p-12 rounded-2xl pp-surface text-center text-xs text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-[#A46BFF]" />
              Select or create a group to split expenses.
            </div>
          ) : (
            <>
              {/* Settlement Plan */}
              <div className="p-6 rounded-2xl pp-surface space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display font-bold">{activeGroup.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                      {activeGroup.members.map((m) => m.name).join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {settlementSummary?.memberBalances.map((mb) => (
                    <div key={mb.memberId} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426]">
                      <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">{mb.name}</p>
                      <p
                        className={`text-sm font-mono font-semibold tabular-nums mt-1 ${
                          mb.netBalance > 0
                            ? 'text-[#40D99A]'
                            : mb.netBalance < 0
                            ? 'text-rose-500'
                            : ''
                        }`}
                      >
                        {mb.netBalance >= 0 ? '+' : ''}
                        {formatMoney(mb.netBalance, activeGroup.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-[#9BA6C0]">
                    Settlement Summary (Who Owes Whom)
                  </h3>
                  {settlementSummary && settlementSummary.suggestedSettlements.length === 0 ? (
                    <p className="text-xs text-[#40D99A]">All balances in this group are settled!</p>
                  ) : (
                    settlementSummary?.suggestedSettlements.map((s) => (
                      <div
                        key={`${s.fromMemberId}-${s.toMemberId}`}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] flex items-center justify-between gap-3 text-xs"
                      >
                        <span>
                          <strong>{s.fromName}</strong> owes <strong>{s.toName}</strong>{' '}
                          <span className="font-mono font-semibold">
                            {formatMoney(s.amount, activeGroup.currency)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            recordSettlement(activeGroup.id, {
                              fromMemberId: s.fromMemberId,
                              toMemberId: s.toMemberId,
                              amount: s.amount,
                              currency: activeGroup.currency,
                              date: toIsoDate(new Date()),
                              note: 'Recorded settlement',
                            })
                          }
                          className="px-3 py-1 rounded-lg bg-[#40D99A]/15 text-[#16A34A] dark:text-[#40D99A] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Record Settlement
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Shared Expense */}
              <form onSubmit={handleAddSharedExpense} className="p-6 rounded-2xl pp-surface space-y-4">
                <h3 className="text-base font-display font-semibold">Add Shared Expense</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Description (e.g. Dinner)"
                    className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={expAmt}
                    onChange={(e) => setExpAmt(e.target.value)}
                    placeholder="Total amount"
                    className="px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                  />
                  <select
                    value={paidBy || activeGroup.members[0]?.id || ''}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                  >
                    {activeGroup.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        Paid by {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setSplitMode('equal')}
                    className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                      splitMode === 'equal'
                        ? 'bg-[#8156F8] text-white border-[#8156F8]'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Split Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                      splitMode === 'custom'
                        ? 'bg-[#8156F8] text-white border-[#8156F8]'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Custom Amounts
                  </button>
                </div>

                {splitMode === 'custom' && (
                  <div className="grid sm:grid-cols-3 gap-2">
                    {activeGroup.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <span className="truncate w-24">{m.name}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={customSplits[m.id] || ''}
                          onChange={(e) =>
                            setCustomSplits((s) => ({ ...s, [m.id]: e.target.value }))
                          }
                          placeholder="0"
                          className="w-24 px-2 py-1 rounded-lg font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Shared Expense
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
