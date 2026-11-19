import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Mic,
  Plus,
  ScanLine,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PipOrb } from '../../components/BrandMark';
import { useFinance } from '../../context/FinanceContext';
import { convertAmount, formatMoney } from '../../shared/currencies';
import { buildMonthlySeries, filterTransactionsByRange } from '../../shared/financeEngine';
import type { PeriodPreset } from '../../shared/types';

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: '3 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

export function OverviewPage() {
  const navigate = useNavigate();
  const {
    dataset,
    reportingCurrency,
    rates,
    periodPreset,
    setPeriodPreset,
    customRange,
    setCustomRange,
    activeRange,
    totalBalance,
    periodSummary,
    budgetStatuses,
    forecast,
    healthReport,
    updateTransaction,
    setQuickAddOpen,
    setQuickAddInitialTab,
  } = useFinance();

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const periodTransactions = useMemo(
    () =>
      filterTransactionsByRange(dataset.transactions, activeRange).sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    [dataset.transactions, activeRange]
  );

  const monthlySeries = useMemo(
    () => buildMonthlySeries(dataset.transactions, reportingCurrency, rates, 6),
    [dataset.transactions, reportingCurrency, rates]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of periodTransactions) {
      if (tx.type !== 'expense') continue;
      const amt = convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
      map[tx.categoryId] = (map[tx.categoryId] ?? 0) + amt;
    }
    return dataset.categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        value: Math.round((map[c.id] ?? 0) * 100) / 100,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [dataset.categories, periodTransactions, rates, reportingCurrency]);

  const totalBudgetRemaining = useMemo(() => {
    const overall = budgetStatuses.find((b) => b.budget.categoryId === null);
    if (overall) return overall.remainingConverted;
    return budgetStatuses.reduce((sum, b) => sum + b.remainingConverted, 0);
  }, [budgetStatuses]);

  const scopeCompareData = useMemo(
    () => [
      {
        name: 'Personal',
        amount: periodSummary.personalExpenses,
      },
      {
        name: 'Business',
        amount: periodSummary.businessExpenses,
      },
    ],
    [periodSummary]
  );

  const saveInlineEdit = (id: string) => {
    const parsed = parseFloat(editAmount);
    if (!Number.isNaN(parsed) && parsed > 0) {
      updateTransaction(id, { amount: parsed });
    }
    setEditingTxId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Financial Overview</h1>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
            Active window: {activeRange.startDate} to {activeRange.endDate} · Reporting in {reportingCurrency}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#101426] border border-slate-200 dark:border-white/[0.07]">
            {PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriodPreset(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  periodPreset === opt.value
                    ? 'bg-white dark:bg-[#8156F8] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-[#9BA6C0] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(e.target.value, customRange.end)}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#101426] border border-slate-200 dark:border-white/10 font-mono"
              />
              <span>–</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(customRange.start, e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#101426] border border-slate-200 dark:border-white/10 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* 6 Dynamic Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <div className="p-5 rounded-2xl pp-surface space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Total Balance</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums">
            {formatMoney(totalBalance, reportingCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
            Across {dataset.accounts.filter((a) => !a.deletedAt).length} accounts
          </p>
        </div>

        <div className="p-5 rounded-2xl pp-surface space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Period Income</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums text-[#16A34A] dark:text-[#40D99A]">
            {formatMoney(periodSummary.income, reportingCurrency)}
          </p>
          <p className="text-[11px] text-[#16A34A] dark:text-[#40D99A] inline-flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            Inflow
          </p>
        </div>

        <div className="p-5 rounded-2xl pp-surface space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Period Expenses</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums">
            {formatMoney(periodSummary.expenses, reportingCurrency)}
          </p>
          <p className="text-[11px] text-rose-500 inline-flex items-center gap-0.5">
            <ArrowDownRight className="w-3 h-3" />
            Outflow
          </p>
        </div>

        <div className="p-5 rounded-2xl pp-surface space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Net Savings</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums text-[#0284C7] dark:text-[#43D9E8]">
            {formatMoney(periodSummary.netSavings, reportingCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">Income minus spend</p>
        </div>

        <div className="p-5 rounded-2xl pp-surface space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Savings Rate</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums text-[#8156F8] dark:text-[#A46BFF]">
            {periodSummary.savingsRatePct}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">Target ≥ 20%</p>
        </div>

        <div className="p-5 rounded-2xl pp-surface space-y-1.5">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Remaining Budget</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums">
            {formatMoney(totalBudgetRemaining, reportingCurrency)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
            {budgetStatuses.length} active budget{budgetStatuses.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Main Analytics Row: Income vs Expenses + Pip AI Copilot Spotlight */}
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold">Income vs Expenses Trend</h2>
              <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                6-month historical trajectory · Next month forecast:{' '}
                <span className="font-mono font-semibold text-[#8156F8] dark:text-[#43D9E8]">
                  {formatMoney(forecast.predictedNextMonth, reportingCurrency)}
                </span>
              </p>
            </div>
            <Link
              to="/app/analytics"
              className="text-xs font-medium text-[#8156F8] dark:text-[#43D9E8] hover:underline whitespace-nowrap"
            >
              View Forecast →
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySeries}>
                <defs>
                  <linearGradient id="ovInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43D9E8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#43D9E8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ovExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A46BFF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#A46BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,166,192,0.12)" />
                <XAxis dataKey="label" stroke="#9BA6C0" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#9BA6C0"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatMoney(Number(v), reportingCurrency, { compact: true })}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101426',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#F6F7FB',
                  }}
                  formatter={(value) => formatMoney(Number(value ?? 0), reportingCurrency)}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="#43D9E8" strokeWidth={2.2} fill="url(#ovInc)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#A46BFF" strokeWidth={2.2} fill="url(#ovExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pip AI Copilot & Quick Actions Card */}
        <div className="lg:col-span-4 p-6 rounded-2xl pp-surface flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <PipOrb size="md" />
              <div>
                <h2 className="text-base font-display font-semibold">Pip AI Copilot</h2>
                <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                  Instant financial intelligence
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101426] border border-slate-200/70 dark:border-white/[0.06] space-y-2 text-xs leading-relaxed">
              <p className="font-medium">
                {forecast.anomalies[0]
                  ? `Outlier noticed: ${forecast.anomalies[0].transaction.merchant} (${formatMoney(forecast.anomalies[0].convertedAmount, reportingCurrency)})`
                  : `Projected next-month spend: ${formatMoney(forecast.predictedNextMonth, reportingCurrency)}`}
              </p>
              <p className="text-slate-600 dark:text-[#9BA6C0]">
                {healthReport.suggestions[0]}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link
              to="/app/pip-ai"
              className="w-full py-2.5 px-4 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Pip AI Anything
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickAddInitialTab('voice');
                  setQuickAddOpen(true);
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-[#43D9E8]" />
                Voice Entry
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/receipts')}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5 text-[#A46BFF]" />
                Scan Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Category Donut + Budget Usage + Personal vs Business + Health Score */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Category Donut */}
        <div className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">Category Breakdown</h2>
          {categoryBreakdown.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-[#9BA6C0] gap-2">
              <p>No expenses recorded for this period yet.</p>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#8156F8] text-white font-medium cursor-pointer"
              >
                Log First Expense
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {categoryBreakdown.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101426',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#F6F7FB',
                      }}
                      formatter={(v) => formatMoney(Number(v ?? 0), reportingCurrency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                {categoryBreakdown.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-slate-600 dark:text-[#9BA6C0] flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-mono tabular-nums font-medium shrink-0">
                      {formatMoney(c.value, reportingCurrency, { compact: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Budget Usage Chart */}
        <div className="p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold">Smart Budgets</h2>
            <Link to="/app/budgets" className="text-xs text-[#8156F8] dark:text-[#43D9E8] hover:underline">
              Manage →
            </Link>
          </div>
          {budgetStatuses.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-500 dark:text-[#9BA6C0] gap-2">
              <p>No budgets configured yet.</p>
              <Link to="/app/budgets" className="px-3 py-1.5 rounded-lg bg-[#8156F8] text-white font-medium">
                Create Budget
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {budgetStatuses.slice(0, 4).map((bs) => {
                const barColor =
                  bs.percentUsed >= 100
                    ? 'bg-rose-500'
                    : bs.percentUsed >= 75
                    ? 'bg-amber-500'
                    : 'bg-[#40D99A]';
                return (
                  <div key={bs.budget.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{bs.budget.name}</span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-[#9BA6C0]">
                        {formatMoney(bs.spentConverted, reportingCurrency, { compact: true })} /{' '}
                        {formatMoney(bs.limitConverted, reportingCurrency, { compact: true })} ({bs.percentUsed}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, bs.percentUsed)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Personal vs Business + Health Score */}
        <div className="p-6 rounded-2xl pp-surface space-y-5 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold">Financial Wellness</h2>
              <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
                Educational budgeting indicator
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold font-mono tabular-nums text-[#40D99A]">
                {healthReport.overallScore}
                <span className="text-xs text-slate-500 dark:text-[#9BA6C0]">/100</span>
              </p>
              <p className="text-[11px] font-medium text-[#43D9E8]">{healthReport.gradeLabel}</p>
            </div>
          </div>

          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeCompareData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" stroke="#9BA6C0" fontSize={12} width={70} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101426',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#F6F7FB',
                  }}
                  formatter={(v) => formatMoney(Number(v ?? 0), reportingCurrency)}
                />
                <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                  <Cell fill="#43D9E8" />
                  <Cell fill="#A46BFF" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/[0.06] text-xs">
            <span className="text-slate-500 dark:text-[#9BA6C0] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#A46BFF]" />
              Personal vs Business Split
            </span>
            <Link to="/app/analytics" className="font-medium text-[#8156F8] dark:text-[#43D9E8] hover:underline">
              Score Formula →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions with Inline Amount Edit */}
      <div className="rounded-2xl pp-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.07] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-semibold">Recent Transactions</h2>
            <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
              Click any amount to edit inline · Showing latest entries for selected period
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#8156F8] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
            <Link
              to="/app/transactions"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            >
              All Transactions
            </Link>
          </div>
        </div>

        {periodTransactions.length === 0 ? (
          <div className="p-10 text-center space-y-2 text-xs text-slate-500 dark:text-[#9BA6C0]">
            <p>No transactions found in this date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-[#9BA6C0]">
                  <th className="py-3 px-6 font-medium">Merchant</th>
                  <th className="py-3 px-4 font-medium">Category · Scope</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-6 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                {periodTransactions.slice(0, 7).map((tx) => {
                  const cat = dataset.categories.find((c) => c.id === tx.categoryId);
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-6">
                        <p className="font-medium text-sm">{tx.merchant}</p>
                        {tx.description && (
                          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] truncate max-w-xs">
                            {tx.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-[#9BA6C0]">
                        <span>{cat?.name || 'Uncategorized'}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="capitalize">{tx.scope}</span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500 dark:text-[#9BA6C0]">
                        {tx.date}
                      </td>
                      <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold">
                        {editingTxId === tx.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(tx.id);
                                if (e.key === 'Escape') setEditingTxId(null);
                              }}
                              autoFocus
                              className="w-24 px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-[#0B0F1E] border border-[#A46BFF]"
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(tx.id)}
                              className="text-xs text-[#40D99A] font-medium cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTxId(tx.id);
                              setEditAmount(String(tx.amount));
                            }}
                            title="Click to edit amount inline"
                            className={`cursor-pointer hover:underline ${
                              tx.type === 'income' ? 'text-[#16A34A] dark:text-[#40D99A]' : ''
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatMoney(tx.amount, tx.currency)}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
