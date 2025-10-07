/**
 * Products Page JavaScript
 *
 * Handles the products catalog page with search, filtering, and cart functionality.
 * Integrates with the main application modules for consistent behavior.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser, getProducts } from "./firebase.js";
import { Cart } from "./cart.js";
import { products as fallbackProducts } from "./products.js";
import { convertAmount, formatCurrency, DEFAULT_BASE, preloadRates } from "./currency.js";
import { Trie, mergeSort } from "./dsa.js";

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  cart: new Cart(),
  currency: "USD",
  currentProducts: [],
  searchQuery: "",
  sortBy: "price-asc",
  isLoading: false
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

  // Sign In Modal
  signInModal: document.getElementById("signInModal"),
  closeSignInModal: document.getElementById("closeSignInModal"),
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  signInLoading: document.getElementById("signInLoading"),

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
 * Fetches products from Firestore with fallback to static products
 */
async function fetchProducts() {
  try {
    state.isLoading = true;
    els.productsLoading.classList.remove('hidden');

    console.log('🔄 Attempting to fetch products from Firestore...');
    const products = await getProducts();

    if (products && products.length > 0) {
      // Transform Firestore products to match expected format
      state.currentProducts = products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceBase: product.basePrice,
        currencyBase: product.baseCurrency,
        priceOverrides: product.priceOverrides || {},
        image: product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=1200&auto=format&fit=crop',
        active: product.active
      }));

      console.log(`📦 Loaded ${state.currentProducts.length} products from Firestore`);
    } else {
      throw new Error('No products found in Firestore');
    }

  } catch (error) {
    console.error('❌ Error fetching products from Firestore:', error);
    console.log('🔄 Falling back to static products...');

    // Fallback to static products
    state.currentProducts = fallbackProducts.map(product => ({
      ...product,
      priceOverrides: {} // Static products don't have price overrides
    }));

    console.log(`📦 Loaded ${state.currentProducts.length} fallback products`);
    showAlert('Using offline product catalog. Some features may be limited.', 'info', 4000);

  } finally {
    state.isLoading = false;
  }
}

/**
 * Loads and displays products with current sorting and search filters
 */
async function loadProducts() {
  // Show loading state
  els.productsLoading.classList.remove('hidden');
  els.productsEmpty.classList.add('hidden');
  els.productGrid.innerHTML = '';

  // Fetch products if not already loaded
  if (state.currentProducts.length === 0 && !state.isLoading) {
    await fetchProducts();
  }

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

  // Update prices to current currency after rendering
  if (state.currency !== 'USD') {
    setTimeout(() => updatePricesForCurrency(), 100);
  }
}

/**
 * Renders a single product card with current currency pricing
 */
