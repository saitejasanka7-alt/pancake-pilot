import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearDatasetFromLocal,
  getSavedAppMode,
  getSavedSessionToken,
  initOrLoadModeDataset,
  loadDatasetFromLocal,
  saveAppMode,
  saveDatasetToLocal,
  saveSessionToken,
} from '../db/localStore';
import {
  convertAmount,
  ExchangeRateTable,
  getCachedExchangeRates,
  getDefaultRateTable,
  refreshExchangeRates,
} from '../shared/currencies';
import { createBaseDefaultDataset } from '../shared/demoSeed';
import {
  calculateAccountBalances,
  calculateBudgetStatuses,
  calculateFinancialHealthScore,
  calculatePeriodSummary,
  calculateTotalBalance,
  computeExpenseForecast,
  detectDuplicateTransaction,
  getSubscriptionMonthlyEquivalent,
  resolveDateRange,
} from '../shared/financeEngine';
import type {
  Account,
  AIConversation,
  AIMessage,
  AppMode,
  Budget,
  Category,
  ExpenseGroup,
  FinanceDataset,
  FinancialChallenge,
  NotificationItem,
  Panel,
  PeriodPreset,
  SavingsContribution,
  SavingsGoal,
  Subscription,
  SyncStatus,
  Transaction,
  Transfer,
  UserProfile,
} from '../shared/types';

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthUserSummary {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

interface FinanceContextValue {
  ready: boolean;
  mode: AppMode;
  authUser: AuthUserSummary | null;
  dataset: FinanceDataset;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  reportingCurrency: string;
  setReportingCurrency: (code: string) => void;
  rates: ExchangeRateTable;
  fxSource: 'frankfurter' | 'fallback';
  fxUpdatedAt: string;
  isOnline: boolean;
  syncStatus: SyncStatus;
  geminiConfigured: boolean;
  resendConfigured: boolean;
  periodPreset: PeriodPreset;
  setPeriodPreset: (preset: PeriodPreset) => void;
  customRange: { start: string; end: string };
  setCustomRange: (start: string, end: string) => void;
  activeRange: ReturnType<typeof resolveDateRange>;
  totalBalance: number;
  accountBalances: Record<string, number>;
  periodSummary: ReturnType<typeof calculatePeriodSummary>;
  budgetStatuses: ReturnType<typeof calculateBudgetStatuses>;
  forecast: ReturnType<typeof computeExpenseForecast>;
  healthReport: ReturnType<typeof calculateFinancialHealthScore>;
  toasts: ToastNotice[];
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  // Mode & Auth transitions
  enterDemoMode: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  completeAuthenticatedLogin: (user: AuthUserSummary, sessionToken?: string) => Promise<{ hasGuestDataToMigrate: boolean; guestTxCount: number }>;
  migrateGuestDataToAccount: () => Promise<{ migratedCount: number; duplicatesSkipped: number }>;
  dismissGuestMigrationPrompt: () => void;
  showMigrationModal: boolean;
  guestPendingTxCount: number;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
  // CRUD Operations
  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncVersion'>) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importTransactionsBatch: (items: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncVersion'>[]) => { imported: number; skippedDuplicates: number };
  addCategory: (cat: Omit<Category, 'id' | 'updatedAt'>) => void;
  deleteCategory: (id: string) => void;
  addPanel: (panel: Omit<Panel, 'id' | 'updatedAt'>) => void;
  addBudget: (b: Omit<Budget, 'id' | 'updatedAt' | 'deletedAt'>) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addAccount: (acc: Omit<Account, 'id' | 'updatedAt' | 'deletedAt'>) => void;
  deleteAccount: (id: string) => void;
  addTransfer: (tr: { fromAccountId: string; toAccountId: string; amount: number; date: string; note: string }) => void;
  addGoal: (g: Omit<SavingsGoal, 'id' | 'contributions' | 'updatedAt' | 'deletedAt'>) => void;
  updateGoal: (id: string, patch: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  addGoalContribution: (goalId: string, amount: number, note: string, accountId?: string) => void;
  addSubscription: (s: Omit<Subscription, 'id' | 'history' | 'updatedAt' | 'deletedAt'>) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  addGroup: (g: Omit<ExpenseGroup, 'id' | 'expenses' | 'settlements' | 'updatedAt' | 'deletedAt'>) => void;
  addSharedExpense: (groupId: string, expense: Omit<ExpenseGroup['expenses'][number], 'id'>) => void;
  recordSettlement: (groupId: string, settlement: Omit<ExpenseGroup['settlements'][number], 'id'>) => void;
  checkInChallenge: (challengeId: string, amountSaved?: number) => void;
  addChallenge: (c: Omit<FinancialChallenge, 'id' | 'completedDays' | 'status' | 'updatedAt'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  updatePreferences: (patch: Partial<FinanceDataset['preferences']>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  appendAIMessage: (conversationId: string, msg: AIMessage) => void;
  createConversation: (title?: string) => AIConversation;
  clearConversations: () => void;
  restoreBackupDataset: (data: FinanceDataset) => void;
  // Quick modal triggers
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddInitialTab: 'manual' | 'voice';
  setQuickAddInitialTab: (tab: 'manual' | 'voice') => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<AppMode>(getSavedAppMode);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [dataset, setDataset] = useState<FinanceDataset>(() => createBaseDefaultDataset('demo'));
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('pancakepilot_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [rates, setRates] = useState<ExchangeRateTable>(() => getCachedExchangeRates().rates);
  const [fxSource, setFxSource] = useState<'frankfurter' | 'fallback'>(() => getCachedExchangeRates().source);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string>(() => getCachedExchangeRates().fetchedAt);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('auth_required');
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [resendConfigured, setResendConfigured] = useState(false);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customRange, setCustomRangeState] = useState<{ start: string; end: string }>(() => {
    const r = resolveDateRange('this_month');
    return { start: r.startDate, end: r.endDate };
  });

  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [guestPendingTxCount, setGuestPendingTxCount] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInitialTab, setQuickAddInitialTab] = useState<'manual' | 'voice'>('manual');

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyTheme = useCallback((next: 'dark' | 'light') => {
    setThemeState(next);
    try {
      localStorage.setItem('pancakepilot_theme', next);
    } catch {
      // ignore
    }
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  // Bootstrap auth status, health flags, FX rates, and local IndexedDB
  useEffect(() => {
    let active = true;
    async function init() {
      const savedMode = getSavedAppMode();
      const token = getSavedSessionToken();

      // Check API health & session
      let detectedUser: AuthUserSummary | null = null;
      try {
        const [healthRes, meRes] = await Promise.all([
          fetch('/api/health').catch(() => null),
          fetch('/api/auth/me', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => null),
        ]);
        if (healthRes && healthRes.ok) {
          const h = (await healthRes.json()) as { geminiConfigured?: boolean; resendConfigured?: boolean };
          if (active) {
            setGeminiConfigured(Boolean(h.geminiConfigured));
            setResendConfigured(Boolean(h.resendConfigured));
          }
        }
        if (meRes && meRes.ok) {
          const m = (await meRes.json()) as { authenticated?: boolean; user?: AuthUserSummary };
          if (m.authenticated && m.user) {
            detectedUser = m.user;
          }
        }
      } catch {
        // Offline start
      }

      if (!active) return;

      if (detectedUser && savedMode === 'authenticated') {
        setAuthUser(detectedUser);
        setMode('authenticated');
        const localDs = await initOrLoadModeDataset('authenticated', detectedUser.id);
        setDataset(localDs);
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
      } else {
        const effectiveMode: AppMode = savedMode === 'authenticated' ? 'guest' : savedMode;
        setMode(effectiveMode);
        if (effectiveMode !== savedMode) saveAppMode(effectiveMode);
        const localDs = await initOrLoadModeDataset(effectiveMode);
        setDataset(localDs);
        setSyncStatus(navigator.onLine ? 'auth_required' : 'offline');
      }
      setReady(true);

      // Refresh FX rates quietly
      const fx = await refreshExchangeRates();
      if (active) {
        setRates(fx.rates);
        setFxSource(fx.source);
        setFxUpdatedAt(fx.fetchedAt);
      }
    }
    init();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Persist dataset changes to IndexedDB automatically
  const persistDataset = useCallback(
    (updater: (prev: FinanceDataset) => FinanceDataset) => {
      setDataset((prev) => {
        const next = updater(prev);
        const key =
          mode === 'authenticated' && authUser ? `auth_${authUser.id}` : mode;
        void saveDatasetToLocal(key, next);
        return next;
      });
    },
    [mode, authUser]
  );

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      setSyncStatus('offline');
      notify('You are offline. Changes are safely saved locally.', 'info');
      return;
    }
    if (mode !== 'authenticated' || !authUser) {
      setSyncStatus('auth_required');
      notify('Sign in with an account to enable cloud synchronisation.', 'info');
      return;
    }
    setSyncStatus('syncing');
    try {
      const token = getSavedSessionToken();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dataset }),
      });
      if (!res.ok) throw new Error('Sync request failed');
      const data = (await res.json()) as { dataset: FinanceDataset; conflictsResolved: number };
      setDataset(data.dataset);
      await saveDatasetToLocal(`auth_${authUser.id}`, data.dataset);
      setSyncStatus('synced');
      notify(
        data.conflictsResolved > 0
          ? `Cloud sync complete (${data.conflictsResolved} newer record conflict(s) safely resolved).`
          : 'Cloud workspace synchronised.',
        'success'
      );
    } catch {
      setSyncStatus('failed');
      notify('Cloud sync failed. Local records remain intact.', 'error');
    }
  }, [authUser, dataset, isOnline, mode, notify]);

  const enterDemoMode = useCallback(async () => {
    saveAppMode('demo');
    setMode('demo');
    setAuthUser(null);
    const ds = await initOrLoadModeDataset('demo');
    setDataset(ds);
    setSyncStatus(isOnline ? 'auth_required' : 'offline');
    notify('Entered Demo Mode with seeded personal & business data.', 'info');
  }, [isOnline, notify]);

  const resetDemoData = useCallback(async () => {
    const fresh = createBaseDefaultDataset('demo');
    await saveDatasetToLocal('demo', fresh);
    if (mode === 'demo') setDataset(fresh);
    notify('Demo data has been reset to initial state.', 'success');
  }, [mode, notify]);

  const enterGuestMode = useCallback(async () => {
    saveAppMode('guest');
    setMode('guest');
    setAuthUser(null);
    const ds = await initOrLoadModeDataset('guest');
    setDataset(ds);
    setSyncStatus(isOnline ? 'auth_required' : 'offline');
    notify('Using Guest Workspace (100% local offline storage).', 'info');
  }, [isOnline, notify]);

  const completeAuthenticatedLogin = useCallback(
    async (user: AuthUserSummary, sessionToken?: string) => {
      if (sessionToken) saveSessionToken(sessionToken);
      saveAppMode('authenticated');
      setMode('authenticated');
      setAuthUser(user);

      // Check guest data for optional migration
      const guestDs = await loadDatasetFromLocal('guest');
      const guestTxCount = guestDs?.transactions.filter((t) => !t.deletedAt).length ?? 0;

      // Load cloud dataset if present
      let targetDs = await loadDatasetFromLocal(`auth_${user.id}`);
      try {
        const res = await fetch('/api/sync', {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        });
        if (res.ok) {
          const payload = (await res.json()) as { dataset: FinanceDataset | null };
          if (payload.dataset) targetDs = payload.dataset;
        }
      } catch {
        // offline fallback
      }

      if (!targetDs) {
        targetDs = createBaseDefaultDataset('guest');
      }
      targetDs = {
        ...targetDs,
        profile: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          avatarInitials: user.fullName
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          createdAt: user.createdAt,
        },
      };
      await saveDatasetToLocal(`auth_${user.id}`, targetDs);
      setDataset(targetDs);
      setSyncStatus(isOnline ? 'synced' : 'offline');

      if (guestTxCount > 0) {
        setGuestPendingTxCount(guestTxCount);
        setShowMigrationModal(true);
      }

      return { hasGuestDataToMigrate: guestTxCount > 0, guestTxCount };
    },
    [isOnline]
  );

  const migrateGuestDataToAccount = useCallback(async () => {
    const guestDs = await loadDatasetFromLocal('guest');
    if (!guestDs) return { migratedCount: 0, duplicatesSkipped: 0 };

    let migratedCount = 0;
    let duplicatesSkipped = 0;

    persistDataset((prev) => {
      const existingTx = [...prev.transactions];
      const mergedTx = [...existingTx];
      for (const gtx of guestDs.transactions) {
        if (gtx.deletedAt) continue;
        const dup = detectDuplicateTransaction(
          { amount: gtx.amount, date: gtx.date, merchant: gtx.merchant },
          mergedTx
        );
        if (dup || mergedTx.some((x) => x.id === gtx.id)) {
          duplicatesSkipped += 1;
        } else {
          mergedTx.push(gtx);
          migratedCount += 1;
        }
      }

      const mergedAccounts = [...prev.accounts];
      for (const gacc of guestDs.accounts) {
        if (!mergedAccounts.some((a) => a.id === gacc.id || a.name === gacc.name)) {
          mergedAccounts.push(gacc);
        }
      }

      const mergedBudgets = [...prev.budgets];
      for (const gb of guestDs.budgets) {
        if (!mergedBudgets.some((b) => b.id === gb.id)) {
          mergedBudgets.push(gb);
        }
      }

      const mergedGoals = [...prev.goals];
      for (const gg of guestDs.goals) {
        if (!mergedGoals.some((g) => g.id === gg.id)) {
          mergedGoals.push(gg);
        }
      }

      return {
        ...prev,
        accounts: mergedAccounts,
        transactions: mergedTx,
        budgets: mergedBudgets,
        goals: mergedGoals,
      };
    });

    await clearDatasetFromLocal('guest');
    setShowMigrationModal(false);
    setGuestPendingTxCount(0);
    notify(
      `Migrated ${migratedCount} local transaction(s) (${duplicatesSkipped} duplicate(s) safely skipped).`,
      'success'
    );
    return { migratedCount, duplicatesSkipped };
  }, [notify, persistDataset]);

  const dismissGuestMigrationPrompt = useCallback(() => {
    setShowMigrationModal(false);
  }, []);

  const logout = useCallback(async () => {
    const token = getSavedSessionToken();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // ignore offline
    }
    saveSessionToken(null);
    setAuthUser(null);
    await enterGuestMode();
    notify('Signed out safely. Switched to local Guest mode.', 'info');
  }, [enterGuestMode, notify]);

  const setReportingCurrency = useCallback(
    (code: string) => {
      persistDataset((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          reportingCurrency: code,
        },
      }));
      notify(`Reporting currency switched to ${code}.`, 'info');
    },
    [notify, persistDataset]
  );

  // Derived financial calculations
  const reportingCurrency = dataset.preferences.reportingCurrency || 'INR';
  const activeRange = useMemo(
    () => resolveDateRange(periodPreset, new Date(), customRange.start, customRange.end),
    [periodPreset, customRange]
  );

  const accountBalances = useMemo(
    () => calculateAccountBalances(dataset.accounts, dataset.transactions, dataset.transfers, rates),
    [dataset.accounts, dataset.transactions, dataset.transfers, rates]
  );

  const totalBalance = useMemo(
    () =>
      calculateTotalBalance(
        dataset.accounts,
        dataset.transactions,
        dataset.transfers,
        reportingCurrency,
        rates
      ),
    [dataset.accounts, dataset.transactions, dataset.transfers, reportingCurrency, rates]
  );

  const periodSummary = useMemo(
    () => calculatePeriodSummary(dataset.transactions, activeRange, reportingCurrency, rates),
    [dataset.transactions, activeRange, reportingCurrency, rates]
  );

  const budgetStatuses = useMemo(
    () => calculateBudgetStatuses(dataset.budgets, dataset.transactions, reportingCurrency, rates),
    [dataset.budgets, dataset.transactions, reportingCurrency, rates]
  );

  const forecast = useMemo(
    () => computeExpenseForecast(dataset.transactions, dataset.categories, reportingCurrency, rates),
    [dataset.transactions, dataset.categories, reportingCurrency, rates]
  );

  const healthReport = useMemo(
    () =>
      calculateFinancialHealthScore(
        dataset.transactions,
        dataset.budgets,
        dataset.goals,
        dataset.subscriptions,
        reportingCurrency,
        rates
      ),
    [dataset.transactions, dataset.budgets, dataset.goals, dataset.subscriptions, reportingCurrency, rates]
  );

  // CRUD Implementations
  const addTransaction: FinanceContextValue['addTransaction'] = useCallback(
    (input) => {
      const nowIso = new Date().toISOString();
      const created: Transaction = {
        ...input,
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
        syncVersion: 1,
      };
      persistDataset((prev) => ({
        ...prev,
        transactions: [created, ...prev.transactions],
      }));
      notify(`${input.type === 'income' ? 'Income' : 'Expense'} "${input.merchant}" saved.`, 'success');
      return created;
    },
    [notify, persistDataset]
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Transaction>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id
            ? { ...tx, ...patch, updatedAt: nowIso, syncVersion: tx.syncVersion + 1 }
            : tx
        ),
      }));
      notify('Transaction updated.', 'success');
    },
    [notify, persistDataset]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, deletedAt: nowIso, updatedAt: nowIso } : tx
        ),
      }));
      notify('Transaction deleted.', 'info');
    },
    [notify, persistDataset]
  );

  const importTransactionsBatch: FinanceContextValue['importTransactionsBatch'] = useCallback(
    (items) => {
      let imported = 0;
      let skippedDuplicates = 0;
      const nowIso = new Date().toISOString();

      persistDataset((prev) => {
        const nextTx = [...prev.transactions];
        for (const item of items) {
          const dup = detectDuplicateTransaction(
            { amount: item.amount, date: item.date, merchant: item.merchant },
            nextTx
          );
          if (dup) {
            skippedDuplicates += 1;
            continue;
          }
          nextTx.unshift({
            ...item,
            id: `tx_imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            createdAt: nowIso,
            updatedAt: nowIso,
            deletedAt: null,
            syncVersion: 1,
          });
          imported += 1;
        }
        const importNotif: NotificationItem = {
          id: `notif_imp_${Date.now()}`,
          type: 'import',
          title: 'Statement Import Completed',
          message: `Imported ${imported} transaction(s); skipped ${skippedDuplicates} duplicate(s).`,
          createdAt: nowIso,
          read: false,
          actionRoute: '/app/transactions',
        };
        return {
          ...prev,
          transactions: nextTx,
          notifications: [importNotif, ...prev.notifications],
        };
      });

      notify(`Imported ${imported} transactions (${skippedDuplicates} duplicates skipped).`, 'success');
      return { imported, skippedDuplicates };
    },
    [notify, persistDataset]
  );

  const addCategory = useCallback(
    (cat: Omit<Category, 'id' | 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        categories: [
          ...prev.categories,
          { ...cat, id: `cat_${Date.now()}`, updatedAt: nowIso },
        ],
      }));
      notify(`Category "${cat.name}" added.`, 'success');
    },
    [notify, persistDataset]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      persistDataset((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id || c.isSystem),
      }));
      notify('Custom category removed.', 'info');
    },
    [notify, persistDataset]
  );

  const addPanel = useCallback(
    (panel: Omit<Panel, 'id' | 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        panels: [...prev.panels, { ...panel, id: `panel_${Date.now()}`, updatedAt: nowIso }],
      }));
      notify(`Panel "${panel.name}" created.`, 'success');
    },
    [notify, persistDataset]
  );

  const addBudget = useCallback(
    (b: Omit<Budget, 'id' | 'updatedAt' | 'deletedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        budgets: [
          ...prev.budgets,
          { ...b, id: `bud_${Date.now()}`, updatedAt: nowIso, deletedAt: null },
        ],
      }));
      notify(`Budget "${b.name}" created.`, 'success');
    },
    [notify, persistDataset]
  );

  const updateBudget = useCallback(
    (id: string, patch: Partial<Budget>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        budgets: prev.budgets.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: nowIso } : b)),
      }));
      notify('Budget updated.', 'success');
    },
    [notify, persistDataset]
  );

  const deleteBudget = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        budgets: prev.budgets.map((b) =>
          b.id === id ? { ...b, deletedAt: nowIso, updatedAt: nowIso } : b
        ),
      }));
      notify('Budget deleted.', 'info');
    },
    [notify, persistDataset]
  );

  const addAccount = useCallback(
    (acc: Omit<Account, 'id' | 'updatedAt' | 'deletedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        accounts: [
          ...prev.accounts,
          { ...acc, id: `acc_${Date.now()}`, updatedAt: nowIso, deletedAt: null },
        ],
      }));
      notify(`Account "${acc.name}" added.`, 'success');
    },
    [notify, persistDataset]
  );

  const deleteAccount = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === id ? { ...a, deletedAt: nowIso, updatedAt: nowIso } : a
        ),
      }));
      notify('Account archived.', 'info');
    },
    [notify, persistDataset]
  );

  const addTransfer = useCallback(
    (tr: { fromAccountId: string; toAccountId: string; amount: number; date: string; note: string }) => {
      const fromAcc = dataset.accounts.find((a) => a.id === tr.fromAccountId);
      const toAcc = dataset.accounts.find((a) => a.id === tr.toAccountId);
      if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) {
        notify('Select two distinct accounts for a transfer.', 'error');
        return;
      }
      const converted = convertAmount(tr.amount, fromAcc.currency, toAcc.currency, rates);
      const nowIso = new Date().toISOString();
      const transfer: Transfer = {
        id: `tr_${Date.now()}`,
        fromAccountId: fromAcc.id,
        toAccountId: toAcc.id,
        amount: tr.amount,
        currency: fromAcc.currency,
        convertedAmount: converted,
        toCurrency: toAcc.currency,
        date: tr.date,
        note: tr.note || `Transfer ${fromAcc.name} → ${toAcc.name}`,
        updatedAt: nowIso,
        deletedAt: null,
      };
      persistDataset((prev) => ({
        ...prev,
        transfers: [transfer, ...prev.transfers],
      }));
      notify('Account transfer recorded (excluded from expenses).', 'success');
    },
    [dataset.accounts, notify, persistDataset, rates]
  );

  const addGoal = useCallback(
    (g: Omit<SavingsGoal, 'id' | 'contributions' | 'updatedAt' | 'deletedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        goals: [
          ...prev.goals,
          {
            ...g,
            id: `goal_${Date.now()}`,
            contributions: [],
            updatedAt: nowIso,
            deletedAt: null,
          },
        ],
      }));
      notify(`Savings goal "${g.name}" created.`, 'success');
    },
    [notify, persistDataset]
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<SavingsGoal>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: nowIso } : g)),
      }));
      notify('Savings goal updated.', 'success');
    },
    [notify, persistDataset]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id ? { ...g, deletedAt: nowIso, updatedAt: nowIso } : g
        ),
      }));
      notify('Savings goal deleted.', 'info');
    },
    [notify, persistDataset]
  );

  const addGoalContribution = useCallback(
    (goalId: string, amount: number, note: string, accountId?: string) => {
      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      persistDataset((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => {
          if (g.id !== goalId) return g;
          const contribution: SavingsContribution = {
            id: `gc_${Date.now()}`,
            goalId,
            amount,
            currency: g.currency,
            date: today,
            note: note || 'Manual contribution',
            accountId,
          };
          return {
            ...g,
            savedAmount: Math.round((g.savedAmount + amount) * 100) / 100,
            contributions: [contribution, ...g.contributions],
            updatedAt: nowIso,
          };
        }),
      }));
      notify('Savings contribution added (never counted as an expense).', 'success');
    },
    [notify, persistDataset]
  );

  const addSubscription = useCallback(
    (s: Omit<Subscription, 'id' | 'history' | 'updatedAt' | 'deletedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        subscriptions: [
          ...prev.subscriptions,
          { ...s, id: `sub_${Date.now()}`, history: [], updatedAt: nowIso, deletedAt: null },
        ],
      }));
      notify(`Subscription "${s.name}" tracked.`, 'success');
    },
    [notify, persistDataset]
  );

  const updateSubscription = useCallback(
    (id: string, patch: Partial<Subscription>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        subscriptions: prev.subscriptions.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: nowIso } : s
        ),
      }));
      notify('Subscription updated.', 'success');
    },
    [notify, persistDataset]
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        subscriptions: prev.subscriptions.map((s) =>
          s.id === id ? { ...s, deletedAt: nowIso, updatedAt: nowIso } : s
        ),
      }));
      notify('Subscription removed.', 'info');
    },
    [notify, persistDataset]
  );

  const addGroup = useCallback(
    (g: Omit<ExpenseGroup, 'id' | 'expenses' | 'settlements' | 'updatedAt' | 'deletedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        groups: [
          ...prev.groups,
          {
            ...g,
            id: `grp_${Date.now()}`,
            expenses: [],
            settlements: [],
            updatedAt: nowIso,
            deletedAt: null,
          },
        ],
      }));
      notify(`Shared group "${g.name}" created.`, 'success');
    },
    [notify, persistDataset]
  );

  const addSharedExpense = useCallback(
    (groupId: string, expense: Omit<ExpenseGroup['expenses'][number], 'id'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                expenses: [{ ...expense, id: `se_${Date.now()}` }, ...g.expenses],
                updatedAt: nowIso,
              }
            : g
        ),
      }));
      notify('Shared expense recorded.', 'success');
    },
    [notify, persistDataset]
  );

  const recordSettlement = useCallback(
    (groupId: string, settlement: Omit<ExpenseGroup['settlements'][number], 'id'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                settlements: [{ ...settlement, id: `st_${Date.now()}` }, ...g.settlements],
                updatedAt: nowIso,
              }
            : g
        ),
      }));
      notify('Settlement recorded in group ledger.', 'success');
    },
    [notify, persistDataset]
  );

  const checkInChallenge = useCallback(
    (challengeId: string, amountSaved?: number) => {
      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      persistDataset((prev) => ({
        ...prev,
        challenges: prev.challenges.map((ch) => {
          if (ch.id !== challengeId || ch.status === 'completed') return ch;
          const nextDays = Math.min(ch.targetDays, ch.completedDays + 1);
          const nextSaved =
            amountSaved !== undefined ? (ch.savedSoFar ?? 0) + amountSaved : ch.savedSoFar;
          const completed =
            nextDays >= ch.targetDays ||
            (ch.targetAmount !== undefined && (nextSaved ?? 0) >= ch.targetAmount);
          return {
            ...ch,
            completedDays: nextDays,
            savedSoFar: nextSaved,
            status: completed ? 'completed' : 'active',
            lastCheckInDate: today,
            updatedAt: nowIso,
          };
        }),
      }));
      notify('Challenge progress checked in!', 'success');
    },
    [notify, persistDataset]
  );

  const addChallenge = useCallback(
    (c: Omit<FinancialChallenge, 'id' | 'completedDays' | 'status' | 'updatedAt'>) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        challenges: [
          ...prev.challenges,
          {
            ...c,
            id: `ch_${Date.now()}`,
            completedDays: 0,
            status: 'active',
            updatedAt: nowIso,
          },
        ],
      }));
      notify(`Challenge "${c.title}" started!`, 'success');
    },
    [notify, persistDataset]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      persistDataset((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    },
    [persistDataset]
  );

  const clearNotifications = useCallback(() => {
    persistDataset((prev) => ({
      ...prev,
      notifications: [],
    }));
    notify('Notifications cleared.', 'info');
  }, [notify, persistDataset]);

  const updatePreferences = useCallback(
    (patch: Partial<FinanceDataset['preferences']>) => {
      persistDataset((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, ...patch },
      }));
      if (patch.theme) applyTheme(patch.theme);
      notify('Preferences saved.', 'success');
    },
    [applyTheme, notify, persistDataset]
  );

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      persistDataset((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...patch } : null,
      }));
      notify('Profile updated.', 'success');
    },
    [notify, persistDataset]
  );

  const appendAIMessage = useCallback(
    (conversationId: string, msg: AIMessage) => {
      const nowIso = new Date().toISOString();
      persistDataset((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                title:
                  c.messages.length <= 1 && msg.role === 'user'
                    ? msg.content.slice(0, 42)
                    : c.title,
                updatedAt: nowIso,
                messages: [...c.messages, msg],
              }
            : c
        ),
      }));
    },
    [persistDataset]
  );

  const createConversation = useCallback(
    (title = 'New Pip Conversation'): AIConversation => {
      const nowIso = new Date().toISOString();
      const conv: AIConversation = {
        id: `conv_${Date.now()}`,
        title,
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [
          {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content:
              "Hey! I'm Pip, your personal finance copilot. Let's make your money work smarter. What would you like to know?",
            createdAt: nowIso,
            source: mode === 'demo' ? 'local_demo' : 'offline_fallback',
          },
        ],
      };
      persistDataset((prev) => ({
        ...prev,
        conversations: [conv, ...prev.conversations],
      }));
      return conv;
    },
    [mode, persistDataset]
  );

  const clearConversations = useCallback(() => {
    const nowIso = new Date().toISOString();
    persistDataset((prev) => ({
      ...prev,
      conversations: [
        {
          id: `conv_${Date.now()}`,
          title: 'Fresh Financial Session',
          createdAt: nowIso,
          updatedAt: nowIso,
          messages: [
            {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content:
                "Hey! I'm Pip, your personal finance copilot. Let's make your money work smarter. What would you like to know?",
              createdAt: nowIso,
              source: mode === 'demo' ? 'local_demo' : 'offline_fallback',
            },
          ],
        },
      ],
    }));
    notify('Conversation history cleared.', 'info');
  }, [mode, notify, persistDataset]);

  const restoreBackupDataset = useCallback(
    (data: FinanceDataset) => {
      if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.accounts)) {
        notify('Invalid backup file format.', 'error');
        return;
      }
      persistDataset(() => data);
      notify('Backup restored cleanly.', 'success');
    },
    [notify, persistDataset]
  );

  // Sync theme preference if changed
  const setTheme = useCallback(
    (next: 'dark' | 'light') => {
      applyTheme(next);
      persistDataset((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, theme: next },
      }));
    },
    [applyTheme, persistDataset]
  );

  const setCustomRange = useCallback((start: string, end: string) => {
    setCustomRangeState({ start, end });
    setPeriodPreset('custom');
  }, []);

  // Re-export helper for subscriptions monthly equivalent in context consumers if needed
  void getSubscriptionMonthlyEquivalent;
  void getDefaultRateTable;

  return (
    <FinanceContext.Provider
      value={{
        ready,
        mode,
        authUser,
        dataset,
        theme,
        toggleTheme,
        setTheme,
        reportingCurrency,
        setReportingCurrency,
        rates,
        fxSource,
        fxUpdatedAt,
        isOnline,
        syncStatus,
        geminiConfigured,
        resendConfigured,
        periodPreset,
        setPeriodPreset,
        customRange,
        setCustomRange,
        activeRange,
        totalBalance,
        accountBalances,
        periodSummary,
        budgetStatuses,
        forecast,
        healthReport,
        toasts,
        notify,
        dismissToast,
        enterDemoMode,
        resetDemoData,
        enterGuestMode,
        completeAuthenticatedLogin,
        migrateGuestDataToAccount,
        dismissGuestMigrationPrompt,
        showMigrationModal,
        guestPendingTxCount,
        logout,
        syncNow,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        importTransactionsBatch,
        addCategory,
        deleteCategory,
        addPanel,
        addBudget,
        updateBudget,
        deleteBudget,
        addAccount,
        deleteAccount,
        addTransfer,
        addGoal,
        updateGoal,
        deleteGoal,
        addGoalContribution,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        addGroup,
        addSharedExpense,
        recordSettlement,
        checkInChallenge,
        addChallenge,
        markNotificationRead,
        clearNotifications,
        updatePreferences,
        updateProfile,
        appendAIMessage,
        createConversation,
        clearConversations,
        restoreBackupDataset,
        quickAddOpen,
        setQuickAddOpen,
        quickAddInitialTab,
        setQuickAddInitialTab,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
