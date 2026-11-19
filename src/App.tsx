import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AuthVerifyPage, LoginPage, SignupPage } from './pages/AuthPages';
import { LandingPage } from './pages/LandingPage';
import { AccountsPage } from './pages/app/AccountsPage';
import { AnalyticsPage } from './pages/app/AnalyticsPage';
import { BudgetsPage } from './pages/app/BudgetsPage';
import { ChallengesPage } from './pages/app/ChallengesPage';
import { OverviewPage } from './pages/app/OverviewPage';
import { PipAIPage } from './pages/app/PipAIPage';
import { ReceiptScannerPage } from './pages/app/ReceiptScannerPage';
import { ReportsPage } from './pages/app/ReportsPage';
import { SavingsGoalsPage } from './pages/app/SavingsGoalsPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { SplitExpensesPage } from './pages/app/SplitExpensesPage';
import { SubscriptionsPage } from './pages/app/SubscriptionsPage';
import { TransactionsPage } from './pages/app/TransactionsPage';

function AppRoutes() {
  const { ready } = useFinance();

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#080B16] text-[#F6F7FB] flex items-center justify-center text-sm font-display">
        Loading PancakePilot AI workspace…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/auth/verify" element={<AuthVerifyPage />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="pip-ai" element={<PipAIPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="receipts" element={<ReceiptScannerPage />} />
        <Route path="goals" element={<SavingsGoalsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="splits" element={<SplitExpensesPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FinanceProvider>
        <AppRoutes />
      </FinanceProvider>
    </BrowserRouter>
  );
}
