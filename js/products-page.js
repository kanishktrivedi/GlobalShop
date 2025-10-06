/**
 * Products Page JavaScript
 *
 * Handles the products catalog page with search, filtering, and cart functionality.
 * Integrates with the main application modules for consistent behavior.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser } from "./firebase.js";
import { Cart } from "./cart.js";
import { products } from "./products.js";
import { convertAmount, formatCurrency, DEFAULT_BASE } from "./currency.js";
import { Trie, mergeSort } from "./dsa.js";

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  cart: new Cart(),
  currency: "USD",
  currentProducts: [...products],
  searchQuery: "",
  sortBy: "price-asc"
};

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const els = {
  // Navigation and Layout
  currencySelect: document.getElementById("currencySelect"),
  productGrid: document.getElementById("productGrid"),
  searchInput: document.getElementById("searchInput"),
  searchSuggest: document.getElementById("searchSuggest"),
  sortSelect: document.getElementById("sortSelect"),
  productsLoading: document.getElementById("productsLoading"),
  productsEmpty: document.getElementById("productsEmpty"),

  // Authentication
  authBtn: document.getElementById("authBtn"),
  userMenu: document.getElementById("userMenu"),
  avatarBtn: document.getElementById("avatarBtn"),
  avatarImg: document.getElementById("avatarImg"),
  avatarFallback: document.getElementById("avatarFallback"),
  userDropdown: document.getElementById("userDropdown"),
  logoutBtn: document.getElementById("logoutBtn"),
  navUserEmail: document.getElementById("navUserEmail"),

  // Cart
  cartButton: document.getElementById("cartButton"),
  cartCount: document.getElementById("cartCount"),

  // Mobile Navigation
  mobileNav: document.getElementById("mobileNav"),
  navToggle: document.getElementById("navToggle"),

  // AI Assistant
  aiAssistant: document.getElementById("aiAssistant"),
  aiAssistantBtn: document.getElementById("aiAssistantBtn"),
  aiChatBubble: document.getElementById("aiChatBubble"),
  aiMessage: document.getElementById("aiMessage"),
  closeAiChat: document.getElementById("closeAiChat"),
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Loads and displays products with current sorting and search filters
 */
function loadProducts() {
  els.productsLoading.classList.remove('hidden');
  els.productsEmpty.classList.add('hidden');
  els.productGrid.innerHTML = '';

  // Apply search filter
  let filteredProducts = state.currentProducts;
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
  }

  // Apply sorting
  const sortedProducts = sortProducts(filteredProducts, state.sortBy);

  // Hide loading state
  els.productsLoading.classList.add('hidden');

  // Show empty state if no products
  if (sortedProducts.length === 0) {
    els.productsEmpty.classList.remove('hidden');
    return;
  }

  // Render products
  els.productGrid.innerHTML = sortedProducts
    .map(product => renderProductCard(product))
    .join("");

  // Attach event handlers
  attachProductHandlers();
}

/**
 * Renders a single product card with current currency pricing
 */
