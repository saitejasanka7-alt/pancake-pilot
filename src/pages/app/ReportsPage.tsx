import React, { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { convertAmount, formatMoney } from '../../shared/currencies';
import {
  buildMonthlySeries,
  calculatePeriodSummary,
  filterTransactionsByRange,
  resolveDateRange,
  toIsoDate,
} from '../../shared/financeEngine';
import type { PeriodPreset } from '../../shared/types';

export function ReportsPage() {
  const {
    dataset,
    reportingCurrency,
    rates,
    accountBalances,
    budgetStatuses,
    healthReport,
    notify,
  } = useFinance();

  const [reportPreset, setReportPreset] = useState<PeriodPreset>('this_month');
  const [includeCommentary, setIncludeCommentary] = useState(true);

  const range = useMemo(() => resolveDateRange(reportPreset), [reportPreset]);
  const summary = useMemo(
    () => calculatePeriodSummary(dataset.transactions, range, reportingCurrency, rates),
    [dataset.transactions, range, rates, reportingCurrency]
  );

  const periodTx = useMemo(
    () => filterTransactionsByRange(dataset.transactions, range),
    [dataset.transactions, range]
  );

  const categoryRows = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const tx of periodTx) {
      if (tx.type !== 'expense') continue;
      totals[tx.categoryId] =
        (totals[tx.categoryId] ?? 0) +
        convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
    }
    return dataset.categories
      .map((c) => ({
        name: c.name,
        amount: Math.round((totals[c.id] ?? 0) * 100) / 100,
      }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [dataset.categories, periodTx, rates, reportingCurrency]);

  const monthlySeries = useMemo(
    () => buildMonthlySeries(dataset.transactions, reportingCurrency, rates, 6),
    [dataset.transactions, rates, reportingCurrency]
  );

  const downloadPdfReport = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 48;

    doc.setFontSize(18);
    doc.text('PancakePilot AI — Financial Statement Report', 42, y);
    y += 20;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Period: ${range.startDate} to ${range.endDate} | Reporting Currency: ${reportingCurrency} | Generated: ${toIsoDate(new Date())}`,
      42,
      y
    );
    y += 24;

    doc.setTextColor(20);
    doc.setFontSize(13);
    doc.text('1. Financial Overview', 42, y);
    y += 18;
    doc.setFontSize(10);
    doc.text(`Income: ${formatMoney(summary.income, reportingCurrency)}`, 48, y);
    y += 15;
    doc.text(`Expenses: ${formatMoney(summary.expenses, reportingCurrency)}`, 48, y);
    y += 15;
    doc.text(
      `Net Savings: ${formatMoney(summary.netSavings, reportingCurrency)} (${summary.savingsRatePct}% savings rate)`,
      48,
      y
    );
    y += 15;
    doc.text(
      `Personal Spend: ${formatMoney(summary.personalExpenses, reportingCurrency)} | Business Spend: ${formatMoney(summary.businessExpenses, reportingCurrency)}`,
      48,
      y
    );
    y += 26;

    doc.setFontSize(13);
    doc.text('2. Category Expense Breakdown', 42, y);
    y += 18;
    doc.setFontSize(10);
    if (categoryRows.length === 0) {
      doc.text('No expenses recorded in this period.', 48, y);
      y += 16;
    } else {
      for (const row of categoryRows.slice(0, 8)) {
        doc.text(`${row.name}: ${formatMoney(row.amount, reportingCurrency)}`, 48, y);
        y += 14;
      }
    }
    y += 16;

    doc.setFontSize(13);
    doc.text('3. Budget Performance', 42, y);
    y += 18;
    doc.setFontSize(10);
    if (budgetStatuses.length === 0) {
      doc.text('No budgets configured.', 48, y);
      y += 16;
    } else {
      for (const bs of budgetStatuses.slice(0, 6)) {
        doc.text(
          `${bs.budget.name}: ${formatMoney(bs.spentConverted, reportingCurrency)} / ${formatMoney(bs.limitConverted, reportingCurrency)} (${bs.percentUsed}%)`,
          48,
          y
        );
        y += 14;
      }
    }
    y += 16;

    doc.setFontSize(13);
    doc.text('4. Savings Goals Progress', 42, y);
    y += 18;
    doc.setFontSize(10);
    const activeGoals = dataset.goals.filter((g) => !g.deletedAt);
    if (activeGoals.length === 0) {
      doc.text('No savings goals configured.', 48, y);
      y += 16;
    } else {
      for (const g of activeGoals.slice(0, 5)) {
        const pct = Math.round((g.savedAmount / Math.max(1, g.targetAmount)) * 100);
        doc.text(
          `${g.name}: ${formatMoney(g.savedAmount, g.currency)} / ${formatMoney(g.targetAmount, g.currency)} (${pct}%)`,
          48,
          y
        );
        y += 14;
      }
    }

    if (includeCommentary) {
      y += 18;
      doc.setFontSize(13);
      doc.text('5. Pip Financial Wellness Commentary', 42, y);
      y += 18;
      doc.setFontSize(10);
      const comment = `Educational Wellness Score: ${healthReport.overallScore}/100 (${healthReport.gradeLabel}). Top recommendation: ${healthReport.suggestions[0]}`;
      const wrapped = doc.splitTextToSize(comment, 500);
      doc.text(wrapped, 48, y);
    }

    doc.save(`pancakepilot-report-${range.startDate}-to-${range.endDate}.pdf`);
    notify('PDF Financial Report generated and downloaded.', 'success');
  };

  const exportCsv = () => {
    const rows = [
      ['Date', 'Type', 'Scope', 'Merchant', 'Amount', 'Currency'],
      ...periodTx.map((t) => [
        t.date,
        t.type,
        t.scope,
        `"${t.merchant.replace(/"/g, '""')}"`,
        String(t.amount),
        t.currency,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pancakepilot-report-${range.startDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('CSV report downloaded.', 'success');
  };

  const exportJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      period: range,
      reportingCurrency,
      summary,
      categoryBreakdown: categoryRows,
      transactions: periodTx,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pancakepilot-report-${range.startDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('JSON report downloaded.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Financial Reports</h1>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
            Period-accurate statements, account summaries, and PDF/CSV/JSON exports in {reportingCurrency}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Report period"
            value={reportPreset}
            onChange={(e) => setReportPreset(e.target.value as PeriodPreset)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#101426] border border-slate-200 dark:border-white/10"
          >
            <option value="this_week">Weekly (This Week)</option>
            <option value="this_month">Monthly (This Month)</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Quarterly (3 Months)</option>
            <option value="this_year">Annual (This Year)</option>
          </select>

          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            type="button"
            onClick={downloadPdfReport}
            className="px-4 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Download PDF Report
          </button>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-[#9BA6C0] cursor-pointer">
        <input
          type="checkbox"
          checked={includeCommentary}
          onChange={(e) => setIncludeCommentary(e.target.checked)}
        />
        Include Pip wellness commentary inside PDF report
      </label>

      {/* Summary Row */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Period Income</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums text-[#40D99A] mt-1">
            {formatMoney(summary.income, reportingCurrency)}
          </p>
        </div>
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Period Expenses</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums mt-1">
            {formatMoney(summary.expenses, reportingCurrency)}
          </p>
        </div>
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Personal vs Business</p>
          <p className="text-sm font-mono tabular-nums font-semibold mt-1">
            {formatMoney(summary.personalExpenses, reportingCurrency, { compact: true })} /{' '}
            {formatMoney(summary.businessExpenses, reportingCurrency, { compact: true })}
          </p>
        </div>
        <div className="p-5 rounded-2xl pp-surface">
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Savings Rate</p>
          <p className="text-xl font-display font-bold font-mono tabular-nums text-[#43D9E8] mt-1">
            {summary.savingsRatePct}%
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">6-Month Income vs Expenses</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
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
                  formatter={(v) => formatMoney(Number(v ?? 0), reportingCurrency)}
                />
                <Bar dataKey="income" name="Income" fill="#43D9E8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#A46BFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">Account-Wise Balances</h2>
          <div className="space-y-2.5">
            {dataset.accounts
              .filter((a) => !a.deletedAt)
              .map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold">{acc.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {acc.type.replace('_', ' ')} · {acc.currency}
                    </p>
                  </div>
                  <span className="font-mono font-bold tabular-nums">
                    {formatMoney(accountBalances[acc.id] ?? acc.openingBalance, acc.currency)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
