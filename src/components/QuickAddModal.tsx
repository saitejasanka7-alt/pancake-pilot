import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Plus, Sparkles, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { SUPPORTED_CURRENCIES } from '../shared/currencies';
import { parseVoiceExpenseTranscript, toIsoDate } from '../shared/financeEngine';
import { transactionSchema } from '../shared/schemas';
import type { ExpenseScope, RecurrenceCycle, TransactionType } from '../shared/types';

export function QuickAddModal() {
  const {
    quickAddOpen,
    setQuickAddOpen,
    quickAddInitialTab,
    dataset,
    reportingCurrency,
    addTransaction,
  } = useFinance();

  const [tab, setTab] = useState<'manual' | 'voice'>(quickAddInitialTab);
  const [type, setType] = useState<TransactionType>('expense');
  const [scope, setScope] = useState<ExpenseScope>('personal');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(reportingCurrency);
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(dataset.categories[0]?.id || 'cat-food');
  const [panelId, setPanelId] = useState<string>(dataset.panels[0]?.id || '');
  const [accountId, setAccountId] = useState(dataset.accounts[0]?.id || '');
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [recurrenceCycle, setRecurrenceCycle] = useState<RecurrenceCycle>('none');
  const [error, setError] = useState('');

  // Voice capture states
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceConfidence, setVoiceConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [speechSupported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  useEffect(() => {
    setTab(quickAddInitialTab);
  }, [quickAddInitialTab]);

  useEffect(() => {
    setCurrency(reportingCurrency);
    if (!accountId && dataset.accounts[0]) setAccountId(dataset.accounts[0].id);
  }, [reportingCurrency, dataset.accounts, accountId]);

  if (!quickAddOpen) return null;

  const applyTranscript = (raw: string) => {
    const parsed = parseVoiceExpenseTranscript(raw, reportingCurrency);
    if (parsed.amount) setAmount(String(parsed.amount));
    setCurrency(parsed.currency);
    setDate(parsed.date);
    setMerchant(parsed.description);
    setDescription(raw);
    const matchedCat = dataset.categories.find(
      (c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()
    );
    if (matchedCat) setCategoryId(matchedCat.id);
    setVoiceConfidence(parsed.confidence);
    setTab('manual');
  };

  const startVoiceCapture = () => {
    if (!speechSupported) return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRec) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRec as any)();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    setListening(true);
    setError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setTranscript(text);
      setListening(false);
      if (text) applyTranscript(text);
    };
    rec.onerror = () => {
      setListening(false);
      setError('Could not capture voice audio. Type or edit your phrase below instead.');
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const numericAmount = parseFloat(amount);
    const parsed = transactionSchema.safeParse({
      type,
      scope,
      amount: numericAmount,
      currency,
      merchant,
      description,
      categoryId,
      panelId: panelId || null,
      accountId,
      date,
      isRecurring: recurrenceCycle !== 'none',
      recurrenceCycle,
      tags: [],
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check the transaction fields.');
      return;
    }

    addTransaction(parsed.data);
    setAmount('');
    setMerchant('');
    setDescription('');
    setVoiceConfidence(null);
    setQuickAddOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
    >
      <div className="w-full max-w-lg rounded-2xl pp-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <h2 id="quick-add-title" className="text-lg font-semibold">
              Quick Add Transaction
            </h2>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#0B0F1E]">
              <button
                type="button"
                onClick={() => setTab('manual')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === 'manual'
                    ? 'bg-white dark:bg-[#1E2642] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-[#9BA6C0]'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setTab('voice')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                  tab === 'voice'
                    ? 'bg-white dark:bg-[#1E2642] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-[#9BA6C0]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                Voice Entry
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#9BA6C0] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tab === 'voice' ? (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={startVoiceCapture}
                disabled={!speechSupported || listening}
                className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  listening
                    ? 'bg-[#A46BFF] text-white ring-4 ring-[#A46BFF]/30'
                    : speechSupported
                    ? 'bg-[#8156F8] hover:bg-[#A46BFF] text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                }`}
              >
                {listening ? <Mic className="w-8 h-8" /> : speechSupported ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
              </button>
              <div>
                <p className="font-medium text-sm">
                  {listening
                    ? 'Listening… speak naturally'
                    : speechSupported
                    ? 'Tap microphone and say e.g. "I spent 250 rupees on lunch today"'
                    : 'Browser speech recognition unavailable — type your expense phrase below'}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-1">
                  You will review and confirm extracted details before anything is saved.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0]">
                Voice transcript or natural-language phrase
              </label>
              <textarea
                rows={2}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder='e.g. "I spent 250 rupees on lunch today"'
                className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
              />
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTab('manual')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Switch to Manual
              </button>
              <button
                type="button"
                disabled={!transcript.trim()}
                onClick={() => applyTranscript(transcript)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#8156F8] hover:bg-[#A46BFF] text-white disabled:opacity-40 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Extract & Review
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {voiceConfidence && (
              <div className="p-3 rounded-xl bg-[#A46BFF]/10 border border-[#A46BFF]/30 text-xs flex items-center justify-between">
                <span>
                  Voice extraction confidence: <strong className="capitalize">{voiceConfidence}</strong> — verify before saving.
                </span>
                <button
                  type="button"
                  onClick={() => setVoiceConfidence(null)}
                  className="text-[#A46BFF] hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F1E]">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                      type === t
                        ? t === 'expense'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-emerald-500/15 text-emerald-500'
                        : 'text-slate-600 dark:text-[#9BA6C0]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F1E]">
                {(['personal', 'business'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                      scope === s
                        ? 'bg-[#8156F8] text-white'
                        : 'text-slate-600 dark:text-[#9BA6C0]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Merchant / Payee
                </label>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Swiggy, AWS, Salary"
                  className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                >
                  {dataset.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Account / Wallet
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                >
                  {dataset.accounts
                    .filter((a) => !a.deletedAt)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Panel Group
                </label>
                <select
                  value={panelId}
                  onChange={(e) => setPanelId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                >
                  <option value="">None</option>
                  {dataset.panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                  Recurrence
                </label>
                <select
                  value={recurrenceCycle}
                  onChange={(e) => setRecurrenceCycle(e.target.value as RecurrenceCycle)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                >
                  <option value="none">One-time</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#9BA6C0] mb-1">
                Note / Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional memo"
                className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
              />
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#8156F8] hover:bg-[#A46BFF] text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Transaction
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
