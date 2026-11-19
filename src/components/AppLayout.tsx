import React, { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Award,
  Bell,
  CreditCard,
  FileBarChart2,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  ScanLine,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { PancakePilotLogo } from './BrandMark';
import { QuickAddModal } from './QuickAddModal';
import { useFinance } from '../context/FinanceContext';
import { SUPPORTED_CURRENCIES } from '../shared/currencies';

const NAV_ITEMS = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/app/pip-ai', label: 'Pip AI Assistant', icon: Sparkles },
  { to: '/app/budgets', label: 'Smart Budgets', icon: Target },
  { to: '/app/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/app/receipts', label: 'Receipt Scanner', icon: ScanLine },
  { to: '/app/goals', label: 'Savings Goals', icon: PiggyBank },
  { to: '/app/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/app/accounts', label: 'Accounts & Wallets', icon: Landmark },
  { to: '/app/splits', label: 'Split Expenses', icon: Users },
  { to: '/app/challenges', label: 'Financial Challenges', icon: Award },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const navigate = useNavigate();
  const {
    mode,
    authUser,
    dataset,
    theme,
    toggleTheme,
    reportingCurrency,
    setReportingCurrency,
    syncStatus,
    syncNow,
    resetDemoData,
    logout,
    toasts,
    dismissToast,
    markNotificationRead,
    clearNotifications,
    setQuickAddOpen,
    setQuickAddInitialTab,
    showMigrationModal,
    guestPendingTxCount,
    migrateGuestDataToAccount,
    dismissGuestMigrationPrompt,
  } = useFinance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [migrating, setMigrating] = useState(false);

  const unreadCount = useMemo(
    () => dataset.notifications.filter((n) => !n.read).length,
    [dataset.notifications]
  );

  const greetingName =
    mode === 'authenticated' && authUser
      ? authUser.fullName.split(' ')[0]
      : mode === 'demo'
      ? 'Arjun'
      : 'Guest';

  const hour = new Date().getHours();
  const greetingPrefix =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/app/transactions?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8FC] text-[#0F172A] dark:bg-[#080B16] dark:text-[#F6F7FB]">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 pp-sidebar z-30">
        <div className="px-5 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-base tracking-tight">
            <PancakePilotLogo size={30} />
            <span>PancakePilot</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#8156F8]/15 text-[#8156F8] dark:bg-[#8156F8]/20 dark:text-white'
                      : 'text-slate-600 dark:text-[#9BA6C0] hover:bg-slate-200/60 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.06] space-y-3">
          {mode === 'demo' && (
            <div className="p-3 rounded-xl bg-[#A46BFF]/10 border border-[#A46BFF]/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8156F8] dark:text-[#A46BFF]">
                <span>DEMO MODE</span>
                <button
                  type="button"
                  onClick={resetDemoData}
                  className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#9BA6C0]">
                Fictional sample ledger. Works offline with zero external keys.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#8156F8]/20 text-[#8156F8] dark:text-[#A46BFF] flex items-center justify-center font-semibold shrink-0">
                {dataset.profile?.avatarInitials || 'PP'}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {authUser?.fullName || dataset.profile?.fullName || 'Workspace'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0] capitalize truncate">
                  {mode === 'authenticated'
                    ? syncStatus === 'synced'
                      ? 'Cloud Synced'
                      : syncStatus
                    : mode === 'demo'
                    ? 'Demo Workspace'
                    : 'Local Guest'}
                </p>
              </div>
            </div>
            {mode === 'authenticated' ? (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="text-xs font-medium text-[#8156F8] dark:text-[#43D9E8] hover:underline whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] pp-sidebar flex flex-col z-10 h-full">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08]">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 font-display font-bold"
              >
                <PancakePilotLogo size={28} />
                <span>PancakePilot</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-[#8156F8]/15 text-[#8156F8] dark:text-white'
                          : 'text-slate-600 dark:text-[#9BA6C0]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        {/* Workspace Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-white/[0.07] bg-white/85 dark:bg-[#080B16]/85 backdrop-blur-xl">
          <div className="px-4 sm:px-7 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-white/10"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-display font-semibold truncate">
                  {greetingPrefix}, {greetingName}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#9BA6C0] hidden sm:block">
                  {mode === 'demo'
                    ? 'DEMO MODE · Sample Personal & Business Workspace'
                    : mode === 'guest'
                    ? 'Guest Workspace · Saved locally offline'
                    : `Cloud Account · ${authUser?.email}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Search */}
              <form onSubmit={handleGlobalSearch} className="hidden md:flex relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions…"
                  className="w-48 lg:w-56 pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
                />
              </form>

              {/* Currency Selector */}
              <select
                aria-label="Reporting currency"
                value={reportingCurrency}
                onChange={(e) => setReportingCurrency(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-mono bg-slate-100 dark:bg-[#101426] border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} {c.symbol}
                  </option>
                ))}
              </select>

              {/* Sync Trigger */}
              {mode === 'authenticated' && (
                <button
                  type="button"
                  onClick={syncNow}
                  title={`Sync status: ${syncStatus}`}
                  aria-label="Synchronise cloud data"
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin text-[#43D9E8]' : ''}`}
                  />
                </button>
              )}

              {/* Notifications */}
              <button
                type="button"
                onClick={() => setNotifDrawerOpen((o) => !o)}
                aria-label="Notifications"
                className="relative p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#A46BFF] text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Quick Add Expense */}
              <button
                type="button"
                onClick={() => {
                  setQuickAddInitialTab('manual');
                  setQuickAddOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Add</span>
              </button>
            </div>
          </div>
        </header>

        {/* Notifications Slide-down Panel */}
        {notifDrawerOpen && (
          <div className="fixed right-4 top-16 z-40 w-80 sm:w-96 rounded-2xl pp-surface shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-3 text-xs">
                {dataset.notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotifDrawerOpen(false)}
                  aria-label="Close notifications"
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-white/[0.06]">
              {dataset.notifications.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500 dark:text-[#9BA6C0]">
                  No active alerts right now.
                </p>
              ) : (
                dataset.notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.actionRoute) navigate(n.actionRoute);
                      setNotifDrawerOpen(false);
                    }}
                    className={`p-4 text-xs space-y-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.04] ${
                      !n.read ? 'bg-[#8156F8]/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{n.title}</span>
                      {!n.read && <span className="text-[10px] text-[#A46BFF] font-medium">New</span>}
                    </div>
                    <p className="text-slate-600 dark:text-[#9BA6C0] leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Active Route Viewport */}
        <main className="flex-1 p-4 sm:p-7 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal />

      {/* Guest-to-Account Migration Modal */}
      {showMigrationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl pp-surface p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#43D9E8]/15 text-[#43D9E8] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold">Migrate Local Guest Records?</h3>
                <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                  We detected {guestPendingTxCount} locally stored transaction(s) in your Guest workspace.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
              We can merge your local transactions, accounts, budgets, and goals into your cloud account safely. Duplicate entries are automatically detected and skipped so nothing is overwritten.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={dismissGuestMigrationPrompt}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium"
              >
                Keep Separate
              </button>
              <button
                type="button"
                disabled={migrating}
                onClick={async () => {
                  setMigrating(true);
                  await migrateGuestDataToAccount();
                  setMigrating(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold"
              >
                {migrating ? 'Migrating…' : 'Migrate Local Records'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Stack */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between gap-3 ${
              t.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-500/40'
                : t.type === 'success'
                ? 'bg-[#101426] text-white border-[#40D99A]/40'
                : 'bg-[#101426] text-white border-[#A46BFF]/40'
            }`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
