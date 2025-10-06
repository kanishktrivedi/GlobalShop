// LocalStorage-cached FX conversion utilities

const KEY_PREFIX = "fx:rates:"; // e.g., fx:rates:USD
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(baseCurrency) {
  return `${KEY_PREFIX}${baseCurrency}`;
}

function readCache(baseCurrency) {
  try {
    const raw = localStorage.getItem(getCacheKey(baseCurrency));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - parsed.timestamp > TTL_MS) return null;
    return parsed.rates;
  } catch {
    return null;
  }
}

function writeCache(baseCurrency, rates) {
  const payload = { rates, timestamp: Date.now() };
  try {
    localStorage.setItem(getCacheKey(baseCurrency), JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

async function fetchRates(baseCurrency) {
  const cached = readCache(baseCurrency);
  if (cached) return cached;
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(baseCurrency)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("FX fetch failed");
  const json = await res.json();
  const rates = json && json.rates ? json.rates : {};
  rates[baseCurrency] = 1;
  writeCache(baseCurrency, rates);
  return rates;
}

export async function convertPrice(baseCurrency, targetCurrency, price) {
  if (baseCurrency === targetCurrency) return price;
  const rates = await fetchRates(baseCurrency);
  const rate = rates[targetCurrency];
  if (!rate) throw new Error(`Missing FX rate ${baseCurrency}->${targetCurrency}`);
  return price * rate;
}

export async function ensureRates(baseCurrency) {
  await fetchRates(baseCurrency);
}


