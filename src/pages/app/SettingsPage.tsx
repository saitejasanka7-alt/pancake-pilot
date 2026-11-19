import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud,
  Download,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SUPPORTED_CURRENCIES } from '../../shared/currencies';
import { toIsoDate } from '../../shared/financeEngine';
import type { FinanceDataset } from '../../shared/types';

export function SettingsPage() {
  const {
    mode,
    authUser,
    dataset,
    theme,
    setTheme,
    reportingCurrency,
    setReportingCurrency,
    fxSource,
    fxUpdatedAt,
    syncStatus,
    syncNow,
    geminiConfigured,
    resendConfigured,
    updateProfile,
    updatePreferences,
    addCategory,
    deleteCategory,
    addPanel,
    restoreBackupDataset,
    resetDemoData,
    logout,
    notify,
  } = useFinance();

  const [fullName, setFullName] = useState(dataset.profile?.fullName || '');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#A46BFF');
  const [newPanelName, setNewPanelName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const exportFullBackup = () => {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pancakepilot-backup-${toIsoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Full workspace backup exported.', 'success');
  };

  const handleRestoreFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FinanceDataset;
      restoreBackupDataset(parsed);
    } catch {
      notify('Could not parse backup JSON file.', 'error');
    }
  };

  const handleDeleteCloudAccount = async () => {
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        await logout();
        notify('Account permanently deleted.', 'info');
      } else {
        notify('Failed to delete cloud account.', 'error');
      }
    } catch {
      notify('Network error deleting account.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          Settings, Privacy &amp; Backup
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
          Manage profile, 33-currency preferences, categories, AI privacy, cloud sync, and full JSON backup/restore.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* 1. Profile */}
        <section className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">1. Profile</h2>
          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
              <button
                type="button"
                onClick={() => updateProfile({ fullName })}
                className="px-4 py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
            Workspace Mode: <strong className="capitalize">{mode}</strong>
            {authUser ? ` · ${authUser.email}` : ''}
          </p>
        </section>

        {/* 2. Currency & 5. Appearance */}
        <section className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">2. Currency &amp; Appearance</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Reporting Currency
              </label>
              <select
                value={reportingCurrency}
                onChange={(e) => setReportingCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Theme Mode
              </label>
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F1E]">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer ${
                      theme === t ? 'bg-[#8156F8] text-white' : 'text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
            FX Rate Source: <strong className="capitalize">{fxSource}</strong> · Updated{' '}
            {fxUpdatedAt.slice(0, 10)}. Existing transactions preserve their original currency.
          </p>
        </section>

        {/* 3. Categories & 4. Panels */}
        <section className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">3. Categories &amp; Panels</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name"
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
            <input
              type="color"
              aria-label="Category color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-10 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent"
            />
            <button
              type="button"
              onClick={() => {
                if (!newCatName.trim()) return;
                addCategory({ name: newCatName.trim(), color: newCatColor, scope: 'both' });
                setNewCatName('');
              }}
              className="px-3 py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {dataset.categories.map((c) => (
              <div
                key={c.id}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#101426] flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.name}</span>
                {!c.isSystem && (
                  <button
                    type="button"
                    onClick={() => deleteCategory(c.id)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] flex gap-2">
            <input
              type="text"
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
              placeholder="New transaction panel (e.g. Q1 Client)"
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
            <button
              type="button"
              onClick={() => {
                if (!newPanelName.trim()) return;
                addPanel({
                  name: newPanelName.trim(),
                  description: 'Custom transaction grouping panel',
                  color: '#43D9E8',
                });
                setNewPanelName('');
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium cursor-pointer"
            >
              Add Panel
            </button>
          </div>
        </section>

        {/* 6. Notifications & 7. AI Privacy */}
        <section className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">4. Notifications &amp; AI Privacy</h2>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>In-app budget &amp; renewal alerts</span>
              <input
                type="checkbox"
                checked={dataset.preferences.notificationsEnabled}
                onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Allow Pip AI to send minimized summary to Gemini</span>
              <input
                type="checkbox"
                checked={dataset.preferences.aiPrivacyConsent}
                onChange={(e) => updatePreferences({ aiPrivacyConsent: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Anonymize merchant labels before AI requests</span>
              <input
                type="checkbox"
                checked={dataset.preferences.aiAnonymizeMerchants}
                onChange={(e) => updatePreferences({ aiAnonymizeMerchants: e.target.checked })}
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#9BA6C0]">
            Server capabilities: Gemini AI {geminiConfigured ? 'Configured' : 'Local Fallback Active'} · Resend Email {resendConfigured ? 'Configured' : 'Dev Preview Mode'}.
          </p>
        </section>

        {/* 8. Cloud Synchronisation & 9. Security */}
        <section className="p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#43D9E8]" />
              5. Cloud Sync &amp; Security
            </h2>
            <span className="text-xs font-mono capitalize text-[#43D9E8]">
              {syncStatus.replace('_', ' ')}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-[#9BA6C0] leading-relaxed">
            {mode === 'authenticated'
              ? `Last synced: ${dataset.lastSyncedAt ? new Date(dataset.lastSyncedAt).toLocaleString() : 'Not synced yet'}. Conflicts resolve safely by keeping the newest timestamp.`
              : 'You are in local offline mode. Sign in with a magic link to synchronise across devices.'}
          </p>

          <div className="flex flex-wrap gap-2">
            {mode === 'authenticated' ? (
              <button
                type="button"
                onClick={syncNow}
                className="px-4 py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Now
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Sign In to Sync
              </Link>
            )}
            {mode === 'demo' && (
              <button
                type="button"
                onClick={resetDemoData}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo Data
              </button>
            )}
          </div>
        </section>

        {/* 10-12. Backup, Restore & Account Deletion */}
        <section className="p-6 rounded-2xl pp-surface space-y-4">
          <h2 className="text-base font-display font-semibold">
            6. Backup, Restore &amp; Account Control
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportFullBackup}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON Backup
            </button>
            <label className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Restore Backup
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleRestoreFile(f);
                }}
              />
            </label>
          </div>

          {mode === 'authenticated' && (
            <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06]">
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  Delete Cloud Account &amp; Data
                </button>
              ) : (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-rose-500 font-medium">Confirm permanent deletion?</span>
                  <button
                    type="button"
                    onClick={handleDeleteCloudAccount}
                    className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
