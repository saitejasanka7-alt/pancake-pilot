import { convertAmount, ExchangeRateTable, formatMoney, getDefaultRateTable } from './currencies';
import {
  Account,
  AIInsightCard,
  Budget,
  Category,
  DateRange,
  ExpenseGroup,
  PeriodPreset,
  SavingsGoal,
  Subscription,
  Transaction,
  Transfer,
} from './types';

export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveDateRange(
  preset: PeriodPreset,
  referenceDate = new Date(),
  customStart?: string,
  customEnd?: string
): DateRange {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (preset === 'custom' && customStart && customEnd) {
    return { preset, startDate: customStart, endDate: customEnd };
  }

  if (preset === 'this_week') {
    const day = today.getDay();
    const diffToMon = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - diffToMon);
    return { preset, startDate: toIsoDate(start), endDate: toIsoDate(today) };
  }

  if (preset === 'this_month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { preset, startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  if (preset === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { preset, startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  if (preset === 'last_3_months') {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { preset, startDate: toIsoDate(start), endDate: toIsoDate(end) };
  }

  // this_year
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31);
  return { preset: 'this_year', startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

export function filterTransactionsByRange(transactions: Transaction[], range: DateRange): Transaction[] {
  return transactions.filter(
    (t) => !t.deletedAt && t.date >= range.startDate && t.date <= range.endDate
  );
}

export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
  rates: ExchangeRateTable = getDefaultRateTable()
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const acc of accounts) {
    if (acc.deletedAt) continue;
    balances[acc.id] = acc.openingBalance;
  }

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    const acc = accounts.find((a) => a.id === tx.accountId && !a.deletedAt);
    if (!acc) continue;
    const amt = convertAmount(tx.amount, tx.currency, acc.currency, rates);
    balances[acc.id] = (balances[acc.id] ?? 0) + (tx.type === 'income' ? amt : -amt);
  }

  for (const tr of transfers) {
    if (tr.deletedAt) continue;
    if (balances[tr.fromAccountId] !== undefined) {
      balances[tr.fromAccountId] -= tr.amount;
    }
    if (balances[tr.toAccountId] !== undefined) {
      balances[tr.toAccountId] += tr.convertedAmount;
    }
  }

  return balances;
}

export function calculateTotalBalance(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable()
): number {
  const perAccount = calculateAccountBalances(accounts, transactions, transfers, rates);
  let total = 0;
  for (const acc of accounts) {
    if (acc.deletedAt) continue;
    const bal = perAccount[acc.id] ?? acc.openingBalance;
    total += convertAmount(bal, acc.currency, reportingCurrency, rates);
  }
  return Math.round(total * 100) / 100;
}

export interface PeriodSummary {
  income: number;
  expenses: number;
  netSavings: number;
  savingsRatePct: number;
  personalExpenses: number;
  businessExpenses: number;
}

export function calculatePeriodSummary(
  transactions: Transaction[],
  range: DateRange,
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable()
): PeriodSummary {
  const filtered = filterTransactionsByRange(transactions, range);
  let income = 0;
  let expenses = 0;
  let personalExpenses = 0;
  let businessExpenses = 0;

  for (const tx of filtered) {
    const converted = convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
    if (tx.type === 'income') {
      income += converted;
    } else {
      expenses += converted;
      if (tx.scope === 'business') businessExpenses += converted;
      else personalExpenses += converted;
    }
  }

  const netSavings = income - expenses;
  const savingsRatePct = income > 0 ? Math.round((netSavings / income) * 1000) / 10 : 0;

  return {
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    netSavings: Math.round(netSavings * 100) / 100,
    savingsRatePct,
    personalExpenses: Math.round(personalExpenses * 100) / 100,
    businessExpenses: Math.round(businessExpenses * 100) / 100,
  };
}

export interface BudgetStatus {
  budget: Budget;
  limitConverted: number;
  spentConverted: number;
  remainingConverted: number;
  percentUsed: number;
  triggeredThreshold: number | null;
  projectedMonthEnd: number;
  willExceed: boolean;
}

