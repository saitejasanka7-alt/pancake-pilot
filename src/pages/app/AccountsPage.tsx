import React, { useState } from 'react';
import { ArrowRight, Landmark, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney, SUPPORTED_CURRENCIES } from '../../shared/currencies';
import { toIsoDate } from '../../shared/financeEngine';
import { accountSchema, transferSchema } from '../../shared/schemas';
import type { AccountType } from '../../shared/types';

export function AccountsPage() {
  const {
    dataset,
    reportingCurrency,
    accountBalances,
    totalBalance,
    addAccount,
    deleteAccount,
    addTransfer,
  } = useFinance();

  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accCurrency, setAccCurrency] = useState(reportingCurrency);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [institution, setInstitution] = useState('');
  const [accError, setAccError] = useState('');

  const activeAccounts = dataset.accounts.filter((a) => !a.deletedAt);

  const [fromId, setFromId] = useState(activeAccounts[0]?.id || '');
  const [toId, setToId] = useState(activeAccounts[1]?.id || '');
  const [trAmount, setTrAmount] = useState('');
  const [trDate, setTrDate] = useState(toIsoDate(new Date()));
  const [trNote, setTrNote] = useState('');
  const [trError, setTrError] = useState('');

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccError('');
    const parsed = accountSchema.safeParse({
      name: accName,
      type: accType,
      currency: accCurrency,
      openingBalance: parseFloat(openingBalance) || 0,
      institution: institution.trim() || undefined,
    });
    if (!parsed.success) {
      setAccError(parsed.error.issues[0]?.message || 'Invalid account details.');
      return;
    }
    addAccount(parsed.data);
    setAccName('');
    setOpeningBalance('0');
    setInstitution('');
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTrError('');
    const parsed = transferSchema.safeParse({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: parseFloat(trAmount),
      date: trDate,
      note: trNote,
    });
    if (!parsed.success) {
      setTrError(parsed.error.issues[0]?.message || 'Check transfer amount and accounts.');
      return;
    }
    if (fromId === toId) {
      setTrError('Source and destination accounts must be different.');
      return;
    }
    addTransfer(parsed.data);
    setTrAmount('');
    setTrNote('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Accounts &amp; Wallets</h1>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
            Track balances locally across Cash, Bank, UPI, and Credit Cards. Never requests passwords, PINs, or OTPs.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Consolidated Balance</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums text-[#43D9E8]">
            {formatMoney(totalBalance, reportingCurrency)}
          </p>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeAccounts.map((acc) => {
          const bal = accountBalances[acc.id] ?? acc.openingBalance;
          return (
            <div key={acc.id} className="p-5 rounded-2xl pp-surface space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#A46BFF] font-medium">
                    {acc.type.replace('_', ' ')} · {acc.currency}
                  </p>
                  <h3 className="text-sm font-display font-semibold mt-0.5">{acc.name}</h3>
                  {acc.institution && (
                    <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
                      {acc.institution}
                    </p>
                  )}
                </div>
                {activeAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteAccount(acc.id)}
                    aria-label={`Archive ${acc.name}`}
                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xl font-display font-bold font-mono tabular-nums">
                {formatMoney(bal, acc.currency)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Add Account Form */}
        <form onSubmit={handleAddAccount} className="lg:col-span-5 p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#A46BFF]" />
            <h2 className="text-base font-display font-semibold">Add Account / Wallet</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Account Name
              </label>
              <input
                type="text"
                required
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder="e.g. SBI Savings"
                className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Type
              </label>
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value as AccountType)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option value="bank">Bank Account</option>
                <option value="savings">Savings Account</option>
                <option value="upi">UPI Wallet</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="other">Other Wallet</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Currency
              </label>
              <select
                value={accCurrency}
                onChange={(e) => setAccCurrency(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Institution Label (Optional)
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. ICICI, GPay"
              className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
          </div>

          {accError && <p className="text-xs text-rose-500">{accError}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </form>

        {/* Transfer Form & History */}
        <div className="lg:col-span-7 p-6 rounded-2xl pp-surface space-y-5">
          <div>
            <h2 className="text-base font-display font-semibold">Transfer Between Accounts</h2>
            <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
              Internal transfers adjust account balances without distorting income or expense totals.
            </p>
          </div>

          <form onSubmit={handleTransfer} className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                From Account
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                To Account
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={trAmount}
                onChange={(e) => setTrAmount(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={trDate}
                onChange={(e) => setTrDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <input
                type="text"
                value={trNote}
                onChange={(e) => setTrNote(e.target.value)}
                placeholder="Transfer memo (optional)"
                className="flex-1 min-w-[180px] rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#43D9E8] text-[#080B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                Record Transfer
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {trError && <p className="text-xs text-rose-500">{trError}</p>}

          <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06] space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-[#9BA6C0]">
              Recent Transfers
            </h3>
            {dataset.transfers.length === 0 ? (
              <p className="text-xs text-slate-500">No transfers recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {dataset.transfers.slice(0, 5).map((tr) => {
                  const fromAcc = dataset.accounts.find((a) => a.id === tr.fromAccountId);
                  const toAcc = dataset.accounts.find((a) => a.id === tr.toAccountId);
                  return (
                    <div
                      key={tr.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-medium">
                          {fromAcc?.name || 'Source'} → {toAcc?.name || 'Destination'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
                          {tr.date} · {tr.note}
                        </p>
                      </div>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatMoney(tr.amount, tr.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
