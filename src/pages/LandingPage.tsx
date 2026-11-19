import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Lock,
  PiggyBank,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PancakePilotLogo, PipOrb } from '../components/BrandMark';
import { useFinance } from '../context/FinanceContext';

const PREVIEW_SERIES = [
  { month: 'Jul', income: 88000, expense: 31200 },
  { month: 'Aug', income: 88000, expense: 29800 },
  { month: 'Sep', income: 92000, expense: 32400 },
  { month: 'Oct', income: 92000, expense: 30300 },
  { month: 'Nov', income: 129890, expense: 48219 },
];

const FAQS = [
  {
    q: 'Can I use PancakePilot AI without creating an account?',
    a: 'Yes. Guest Mode stores all transactions, budgets, accounts, and goals locally in your browser IndexedDB so you can track offline with zero sign-up required.',
  },
  {
    q: 'How does Pip AI protect my financial privacy?',
    a: 'All totals, percentages, and forecasts are computed deterministically inside your workspace. Pip only sends a minimized summary to Gemini via a server-side proxy when you grant AI privacy consent, with optional merchant anonymization.',
  },
  {
    q: 'What happens when I am offline or without a Gemini API key?',
    a: 'PancakePilot remains fully functional offline. Pip automatically switches to a deterministic local query engine that calculates answers directly from your stored ledger without fabricating responses.',
  },
  {
    q: 'Does it preserve PancakeMaker personal and business expense tracking?',
    a: 'Yes. Every transaction supports Personal vs Business scopes, category & panel grouping, inline editing, recurring schedules, 33 currencies with INR default, and CSV/JSON exports.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { enterDemoMode, enterGuestMode } = useFinance();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [previewMode, setPreviewMode] = useState<'cashflow' | 'forecast'>('cashflow');

  const handleLaunchDemo = async () => {
    await enterDemoMode();
    navigate('/app');
  };

  const handleGuestStart = async () => {
    await enterGuestMode();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-[#0F172A] dark:bg-[#080B16] dark:text-[#F6F7FB]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/[0.07] bg-white/85 dark:bg-[#080B16]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-display font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            <PancakePilotLogo size={32} />
            <span>PancakePilot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-[#9BA6C0]">
            <a
              href="#features"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#pip-ai"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Pip AI
            </a>
            <a
              href="#privacy"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Offline Privacy
            </a>
            <a
              href="#faq"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-[#9BA6C0] hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Demo
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero Section + 2. Animated Dashboard Preview */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-7">
              <p className="text-xs font-medium tracking-wide text-[#8156F8] dark:text-[#43D9E8]">
                PancakeMaker 2.0 · Personal &amp; Business Finance Copilot
              </p>
              <h1
                className="font-display font-bold tracking-tight leading-[1.08] text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.65rem)' }}
              >
                Take Control of Your Money. Let AI Guide Your Next Move.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-[#9BA6C0] leading-relaxed max-w-xl">
                PancakePilot AI helps you track expenses, understand spending habits, predict financial trends and make smarter financial decisions with your personal AI finance copilot.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to="/signup"
                  className="px-6 py-3.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  START YOUR FREE JOURNEY
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  EXPLORE LIVE DEMO
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-[#9BA6C0] pt-2">
                <span>Offline-First IndexedDB</span>
                <span aria-hidden="true">·</span>
                <span>33 Currencies (INR Default)</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleGuestStart}
                  className="underline decoration-dotted hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Continue as Guest without account
                </button>
              </div>
            </div>

            {/* Interactive NeuroBank-inspired Financial Dashboard Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl pp-surface p-6 sm:p-7 shadow-2xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                      Consolidated Net Balance
                    </p>
                    <p className="text-2xl sm:text-3xl font-display font-bold font-mono tabular-nums mt-1">
                      ₹3,57,389.00
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F1E]">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('cashflow')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        previewMode === 'cashflow'
                          ? 'bg-white dark:bg-[#1E2642] text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-[#9BA6C0]'
                      }`}
                    >
                      Cashflow
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('forecast')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        previewMode === 'forecast'
                          ? 'bg-white dark:bg-[#1E2642] text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-[#9BA6C0]'
                      }`}
                    >
                      Forecast
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-left">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101426]">
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Monthly Income</p>
                    <p className="text-base font-semibold font-mono tabular-nums text-[#40D99A] mt-1">
                      ₹1,29,890
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101426]">
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Monthly Spend</p>
                    <p className="text-base font-semibold font-mono tabular-nums mt-1">
                      ₹48,219
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101426]">
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Savings Rate</p>
                    <p className="text-base font-semibold font-mono tabular-nums text-[#43D9E8] mt-1">
                      62.8%
                    </p>
                  </div>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={PREVIEW_SERIES}>
                      <defs>
                        <linearGradient id="landInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#43D9E8" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#43D9E8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="landExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A46BFF" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#A46BFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        stroke="#9BA6C0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#101426',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderRadius: 12,
                          fontSize: 12,
                          color: '#F6F7FB',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={previewMode === 'cashflow' ? 'income' : 'expense'}
                        stroke="#43D9E8"
                        strokeWidth={2}
                        fill="url(#landInc)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#A46BFF"
                        strokeWidth={2}
                        fill="url(#landExp)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-[#101426] border border-slate-200/70 dark:border-white/[0.06]">
                  <PipOrb size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">Pip AI Copilot Insight</p>
                    <p className="text-xs text-slate-600 dark:text-[#9BA6C0] truncate">
                      Client Travel exceeded its ₹8,000 cap due to a one-off summit flight.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLaunchDemo}
                    className="text-xs font-semibold text-[#8156F8] dark:text-[#43D9E8] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Inspect →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Meet Pip AI Section */}
        <section id="pip-ai" className="border-t border-slate-200/80 dark:border-white/[0.06] py-20">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 flex flex-col items-start space-y-5">
              <PipOrb size="lg" />
              <h2 className="text-3xl font-display font-bold tracking-tight text-balance">
                Meet Pip AI — Deterministic Math Meets Natural Conversation
              </h2>
              <p className="text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                Ask why your monthly spending shifted, compare personal versus business outflows, or inspect upcoming subscription renewals. Every figure is calculated from your real ledger before Pip explains the story.
              </p>
              <button
                type="button"
                onClick={handleLaunchDemo}
                className="px-5 py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Ask Pip in Live Demo
              </button>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {[
                {
                  prompt: '"Why did I spend more this month?"',
                  answer:
                    'Shows exact month-on-month delta, top contributing categories, and a 1-click button to view filtered transactions.',
                },
                {
                  prompt: '"Am I exceeding my food budget?"',
                  answer:
                    'Evaluates 50% / 75% / 90% / 100% alert thresholds and projects month-end run rate using daily velocity.',
                },
                {
                  prompt: '"Compare my business and personal expenses"',
                  answer:
                    'Separates tax-deductible business panels from household spending across all 33 supported currencies.',
                },
                {
                  prompt: '"Predict next month’s expenses"',
                  answer:
                    'Applies weighted moving averages with uncertainty ranges and flags unusual outlier transactions automatically.',
                },
              ].map((item) => (
                <div key={item.prompt} className="p-5 rounded-2xl pp-surface space-y-2">
                  <p className="text-sm font-semibold text-[#8156F8] dark:text-[#A46BFF]">
                    {item.prompt}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4-9. Feature Overview Bento Grid (Budgets, Receipt OCR, Predictions, Savings, Multi-Account, Imports) */}
        <section id="features" className="border-t border-slate-200/80 dark:border-white/[0.06] py-20">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-medium text-[#43D9E8]">Complete Finance Architecture</p>
              <h2 className="text-3xl font-display font-bold tracking-tight">
                Everything in PancakeMaker 2.0, Upgraded for Clarity
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="md:col-span-2 p-7 rounded-2xl pp-surface flex flex-col justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#A46BFF]">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-xs font-semibold">Predictive Analytics &amp; Anomaly Detection</span>
                  </div>
                  <h3 className="text-xl font-display font-semibold">
                    Forecast next month before it happens
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-[#9BA6C0] max-w-xl">
                    Recency-weighted category forecasts, confidence intervals, and statistical outlier flags surface hidden spending drift early.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Budget Alerts</p>
                    <p className="text-sm font-semibold mt-0.5">50 / 75 / 90 / 100%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Currencies</p>
                    <p className="text-sm font-semibold mt-0.5">33 Live FX Pairs</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">Health Score</p>
                    <p className="text-sm font-semibold mt-0.5">5 Transparent Pillars</p>
                  </div>
                </div>
              </div>

              <div className="p-7 rounded-2xl pp-surface space-y-3">
                <ScanLine className="w-5 h-5 text-[#43D9E8]" />
                <h3 className="text-lg font-display font-semibold">Local Receipt Scanner OCR</h3>
                <p className="text-sm text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                  Upload or snap receipts with camera capture and image rotation. Local Tesseract OCR extracts merchant, amount, tax, and date for your review—never saved blindly.
                </p>
              </div>

              <div className="p-7 rounded-2xl pp-surface space-y-3">
                <PiggyBank className="w-5 h-5 text-[#40D99A]" />
                <h3 className="text-lg font-display font-semibold">Savings Goals &amp; Subscriptions</h3>
                <p className="text-sm text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                  Track emergency funds and milestone targets separately from expenses, while monitoring monthly and annual subscription equivalents.
                </p>
              </div>

              <div className="p-7 rounded-2xl pp-surface space-y-3">
                <Wallet className="w-5 h-5 text-[#A46BFF]" />
                <h3 className="text-lg font-display font-semibold">Accounts, Transfers &amp; Splits</h3>
                <p className="text-sm text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                  Manage Cash, Bank, UPI, and Credit Card balances with cross-account transfers and roommate/trip split settlement ledgers.
                </p>
              </div>

              <div className="p-7 rounded-2xl pp-surface space-y-3">
                <Sparkles className="w-5 h-5 text-[#43D9E8]" />
                <h3 className="text-lg font-display font-semibold">Voice Entry &amp; CSV Importer</h3>
                <p className="text-sm text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                  Dictate expenses hands-free or map bank/UPI CSV statements with automatic duplicate detection and PDF/CSV/JSON reporting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Offline-First Privacy & 10. How It Works */}
        <section id="privacy" className="border-t border-slate-200/80 dark:border-white/[0.06] py-20">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[#40D99A]">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-semibold">Offline-First Privacy Architecture</span>
              </div>
              <h2 className="text-3xl font-display font-bold tracking-tight">
                Your Ledger Stays on Your Device First
              </h2>
              <p className="text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                PancakePilot never requests bank passwords, PINs, or OTPs. Guest mode works 100% locally in IndexedDB, and optional magic-link cloud sync resolves conflicts safely by timestamp without silently overwriting newer edits.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                  Installable PWA · Explicit AI consent toggle · Full JSON Backup &amp; Restore
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  num: '01. Choose Your Workspace',
                  desc: 'Start immediately in Guest Mode, launch the seeded Live Demo, or create a magic-link account for cross-device sync.',
                },
                {
                  num: '02. Capture Every Move Effortlessly',
                  desc: 'Log personal or business entries inline, via voice dictation, receipt OCR, or CSV statement import.',
                },
                {
                  num: '03. Act on Pip AI & Forecast Insights',
                  desc: 'Track budget alerts, uncover anomalies, settle group splits, and export audit-ready PDF reports.',
                },
              ].map((step) => (
                <div key={step.num} className="p-5 rounded-2xl pp-surface space-y-1.5">
                  <h3 className="text-base font-display font-semibold">{step.num}</h3>
                  <p className="text-sm text-slate-600 dark:text-[#9BA6C0]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11. Frequently Asked Questions */}
        <section id="faq" className="border-t border-slate-200/80 dark:border-white/[0.06] py-20">
          <div className="max-w-3xl mx-auto px-6 space-y-8">
            <h2 className="text-3xl font-display font-bold tracking-tight text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((item, idx) => {
                const open = openFaq === idx;
                return (
                  <div key={item.q} className="rounded-2xl pp-surface overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-medium text-sm cursor-pointer"
                      aria-expanded={open}
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          open ? 'rotate-180 text-[#A46BFF]' : ''
                        }`}
                      />
                    </button>
                    {open && (
                      <div className="px-6 pb-5 text-sm text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* 12. Quiet Footer with working navigation */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.07] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-[#9BA6C0]">
          <div className="flex items-center gap-2.5">
            <PancakePilotLogo size={24} />
            <span className="font-display font-semibold text-slate-900 dark:text-white">
              PancakePilot AI
            </span>
            <span aria-hidden="true">·</span>
            <span>Your Money. Your Moves. Your AI Copilot.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/signup" className="hover:text-slate-900 dark:hover:text-white">
              Create Account
            </Link>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white">
              Sign In
            </Link>
            <button
              type="button"
              onClick={handleGuestStart}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Guest Mode
            </button>
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Live Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