export function calculateBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable(),
  referenceDate = new Date()
): BudgetStatus[] {
  const monthRange = resolveDateRange('this_month', referenceDate);
  const weekRange = resolveDateRange('this_week', referenceDate);
  const daysElapsedInMonth = Math.max(1, referenceDate.getDate());
  const totalDaysInMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  ).getDate();

  return budgets
    .filter((b) => !b.deletedAt)
    .map((budget) => {
      const range = budget.period === 'weekly' ? weekRange : monthRange;
      const periodExpenses = filterTransactionsByRange(transactions, range).filter(
        (t) =>
          t.type === 'expense' &&
          (budget.categoryId === null || t.categoryId === budget.categoryId)
      );

      let spent = 0;
      for (const tx of periodExpenses) {
        spent += convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
      }
      const limit = convertAmount(budget.limitAmount, budget.currency, reportingCurrency, rates);
      const remaining = Math.max(0, limit - spent);
      const percentUsed = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;

      const sortedThresholds = [...budget.alertThresholds].sort((a, b) => b - a);
      const triggeredThreshold = sortedThresholds.find((th) => percentUsed >= th) ?? null;

      let projected = spent;
      if (budget.period === 'monthly') {
        projected = (spent / daysElapsedInMonth) * totalDaysInMonth;
      } else {
        const dayIdx = referenceDate.getDay() === 0 ? 7 : referenceDate.getDay();
        projected = (spent / Math.max(1, dayIdx)) * 7;
      }

      return {
        budget,
        limitConverted: Math.round(limit * 100) / 100,
        spentConverted: Math.round(spent * 100) / 100,
        remainingConverted: Math.round(remaining * 100) / 100,
        percentUsed,
        triggeredThreshold,
        projectedMonthEnd: Math.round(projected * 100) / 100,
        willExceed: projected > limit && limit > 0,
      };
    });
}

export function getSubscriptionMonthlyEquivalent(
  sub: Subscription,
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable()
): number {
  const amt = convertAmount(sub.amount, sub.currency, reportingCurrency, rates);
  if (sub.cycle === 'weekly') return amt * 4.333;
  if (sub.cycle === 'yearly') return amt / 12;
  return amt;
}

export interface MonthlyBucket {
  monthKey: string; // YYYY-MM
  label: string;
  income: number;
  expenses: number;
  savings: number;
}

export function buildMonthlySeries(
  transactions: Transaction[],
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable(),
  monthsBack = 6,
  referenceDate = new Date()
): MonthlyBucket[] {
  const buckets: MonthlyBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    buckets.push({ monthKey, label, income: 0, expenses: 0, savings: 0 });
  }

  const map = Object.fromEntries(buckets.map((b) => [b.monthKey, b]));
  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    const key = tx.date.slice(0, 7);
    const bucket = map[key];
    if (!bucket) continue;
    const amt = convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
    if (tx.type === 'income') bucket.income += amt;
    else bucket.expenses += amt;
  }

  for (const b of buckets) {
    b.income = Math.round(b.income * 100) / 100;
    b.expenses = Math.round(b.expenses * 100) / 100;
    b.savings = Math.round((b.income - b.expenses) * 100) / 100;
  }

  return buckets;
}

export interface CategoryPrediction {
  categoryId: string;
  categoryName: string;
  color: string;
  historicalAvg: number;
  predictedAmount: number;
  trendPct: number;
  direction: 'rising' | 'falling' | 'stable';
}

export interface ExpenseForecast {
  predictedNextMonth: number;
  historicalAverage: number;
  confidenceLow: number;
  confidenceHigh: number;
  methodologyExplanation: string;
  categoryPredictions: CategoryPrediction[];
  anomalies: {
    transaction: Transaction;
    convertedAmount: number;
    categoryAverage: number;
    deviationFactor: number;
    reason: string;
  }[];
}

