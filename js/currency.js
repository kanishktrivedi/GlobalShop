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
  
  // Try multiple endpoints for better reliability
  const endpoints = [
    `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`,
    `https://api.fxratesapi.com/latest?base=${encodeURIComponent(base)}`,
    `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`
  ];
  
  for (const url of endpoints) {
    try {
      console.log(`🔄 Fetching rates from: ${url}`);
      const res = await fetch(url, { 
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (!res.ok) {
        console.warn(`❌ Failed to fetch from ${url}: ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      const rates = data.rates || {};
      rates[base] = 1;
      
      console.log(`✅ Successfully fetched rates for ${base}`);
      ratesCache.set(cacheKey, { rates, timestamp: Date.now() });
      return rates;
      
    } catch (error) {
      console.warn(`❌ Error fetching from ${url}:`, error.message);
      continue;
    }
  }
  
  throw new Error("All currency API endpoints failed");
}

export async function convertAmount(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;
  
  try {
    const rates = await fetchRates(fromCurrency);
    const rate = rates[toCurrency];
    if (!rate) {
      console.warn(`Missing rate ${fromCurrency}->${toCurrency}, using fallback`);
      return getFallbackRate(amount, fromCurrency, toCurrency);
    }
    return amount * rate;
  } catch (error) {
    console.warn(`Currency conversion failed: ${error.message}, using fallback`);
    return getFallbackRate(amount, fromCurrency, toCurrency);
  }
}

// Fallback rates for when API is unavailable
function getFallbackRate(amount, fromCurrency, toCurrency) {
  const fallbackRates = {
    'USD': {
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5
    },
    'EUR': {
      'USD': 1.18,
      'GBP': 0.86,
      'JPY': 129,
      'CAD': 1.47,
      'AUD': 1.59,
      'CHF': 1.08,
      'CNY': 7.59,
      'INR': 87.7
    },
    'GBP': {
      'USD': 1.37,
      'EUR': 1.16,
      'JPY': 150,
      'CAD': 1.71,
      'AUD': 1.85,
      'CHF': 1.26,
      'CNY': 8.84,
      'INR': 102.1
    }
  };

  const fromRates = fallbackRates[fromCurrency];
  if (fromRates && fromRates[toCurrency]) {
    console.log(`Using fallback rate: ${fromCurrency} -> ${toCurrency} = ${fromRates[toCurrency]}`);
    return amount * fromRates[toCurrency];
  }

  // If no fallback rate available, return original amount
  console.warn(`No fallback rate available for ${fromCurrency} -> ${toCurrency}, returning original amount`);
  return amount;
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

// Preload common currency rates
export async function preloadRates() {
  const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
  
  console.log('🔄 Preloading currency rates...');
  
  for (const currency of commonCurrencies) {
    try {
      await fetchRates(currency);
      console.log(`✅ Preloaded rates for ${currency}`);
    } catch (error) {
      console.warn(`⚠️  Failed to preload rates for ${currency}:`, error.message);
    }
  }
  
  console.log('📦 Currency rates preloading completed');
}

export { DEFAULT_BASE };