function renderProductCard(product) {
  return `
    <div class="product-card animate-fade-in-up" data-id="${product.id}">
      <div class="product-image-wrap">
        <img src="${product.image}" alt="${product.name}" class="product-image" />
      </div>
      <div class="product-body">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-row">
          <span data-price data-id="${product.id}" class="product-price">${formatCurrency(product.priceBase, DEFAULT_BASE)}</span>
          <button data-add data-id="${product.id}" class="btn-cta" data-tooltip="Add to cart">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Sorts products based on the selected criteria
 */
function sortProducts(products, sortBy) {
  const productsCopy = [...products];

  switch (sortBy) {
    case 'price-asc':
      return mergeSort(productsCopy, (a, b) => {
        if (a.priceBase < b.priceBase) return -1;
        if (a.priceBase > b.priceBase) return 1;
        return 0;
      });
    case 'price-desc':
      return mergeSort(productsCopy, (a, b) => {
        if (a.priceBase > b.priceBase) return -1;
        if (a.priceBase < b.priceBase) return 1;
        return 0;
      });
    case 'name-asc':
      return mergeSort(productsCopy, (a, b) => {
        return a.name.localeCompare(b.name);
      });
    case 'name-desc':
      return mergeSort(productsCopy, (a, b) => {
        return b.name.localeCompare(a.name);
      });
    default:
      return productsCopy;
  }
}

/**
 * Attaches click handlers to product cards
 */
function attachProductHandlers() {
  const addButtons = els.productGrid.querySelectorAll("[data-add]");

  addButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const product = products.find((p) => p.id === id);

      if (product) {
        state.cart.setItem(product);
        updateCartUI();

        // Show success feedback
        showAlert(`Added ${product.name} to cart!`, 'success', 2000);

        // Optional: scroll to cart or show cart preview
        setTimeout(() => {
          if (window.innerWidth >= 768) { // Desktop only
            // Could show a cart preview here
          }
        }, 500);
      }
    });
  });
}

/**
 * Updates currency display prices for all products
 */
async function updatePricesForCurrency() {
  const priceElements = els.productGrid.querySelectorAll("[data-price]");

  for (const priceEl of priceElements) {
    const id = priceEl.getAttribute("data-id");
    const product = products.find((p) => p.id === id);

    if (product) {
      const converted = await convertAmount(product.priceBase, product.currencyBase, state.currency);
      priceEl.textContent = formatCurrency(converted, state.currency);
    }
  }
}

/**
 * Updates cart UI elements
 */
function updateCartUI() {
  const items = state.cart.toArray();
  const itemCount = items.reduce((acc, item) => acc + item.qty, 0);

  els.cartCount.textContent = itemCount;
}

/**
 * Sets up search functionality with autocomplete
 */
function setupSearch() {
  // Build search trie
  const trie = new Trie();
  products.forEach(product => {
    trie.insert(product.name.toLowerCase(), product.id);
  });

  els.searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    state.searchQuery = query;

    // Show suggestions
    if (query.length > 0) {
      const suggestions = trie.suggest(query, 5);

      if (suggestions.length > 0) {
        els.searchSuggest.innerHTML = suggestions
          .map(suggestion => `<button data-suggestion="${suggestion.word}" class="block w-full px-3 py-2 text-left hover:bg-neutral-50 text-sm">${suggestion.word}</button>`)
          .join("");
        els.searchSuggest.classList.remove("hidden");

        // Attach suggestion handlers
        els.searchSuggest.querySelectorAll('[data-suggestion]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const word = e.currentTarget.getAttribute('data-suggestion');
            els.searchInput.value = word;
            state.searchQuery = word;
            els.searchSuggest.classList.add('hidden');
            loadProducts();
          });
        });
      } else {
        els.searchSuggest.classList.add("hidden");
      }
    } else {
      els.searchSuggest.classList.add("hidden");
      state.searchQuery = "";
      loadProducts();
    }

    // Filter products as user types
    if (query.length >= 2) {
      loadProducts();
    } else if (query.length === 0) {
      loadProducts();
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!els.searchInput.contains(e.target) && !els.searchSuggest.contains(e.target)) {
      els.searchSuggest.classList.add("hidden");
    }
  });
}

/**
 * Sets up sorting functionality
 */
function setupSorting() {
  els.sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    loadProducts();
  });
}

/**
 * Sets up authentication UI
 */
function setupAuthUI() {
  observeAuthState((user) => {
    if (user) {
      els.authBtn.classList.add("hidden");
      els.userMenu.classList.remove("hidden");
      els.navUserEmail.textContent = user.email || "User";

      if (user.photoURL) {
        els.avatarImg.src = user.photoURL;
        els.avatarImg.classList.remove("hidden");
        els.avatarFallback.classList.add("hidden");
      } else {
        const letter = (user.email || "U").charAt(0).toUpperCase();
        els.avatarFallback.textContent = letter;
        els.avatarImg.classList.add("hidden");
        els.avatarFallback.classList.remove("hidden");
      }
    } else {
      els.authBtn.classList.remove("hidden");
      els.userMenu.classList.add("hidden");
    }
  });

  // Sign in button
  els.authBtn.addEventListener("click", () => {
    signInWithGooglePopup();
  });

  // Dropdown toggle
  els.avatarBtn.addEventListener("click", () => {
    els.userDropdown.classList.toggle("hidden");
  });

  // Logout
  els.logoutBtn.addEventListener("click", async () => {
    await signOutUser();
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!els.userMenu.contains(e.target)) {
      els.userDropdown.classList.add("hidden");
    }
  });
}

/**
 * Sets up mobile navigation
 */
function setupMobileNav() {
  els.navToggle?.addEventListener('click', () => {
    els.mobileNav.classList.toggle('hidden');
  });
}

/**
 * Sets up currency selection
 */
function setupCurrencySelection() {
  // Load saved currency
  try {
    const saved = localStorage.getItem('currency');
    if (saved) {
      state.currency = saved;
      els.currencySelect.value = saved;
    }
  } catch {}

  els.currencySelect.addEventListener("change", async (e) => {
    state.currency = e.target.value;

    try {
      localStorage.setItem('currency', state.currency);
    } catch {}

    await updatePricesForCurrency();
  });
}

/**
 * Sets up AI assistant
 */
function setupAiAssistant() {
  if (!els.aiAssistantBtn || !els.aiChatBubble || !els.closeAiChat) return;

  const insights = [
    "💹 EUR is up 0.8% against USD today - great time to buy European imports!",
    "📈 JPY has strengthened 1.2% this week - Japanese electronics are more affordable!",
    "🔥 GBP dropped 0.5% overnight - now's the perfect moment for UK shopping!",
    "⚡ INR gained 0.3% today - Indian goods are slightly cheaper for international buyers!",
    "🚀 AUD is stable at current levels - Australian products maintaining steady pricing!"
  ];

  function showAiChat() {
    els.aiChatBubble.classList.remove('hidden');
    els.aiMessage.textContent = insights[Math.floor(Math.random() * insights.length)];

    setTimeout(() => {
      if (!els.aiChatBubble.classList.contains('hidden')) {
        hideAiChat();
      }
    }, 8000);
  }

  function hideAiChat() {
    els.aiChatBubble.classList.add('hidden');
  }

  els.aiAssistantBtn.addEventListener('click', showAiChat);
  els.closeAiChat.addEventListener('click', hideAiChat);

  // Auto-show after 10 seconds
  setTimeout(() => {
    if (els.aiChatBubble.classList.contains('hidden')) {
      showAiChat();
    }
  }, 10000);
}

/**
 * Shows alert messages
 */
function showAlert(message, type = 'success', timeoutMs = 3000) {
  const alertsContainer = document.getElementById('alerts') || (() => {
    const div = document.createElement('div');
    div.id = 'alerts';
    div.className = 'pointer-events-none fixed inset-x-0 top-2 z-[70] mx-auto flex max-w-lg flex-col gap-2 px-4';
    document.body.appendChild(div);
    return div;
  })();

  const wrap = document.createElement('div');
  wrap.className = 'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md';
  if (type === 'error') {
    wrap.className += ' border-rose-200 bg-rose-50 text-rose-800';
  } else {
    wrap.className += ' border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  wrap.style.animation = 'alert-in 160ms ease both';
  wrap.textContent = message;
  alertsContainer.appendChild(wrap);

  const hide = () => {
    wrap.style.animation = 'alert-out 200ms ease forwards';
    wrap.addEventListener('animationend', () => wrap.remove(), { once: true });
  };

  if (timeoutMs > 0) setTimeout(hide, timeoutMs);
  wrap.addEventListener('click', hide);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the products page
 */
async function init() {
  // Setup all functionality
  setupAuthUI();
  setupMobileNav();
  setupCurrencySelection();
  setupSearch();
  setupSorting();
  setupAiAssistant();

  // Load initial products
  await loadProducts();
  await updatePricesForCurrency();

  // Update cart UI
  updateCartUI();

  // Setup enhanced cursor if elements exist
  if (document.getElementById('cursorDot') && document.getElementById('cursorOutline')) {
    document.body.style.cursor = 'none';

    document.addEventListener('mousemove', (e) => {
      const cursorDot = document.getElementById('cursorDot');
      const cursorOutline = document.getElementById('cursorOutline');

      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
      cursorOutline.style.left = `${e.clientX}px`;
      cursorOutline.style.top = `${e.clientY}px`;
    });

    // Add hover effects
    const interactiveElements = document.querySelectorAll('button, a, input, select, .product-card');
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-hover');
      });
      element.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover');
      });
    });
  }
}

// Start the application
init();