function renderProductCard(product) {
  // Use price override if available for current currency, otherwise show base price
  // (conversion will happen later in updatePricesForCurrency)
  const hasOverride = product.priceOverrides && product.priceOverrides[state.currency];
  const displayPrice = hasOverride ? product.priceOverrides[state.currency] : product.priceBase;
  const displayCurrency = hasOverride ? state.currency : product.currencyBase;

  return `
    <div class="product-card animate-fade-in-up" data-id="${product.id}">
      <div class="product-image-wrap">
        <img src="${product.image}" alt="${product.name}" class="product-image" />
      </div>
      <div class="product-body">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-row">
          <span data-price data-id="${product.id}" class="product-price">${formatCurrency(displayPrice, displayCurrency)}</span>
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
      const product = state.currentProducts.find((p) => p.id === id);

      if (product) {
        // Add visual feedback to button
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = `
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          Added!
        `;
        button.classList.add('bg-success-600', 'hover:bg-success-700');
        button.classList.remove('bg-neutral-900', 'hover:bg-neutral-800');
        
        // Add to cart
        state.cart.setItem(product);
        
        // Save to localStorage
        saveCartToStorage();
        
        // Update UI
        updateCartUI();

        // Show success feedback
        showAlert(`${product.name} added to cart!`, 'success', 3000);

        // Reset button after delay
        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('bg-success-600', 'hover:bg-success-700');
          button.classList.add('bg-neutral-900', 'hover:bg-neutral-800');
        }, 1500);

        // Add cart bounce animation
        if (els.cartCount) {
          els.cartCount.style.transition = 'transform 0.2s ease';
          els.cartCount.style.transform = 'scale(1.3)';
          setTimeout(() => {
            els.cartCount.style.transform = 'scale(1)';
          }, 200);
        }
      }
    });
  });
}

/**
 * Updates currency display prices for all products
 */
async function updatePricesForCurrency() {
  const priceElements = els.productGrid.querySelectorAll("[data-price]");

  if (priceElements.length === 0) {
    console.log('No price elements found to update');
    return;
  }

  console.log(`🔄 Updating ${priceElements.length} prices to ${state.currency}`);

  // Add loading animation to price elements
  priceElements.forEach(el => {
    el.style.opacity = '0.6';
    el.style.transition = 'opacity 0.2s ease';
  });

  try {
    for (const priceEl of priceElements) {
      const id = priceEl.getAttribute("data-id");
      const product = state.currentProducts.find((p) => p.id === id);

      if (product) {
        try {
          // Check if there's a price override for the current currency
          if (product.priceOverrides && product.priceOverrides[state.currency]) {
            priceEl.textContent = formatCurrency(product.priceOverrides[state.currency], state.currency);
            console.log(`💰 Using price override for ${product.name}: ${product.priceOverrides[state.currency]} ${state.currency}`);
          } else {
            const converted = await convertAmount(product.priceBase, product.currencyBase, state.currency);
            priceEl.textContent = formatCurrency(converted, state.currency);
            console.log(`🔄 Converted ${product.name}: ${product.priceBase} ${product.currencyBase} → ${converted} ${state.currency}`);
          }
        } catch (conversionError) {
          console.warn(`⚠️  Failed to convert price for ${product.name}, keeping original:`, conversionError.message);
          // Keep original price if conversion fails
          priceEl.textContent = formatCurrency(product.priceBase, product.currencyBase);
        }
      }
    }

    console.log(`✅ Successfully updated all prices to ${state.currency}`);

  } catch (error) {
    console.error('❌ Error updating prices:', error);
    // Don't throw error, just log it to prevent initialization failure
  } finally {
    // Remove loading animation
    priceElements.forEach(el => {
      el.style.opacity = '1';
    });
  }
}

/**
 * Loads cart from localStorage
 */
function loadCartFromStorage() {
  try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cartData = JSON.parse(savedCart);
      cartData.forEach(item => {
        state.cart.itemsById.set(item.id, item);
      });
    }
  } catch (error) {
    console.warn('Could not load cart from storage:', error);
  }
}

/**
 * Saves cart to localStorage
 */
function saveCartToStorage() {
  try {
    const cartData = state.cart.toArray();
    localStorage.setItem('cart', JSON.stringify(cartData));
  } catch (error) {
    console.warn('Could not save cart to storage:', error);
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
 * Sets up cart functionality
 */
function setupCart() {
  // Load cart from storage
  loadCartFromStorage();
  
  // Cart button click handler
  els.cartButton?.addEventListener('click', () => {
    // Navigate to cart page
    window.location.href = '/cart.html';
  });
}

/**
 * Sets up search functionality with autocomplete
 */
function setupSearch() {
  // Build search trie - will be rebuilt when products are loaded
  let trie = new Trie();

  const rebuildTrie = () => {
    trie = new Trie();
    state.currentProducts.forEach(product => {
      trie.insert(product.name.toLowerCase(), product.id);
    });
  };

  els.searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    state.searchQuery = query;

    // Rebuild trie if products are loaded but trie is empty
    if (state.currentProducts.length > 0 && trie.root.children.size === 0) {
      rebuildTrie();
    }

    // Show suggestions
    if (query.length > 0 && state.currentProducts.length > 0) {
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

  // Store rebuildTrie function for later use
  window.rebuildSearchTrie = rebuildTrie;

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

  // Sign in button - show modal
  els.authBtn.addEventListener("click", () => {
    showSignInModal();
  });

  // Modal close handlers
  els.closeSignInModal?.addEventListener("click", hideSignInModal);
  els.signInModal?.addEventListener("click", (e) => {
    if (e.target === els.signInModal) {
      hideSignInModal();
    }
  });

  // Google sign in button
  els.googleSignInBtn?.addEventListener("click", async () => {
    try {
      showSignInLoading();
      await signInWithGooglePopup();
      hideSignInModal();
      showAlert('Successfully signed in!', 'success', 3000);
    } catch (error) {
      console.error('Sign in error:', error);
      showAlert('Sign in failed. Please try again.', 'error', 4000);
    } finally {
      hideSignInLoading();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.signInModal?.classList.contains('hidden')) {
      hideSignInModal();
    }
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
  } catch { }

  els.currencySelect.addEventListener("change", async (e) => {
    const newCurrency = e.target.value;
    const oldCurrency = state.currency;

    // Update state
    state.currency = newCurrency;

    try {
      localStorage.setItem('currency', state.currency);
    } catch { }

    // Show loading feedback
    if (els.currencySelect) {
      els.currencySelect.disabled = true;
    }

    try {
      // Update all product prices
      await updatePricesForCurrency();

      // Show success feedback
      showAlert(`Currency changed to ${newCurrency}`, 'success', 2000);

    } catch (error) {
      console.error('Error updating currency:', error);
      showAlert('Failed to update currency. Please try again.', 'error');

      // Revert currency on error
      state.currency = oldCurrency;
      els.currencySelect.value = oldCurrency;
    } finally {
      // Re-enable currency selector
      if (els.currencySelect) {
        els.currencySelect.disabled = false;
      }
    }
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
 * Shows the sign-in modal
 */
function showSignInModal() {
  if (els.signInModal) {
    els.signInModal.classList.remove('hidden');
    els.signInModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    // Add entrance animation
    setTimeout(() => {
      const modalContent = els.signInModal.querySelector('div > div');
      if (modalContent) {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
      }
    }, 10);
  }
}

/**
 * Hides the sign-in modal
 */
function hideSignInModal() {
  if (els.signInModal) {
    const modalContent = els.signInModal.querySelector('div > div');
    if (modalContent) {
      modalContent.style.transform = 'scale(0.95)';
      modalContent.style.opacity = '0';
    }
    
    setTimeout(() => {
      els.signInModal.classList.add('hidden');
      els.signInModal.classList.remove('flex');
      document.body.style.overflow = '';
    }, 150);
  }
}

/**
 * Shows loading state in sign-in modal
 */
function showSignInLoading() {
  if (els.signInLoading) {
    els.signInLoading.classList.remove('hidden');
    els.signInLoading.classList.add('flex');
  }
}

/**
 * Hides loading state in sign-in modal
 */
function hideSignInLoading() {
  if (els.signInLoading) {
    els.signInLoading.classList.add('hidden');
    els.signInLoading.classList.remove('flex');
  }
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
  } else if (type === 'info') {
    wrap.className += ' border-blue-200 bg-blue-50 text-blue-800';
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
  try {
    // Setup all functionality
    setupAuthUI();
    setupMobileNav();
    setupCurrencySelection();
    setupSearch();
    setupSorting();
    setupAiAssistant();
    setupCart();

    // Preload currency rates in background (don't wait for it)
    preloadRates().catch(error => {
      console.warn('⚠️  Currency preloading failed:', error.message);
    });

    // Load initial products from Firestore
    await loadProducts();

    // Rebuild search trie after products are loaded
    if (window.rebuildSearchTrie && state.currentProducts.length > 0) {
      window.rebuildSearchTrie();
    }

    // Update prices for current currency
    try {
      await updatePricesForCurrency();
    } catch (error) {
      console.warn('⚠️  Initial currency conversion failed, will retry in 3 seconds:', error.message);
      
      // Retry after a short delay
      setTimeout(async () => {
        try {
          console.log('🔄 Retrying currency conversion...');
          await updatePricesForCurrency();
          console.log('✅ Currency conversion retry successful');
        } catch (retryError) {
          console.warn('⚠️  Currency conversion retry also failed:', retryError.message);
        }
      }, 3000);
    }

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

    console.log('🚀 Products page initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing products page:', error);
    showAlert('Failed to initialize page. Please refresh.', 'error');
  }
}

// Global cart functions for cross-page integration
window.addToCart = function(product) {
  state.cart.setItem(product);
  saveCartToStorage();
  updateCartUI();
  showAlert(`${product.name} added to cart!`, 'success', 3000);
};

window.getCartCount = function() {
  return state.cart.toArray().reduce((total, item) => total + item.qty, 0);
};

window.getCartItems = function() {
  return state.cart.toArray();
};

window.clearCart = function() {
  state.cart.clear();
  saveCartToStorage();
  updateCartUI();
  showAlert('Cart cleared', 'success', 2000);
};

// Debug function for testing currency changes
window.testCurrency = async (currency) => {
  console.log(`🧪 Testing currency change to ${currency}`);
  state.currency = currency;
  els.currencySelect.value = currency;
  await updatePricesForCurrency();
  console.log(`✅ Currency test completed for ${currency}`);
};

// Start the application
init();
