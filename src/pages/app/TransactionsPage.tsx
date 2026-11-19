import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Download,
  Edit3,
  Mic,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { convertAmount, formatMoney } from '../../shared/currencies';
import { detectDuplicateTransaction, toIsoDate } from '../../shared/financeEngine';
import type { ExpenseScope, Transaction, TransactionType } from '../../shared/types';

function parseCsvRows(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  });
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    dataset,
    reportingCurrency,
    rates,
    updateTransaction,
    deleteTransaction,
    importTransactionsBatch,
    setQuickAddOpen,
    setQuickAddInitialTab,
    notify,
  } = useFinance();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [scopeFilter, setScopeFilter] = useState<'all' | ExpenseScope>(
    (searchParams.get('scope') as ExpenseScope) || 'all'
  );
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>(
    (searchParams.get('type') as TransactionType) || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get('category') || 'all'
  );
  const [panelFilter, setPanelFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    merchant: string;
    amount: string;
    categoryId: string;
    scope: ExpenseScope;
  }>({ merchant: '', amount: '', categoryId: '', scope: 'personal' });

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // CSV Bank/UPI Statement Importer Modal
  const [importOpen, setImportOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState({ date: 0, merchant: 1, amount: 2, type: -1 });
  const [importAccountId, setImportAccountId] = useState(dataset.accounts[0]?.id || '');
  const [importError, setImportError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dataset.transactions
      .filter((tx) => {
        if (tx.deletedAt) return false;
        if (scopeFilter !== 'all' && tx.scope !== scopeFilter) return false;
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
        if (panelFilter !== 'all' && tx.panelId !== panelFilter) return false;
        if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;
        if (q) {
          const catName =
            dataset.categories.find((c) => c.id === tx.categoryId)?.name.toLowerCase() || '';
          return (
            tx.merchant.toLowerCase().includes(q) ||
            tx.description.toLowerCase().includes(q) ||
            catName.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    accountFilter,
    categoryFilter,
    dataset.categories,
    dataset.transactions,
    panelFilter,
    query,
    scopeFilter,
    typeFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredTotals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of filtered) {
      const val = convertAmount(tx.amount, tx.currency, reportingCurrency, rates);
      if (tx.type === 'income') inc += val;
      else exp += val;
    }
    return { inc, exp };
  }, [filtered, rates, reportingCurrency]);

  const exportCsv = () => {
    const header = ['Date', 'Type', 'Scope', 'Merchant', 'Description', 'Category', 'Amount', 'Currency'];
    const lines = [header.join(',')];
    for (const tx of filtered) {
      const cat = dataset.categories.find((c) => c.id === tx.categoryId)?.name || '';
      lines.push(
        [
          tx.date,
          tx.type,
          tx.scope,
          `"${tx.merchant.replace(/"/g, '""')}"`,
          `"${tx.description.replace(/"/g, '""')}"`,
          `"${cat}"`,
          tx.amount,
          tx.currency,
        ].join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pancakepilot-transactions-${toIsoDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${filtered.length} transactions to CSV.`, 'success');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pancakepilot-transactions-${toIsoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${filtered.length} transactions to JSON.`, 'success');
  };

  const handleCsvFile = async (file: File) => {
    setImportError('');
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Please upload a valid .csv bank or UPI statement file.');
      return;
    }
    const text = await file.text();
    const parsed = parseCsvRows(text);
    if (parsed.length < 2) {
      setImportError('CSV file must include a header row and at least one transaction row.');
      return;
    }
    const headers = parsed[0];
    setCsvHeaders(headers);
    setCsvRows(parsed.slice(1));

    // Auto-detect common column names
    const lower = headers.map((h) => h.toLowerCase());
    const dateIdx = lower.findIndex((h) => h.includes('date'));
    const merchIdx = lower.findIndex((h) =>
      ['description', 'narration', 'merchant', 'payee', 'particulars'].some((k) => h.includes(k))
    );
    const amtIdx = lower.findIndex((h) =>
      ['amount', 'debit', 'withdrawal', 'value'].some((k) => h.includes(k))
    );
    const typeIdx = lower.findIndex((h) => h.includes('type') || h.includes('cr/dr'));

    setColMap({
      date: dateIdx >= 0 ? dateIdx : 0,
      merchant: merchIdx >= 0 ? merchIdx : Math.min(1, headers.length - 1),
      amount: amtIdx >= 0 ? amtIdx : Math.min(2, headers.length - 1),
      type: typeIdx,
    });
  };

  const previewImported = useMemo(() => {
    return csvRows.slice(0, 50).map((row) => {
      const rawDate = row[colMap.date] || toIsoDate(new Date());
      const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : toIsoDate(new Date(rawDate));
      const safeDate = normalizedDate === 'NaN-NaN-NaN' ? toIsoDate(new Date()) : normalizedDate;
      const merchant = row[colMap.merchant] || 'Statement Entry';
      const rawAmt = parseFloat((row[colMap.amount] || '0').replace(/[^0-9.-]/g, ''));
      const amount = Math.abs(rawAmt);
      const rawType = colMap.type >= 0 ? (row[colMap.type] || '').toLowerCase() : '';
      const type: TransactionType =
        rawType.includes('credit') || rawType.includes('cr') || rawType.includes('income')
          ? 'income'
          : 'expense';

      // Suggest category from keywords
      const mLow = merchant.toLowerCase();
      let categoryId = dataset.categories[0]?.id || 'cat-food';
      if (/uber|ola|metro|fuel|indigo|flight/.test(mLow)) categoryId = 'cat-transport';
      else if (/aws|vercel|cloudflare|figma|saas|github/.test(mLow)) categoryId = 'cat-saas';
      else if (/rent|airtel|electricity|bill|water/.test(mLow)) categoryId = 'cat-utilities';
      else if (/salary|payroll|retainer/.test(mLow)) categoryId = 'cat-salary';

      const isDup = Boolean(
        detectDuplicateTransaction({ amount, date: safeDate, merchant }, dataset.transactions)
      );

      return {
        date: safeDate,
        merchant,
        amount,
        type,
        categoryId,
        isDup,
        valid: !Number.isNaN(amount) && amount > 0,
      };
    });
  }, [colMap, csvRows, dataset.categories, dataset.transactions]);

  const confirmCsvImport = () => {
    const validItems = previewImported.filter((p) => p.valid);
    if (validItems.length === 0) {
      setImportError('No valid positive-amount rows detected with the current column mapping.');
      return;
    }
    importTransactionsBatch(
      validItems.map((p) => ({
        type: p.type,
        scope: 'personal',
        amount: p.amount,
        currency: reportingCurrency,
        merchant: p.merchant,
        description: 'Imported from CSV statement',
        categoryId: p.categoryId,
        panelId: null,
        accountId: importAccountId || dataset.accounts[0]?.id || 'acc-cash',
        date: p.date,
        isRecurring: false,
        recurrenceCycle: 'none',
        tags: ['imported'],
      }))
    );
    setImportOpen(false);
    setCsvHeaders([]);
    setCsvRows([]);
  };

  const startEditing = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditDraft({
      merchant: tx.merchant,
      amount: String(tx.amount),
      categoryId: tx.categoryId,
      scope: tx.scope,
    });
  };

  const commitEditing = (id: string) => {
    const amt = parseFloat(editDraft.amount);
    if (!editDraft.merchant.trim() || Number.isNaN(amt) || amt <= 0) return;
    updateTransaction(id, {
      merchant: editDraft.merchant.trim(),
      amount: amt,
      categoryId: editDraft.categoryId,
      scope: editDraft.scope,
    });
    setEditingId(null);
  };

  const clearAllFilters = () => {
    setQuery('');
    setScopeFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setPanelFilter('all');
    setAccountFilter('all');
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Transactions &amp; Panels</h1>
          <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
            {filtered.length} matching records · Inflow{' '}
            <span className="font-mono text-[#40D99A]">
              {formatMoney(filteredTotals.inc, reportingCurrency)}
            </span>{' '}
            · Outflow{' '}
            <span className="font-mono">
              {formatMoney(filteredTotals.exp, reportingCurrency)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setQuickAddInitialTab('voice');
              setQuickAddOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-[#43D9E8]" />
            Voice Entry
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#A46BFF]" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickAddInitialTab('manual');
              setQuickAddOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl pp-surface grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search merchant, note, category…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#A46BFF]"
          />
        </div>

        <select
          aria-label="Filter by personal or business scope"
          value={scopeFilter}
          onChange={(e) => {
            setScopeFilter(e.target.value as 'all' | ExpenseScope);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
        >
          <option value="all">All Scopes</option>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>

        <select
          aria-label="Filter by transaction type"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as 'all' | TransactionType);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
        >
          <option value="all">All Types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
        >
          <option value="all">All Categories</option>
          {dataset.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by panel"
          value={panelFilter}
          onChange={(e) => {
            setPanelFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
        >
          <option value="all">All Panels</option>
          {dataset.panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl pp-surface overflow-hidden">
        {paged.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium">No transactions match your current filters.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-xl bg-[#8156F8] text-white text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.07] text-xs text-slate-500 dark:text-[#9BA6C0]">
                  <th className="py-3 px-5 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Merchant &amp; Note</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Panel · Account</th>
                  <th className="py-3 px-4 font-medium">Scope</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                {paged.map((tx) => {
                  const cat = dataset.categories.find((c) => c.id === tx.categoryId);
                  const panel = dataset.panels.find((p) => p.id === tx.panelId);
                  const acc = dataset.accounts.find((a) => a.id === tx.accountId);
                  const isEditing = editingId === tx.id;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-5 text-xs font-mono tabular-nums text-slate-500 dark:text-[#9BA6C0] whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.merchant}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, merchant: e.target.value }))
                            }
                            className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-[#0B0F1E] border border-[#A46BFF] w-full"
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-sm">{tx.merchant}</p>
                            {tx.description && (
                              <p className="text-xs text-slate-500 dark:text-[#9BA6C0] truncate max-w-xs">
                                {tx.description}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {isEditing ? (
                          <select
                            value={editDraft.categoryId}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, categoryId: e.target.value }))
                            }
                            className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-[#0B0F1E] border border-[#A46BFF]"
                          >
                            {dataset.categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300">
                            {cat?.name || 'Other'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-[#9BA6C0]">
                        {panel ? `${panel.name} · ` : ''}
                        {acc?.name || 'Wallet'}
                      </td>
                      <td className="py-3 px-4 text-xs capitalize">
                        {isEditing ? (
                          <select
                            value={editDraft.scope}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                scope: e.target.value as ExpenseScope,
                              }))
                            }
                            className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-[#0B0F1E] border border-[#A46BFF]"
                          >
                            <option value="personal">personal</option>
                            <option value="business">business</option>
                          </select>
                        ) : (
                          <span className="text-slate-600 dark:text-[#9BA6C0]">{tx.scope}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editDraft.amount}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, amount: e.target.value }))
                            }
                            className="w-24 px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-[#0B0F1E] border border-[#A46BFF] text-right"
                          />
                        ) : (
                          <span className={tx.type === 'income' ? 'text-[#16A34A] dark:text-[#40D99A]' : ''}>
                            {tx.type === 'income' ? '+' : '-'}
                            {formatMoney(tx.amount, tx.currency)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => commitEditing(tx.id)}
                              aria-label="Save changes"
                              className="p-1.5 rounded-lg bg-[#40D99A]/15 text-[#40D99A] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel editing"
                              className="p-1.5 rounded-lg bg-slate-200 dark:bg-white/10 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : confirmDeleteId === tx.id ? (
                          <div className="inline-flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                deleteTransaction(tx.id);
                                setConfirmDeleteId(null);
                              }}
                              className="text-rose-500 font-semibold hover:underline cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-500 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditing(tx)}
                              aria-label={`Edit ${tx.merchant}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(tx.id)}
                              aria-label={`Delete ${tx.merchant}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-[#9BA6C0]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bank & UPI CSV Statement Importer Modal */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl pp-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-semibold">Bank &amp; UPI Statement Importer (CSV)</h2>
                <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                  Upload a CSV statement, map columns, and preview duplicates before importing. Zero bank credentials required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                aria-label="Close importer"
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-4 py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Select CSV File
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleCsvFile(f);
                    }}
                  />
                </label>

                <select
                  aria-label="Target account"
                  value={importAccountId}
                  onChange={(e) => setImportAccountId(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                >
                  {dataset.accounts
                    .filter((a) => !a.deletedAt)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        Import into: {a.name}
                      </option>
                    ))}
                </select>
              </div>

              {importError && <p className="text-xs text-rose-500">{importError}</p>}

              {csvHeaders.length > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Date Column</label>
                      <select
                        value={colMap.date}
                        onChange={(e) => setColMap((m) => ({ ...m, date: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                      >
                        {csvHeaders.map((h, i) => (
                          <option key={h + i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Merchant / Narration</label>
                      <select
                        value={colMap.merchant}
                        onChange={(e) =>
                          setColMap((m) => ({ ...m, merchant: Number(e.target.value) }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                      >
                        {csvHeaders.map((h, i) => (
                          <option key={h + i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Amount Column</label>
                      <select
                        value={colMap.amount}
                        onChange={(e) => setColMap((m) => ({ ...m, amount: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                      >
                        {csvHeaders.map((h, i) => (
                          <option key={h + i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Type (Optional)</label>
                      <select
                        value={colMap.type}
                        onChange={(e) => setColMap((m) => ({ ...m, type: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
                      >
                        <option value={-1}>Assume Expense</option>
                        {csvHeaders.map((h, i) => (
                          <option key={h + i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-[#0B0F1E] text-slate-500">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Merchant</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                        {previewImported.map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-mono">{row.date}</td>
                            <td className="p-2.5">{row.merchant}</td>
                            <td className="p-2.5 text-right font-mono">
                              {formatMoney(row.amount, reportingCurrency)}
                            </td>
                            <td className="p-2.5">
                              {!row.valid ? (
                                <span className="text-rose-500">Invalid amount</span>
                              ) : row.isDup ? (
                                <span className="text-amber-500">Duplicate (will skip)</span>
                              ) : (
                                <span className="text-[#40D99A]">Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={previewImported.filter((p) => p.valid).length === 0}
                onClick={confirmCsvImport}
                className="px-4 py-2 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold disabled:opacity-40"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
