/**
 * LRU Cache implementation using Map + Doubly Linked List
 * Time Complexity: O(1) average for get/put operations
 */

// Node class for doubly linked list
class ListNode {
  constructor(key, value) {
    this.key = key;        // Currency pair (e.g., 'USD_EUR')
    this.value = value;    // Exchange rate
    this.prev = null;      // Previous node in list
    this.next = null;      // Next node in list
  }
}

class LRUCache {
  /**
   * @param {number} capacity - Maximum number of items to store in cache
   * Time: O(1)
   */
  constructor(capacity = 10) {
    this.capacity = capacity;
    this.cache = new Map();        // Map for O(1) key lookups
    this.head = new ListNode(0, 0); // Dummy head node
    this.tail = new ListNode(0, 0); // Dummy tail node
    this.head.next = this.tail;     // Connect head to tail
    this.tail.prev = this.head;     // Connect tail to head
  }

  /**
   * Get value by key and move node to front (most recently used)
   * Time: O(1) average - Map lookup + list operations are O(1)
   */
  get(key) {
    if (!this.cache.has(key)) {
      console.log(`🔍 Cache MISS for key: ${key}`);
      return null;
    }

    const node = this.cache.get(key);
    this._moveToHead(node);  // Move to front (most recently used)

    console.log(`✅ Cache HIT for key: ${key}, value: ${node.value}`);
    return node.value;
  }

  /**
   * Add or update value in cache
   * Time: O(1) average - Map operations + list operations are O(1)
   */
  put(key, value) {
    if (this.cache.has(key)) {
      // Update existing node
      const node = this.cache.get(key);
      node.value = value;
      this._moveToHead(node);
      console.log(`🔄 Updated cache: ${key} = ${value}`);
    } else {
      // Check if cache is full before adding new node
      if (this.cache.size >= this.capacity) {
        this._evictLRU();  // Remove least recently used
      }

      // Add new node
      const newNode = new ListNode(key, value);
      this.cache.set(key, newNode);
      this._addToHead(newNode);
      console.log(`➕ Added to cache: ${key} = ${value}`);
    }
  }

  /**
   * Move a node to the head (most recently used position)
   * Time: O(1) - simple pointer updates
   */
  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }

  /**
   * Add a node to the head position (after dummy head)
   * Time: O(1) - simple pointer updates
   */
  _addToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  /**
   * Remove a node from the linked list
   * Time: O(1) - simple pointer updates
   */
  _removeNode(node) {
    const prev = node.prev;
    const next = node.next;
    prev.next = next;
    next.prev = prev;
  }

  /**
   * Evict the least recently used item (node before dummy tail)
   * Time: O(1) - remove from Map and linked list
   */
  _evictLRU() {
    const lruNode = this.tail.prev;
    console.log(`🗑️ EVICTING LRU item: ${lruNode.key} = ${lruNode.value}`);
    this.cache.delete(lruNode.key);
    this._removeNode(lruNode);
  }

  /**
   * Get current cache size
   * Time: O(1) - Map.size is O(1)
   */
  size() {
    return this.cache.size;
  }

  /**
   * Check if cache is empty
   * Time: O(1) - Map.size is O(1)
   */
  isEmpty() {
    return this.cache.size === 0;
  }

  /**
   * Clear all cache entries
   * Time: O(1) amortized - Map.clear + reset list pointers
   */
  clear() {
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Debug method to print current cache state
   * Time: O(n) where n is cache size
   */
  debug() {
    console.log('=== LRU Cache Debug ===');
    console.log(`Capacity: ${this.capacity}, Size: ${this.cache.size}`);
    console.log('Order (most recent -> least recent):');

    let current = this.head.next;
    const order = [];
    while (current !== this.tail) {
      order.push(`${current.key}: ${current.value}`);
      current = current.next;
    }
    console.log(order.join(' -> '));
    console.log('=======================');
  }
}

/**
 * Currency Rate Service with LRU Cache Integration
 */