export function computeExpenseForecast(
  transactions: Transaction[],
  categories: Category[],
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable(),
  referenceDate = new Date()
): ExpenseForecast {
  const series = buildMonthlySeries(transactions, reportingCurrency, rates, 6, referenceDate);
  const nonZeroMonths = series.filter((m) => m.expenses > 0);
  const expValues = nonZeroMonths.map((m) => m.expenses);

  const historicalAverage =
    expValues.length > 0
      ? expValues.reduce((sum, v) => sum + v, 0) / expValues.length
      : 0;

  // Weighted moving average giving higher weight to most recent 3 months
  let weightedSum = 0;
  let weightTotal = 0;
  expValues.forEach((val, idx) => {
    const weight = idx + 1;
    weightedSum += val * weight;
    weightTotal += weight;
  });
  const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // Linear trend adjustment based on recent slope
  let slopeAdjustment = 0;
  if (expValues.length >= 2) {
    const last = expValues[expValues.length - 1];
    const prev = expValues[expValues.length - 2];
    slopeAdjustment = (last - prev) * 0.25;
  }
  const predictedNextMonth = Math.max(0, Math.round((weightedAvg + slopeAdjustment) * 100) / 100);

  // Standard deviation for uncertainty band
  const variance =
    expValues.length > 1
      ? expValues.reduce((acc, v) => acc + Math.pow(v - historicalAverage, 2), 0) / expValues.length
      : Math.pow(predictedNextMonth * 0.12, 2);
  const stdDev = Math.sqrt(variance);
  const confidenceLow = Math.max(0, Math.round((predictedNextMonth - stdDev * 0.85) * 100) / 100);
  const confidenceHigh = Math.round((predictedNextMonth + stdDev * 0.85) * 100) / 100;

  // Category-level predictions across recent 3 months vs prior
  const activeMonthKeys = series.slice(-3).map((s) => s.monthKey);
  const lastMonthKey = series[series.length - 1]?.monthKey ?? '';
  const prevMonthKey = series[series.length - 2]?.monthKey ?? '';

  const categoryPredictions: CategoryPrediction[] = categories
    .map((cat) => {
      const catExpenses = transactions.filter(
        (t) => !t.deletedAt && t.type === 'expense' && t.categoryId === cat.id
      );
      const perMonth: Record<string, number> = {};
      for (const tx of catExpenses) {
        const mk = tx.date.slice(0, 7);
        perMonth[mk] =
          (perMonth[mk] ?? 0) + convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
      }

      const recentVals = activeMonthKeys.map((mk) => perMonth[mk] ?? 0);
      const activeCount = recentVals.filter((v) => v > 0).length || 1;
      const histAvg = recentVals.reduce((a, b) => a + b, 0) / activeCount;

      const lastVal = perMonth[lastMonthKey] ?? 0;
      const prevVal = perMonth[prevMonthKey] ?? 0;
      const trendPct =
        prevVal > 0 ? Math.round(((lastVal - prevVal) / prevVal) * 1000) / 10 : 0;

      const predicted =
        lastVal > 0 && prevVal > 0 ? lastVal * 0.55 + prevVal * 0.45 : histAvg;

      const direction: 'rising' | 'falling' | 'stable' =
        trendPct >= 10 ? 'rising' : trendPct <= -10 ? 'falling' : 'stable';

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        color: cat.color,
        historicalAvg: Math.round(histAvg * 100) / 100,
        predictedAmount: Math.round(predicted * 100) / 100,
        trendPct,
        direction,
      };
    })
    .filter((c) => c.historicalAvg > 0 || c.predictedAmount > 0)
    .sort((a, b) => b.predictedAmount - a.predictedAmount);

  // Anomaly detection: transactions > 2.2x category median/average (and >= significant threshold)
  const anomalies: ExpenseForecast['anomalies'] = [];
  const catExpenseGroups: Record<string, { tx: Transaction; amt: number }[]> = {};
  for (const tx of transactions) {
    if (tx.deletedAt || tx.type !== 'expense') continue;
    const amt = convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
    if (!catExpenseGroups[tx.categoryId]) catExpenseGroups[tx.categoryId] = [];
    catExpenseGroups[tx.categoryId].push({ tx, amt });
  }

  for (const [catId, items] of Object.entries(catExpenseGroups)) {
    if (items.length < 3) continue;
    const avg = items.reduce((s, i) => s + i.amt, 0) / items.length;
    const catName = categories.find((c) => c.id === catId)?.name ?? 'Category';
    for (const item of items) {
      if (item.amt > avg * 2.1 && item.amt > 500) {
        const factor = Math.round((item.amt / avg) * 10) / 10;
        anomalies.push({
          transaction: item.tx,
          convertedAmount: Math.round(item.amt * 100) / 100,
          categoryAverage: Math.round(avg * 100) / 100,
          deviationFactor: factor,
          reason: `${factor}x higher than your typical ${catName} transaction (${formatMoney(avg, reportingCurrency)} avg).`,
        });
      }
    }
  }
  anomalies.sort((a, b) => b.deviationFactor - a.deviationFactor);

  return {
    predictedNextMonth,
    historicalAverage: Math.round(historicalAverage * 100) / 100,
    confidenceLow,
    confidenceHigh,
    methodologyExplanation: `Calculated via recency-weighted moving average across ${nonZeroMonths.length} active months plus 25% recent momentum adjustment (±0.85σ uncertainty interval). Estimates are statistical projections, not guaranteed outcomes.`,
    categoryPredictions,
    anomalies: anomalies.slice(0, 6),
  };
}

export interface FinancialHealthReport {
  overallScore: number;
  gradeLabel: string;
  components: {
    key: string;
    label: string;
    score: number;
    weightPct: number;
    detail: string;
  }[];
  suggestions: string[];
  disclaimer: string;
}

