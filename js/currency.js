// Currency conversion module with LRU cache

const DEFAULT_BASE = "USD";

// LRU cache with O(1) get/set using Map re-insertion
// Time complexity: get -> O(1), set -> O(1) amortized, delete LRU -> O(1)
class LRUCache {
  constructor(limit = 50) {
    this.limit = limit;
    this.map = new Map(); // key -> { value, node }
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    // refresh
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit) {
      const lruKey = this.map.keys().next().value;
      this.map.delete(lruKey);
    }
  }
}

const ratesCache = new LRUCache(100);

export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

async function fetchRates(base) {
  const cacheKey = `rates:${base}`;
  const cached = ratesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.rates;
  }
  // Public ECB proxy or fallback demo endpoint
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch rates");
  const data = await res.json();
  const rates = data.rates || {};
  rates[base] = 1;
  ratesCache.set(cacheKey, { rates, timestamp: Date.now() });
  return rates;
}

export async function convertAmount(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  const rates = await fetchRates(fromCurrency);
  const rate = rates[toCurrency];
  if (!rate) throw new Error(`Missing rate ${fromCurrency}->${toCurrency}`);
  return amount * rate;
}

export async function convertList(lineItems, toCurrency, taxRate = 0) {
  // lineItems: [{ priceBase, currencyBase, qty }]
  const subtotals = await Promise.all(
    lineItems.map(async (li) => {
      const unit = await convertAmount(li.priceBase, li.currencyBase, toCurrency);
      return { ...li, unitConverted: unit, subtotalConverted: unit * li.qty };
    })
  );
  const subtotal = subtotals.reduce((acc, it) => acc + it.subtotalConverted, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  return { items: subtotals, subtotal, tax, total };
}

export { DEFAULT_BASE };


