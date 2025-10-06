// currencies.js - live FX with LRU cache + Intl formatting

const TEN_MINUTES_MS = 10 * 60 * 1000;

class LRUCache {
  constructor(limit = 100) {
    this.limit = limit;
    this.map = new Map(); // key -> { value }
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}

const ratesCache = new LRUCache(100);

const MOCK_RATES = {
  USD: { USD: 1, EUR: 0.92, GBP: 0.78, JPY: 151.2, INR: 83.2, AUD: 1.49, CAD: 1.35 },
  EUR: { EUR: 1, USD: 1.09, GBP: 0.85, JPY: 164.1, INR: 90.2, AUD: 1.62, CAD: 1.47 },
};

async function fetchLiveRates(base) {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("FX fetch failed");
  const data = await res.json();
  const rates = data && data.rates ? data.rates : {};
  rates[base] = 1;
  return rates;
}

function getMockRates(base) {
  const baseRates = MOCK_RATES[base];
  if (baseRates) return baseRates;
  // derive mock if unknown base by inverting USD where possible
  if (MOCK_RATES.USD && base !== "USD") {
    const fromUsd = MOCK_RATES.USD;
    const inv = {};
    Object.entries(fromUsd).forEach(([ccy, r]) => {
      if (r && typeof r === "number") inv[ccy] = 1 / r;
    });
    inv[base] = 1;
    return inv;
  }
  return { [base]: 1 };
}

export async function getRates(base) {
  const key = `rates:${base}`;
  const cached = ratesCache.get(key);
  if (cached && Date.now() - cached.timestamp < TEN_MINUTES_MS) {
    return cached.rates;
  }
  let rates;
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("offline");
    }
    rates = await fetchLiveRates(base);
  } catch {
    rates = getMockRates(base);
  }
  ratesCache.set(key, { rates, timestamp: Date.now() });
  return rates;
}

export async function convert(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const rates = await getRates(fromCurrency);
  const rate = rates[toCurrency];
  if (!rate) throw new Error(`Missing rate ${fromCurrency}->${toCurrency}`);
  return amount * rate;
}

export function formatPrice(amount, currency, locale) {
  return new Intl.NumberFormat(locale || undefined, { style: "currency", currency }).format(amount);
}


