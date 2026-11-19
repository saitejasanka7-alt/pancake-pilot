import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PipOrb } from '../../components/BrandMark';
import { useFinance } from '../../context/FinanceContext';
import { convertAmount, formatMoney } from '../../shared/currencies';
import {
  answerFinancesDeterministically,
  calculatePeriodSummary,
  filterTransactionsByRange,
  getSubscriptionMonthlyEquivalent,
  resolveDateRange,
} from '../../shared/financeEngine';
import type { AIMessage } from '../../shared/types';

const SUGGESTED_PROMPTS = [
  'How much did I spend on food this week?',
  'Why did my expenses increase?',
  'Which category consumes most of my money?',
  'How much can I save next month?',
  'Am I exceeding my budget?',
  'Which subscriptions cost me the most?',
  "Predict next month's expenses.",
  'How can I reduce unnecessary spending?',
  'Compare my business and personal expenses.',
  'Show my largest transactions.',
];

export function PipAIPage() {
  const navigate = useNavigate();
  const {
    mode,
    dataset,
    reportingCurrency,
    rates,
    isOnline,
    geminiConfigured,
    totalBalance,
    budgetStatuses,
    forecast,
    appendAIMessage,
    createConversation,
    clearConversations,
    updatePreferences,
  } = useFinance();

  const [activeConvId, setActiveConvId] = useState(
    () => dataset.conversations[0]?.id || ''
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const activeConv = useMemo(
    () =>
      dataset.conversations.find((c) => c.id === activeConvId) ||
      dataset.conversations[0],
    [activeConvId, dataset.conversations]
  );

  const sendQuestion = async (rawPrompt: string) => {
    const question = rawPrompt.trim();
    if (!question || loading) return;

    let convId = activeConv?.id;
    if (!convId) {
      const created = createConversation();
      convId = created.id;
      setActiveConvId(convId);
    }

    const userMsg: AIMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    appendAIMessage(convId, userMsg);
    setInput('');
    setLoading(true);

    // Deterministic calculation first (always grounded in real database records)
    const deterministic = answerFinancesDeterministically(question, {
      transactions: dataset.transactions,
      categories: dataset.categories,
      budgets: dataset.budgets,
      subscriptions: dataset.subscriptions,
      goals: dataset.goals,
      reportingCurrency,
      rates,
    });

    const useLiveGemini =
      isOnline && geminiConfigured && dataset.preferences.aiPrivacyConsent;

    if (!useLiveGemini) {
      const offlineMsg: AIMessage = {
        id: `msg_a_${Date.now() + 1}`,
        role: 'assistant',
        content: deterministic.reply,
        createdAt: new Date().toISOString(),
        source: mode === 'demo' ? 'local_demo' : 'offline_fallback',
        insightCard: deterministic.insightCard,
      };
      appendAIMessage(convId, offlineMsg);
      setLoading(false);
      return;
    }

    try {
      const thisMonthRange = resolveDateRange('this_month');
      const lastMonthRange = resolveDateRange('last_month');
      const thisMonthSum = calculatePeriodSummary(
        dataset.transactions,
        thisMonthRange,
        reportingCurrency,
        rates
      );
      const lastMonthSum = calculatePeriodSummary(
        dataset.transactions,
        lastMonthRange,
        reportingCurrency,
        rates
      );

      const topCategories = dataset.categories
        .map((c) => ({
          name: c.name,
          thisMonth: Math.round(
            filterTransactionsByRange(dataset.transactions, thisMonthRange)
              .filter((t) => t.type === 'expense' && t.categoryId === c.id)
              .reduce((acc, t) => acc + convertAmount(t.amount, t.currency, reportingCurrency, rates), 0)
          ),
          lastMonth: Math.round(
            filterTransactionsByRange(dataset.transactions, lastMonthRange)
              .filter((t) => t.type === 'expense' && t.categoryId === c.id)
              .reduce((acc, t) => acc + convertAmount(t.amount, t.currency, reportingCurrency, rates), 0)
          ),
        }))
        .filter((c) => c.thisMonth > 0 || c.lastMonth > 0)
        .slice(0, 6);

      const activeSubs = dataset.subscriptions.filter((s) => !s.deletedAt && s.status === 'active');
      const subscriptionsMonthlyTotal = activeSubs.reduce(
        (sum, s) => sum + getSubscriptionMonthlyEquivalent(s, reportingCurrency, rates),
        0
      );

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          conversationId: convId,
          reportingCurrency,
          anonymizeMerchants: dataset.preferences.aiAnonymizeMerchants,
          contextSummary: {
            totalBalance,
            thisMonthIncome: thisMonthSum.income,
            thisMonthExpenses: thisMonthSum.expenses,
            lastMonthExpenses: lastMonthSum.expenses,
            savingsRatePct: thisMonthSum.savingsRatePct,
            personalExpenses: thisMonthSum.personalExpenses,
            businessExpenses: thisMonthSum.businessExpenses,
            predictedNextMonth: forecast.predictedNextMonth,
            topCategories,
            budgets: budgetStatuses.map((b) => ({
              name: b.budget.name,
              limit: b.limitConverted,
              spent: b.spentConverted,
              pct: b.percentUsed,
            })),
            subscriptionsMonthlyTotal: Math.round(subscriptionsMonthlyTotal),
            topSubscriptions: activeSubs.slice(0, 4).map((s) => ({
              name: s.name,
              monthlyEquivalent: Math.round(
                getSubscriptionMonthlyEquivalent(s, reportingCurrency, rates)
              ),
            })),
            recentNotableTransactions: filterTransactionsByRange(
              dataset.transactions,
              thisMonthRange
            )
              .slice(0, 12)
              .map((t) => ({
                date: t.date,
                label: t.merchant,
                category:
                  dataset.categories.find((c) => c.id === t.categoryId)?.name || 'Other',
                amount: Math.round(convertAmount(t.amount, t.currency, reportingCurrency, rates)),
                scope: t.scope,
                type: t.type,
              })),
          },
        }),
      });

      const data = await res.json();
      if (data.mode === 'gemini' && data.reply) {
        const matchedCat = data.relatedCategoryName
          ? dataset.categories.find(
              (c) => c.name.toLowerCase() === String(data.relatedCategoryName).toLowerCase()
            )
          : undefined;
        appendAIMessage(convId, {
          id: `msg_a_${Date.now() + 1}`,
          role: 'assistant',
          content: data.reply,
          createdAt: new Date().toISOString(),
          source: 'gemini',
          modelUsed: data.modelUsed,
          insightCard: {
            ...(data.insightCard || deterministic.insightCard),
            relatedFilter: {
              categoryId: matchedCat?.id || deterministic.insightCard.relatedFilter?.categoryId,
              scope:
                data.relatedScope === 'personal' || data.relatedScope === 'business'
                  ? data.relatedScope
                  : deterministic.insightCard.relatedFilter?.scope,
              type: 'expense',
            },
          },
        });
      } else {
        appendAIMessage(convId, {
          id: `msg_a_${Date.now() + 1}`,
          role: 'assistant',
          content: deterministic.reply,
          createdAt: new Date().toISOString(),
          source: 'offline_fallback',
          insightCard: deterministic.insightCard,
        });
      }
    } catch {
      appendAIMessage(convId, {
        id: `msg_a_${Date.now() + 1}`,
        role: 'assistant',
        content: deterministic.reply,
        createdAt: new Date().toISOString(),
        source: 'offline_fallback',
        insightCard: deterministic.insightCard,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceQuestion = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SpeechRec) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRec as any)();
    rec.lang = 'en-IN';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      if (text) void sendQuestion(text);
    };
    rec.start();
  };

  const navigateRelated = (msg: AIMessage) => {
    const f = msg.insightCard?.relatedFilter;
    const params = new URLSearchParams();
    if (f?.categoryId) params.set('category', f.categoryId);
    if (f?.scope) params.set('scope', f.scope);
    if (f?.type) params.set('type', f.type);
    navigate(`/app/transactions?${params.toString()}`);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] min-h-[600px]">
      {/* Left Conversation History */}
      <aside className="lg:col-span-3 rounded-2xl pp-surface p-4 flex flex-col justify-between gap-4">
        <div className="space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold">Conversations</h2>
            <button
              type="button"
              onClick={() => {
                const c = createConversation();
                setActiveConvId(c.id);
              }}
              aria-label="New conversation"
              className="p-1.5 rounded-lg bg-[#8156F8] text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {dataset.conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate cursor-pointer transition-colors ${
                  c.id === activeConv?.id
                    ? 'bg-[#8156F8]/15 text-[#8156F8] dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-[#9BA6C0] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#101426] space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#40D99A]" />
              <span>AI Privacy Control</span>
            </div>
            <p className="text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
              {dataset.preferences.aiPrivacyConsent
                ? 'Minimized summary sharing enabled for Gemini analysis.'
                : 'External AI paused — running 100% locally on your device.'}
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dataset.preferences.aiPrivacyConsent}
                onChange={(e) =>
                  updatePreferences({ aiPrivacyConsent: e.target.checked })
                }
              />
              <span>Allow Gemini AI summary</span>
            </label>
          </div>

          <button
            type="button"
            onClick={clearConversations}
            className="w-full py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-[#9BA6C0] hover:text-rose-500 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>
      </aside>

      {/* Main Pip AI Chat Workspace */}
      <section className="lg:col-span-9 rounded-2xl pp-surface flex flex-col overflow-hidden">
        {/* Pip Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <PipOrb size="sm" />
            <div>
              <h1 className="text-base font-display font-bold">Pip AI Finance Copilot</h1>
              <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                {isOnline && geminiConfigured && dataset.preferences.aiPrivacyConsent
                  ? 'Gemini Server-Side AI + Deterministic Ledger Math'
                  : 'Local Deterministic Analysis Engine (Offline / Privacy Mode)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9BA6C0]">
            <Lock className="w-3.5 h-3.5" />
            <span>Isolated to your workspace</span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeConv?.messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-5 py-4 space-y-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#8156F8] text-white'
                    : 'bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-white/[0.07]'
                }`}
              >
                <p>{m.content}</p>

                {m.role === 'assistant' && m.insightCard && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#151B30] border border-slate-200/80 dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#8156F8] dark:text-[#43D9E8]">
                        {m.insightCard.headline}
                      </p>
                      <span className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
                        {m.source === 'gemini'
                          ? `Gemini (${m.modelUsed})`
                          : m.source === 'local_demo'
                          ? 'Local Demo Calculation'
                          : 'Offline Local Calculation'}
                      </span>
                    </div>

                    {m.insightCard.differenceLabel && (
                      <p className="text-xs text-slate-600 dark:text-[#9BA6C0]">
                        {m.insightCard.differenceLabel}
                      </p>
                    )}

                    {m.insightCard.breakdown && m.insightCard.breakdown.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {m.insightCard.breakdown.map((b) => (
                          <div
                            key={b.label}
                            className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/[0.04] pb-1"
                          >
                            <span className="text-slate-600 dark:text-[#9BA6C0]">{b.label}</span>
                            <span className="font-mono tabular-nums font-semibold">
                              {formatMoney(b.value, reportingCurrency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.insightCard.recommendedAction && (
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        Recommended action: {m.insightCard.recommendedAction}
                      </p>
                    )}

                    {m.insightCard.relatedFilter && (
                      <button
                        type="button"
                        onClick={() => navigateRelated(m)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8156F8] dark:text-[#A46BFF] hover:underline cursor-pointer"
                      >
                        VIEW RELATED TRANSACTIONS
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#9BA6C0]">
              <PipOrb size="sm" />
              <span>Pip is analyzing your ledger…</span>
            </div>
          )}
        </div>

        {/* Clickable Prompt Suggestions */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-white/[0.06] flex gap-2 overflow-x-auto">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendQuestion(prompt)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#101426] hover:bg-[#8156F8]/15 border border-slate-200 dark:border-white/[0.08] text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendQuestion(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center gap-2.5"
        >
          <button
            type="button"
            onClick={handleVoiceQuestion}
            title="Voice input"
            aria-label="Ask via voice"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer"
          >
            <Mic className="w-4 h-4 text-[#43D9E8]" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Pip about your spending, budgets, subscriptions, or forecast…"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