export function calculateFinancialHealthScore(
  transactions: Transaction[],
  budgets: Budget[],
  goals: SavingsGoal[],
  subscriptions: Subscription[],
  reportingCurrency: string,
  rates: ExchangeRateTable = getDefaultRateTable(),
  referenceDate = new Date()
): FinancialHealthReport {
  const monthRange = resolveDateRange('this_month', referenceDate);
  const summary = calculatePeriodSummary(transactions, monthRange, reportingCurrency, rates);
  const budgetStatuses = calculateBudgetStatuses(
    budgets,
    transactions,
    reportingCurrency,
    rates,
    referenceDate
  );

  // 1. Savings Rate (weight 30%) -> 20%+ savings rate scores 100
  const savingsScore =
    summary.income <= 0
      ? 40
      : Math.max(0, Math.min(100, Math.round((summary.savingsRatePct / 25) * 100)));

  // 2. Budget Adherence (weight 25%) -> % of budgets under 100%
  const activeBudgets = budgetStatuses.length;
  const adherentBudgets = budgetStatuses.filter((b) => b.percentUsed <= 100).length;
  const budgetScore =
    activeBudgets === 0 ? 65 : Math.round((adherentBudgets / activeBudgets) * 100);

  // 3. Spending Consistency (weight 15%) -> variance across recent months
  const series = buildMonthlySeries(transactions, reportingCurrency, rates, 4, referenceDate);
  const expVals = series.map((s) => s.expenses).filter((v) => v > 0);
  let consistencyScore = 75;
  if (expVals.length >= 2) {
    const mean = expVals.reduce((a, b) => a + b, 0) / expVals.length;
    const sd = Math.sqrt(
      expVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / expVals.length
    );
    const cv = mean > 0 ? sd / mean : 0;
    consistencyScore = Math.max(25, Math.min(100, Math.round((1 - cv) * 100)));
  }

  // 4. Recurring Payment Burden (weight 15%) -> subscriptions <= 15% of income scores high
  const subMonthly = subscriptions
    .filter((s) => !s.deletedAt && s.status === 'active')
    .reduce(
      (sum, s) => sum + getSubscriptionMonthlyEquivalent(s, reportingCurrency, rates),
      0
    );
  const burdenRatio = summary.income > 0 ? subMonthly / summary.income : 0.2;
  const recurringScore = Math.max(
    20,
    Math.min(100, Math.round((1 - Math.max(0, burdenRatio - 0.05) * 2.2) * 100))
  );

  // 5. Emergency / Savings Goals Progress (weight 15%)
  const activeGoals = goals.filter((g) => !g.deletedAt && g.targetAmount > 0);
  const goalsScore =
    activeGoals.length === 0
      ? 50
      : Math.min(
          100,
          Math.round(
            (activeGoals.reduce((sum, g) => sum + Math.min(1, g.savedAmount / g.targetAmount), 0) /
              activeGoals.length) *
              100
          )
        );

  const overallScore = Math.round(
    savingsScore * 0.3 +
      budgetScore * 0.25 +
      consistencyScore * 0.15 +
      recurringScore * 0.15 +
      goalsScore * 0.15
  );

  const gradeLabel =
    overallScore >= 85
      ? 'Strong'
      : overallScore >= 70
      ? 'Healthy'
      : overallScore >= 50
      ? 'Developing'
      : 'Needs Attention';

  const suggestions: string[] = [];
  if (summary.savingsRatePct < 20) {
    suggestions.push('Aim to retain at least 20% of monthly income by trimming discretionary spikes.');
  }
  if (budgetStatuses.some((b) => b.percentUsed >= 90)) {
    suggestions.push('One or more category budgets are above 90% utilization — review upcoming expenses.');
  }
  if (burdenRatio > 0.2) {
    suggestions.push('Active subscriptions consume over 20% of monthly income; audit paused or unused services.');
  }
  if (activeGoals.length === 0) {
    suggestions.push('Create an emergency fund savings goal to build a 3–6 month resilience buffer.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Your cashflow and budget adherence are well balanced — consider increasing automated goal contributions.');
  }

  return {
    overallScore,
    gradeLabel,
    components: [
      {
        key: 'savings',
        label: 'Savings Rate',
        score: savingsScore,
        weightPct: 30,
        detail: `${summary.savingsRatePct}% net retention this month`,
      },
      {
        key: 'budgets',
        label: 'Budget Adherence',
        score: budgetScore,
        weightPct: 25,
        detail:
          activeBudgets > 0
            ? `${adherentBudgets}/${activeBudgets} budgets within limit`
            : 'No active budgets configured',
      },
      {
        key: 'consistency',
        label: 'Spending Consistency',
        score: consistencyScore,
        weightPct: 15,
        detail: 'Month-to-month expenditure stability',
      },
      {
        key: 'recurring',
        label: 'Recurring Burden',
        score: recurringScore,
        weightPct: 15,
        detail: `${formatMoney(subMonthly, reportingCurrency)}/mo active subscriptions`,
      },
      {
        key: 'goals',
        label: 'Savings Goals Progress',
        score: goalsScore,
        weightPct: 15,
        detail: `${activeGoals.length} active savings goal${activeGoals.length === 1 ? '' : 's'}`,
      },
    ],
    suggestions,
    disclaimer:
      'Educational budgeting wellness indicator calculated from your recorded transactions and budgets — not a credit score or regulated financial assessment.',
  };
}

