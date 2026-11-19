import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney } from '../../shared/currencies';
import { buildMonthlySeries } from '../../shared/financeEngine';

export function AnalyticsPage() {
  const { dataset, reportingCurrency, rates, forecast, healthReport } = useFinance();

  const actualPlusForecast = useMemo(() => {
    const history = buildMonthlySeries(dataset.transactions, reportingCurrency, rates, 5);
    const rows = history.map((h) => ({
      label: h.label,
      actual: h.expenses,
      predicted: null as number | null,
    }));
    rows.push({
      label: 'Next Mo (Est.)',
      actual: 0,
      predicted: forecast.predictedNextMonth,
    });
    return rows;
  }, [dataset.transactions, forecast.predictedNextMonth, rates, reportingCurrency]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Predictive Analytics &amp; Financial Health
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
          Statistical forecasts, anomaly detection, and educational wellness scoring from your actual ledger.
        </p>
      </div>

      {/* Forecast Headline Banner */}
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 p-6 rounded-2xl pp-surface space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#43D9E8] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Next-Month Expenditure Forecast (Statistical Estimate)
              </p>
              <p className="text-3xl font-display font-bold font-mono tabular-nums">
                {formatMoney(forecast.predictedNextMonth, reportingCurrency)}
              </p>
              <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                Based on your recent spending pattern · Expected range:{' '}
                <span className="font-mono">
                  {formatMoney(forecast.confidenceLow, reportingCurrency)} –{' '}
                  {formatMoney(forecast.confidenceHigh, reportingCurrency)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Historical Monthly Avg</p>
              <p className="text-lg font-mono font-semibold tabular-nums">
                {formatMoney(forecast.historicalAverage, reportingCurrency)}
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={actualPlusForecast}>
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
                <Bar dataKey="actual" name="Actual Expenses" fill="#8156F8" radius={[8, 8, 0, 0]} />
                <Bar dataKey="predicted" name="Predicted Next Month" fill="#43D9E8" radius={[8, 8, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#A46BFF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] text-xs text-slate-600 dark:text-[#9BA6C0] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#43D9E8] shrink-0 mt-0.5" />
            <span>{forecast.methodologyExplanation}</span>
          </div>
        </div>

        {/* Financial Health Score Card */}
        <div className="lg:col-span-4 p-6 rounded-2xl pp-surface flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#40D99A]" />
                <h2 className="text-base font-display font-semibold">Financial Health Score</h2>
              </div>
              <span className="text-xs font-semibold text-[#43D9E8]">{healthReport.gradeLabel}</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-bold font-mono tabular-nums text-[#40D99A]">
                {healthReport.overallScore}
              </span>
              <span className="text-sm text-slate-500 dark:text-[#9BA6C0]">/ 100</span>
            </div>

            <div className="space-y-3">
              {healthReport.components.map((comp) => (
                <div key={comp.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      {comp.label}{' '}
                      <span className="text-slate-400">({comp.weightPct}%)</span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold">{comp.score}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8156F8] to-[#43D9E8]"
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">{comp.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0] pt-3 border-t border-slate-200 dark:border-white/[0.06] leading-relaxed">
            {healthReport.disclaimer}
          </p>
        </div>
      </div>

      {/* Category Predictions & Anomaly Detection */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">Category-Level Predictions</h2>
          {forecast.categoryPredictions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
              Add expense history across categories to generate category-level projections.
            </p>
          ) : (
            <div className="space-y-3">
              {forecast.categoryPredictions.map((cp) => (
                <div
                  key={cp.categoryId}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101426] flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">{cp.categoryName}</p>
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                      Avg: <span className="font-mono">{formatMoney(cp.historicalAvg, reportingCurrency)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold tabular-nums">
                      {formatMoney(cp.predictedAmount, reportingCurrency)}
                    </p>
                    <p
                      className={`text-[11px] inline-flex items-center gap-0.5 ${
                        cp.direction === 'rising'
                          ? 'text-rose-500'
                          : cp.direction === 'falling'
                          ? 'text-[#40D99A]'
                          : 'text-slate-500'
                      }`}
                    >
                      {cp.direction === 'rising' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : cp.direction === 'falling' ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : null}
                      {cp.trendPct > 0 ? `+${cp.trendPct}%` : `${cp.trendPct}%`} mom
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold">Unusual Transaction Detector</h2>
            <Link
              to="/app/transactions"
              className="text-xs text-[#8156F8] dark:text-[#43D9E8] hover:underline"
            >
              Inspect Ledger →
            </Link>
          </div>

          {forecast.anomalies.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-[#9BA6C0]">
              No statistical outlier transactions detected right now.
            </div>
          ) : (
            <div className="space-y-3">
              {forecast.anomalies.map((anom) => (
                <div
                  key={anom.transaction.id}
                  className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      {anom.transaction.merchant}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-sm">
                      {formatMoney(anom.convertedAmount, reportingCurrency)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#9BA6C0]">
                    {anom.transaction.date} · {anom.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
