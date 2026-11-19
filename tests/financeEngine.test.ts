import { describe, expect, it } from 'vitest';
import {
  convertAmount,
  formatMoney,
  fromMinorUnits,
  SUPPORTED_CURRENCIES,
  toMinorUnits,
} from '../src/shared/currencies';
import { createBaseDefaultDataset } from '../src/shared/demoSeed';
import {
  answerFinancesDeterministically,
  calculateAccountBalances,
  calculateBudgetStatuses,
  calculateFinancialHealthScore,
  calculateGroupSettlements,
  calculatePeriodSummary,
  computeExpenseForecast,
  detectDuplicateTransaction,
  getSubscriptionMonthlyEquivalent,
  parseVoiceExpenseTranscript,
  resolveDateRange,
} from '../src/shared/financeEngine';
import { signupSchema, transactionSchema } from '../src/shared/schemas';

describe('PancakePilot AI — Currency & Minor-Unit Math', () => {
  it('supports 33 currencies with INR default', () => {
    expect(SUPPORTED_CURRENCIES.length).toBe(33);
    expect(SUPPORTED_CURRENCIES[0].code).toBe('INR');
  });

  it('prevents floating point errors via minor units', () => {
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
    expect(fromMinorUnits(1999, 'USD')).toBe(19.99);
    expect(toMinorUnits(500, 'JPY')).toBe(500);
  });

  it('converts across currencies accurately', () => {
    const inr = convertAmount(100, 'USD', 'INR');
    expect(inr).toBeCloseTo(8420, 0);
    expect(formatMoney(1500, 'INR')).toContain('1,500.00');
  });
});

describe('PancakePilot AI — Deterministic Finance Engine', () => {
  const refDate = new Date('2026-11-18T12:00:00Z');
  const demo = createBaseDefaultDataset('demo', refDate);

  it('calculates period income, expenses, and savings rate from actual records', () => {
    const range = resolveDateRange('this_month', refDate);
    const summary = calculatePeriodSummary(demo.transactions, range, 'INR');
    expect(summary.income).toBeGreaterThan(92000);
    expect(summary.expenses).toBeGreaterThan(30000);
    expect(summary.netSavings).toBeCloseTo(summary.income - summary.expenses, 1);
    expect(summary.personalExpenses).toBeGreaterThan(0);
    expect(summary.businessExpenses).toBeGreaterThan(0);
  });

  it('calculates account balances and keeps transfers excluded from expenses', () => {
    const balances = calculateAccountBalances(demo.accounts, demo.transactions, demo.transfers);
    expect(balances['acc-hdfc']).toBeDefined();
    expect(balances['acc-upi']).toBeDefined();
    const range = resolveDateRange('this_month', refDate);
    const summaryBefore = calculatePeriodSummary(demo.transactions, range, 'INR');
    expect(summaryBefore.expenses).not.toContain(10000);
  });

  it('evaluates budget utilization and alert thresholds', () => {
    const statuses = calculateBudgetStatuses(
      demo.budgets,
      demo.transactions,
      'INR',
      undefined,
      refDate
    );
    const travel = statuses.find((s) => s.budget.id === 'bud-travel');
    expect(travel).toBeDefined();
    expect(travel!.percentUsed).toBeGreaterThan(100);
    expect(travel!.triggeredThreshold).toBe(100);
  });

  it('computes next-month expense prediction and detects anomalies', () => {
    const forecast = computeExpenseForecast(
      demo.transactions,
      demo.categories,
      'INR',
      undefined,
      refDate
    );
    expect(forecast.predictedNextMonth).toBeGreaterThan(15000);
    expect(forecast.confidenceHigh).toBeGreaterThanOrEqual(forecast.confidenceLow);
    expect(forecast.categoryPredictions.length).toBeGreaterThan(0);
  });

  it('calculates transparent Financial Health Score', () => {
    const report = calculateFinancialHealthScore(
      demo.transactions,
      demo.budgets,
      demo.goals,
      demo.subscriptions,
      'INR',
      undefined,
      refDate
    );
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.components.length).toBe(5);
  });

  it('normalizes subscription monthly equivalents', () => {
    const yearlySub = demo.subscriptions.find((s) => s.cycle === 'yearly')!;
    const monthlyEq = getSubscriptionMonthlyEquivalent(yearlySub, 'INR');
    expect(monthlyEq).toBeCloseTo(1200, 1);
  });

  it('parses natural-language voice expenses accurately', () => {
    const parsed = parseVoiceExpenseTranscript('I spent 250 rupees on lunch today', 'INR', refDate);
    expect(parsed.amount).toBe(250);
    expect(parsed.currency).toBe('INR');
    expect(parsed.categoryName).toBe('Food & Dining');
    expect(parsed.confidence).toBe('high');
  });

  it('detects duplicate transactions on matching date, merchant, and amount', () => {
    const first = demo.transactions.find((t) => t.type === 'expense')!;
    const dup = detectDuplicateTransaction(
      { amount: first.amount, date: first.date, merchant: first.merchant },
      demo.transactions
    );
    expect(dup?.id).toBe(first.id);
  });

  it('simplifies split expense group debts accurately', () => {
    const result = calculateGroupSettlements(demo.groups[0]);
    expect(result.suggestedSettlements.length).toBeGreaterThan(0);
    const totalSettled = result.suggestedSettlements.reduce((s, d) => s + d.amount, 0);
    expect(totalSettled).toBeGreaterThan(0);
  });

  it('answers Pip AI financial questions deterministically offline', () => {
    const res = answerFinancesDeterministically('Why did my expenses increase?', {
      transactions: demo.transactions,
      categories: demo.categories,
      budgets: demo.budgets,
      subscriptions: demo.subscriptions,
      goals: demo.goals,
      reportingCurrency: 'INR',
      referenceDate: refDate,
    });
    expect(res.reply.length).toBeGreaterThan(20);
    expect(res.insightCard.headline).toBeTruthy();
  });
});

describe('PancakePilot AI — Validation Schemas', () => {
  it('validates signup and transaction schemas', () => {
    expect(
      signupSchema.safeParse({ fullName: 'Riya', email: 'bad-email', termsAccepted: true }).success
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        fullName: 'Riya Nair',
        email: 'riya@example.com',
        termsAccepted: true,
      }).success
    ).toBe(true);

    expect(
      transactionSchema.safeParse({
        type: 'expense',
        scope: 'personal',
        amount: -50,
        currency: 'INR',
        merchant: 'Cafe',
        categoryId: 'cat-food',
        accountId: 'acc-upi',
        date: '2026-11-18',
      }).success
    ).toBe(false);
  });
});