export interface ParsedVoiceExpense {
  amount: number | null;
  currency: string;
  categoryName: string;
  date: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export function parseVoiceExpenseTranscript(
  transcript: string,
  defaultCurrency = 'INR',
  referenceDate = new Date()
): ParsedVoiceExpense {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  // Amount extraction
  const amountMatch = lower.match(/(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

  // Currency detection
  let currency = defaultCurrency;
  if (/\b(dollar|dollars|usd)\b|\$/.test(lower)) currency = 'USD';
  else if (/\b(euro|euros|eur)\b|€/.test(lower)) currency = 'EUR';
  else if (/\b(pound|pounds|gbp)\b|£/.test(lower)) currency = 'GBP';
  else if (/\b(rupee|rupees|rs|inr)\b|₹/.test(lower)) currency = 'INR';

  // Date detection
  const dateObj = new Date(referenceDate);
  if (/\byesterday\b/.test(lower)) {
    dateObj.setDate(dateObj.getDate() - 1);
  }
  const date = toIsoDate(dateObj);

  // Category detection
  let categoryName = 'Food & Dining';
  if (/\b(uber|ola|cab|taxi|bus|metro|train|fuel|petrol|diesel|flight|transport|auto)\b/.test(lower)) {
    categoryName = 'Transport';
  } else if (/\b(rent|electricity|water|wifi|internet|bill|utility|utilities|recharge)\b/.test(lower)) {
    categoryName = 'Utilities & Bills';
  } else if (/\b(software|saas|cloud|aws|figma|hosting|domain|office|laptop|client)\b/.test(lower)) {
    categoryName = 'Software & SaaS';
  } else if (/\b(movie|netflix|spotify|concert|game|entertainment)\b/.test(lower)) {
    categoryName = 'Entertainment';
  } else if (/\b(medicine|doctor|pharmacy|hospital|health|gym)\b/.test(lower)) {
    categoryName = 'Health & Wellness';
  } else if (/\b(amazon|flipkart|shopping|clothes|shoes|gift)\b/.test(lower)) {
    categoryName = 'Shopping';
  } else if (/\b(lunch|dinner|breakfast|coffee|tea|snack|grocery|groceries|food|swiggy|zomato|restaurant)\b/.test(lower)) {
    categoryName = 'Food & Dining';
  }

  // Description cleanup
  let description = text
    .replace(/^(i\s+)?(spent|paid|bought|added)\s+/i, '')
    .replace(/(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp)?\s*\d+(?:,\d{3})*(?:\.\d{1,2})?\s*(?:rupees|rs|inr|dollars|usd|euros|pounds)?/i, '')
    .replace(/\b(on|for|at|today|yesterday)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description) description = categoryName;
  else description = description.charAt(0).toUpperCase() + description.slice(1);

  const confidence: 'high' | 'medium' | 'low' =
    amount && amount > 0 && description.length > 1
      ? 'high'
      : amount && amount > 0
      ? 'medium'
      : 'low';

  return { amount, currency, categoryName, date, description, confidence };
}

export function detectDuplicateTransaction(
  candidate: { amount: number; date: string; merchant: string },
  existing: Transaction[]
): Transaction | null {
  const normMerchant = candidate.merchant.trim().toLowerCase();
  return (
    existing.find(
      (t) =>
        !t.deletedAt &&
        t.date === candidate.date &&
        Math.abs(t.amount - candidate.amount) < 0.01 &&
        (t.merchant.trim().toLowerCase() === normMerchant ||
          t.merchant.toLowerCase().includes(normMerchant) ||
          normMerchant.includes(t.merchant.toLowerCase()))
    ) ?? null
  );
}

export interface SettlementDebt {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

export function calculateGroupSettlements(group: ExpenseGroup): {
  memberBalances: { memberId: string; name: string; netBalance: number }[];
  suggestedSettlements: SettlementDebt[];
} {
  const net: Record<string, number> = {};
  for (const m of group.members) net[m.id] = 0;

  for (const exp of group.expenses) {
    if (net[exp.paidByMemberId] !== undefined) {
      net[exp.paidByMemberId] += exp.amount;
    }
    for (const sp of exp.splits) {
      if (net[sp.memberId] !== undefined) {
        net[sp.memberId] -= sp.amount;
      }
    }
  }

  for (const st of group.settlements) {
    if (net[st.fromMemberId] !== undefined) net[st.fromMemberId] += st.amount;
    if (net[st.toMemberId] !== undefined) net[st.toMemberId] -= st.amount;
  }

  const memberBalances = group.members.map((m) => ({
    memberId: m.id,
    name: m.name,
    netBalance: Math.round((net[m.id] ?? 0) * 100) / 100,
  }));

  const debtors = memberBalances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({ ...b, remaining: Math.abs(b.netBalance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = memberBalances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({ ...b, remaining: b.netBalance }))
    .sort((a, b) => b.remaining - a.remaining);

  const suggestedSettlements: SettlementDebt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const settleAmt = Math.round(Math.min(d.remaining, c.remaining) * 100) / 100;
    if (settleAmt > 0.01) {
      suggestedSettlements.push({
        fromMemberId: d.memberId,
        fromName: d.name,
        toMemberId: c.memberId,
        toName: c.name,
        amount: settleAmt,
      });
    }
    d.remaining -= settleAmt;
    c.remaining -= settleAmt;
    if (d.remaining <= 0.01) i++;
    if (c.remaining <= 0.01) j++;
  }

  return { memberBalances, suggestedSettlements };
}

/**
 * Deterministic offline Pip AI engine — answers natural-language financial questions
 * strictly from actual user records without fabricating AI claims.
 */
export function answerFinancesDeterministically(
  question: string,
  params: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    subscriptions: Subscription[];
    goals: SavingsGoal[];
    reportingCurrency: string;
    rates?: ExchangeRateTable;
    referenceDate?: Date;
  }
): { reply: string; insightCard: AIInsightCard } {
  const {
    transactions,
    categories,
    budgets,
    subscriptions,
    reportingCurrency,
    rates = getDefaultRateTable(),
    referenceDate = new Date(),
  } = params;

  const q = question.toLowerCase();
  const thisMonthRange = resolveDateRange('this_month', referenceDate);
  const lastMonthRange = resolveDateRange('last_month', referenceDate);
  const thisWeekRange = resolveDateRange('this_week', referenceDate);

  const thisMonthSummary = calculatePeriodSummary(
    transactions,
    thisMonthRange,
    reportingCurrency,
    rates
  );
  const lastMonthSummary = calculatePeriodSummary(
    transactions,
    lastMonthRange,
    reportingCurrency,
    rates
  );
  const forecast = computeExpenseForecast(
    transactions,
    categories,
    reportingCurrency,
    rates,
    referenceDate
  );
  const budgetStatuses = calculateBudgetStatuses(
    budgets,
    transactions,
    reportingCurrency,
    rates,
    referenceDate
  );

  const catTotalsThisMonth = categories
    .map((c) => {
      const sum = filterTransactionsByRange(transactions, thisMonthRange)
        .filter((t) => t.type === 'expense' && t.categoryId === c.id)
        .reduce((acc, t) => acc + convertAmount(t.amount, t.currency, reportingCurrency, rates), 0);
      const lastSum = filterTransactionsByRange(transactions, lastMonthRange)
        .filter((t) => t.type === 'expense' && t.categoryId === c.id)
        .reduce((acc, t) => acc + convertAmount(t.amount, t.currency, reportingCurrency, rates), 0);
      return { category: c, thisMonth: sum, lastMonth: lastSum, delta: sum - lastSum };
    })
    .filter((x) => x.thisMonth > 0 || x.lastMonth > 0)
    .sort((a, b) => b.thisMonth - a.thisMonth);

  // 1. Food / specific category this week
  if (q.includes('food') && q.includes('week')) {
    const foodCat = categories.find((c) => c.name.toLowerCase().includes('food'));
    const weekFood = filterTransactionsByRange(transactions, thisWeekRange).filter(
      (t) => t.type === 'expense' && (!foodCat || t.categoryId === foodCat.id)
    );
    const total = weekFood.reduce(
      (acc, t) => acc + convertAmount(t.amount, t.currency, reportingCurrency, rates),
      0
    );
    return {
      reply: `You spent ${formatMoney(total, reportingCurrency)} on ${foodCat?.name ?? 'Food'} this week across ${weekFood.length} transaction${weekFood.length === 1 ? '' : 's'}.`,
      insightCard: {
        headline: `Weekly ${foodCat?.name ?? 'Food'} Spend: ${formatMoney(total, reportingCurrency)}`,
        breakdown: weekFood.slice(0, 4).map((t) => ({
          label: `${t.merchant} (${t.date})`,
          value: Math.round(convertAmount(t.amount, t.currency, reportingCurrency, rates)),
        })),
        recommendedAction: 'Review food receipts or set a weekly meal budget limit to keep pace.',
        relatedFilter: { categoryId: foodCat?.id, datePreset: 'this_week', type: 'expense' },
      },
    };
  }

  // 2. Why did my expenses increase?
  if (q.includes('increase') || q.includes('why did i spend more') || q.includes('more this month')) {
    const diff = thisMonthSummary.expenses - lastMonthSummary.expenses;
    const risers = [...catTotalsThisMonth].sort((a, b) => b.delta - a.delta).slice(0, 3);
    const topRiserNames = risers.filter((r) => r.delta > 0).map((r) => r.category.name);
    const directionText =
      diff >= 0
        ? `Your spending is up ${formatMoney(diff, reportingCurrency)} compared to last month (${formatMoney(lastMonthSummary.expenses, reportingCurrency)} → ${formatMoney(thisMonthSummary.expenses, reportingCurrency)}).`
        : `Actually, your spending is down ${formatMoney(Math.abs(diff), reportingCurrency)} compared to last month (${formatMoney(lastMonthSummary.expenses, reportingCurrency)} → ${formatMoney(thisMonthSummary.expenses, reportingCurrency)}).`;

    return {
      reply: `${directionText}${topRiserNames.length ? ` ${topRiserNames.join(' and ')} contributed most to the increase.` : ''}`,
      insightCard: {
        headline:
          diff >= 0
            ? `+${formatMoney(diff, reportingCurrency)} vs Last Month`
            : `${formatMoney(diff, reportingCurrency)} vs Last Month`,
        differenceLabel: `This month ${formatMoney(thisMonthSummary.expenses, reportingCurrency)} vs last month ${formatMoney(lastMonthSummary.expenses, reportingCurrency)}`,
        breakdown: risers.map((r) => ({
          label: `${r.category.name} (${r.delta >= 0 ? '+' : ''}${formatMoney(r.delta, reportingCurrency)})`,
          value: Math.round(r.thisMonth),
        })),
        recommendedAction: topRiserNames[0]
          ? `Inspect ${topRiserNames[0]} transactions to spot one-off purchases vs recurring habits.`
          : 'Maintain your current monthly spending cadence.',
        relatedFilter: { categoryId: risers[0]?.category.id, datePreset: 'this_month', type: 'expense' },
      },
    };
  }

  // 3. Which category consumes most money?
  if (q.includes('category') && (q.includes('most') || q.includes('top') || q.includes('consumes'))) {
    const top = catTotalsThisMonth[0];
    if (!top) {
      return {
        reply: 'No expenses recorded this month yet. Add a transaction to see category insights.',
        insightCard: { headline: 'No Expenses Yet This Month' },
      };
    }
    const share =
      thisMonthSummary.expenses > 0
        ? Math.round((top.thisMonth / thisMonthSummary.expenses) * 100)
        : 0;
    return {
      reply: `${top.category.name} consumes the most of your spending this month at ${formatMoney(top.thisMonth, reportingCurrency)} (${share}% of total expenses).`,
      insightCard: {
        headline: `Top Category: ${top.category.name} (${share}%)`,
        breakdown: catTotalsThisMonth.slice(0, 4).map((c) => ({
          label: c.category.name,
          value: Math.round(c.thisMonth),
          sharePct:
            thisMonthSummary.expenses > 0
              ? Math.round((c.thisMonth / thisMonthSummary.expenses) * 100)
              : 0,
        })),
        recommendedAction: `Consider capping ${top.category.name} with a dedicated Smart Budget.`,
        relatedFilter: { categoryId: top.category.id, datePreset: 'this_month', type: 'expense' },
      },
    };
  }

  // 4. Budget status
  if (q.includes('budget') || q.includes('exceeding')) {
    const exceeded = budgetStatuses.filter((b) => b.percentUsed >= 90);
    return {
      reply:
        exceeded.length > 0
          ? `Warning: ${exceeded.length} budget${exceeded.length > 1 ? 's are' : ' is'} at or above 90%: ${exceeded.map((b) => `${b.budget.name} (${b.percentUsed}%)`).join(', ')}.`
          : `You are currently within all ${budgetStatuses.length} active budgets this period.`,
      insightCard: {
        headline: `${budgetStatuses.length - exceeded.length}/${budgetStatuses.length} Budgets Healthy`,
        breakdown: budgetStatuses.slice(0, 4).map((b) => ({
          label: `${b.budget.name} (${b.percentUsed}%)`,
          value: Math.round(b.spentConverted),
        })),
        recommendedAction:
          exceeded.length > 0
            ? `Slow down spending in ${exceeded[0].budget.name} to stay under ${formatMoney(exceeded[0].limitConverted, reportingCurrency)}.`
            : 'Keep tracking daily expenses to preserve your margin.',
        relatedFilter: { categoryId: exceeded[0]?.budget.categoryId ?? undefined, type: 'expense' },
      },
    };
  }

  // 5. Subscriptions
  if (q.includes('subscription') || q.includes('recurring')) {
    const activeSubs = subscriptions
      .filter((s) => !s.deletedAt && s.status === 'active')
      .map((s) => ({
        sub: s,
        monthly: getSubscriptionMonthlyEquivalent(s, reportingCurrency, rates),
      }))
      .sort((a, b) => b.monthly - a.monthly);
    const totalMonthly = activeSubs.reduce((acc, s) => acc + s.monthly, 0);
    return {
      reply: `Your ${activeSubs.length} active subscriptions cost ${formatMoney(totalMonthly, reportingCurrency)}/month (${formatMoney(totalMonthly * 12, reportingCurrency)}/year). Top service: ${activeSubs[0]?.sub.name ?? 'None'}.`,
      insightCard: {
        headline: `${formatMoney(totalMonthly, reportingCurrency)}/mo Subscriptions`,
        breakdown: activeSubs.slice(0, 4).map((s) => ({
          label: s.sub.name,
          value: Math.round(s.monthly),
        })),
        recommendedAction: 'Audit subscriptions you have not used in the past 30 days and pause or cancel them.',
      },
    };
  }

  // 6. Predict next month / how much can I save next month
  if (q.includes('predict') || q.includes('next month') || q.includes('save')) {
    const expectedSavings = Math.max(0, thisMonthSummary.income - forecast.predictedNextMonth);
    return {
      reply: `Based on your recent spending pattern, your estimated next-month expenses are ${formatMoney(forecast.predictedNextMonth, reportingCurrency)} (range ${formatMoney(forecast.confidenceLow, reportingCurrency)} – ${formatMoney(forecast.confidenceHigh, reportingCurrency)}). Assuming current income of ${formatMoney(thisMonthSummary.income, reportingCurrency)}, you could save ~${formatMoney(expectedSavings, reportingCurrency)}.`,
      insightCard: {
        headline: `Predicted Next Month: ${formatMoney(forecast.predictedNextMonth, reportingCurrency)}`,
        differenceLabel: `Historical monthly avg: ${formatMoney(forecast.historicalAverage, reportingCurrency)}`,
        breakdown: forecast.categoryPredictions.slice(0, 4).map((c) => ({
          label: `${c.categoryName} (${c.direction})`,
          value: Math.round(c.predictedAmount),
        })),
        recommendedAction: `Automate a transfer of ${formatMoney(Math.round(expectedSavings * 0.6), reportingCurrency)} right after payday.`,
      },
    };
  }

  // 7. Business vs Personal
  if (q.includes('business') || q.includes('personal')) {
    return {
      reply: `This month, Personal expenses are ${formatMoney(thisMonthSummary.personalExpenses, reportingCurrency)} and Business expenses are ${formatMoney(thisMonthSummary.businessExpenses, reportingCurrency)}.`,
      insightCard: {
        headline: 'Personal vs Business Breakdown',
        breakdown: [
          { label: 'Personal Expenses', value: Math.round(thisMonthSummary.personalExpenses) },
          { label: 'Business Expenses', value: Math.round(thisMonthSummary.businessExpenses) },
        ],
        recommendedAction: 'Tag reimbursable or tax-deductible items under Business Panels for clean reporting.',
        relatedFilter: { scope: 'business', datePreset: 'this_month', type: 'expense' },
      },
    };
  }

  // 8. Largest transactions
  if (q.includes('largest') || q.includes('biggest') || q.includes('highest')) {
    const largest = filterTransactionsByRange(transactions, thisMonthRange)
      .filter((t) => t.type === 'expense')
      .map((t) => ({
        tx: t,
        converted: convertAmount(t.amount, t.currency, reportingCurrency, rates),
      }))
      .sort((a, b) => b.converted - a.converted)
      .slice(0, 5);
    return {
      reply:
        largest.length > 0
          ? `Your largest expense this month is ${largest[0].tx.merchant} at ${formatMoney(largest[0].converted, reportingCurrency)} on ${largest[0].tx.date}.`
          : 'No expenses found for this month.',
      insightCard: {
        headline: 'Largest Expenses This Month',
        breakdown: largest.map((l) => ({
          label: `${l.tx.merchant} (${l.tx.date})`,
          value: Math.round(l.converted),
        })),
        recommendedAction: 'Check whether any one-off outliers should be tagged as Business or excluded from recurring budgets.',
        relatedFilter: { datePreset: 'this_month', type: 'expense' },
      },
    };
  }

  // 9. Reduce unnecessary spending / general summary
  const topCat = catTotalsThisMonth[0];
  return {
    reply: `This month you earned ${formatMoney(thisMonthSummary.income, reportingCurrency)} and spent ${formatMoney(thisMonthSummary.expenses, reportingCurrency)}, leaving net savings of ${formatMoney(thisMonthSummary.netSavings, reportingCurrency)} (${thisMonthSummary.savingsRatePct}% savings rate).${topCat ? ` Your biggest spend category is ${topCat.category.name} (${formatMoney(topCat.thisMonth, reportingCurrency)}).` : ''}`,
    insightCard: {
      headline: `Monthly Snapshot · ${thisMonthSummary.savingsRatePct}% Savings Rate`,
      breakdown: catTotalsThisMonth.slice(0, 4).map((c) => ({
        label: c.category.name,
        value: Math.round(c.thisMonth),
      })),
      recommendedAction: topCat
        ? `Trimming 10% from ${topCat.category.name} frees up ${formatMoney(topCat.thisMonth * 0.1, reportingCurrency)} monthly.`
        : 'Log daily expenses to unlock personalized savings suggestions.',
      relatedFilter: { datePreset: 'this_month', type: 'expense' },
    },
  };
}
