import { z } from 'zod';

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name (at least 2 characters).').max(80),
  email: z.string().trim().email('Please enter a valid email address.'),
  termsAccepted: z.literal(true, {
    message: 'Please accept the Terms and Privacy Policy to continue.',
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
});

export const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  scope: z.enum(['personal', 'business']),
  amount: z.number().positive('Amount must be greater than zero.'),
  currency: z.string().length(3),
  merchant: z.string().trim().min(1, 'Merchant or payee is required.').max(120),
  description: z.string().trim().max(240).default(''),
  categoryId: z.string().min(1, 'Please select a category.'),
  panelId: z.string().nullable().optional(),
  accountId: z.string().min(1, 'Please select an account.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  isRecurring: z.boolean().default(false),
  recurrenceCycle: z.enum(['none', 'weekly', 'monthly', 'yearly']).default('none'),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
});

export const budgetSchema = z.object({
  name: z.string().trim().min(1, 'Budget name is required.').max(80),
  categoryId: z.string().nullable(),
  period: z.enum(['monthly', 'weekly']),
  limitAmount: z.number().positive('Budget limit must be greater than zero.'),
  currency: z.string().length(3),
  alertThresholds: z.array(z.number().min(10).max(100)).min(1),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required.').max(80),
  type: z.enum(['cash', 'savings', 'bank', 'upi', 'credit_card', 'other']),
  currency: z.string().length(3),
  openingBalance: z.number(),
  institution: z.string().max(80).optional(),
});

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive('Transfer amount must be positive.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).default(''),
});

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1, 'Goal name is required.').max(80),
  targetAmount: z.number().positive('Target amount must be greater than zero.'),
  savedAmount: z.number().min(0).default(0),
  currency: z.string().length(3),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlyContribution: z.number().min(0),
  categoryLabel: z.string().trim().min(1).max(40),
});

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Subscription name is required.').max(80),
  categoryLabel: z.string().trim().min(1).max(40),
  amount: z.number().positive(),
  currency: z.string().length(3),
  cycle: z.enum(['weekly', 'monthly', 'yearly']),
  nextPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'paused', 'cancelled']),
  accountId: z.string().min(1),
  scope: z.enum(['personal', 'business']),
});

export const aiPromptSchema = z.object({
  question: z.string().trim().min(1).max(800),
  conversationId: z.string().optional(),
  reportingCurrency: z.string().length(3).default('INR'),
  anonymizeMerchants: z.boolean().default(false),
  contextSummary: z.object({
    totalBalance: z.number(),
    thisMonthIncome: z.number(),
    thisMonthExpenses: z.number(),
    lastMonthExpenses: z.number(),
    savingsRatePct: z.number(),
    personalExpenses: z.number(),
    businessExpenses: z.number(),
    predictedNextMonth: z.number(),
    topCategories: z.array(
      z.object({
        name: z.string(),
        thisMonth: z.number(),
        lastMonth: z.number(),
      })
    ),
    budgets: z.array(
      z.object({
        name: z.string(),
        limit: z.number(),
        spent: z.number(),
        pct: z.number(),
      })
    ),
    subscriptionsMonthlyTotal: z.number(),
    topSubscriptions: z.array(
      z.object({
        name: z.string(),
        monthlyEquivalent: z.number(),
      })
    ),
    recentNotableTransactions: z.array(
      z.object({
        date: z.string(),
        label: z.string(),
        category: z.string(),
        amount: z.number(),
        scope: z.string(),
        type: z.string(),
      })
    ),
  }),
});
