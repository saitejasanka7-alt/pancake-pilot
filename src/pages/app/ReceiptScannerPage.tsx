import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  RotateCw,
  ScanLine,
  Upload,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SUPPORTED_CURRENCIES } from '../../shared/currencies';
import { detectDuplicateTransaction, toIsoDate } from '../../shared/financeEngine';
import type { ExpenseScope } from '../../shared/types';

interface ExtractedReceipt {
  merchant: string;
  amount: string;
  tax: string;
  date: string;
  currency: string;
  description: string;
  categoryId: string;
  confidence: number | null;
  rawText: string;
}

function parseReceiptText(rawText: string, defaultCurrency: string): Omit<ExtractedReceipt, 'categoryId' | 'confidence' | 'rawText'> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const merchant = lines[0]?.slice(0, 60) || 'Receipt Merchant';

  // Detect currency
  let currency = defaultCurrency;
  if (/\$|USD/i.test(rawText)) currency = 'USD';
  else if (/€|EUR/i.test(rawText)) currency = 'EUR';
  else if (/£|GBP/i.test(rawText)) currency = 'GBP';
  else if (/₹|INR|RS\.?/i.test(rawText)) currency = 'INR';

  // Extract total amount (prioritize lines containing total/grand total/amount due)
  let amount = '';
  const totalLine = lines.find((l) => /(grand\s*total|total\s*due|net\s*amount|total)/i.test(l));
  const amtRegex = /(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g;
  if (totalLine) {
    const matches = totalLine.match(amtRegex);
    if (matches && matches.length > 0) {
      amount = matches[matches.length - 1].replace(/,/g, '');
    }
  }
  if (!amount) {
    const allNums = (rawText.match(/\d+(?:,\d{3})*\.\d{2}/g) || []).map((s) =>
      parseFloat(s.replace(/,/g, ''))
    );
    if (allNums.length > 0) {
      amount = String(Math.max(...allNums));
    }
  }

  // Extract tax if identifiable
  let tax = '';
  const taxLine = lines.find((l) => /(gst|vat|tax|cgst|sgst)/i.test(l));
  if (taxLine) {
    const tm = taxLine.match(amtRegex);
    if (tm && tm.length > 0) tax = tm[tm.length - 1].replace(/,/g, '');
  }

  // Extract date
  let date = toIsoDate(new Date());
  const isoMatch = rawText.match(/(\d{4}-\d{2}-\d{2})/);
  const slashMatch = rawText.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (isoMatch) {
    date = isoMatch[1];
  } else if (slashMatch) {
    const [, p1, p2, yr] = slashMatch;
    const m = Number(p2) > 12 ? p1 : p2;
    const d = Number(p2) > 12 ? p2 : p1;
    date = `${yr}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return {
    merchant,
    amount,
    tax,
    date,
    currency,
    description: tax ? `Receipt scan (incl. tax ${tax})` : 'Receipt scan',
  };
}

export function ReceiptScannerPage() {
  const { dataset, reportingCurrency, addTransaction, notify } = useFinance();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [scope, setScope] = useState<ExpenseScope>('personal');
  const [accountId, setAccountId] = useState(dataset.accounts[0]?.id || '');

  const [form, setForm] = useState<ExtractedReceipt>({
    merchant: '',
    amount: '',
    tax: '',
    date: toIsoDate(new Date()),
    currency: reportingCurrency,
    description: '',
    categoryId: dataset.categories[0]?.id || 'cat-food',
    confidence: null,
    rawText: '',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const suggestCategory = (text: string): string => {
    const lower = text.toLowerCase();
    if (/uber|ola|fuel|petrol|indigo|metro|parking/.test(lower)) return 'cat-transport';
    if (/aws|vercel|cloudflare|figma|software|cloud/.test(lower)) return 'cat-saas';
    if (/electricity|airtel|internet|water|bill/.test(lower)) return 'cat-utilities';
    if (/pharmacy|clinic|medical|fitness/.test(lower)) return 'cat-health';
    return 'cat-food';
  };

  const handleFile = (file: File) => {
    setOcrError('');
    if (!file.type.startsWith('image/')) {
      setOcrError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(String(reader.result));
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const getRotatedImageDataUrl = async (): Promise<string | null> => {
    if (!imageSrc) return null;
    if (rotation % 360 === 0) return imageSrc;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const rad = (rotation * Math.PI) / 180;
        const swap = rotation % 180 !== 0;
        canvas.width = swap ? img.height : img.width;
        canvas.height = swap ? img.width : img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  };

  const runLocalOcr = async () => {
    if (!imageSrc) return;
    setScanning(true);
    setProgressPct(5);
    setOcrError('');

    try {
      const targetUrl = await getRotatedImageDataUrl();
      if (!targetUrl) throw new Error('Image unavailable');

      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(targetUrl, 'eng', {
        logger: (m) => {
          if (typeof m.progress === 'number') {
            setProgressPct(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text || '';
      const confidence = Math.round(result.data.confidence || 0);
      const parsed = parseReceiptText(rawText, reportingCurrency);
      const catId = suggestCategory(`${parsed.merchant} ${rawText}`);

      setForm({
        ...parsed,
        categoryId: catId,
        confidence,
        rawText,
      });
      notify('Receipt OCR completed. Please review and confirm details before saving.', 'info');
    } catch {
      setOcrError('Local OCR could not read this image clearly. Enter or correct the fields manually below.');
    } finally {
      setScanning(false);
    }
  };

  const duplicateMatch =
    form.amount && form.merchant
      ? detectDuplicateTransaction(
          {
            amount: parseFloat(form.amount) || 0,
            date: form.date,
            merchant: form.merchant,
          },
          dataset.transactions
        )
      : null;

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmt = parseFloat(form.amount);
    if (!form.merchant.trim() || Number.isNaN(numericAmt) || numericAmt <= 0) {
      setOcrError('Enter a valid merchant and positive amount before saving.');
      return;
    }

    addTransaction({
      type: 'expense',
      scope,
      amount: numericAmt,
      currency: form.currency,
      merchant: form.merchant.trim(),
      description: form.description.trim() || 'Confirmed receipt expense',
      categoryId: form.categoryId,
      panelId: null,
      accountId: accountId || dataset.accounts[0]?.id || 'acc-cash',
      date: form.date,
      isRecurring: false,
      recurrenceCycle: 'none',
      tags: ['receipt-ocr'],
      notes: form.tax ? `Tax identified: ${form.tax}` : undefined,
    });

    setForm({
      merchant: '',
      amount: '',
      tax: '',
      date: toIsoDate(new Date()),
      currency: reportingCurrency,
      description: '',
      categoryId: dataset.categories[0]?.id || 'cat-food',
      confidence: null,
      rawText: '',
    });
    setImageSrc(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Receipt Scanner (Local OCR)</h1>
        <p className="text-xs text-slate-500 dark:text-[#9BA6C0] mt-0.5">
          Processed privately in your browser using Tesseract OCR. Review and confirm extracted details—never saved automatically.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Image Upload, Camera Capture & Rotation Preview */}
        <div className="lg:col-span-6 p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Receipt Image
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.05] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#43D9E8]" />
              Camera Capture
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {imageSrc ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-100 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/[0.08] p-4 flex items-center justify-center min-h-[280px] overflow-hidden">
                <img
                  src={imageSrc}
                  alt="Receipt preview"
                  referrerPolicy="no-referrer"
                  className="max-h-72 object-contain transition-transform"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotate 90°
                </button>
                <button
                  type="button"
                  disabled={scanning}
                  onClick={runLocalOcr}
                  className="px-5 py-2.5 rounded-xl bg-[#43D9E8] text-[#080B16] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Extracting ({progressPct}%)…
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-3.5 h-3.5" />
                      Extract Receipt Fields
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 p-12 text-center space-y-2">
              <ScanLine className="w-8 h-8 mx-auto text-[#A46BFF]" />
              <p className="text-sm font-medium">Upload or capture a receipt photo</p>
              <p className="text-xs text-slate-500 dark:text-[#9BA6C0]">
                Supports PNG, JPG, WEBP. Or fill in the manual receipt form on the right anytime.
              </p>
            </div>
          )}

          {form.rawText && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 dark:text-[#9BA6C0]">
                View Raw OCR Text
              </summary>
              <pre className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-[#0B0F1E] whitespace-pre-wrap font-mono text-[11px] max-h-40 overflow-y-auto">
                {form.rawText}
              </pre>
            </details>
          )}
        </div>

        {/* Right: Review & Confirm Extracted Fields */}
        <form onSubmit={handleConfirmSave} className="lg:col-span-6 p-6 rounded-2xl pp-surface space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold">Review &amp; Confirm Expense</h2>
            {form.confidence !== null && (
              <span className="text-xs font-mono text-[#43D9E8]">
                OCR Confidence: {form.confidence}%
              </span>
            )}
          </div>

          {duplicateMatch && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Likely duplicate receipt detected ({duplicateMatch.merchant} on {duplicateMatch.date} for {duplicateMatch.amount}). You may still save if this is a separate purchase.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Merchant
              </label>
              <input
                type="text"
                required
                value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                placeholder="Merchant name"
                className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Total Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Tax (Optional)
              </label>
              <input
                type="text"
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))}
                placeholder="e.g. 42.50"
                className="w-full rounded-xl px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Suggested Category
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {dataset.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ExpenseScope)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
              >
                {dataset.accounts
                  .filter((a) => !a.deletedAt)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 dark:text-[#9BA6C0] mb-1">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Item summary"
              className="w-full rounded-xl px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0B0F1E] border border-slate-200 dark:border-white/10"
            />
          </div>

          {ocrError && <p className="text-xs text-rose-500">{ocrError}</p>}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#8156F8] hover:bg-[#A46BFF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Confirm &amp; Save Expense
          </button>
        </form>
      </div>
    </div>
  );
}
