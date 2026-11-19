export type AppMode = 'demo' | 'guest' | 'authenticated';

export type TransactionType = 'expense' | 'income';
export type ExpenseScope = 'personal' | 'business';
export type RecurrenceCycle = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  color: string;
  scope: ExpenseScope | 'both';
  isSystem?: boolean;
  updatedAt: string;
}

export interface Panel {
  id: string;
  name: string;
  description: string;
  color: string;
  updatedAt: string;
}

export type AccountType = 'cash' | 'savings' | 'bank' | 'upi' | 'credit_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  institution?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  toCurrency: string;
  date: string; // YYYY-MM-DD
  note: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  scope: ExpenseScope;
  amount: number;
  currency: string;
  merchant: string;
  description: string;
  categoryId: string;
  panelId?: string | null;
  accountId: string;
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  recurrenceCycle: RecurrenceCycle;
  tags: string[];
  receiptId?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncVersion: number;
}

export type BudgetPeriod = 'monthly' | 'weekly';

export interface Budget {
  id: string;
  name: string;
  categoryId: string | null; // null = overall budget
  period: BudgetPeriod;
  limitAmount: number;
  currency: string;
  alertThresholds: number[]; // e.g. [50, 75, 90, 100]
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SavingsContribution {
  id: string;
  goalId: string;
  amount: number;
  currency: string;
  date: string;
  note: string;
  accountId?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  targetDate: string; // YYYY-MM-DD
  monthlyContribution: number;
  categoryLabel: string;
  contributions: SavingsContribution[];
  updatedAt: string;
  deletedAt?: string | null;
}

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type BillingCycle = 'weekly' | 'monthly' | 'yearly';

export interface SubscriptionPayment {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'skipped';
}

export interface Subscription {
  id: string;
  name: string;
  categoryLabel: string;
  amount: number;
  currency: string;
  cycle: BillingCycle;
  nextPaymentDate: string; // YYYY-MM-DD
  status: SubscriptionStatus;
  accountId: string;
  scope: ExpenseScope;
  history: SubscriptionPayment[];
  updatedAt: string;
  deletedAt?: string | null;
}

export interface GroupMember {
  id: string;
  name: string;
  email?: string;
}

export interface SharedExpenseSplit {
  memberId: string;
  amount: number;
}

export interface SharedExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidByMemberId: string;
  splitMode: 'equal' | 'custom';
  splits: SharedExpenseSplit[];
  date: string;
}

export interface GroupSettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  date: string;
  note: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  type: 'friends' | 'roommates' | 'hostel' | 'travel' | 'family';
  currency: string;
  members: GroupMember[];
  expenses: SharedExpense[];
  settlements: GroupSettlementRecord[];
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FinancialChallenge {
  id: string;
  title: string;
  description: string;
  targetDays: number;
  completedDays: number;
  targetAmount?: number;
  savedSoFar?: number;
  badgeLabel: string;
  status: 'active' | 'completed';
  lastCheckInDate?: string | null;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'budget' | 'subscription' | 'anomaly' | 'goal' | 'summary' | 'import' | 'sync';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionRoute?: string;
}

export interface AIInsightCard {
  headline: string;
  differenceLabel?: string;
  breakdown?: { label: string; value: number; sharePct?: number }[];
  recommendedAction?: string;
  relatedFilter?: {
    categoryId?: string;
    scope?: ExpenseScope;
    type?: TransactionType;
    search?: string;
    datePreset?: PeriodPreset;
  };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  source?: 'gemini' | 'offline_fallback' | 'local_demo';
  modelUsed?: string;
  insightCard?: AIInsightCard;
}

export interface AIConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AIMessage[];
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  createdAt: string;
}

export interface UserPreferences {
  defaultCurrency: string;
  reportingCurrency: string;
  theme: 'dark' | 'light';
  aiPrivacyConsent: boolean;
  aiAnonymizeMerchants: boolean;
  notificationsEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export type SyncStatus =
  | 'offline'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'auth_required';

export type PeriodPreset =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';

export interface DateRange {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
}

export interface FinanceDataset {
  version: number;
  profile: UserProfile | null;
  preferences: UserPreferences;
  categories: Category[];
  panels: Panel[];
  accounts: Account[];
  transfers: Transfer[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  subscriptions: Subscription[];
  groups: ExpenseGroup[];
  challenges: FinancialChallenge[];
  notifications: NotificationItem[];
  conversations: AIConversation[];
  lastSyncedAt: string | null;
}