class CurrencyRateService {
  constructor(cacheCapacity = 50) {
    this.cache = new LRUCache(cacheCapacity);
    this.API_BASE = 'https://api.exchangerate-api.com/v4/latest/';
    this.CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    this.rateCache = new Map(); // For rate timestamps
  }

  /**
   * Get exchange rate with caching
   * @param {string} from - Source currency (e.g., 'USD')
   * @param {string} to - Target currency (e.g., 'EUR')
   * @returns {Promise<number|null>} Exchange rate or null if failed
   * Time: O(1) average for cache hits, O(1) amortized for API calls
   */
  async getExchangeRate(from, to) {
    const cacheKey = `${from}_${to}`;
    const rateKey = `rate_${from}_${to}`;

    // Check if we have a fresh cached rate
    const cachedRate = this.cache.get(cacheKey);
    const rateTimestamp = this.rateCache.get(rateKey);

    if (cachedRate && rateTimestamp && (Date.now() - rateTimestamp) < this.CACHE_EXPIRY) {
      console.log(`💰 Using cached rate: ${from} -> ${to} = ${cachedRate}`);
      return cachedRate;
    }

    // Fetch fresh rate from API
    try {
      console.log(`🌐 Fetching fresh rate: ${from} -> ${to}`);
      const response = await fetch(`${this.API_BASE}${from}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.rates || !data.rates[to]) {
        throw new Error(`Rate not found: ${from} -> ${to}`);
      }

      const rate = data.rates[to];

      // Cache the rate and timestamp
      this.cache.put(cacheKey, rate);
      this.rateCache.set(rateKey, Date.now());

      console.log(`💾 Cached new rate: ${from} -> ${to} = ${rate}`);
      return rate;

    } catch (error) {
      console.error(`❌ Failed to fetch rate ${from} -> ${to}:`, error.message);
      return null;
    }
  }

  /**
   * Convert amount between currencies
   * @param {number} amount - Amount to convert
   * @param {string} from - Source currency
   * @param {string} to - Target currency
   * @returns {Promise<number|null>} Converted amount or null if failed
   * Time: O(1) average due to caching
   */
  async convert(amount, from, to) {
    if (from === to) return amount;

    const rate = await this.getExchangeRate(from, to);
    if (rate === null) return null;

    return amount * rate;
  }

  /**
   * Get cache statistics
   * Time: O(1)
   */
  getCacheStats() {
    return {
      capacity: this.cache.capacity,
      size: this.cache.size(),
      hitRatio: this.cache.hitCount / (this.cache.hitCount + this.cache.missCount) || 0
    };
  }
}

// Export classes for use in other modules
export { LRUCache, CurrencyRateService };

// Example usage and testing
async function demonstrateLRUCache() {
  console.log('🚀 Starting LRU Cache Currency Rate Demo...\n');

  // Create cache with small capacity to show evictions
  const currencyService = new CurrencyRateService(3);

  // Test currency conversions
  const testConversions = [
    { amount: 100, from: 'USD', to: 'EUR' },
    { amount: 50, from: 'USD', to: 'GBP' },
    { amount: 200, from: 'EUR', to: 'JPY' },
    { amount: 75, from: 'USD', to: 'EUR' }, // Should be cache hit
    { amount: 150, from: 'GBP', to: 'USD' }, // New conversion
    { amount: 300, from: 'USD', to: 'GBP' }, // Should be cache hit
    { amount: 100, from: 'CAD', to: 'AUD' }, // This should cause eviction
  ];

  for (const conversion of testConversions) {
    console.log(`\n--- Converting ${conversion.amount} ${conversion.from} to ${conversion.to} ---`);

    const result = await currencyService.convert(conversion.amount, conversion.from, conversion.to);

    if (result !== null) {
      console.log(`Result: ${conversion.amount} ${conversion.from} = ${result.toFixed(2)} ${conversion.to}`);
    }

    // Show cache state after each operation
    currencyService.cache.debug();
  }

  console.log('\n✨ Demo completed!');
  console.log('Cache stats:', currencyService.getCacheStats());
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateLRUCache().catch(console.error);
}
