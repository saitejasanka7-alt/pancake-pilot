export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  fallbackRateFromUSD: number; // Approximate fallback rate relative to 1 USD
}

// Preserved 33-currency support with INR (₹) as initial default
export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, fallbackRateFromUSD: 84.2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, fallbackRateFromUSD: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, fallbackRateFromUSD: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, fallbackRateFromUSD: 0.79 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, fallbackRateFromUSD: 154.0 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, fallbackRateFromUSD: 1.53 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, fallbackRateFromUSD: 1.39 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, fallbackRateFromUSD: 0.88 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, fallbackRateFromUSD: 7.22 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2, fallbackRateFromUSD: 10.85 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, fallbackRateFromUSD: 1.69 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimals: 2, fallbackRateFromUSD: 20.1 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, fallbackRateFromUSD: 1.34 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, fallbackRateFromUSD: 7.78 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, fallbackRateFromUSD: 11.05 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimals: 0, fallbackRateFromUSD: 1395.0 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimals: 2, fallbackRateFromUSD: 34.4 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2, fallbackRateFromUSD: 18.1 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, fallbackRateFromUSD: 5.75 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2, fallbackRateFromUSD: 6.89 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimals: 2, fallbackRateFromUSD: 4.05 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2, fallbackRateFromUSD: 34.6 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, fallbackRateFromUSD: 15850.0 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimals: 0, fallbackRateFromUSD: 382.0 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, fallbackRateFromUSD: 23.6 },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', decimals: 2, fallbackRateFromUSD: 3.72 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2, fallbackRateFromUSD: 58.6 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2, fallbackRateFromUSD: 3.67 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2, fallbackRateFromUSD: 3.75 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, fallbackRateFromUSD: 4.46 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimals: 2, fallbackRateFromUSD: 4.61 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, fallbackRateFromUSD: 1.81 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimals: 0, fallbackRateFromUSD: 138.0 },
];

export const CURRENCY_MAP: Record<string, CurrencyMeta> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c])
);

export function getCurrencyMeta(code: string): CurrencyMeta {
  return CURRENCY_MAP[code.toUpperCase()] ?? CURRENCY_MAP.INR;
}

/**
 * Minor-unit integer conversion avoids IEEE-754 floating-point drift.
 */
export function toMinorUnits(amount: number, currencyCode: string): number {
  const { decimals } = getCurrencyMeta(currencyCode);
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor);
}

export function fromMinorUnits(minor: number, currencyCode: string): number {
  const { decimals } = getCurrencyMeta(currencyCode);
  const factor = Math.pow(10, decimals);
  return minor / factor;
}

export type ExchangeRateTable = Record<string, number>; // Base USD -> rate

export function getDefaultRateTable(): ExchangeRateTable {
  const table: ExchangeRateTable = {};
  for (const c of SUPPORTED_CURRENCIES) {
    table[c.code] = c.fallbackRateFromUSD;
  }
  return table;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesFromUSD: ExchangeRateTable = getDefaultRateTable()
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;

  const fromRate = ratesFromUSD[from] ?? getCurrencyMeta(from).fallbackRateFromUSD;
  const toRate = ratesFromUSD[to] ?? getCurrencyMeta(to).fallbackRateFromUSD;

  if (!fromRate || !toRate) return amount;

  const fromMinor = toMinorUnits(amount, from);
  const fromDecimal = fromMinorUnits(fromMinor, from);
  const usdValue = fromDecimal / fromRate;
  const targetDecimal = usdValue * toRate;
  const targetMinor = toMinorUnits(targetDecimal, to);
  return fromMinorUnits(targetMinor, to);
}

export function formatMoney(
  amount: number,
  currencyCode = 'INR',
  options?: { compact?: boolean; showSign?: boolean }
): string {
  const meta = getCurrencyMeta(currencyCode);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : options?.showSign && amount > 0 ? '+' : '';

  if (options?.compact && abs >= 1000) {
    try {
      const formatted = new Intl.NumberFormat(meta.code === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency: meta.code,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(abs);
      return `${sign}${formatted}`;
    } catch {
      return `${sign}${meta.symbol}${abs.toFixed(meta.decimals)}`;
    }
  }

  try {
    const formatted = new Intl.NumberFormat(meta.code === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(abs);
    return `${sign}${formatted}`;
  } catch {
    return `${sign}${meta.symbol}${abs.toFixed(meta.decimals)}`;
  }
}

const RATE_CACHE_KEY = 'pancakepilot_fx_rates_v1';

export interface CachedRates {
  rates: ExchangeRateTable;
  fetchedAt: string;
  source: 'frankfurter' | 'fallback';
}

export function getCachedExchangeRates(): CachedRates {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(RATE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedRates;
        if (parsed && parsed.rates && parsed.rates.INR) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    rates: getDefaultRateTable(),
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
  };
}

export async function refreshExchangeRates(): Promise<CachedRates> {
  const cached = getCachedExchangeRates();
  const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
  if (cached.source === 'frankfurter' && ageMs < 12 * 60 * 60 * 1000) {
    return cached;
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD', {
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) throw new Error('FX fetch failed');
    const data = (await res.json()) as { rates?: Record<string, number> };
    const merged: ExchangeRateTable = {
      ...getDefaultRateTable(),
      ...(data.rates ?? {}),
      USD: 1.0,
    };
    const next: CachedRates = {
      rates: merged,
      fetchedAt: new Date().toISOString(),
      source: 'frankfurter',
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(next));
    }
    return next;
  } catch {
    return cached;
  }
}
