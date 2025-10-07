/**
 * Cart Page JavaScript
 *
 * Handles the shopping cart page with item management, quantity controls,
 * and checkout functionality. Integrates with main application modules.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser } from "./firebase.js";
import { Cart } from "./cart.js";
import { convertList, formatCurrency } from "./currency.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const TAX_RATE = 0.07; // 7% tax rate

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  cart: new Cart(),
  currency: "USD"
};

// Load cart from localStorage on initialization
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

// Save cart to localStorage
function saveCartToStorage() {
  try {
    const cartData = state.cart.toArray();
    localStorage.setItem('cart', JSON.stringify(cartData));
  } catch (error) {
    console.warn('Could not save cart to storage:', error);
  }
}

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const els = {
  // Cart Management
  cartItems: document.getElementById("cartItems"),
  emptyCart: document.getElementById("emptyCart"),
  cartSummary: document.getElementById("cartSummary"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartTax: document.getElementById("cartTax"),
  cartTotal: document.getElementById("cartTotal"),

  // Navigation and Layout
  currencySelect: document.getElementById("currencySelect"),

  // Authentication
  authBtn: document.getElementById("authBtn"),
  userMenu: document.getElementById("userMenu"),
  avatarBtn: document.getElementById("avatarBtn"),
  avatarImg: document.getElementById("avatarImg"),
  avatarFallback: document.getElementById("avatarFallback"),
  userDropdown: document.getElementById("userDropdown"),
  logoutBtn: document.getElementById("logoutBtn"),
  navUserEmail: document.getElementById("navUserEmail"),

  // Mobile Navigation
  mobileNav: document.getElementById("mobileNav"),
  navToggle: document.getElementById("navToggle"),

  // Actions
  checkoutBtn: document.getElementById("checkoutBtn"),
  continueShoppingBtn: document.getElementById("continueShoppingBtn"),
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Updates the cart UI with current items and totals
 */
function updateCartUI() {
  const items = state.cart.toArray();

  if (items.length === 0) {
    showEmptyCart();
    return;
  }

  showCartItems(items);
  updateCartTotals();
}

/**
 * Shows cart items with quantity controls
 */
function showCartItems(items) {
  els.cartItems.innerHTML = items
    .map(item => {
      const itemTotal = item.priceBase * item.qty;
      return `
        <div class="cart-item rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div class="flex items-start gap-4">
            <!-- Product Image -->
            <div class="h-20 w-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center overflow-hidden">
              ${item.image ? 
                `<img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover" />` :
                `<svg class="h-10 w-10 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>`
              }
            </div>

            <!-- Product Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-neutral-900 mb-1">${item.name}</h3>
                  <p class="text-sm text-neutral-600 mb-2">${item.description || 'Premium quality product'}</p>
                  <div class="flex items-center gap-4 text-sm">
                    <span class="text-neutral-600">Unit Price:</span>
                    <span class="font-medium text-neutral-900">${formatCurrency(item.priceBase, item.currencyBase)}</span>
                  </div>
                </div>

                <!-- Remove Button -->
                <button data-rem="${item.id}" class="rounded-full p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Remove item">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>

              <!-- Quantity Controls and Total -->
              <div class="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-neutral-700">Quantity:</span>
                  <div class="quantity-controls flex items-center gap-1 rounded-lg border border-neutral-300 bg-neutral-50">
                    <button data-dec="${item.id}" class="flex h-10 w-10 items-center justify-center text-lg font-medium text-neutral-700 hover:bg-neutral-100 transition-colors rounded-l-lg">
                      −
                    </button>
                    <span class="quantity-display flex h-10 w-12 items-center justify-center text-sm font-semibold bg-white border-x border-neutral-300">${item.qty}</span>
                    <button data-inc="${item.id}" class="flex h-10 w-10 items-center justify-center text-lg font-medium text-neutral-700 hover:bg-neutral-100 transition-colors rounded-r-lg">
                      +
                    </button>
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-sm text-neutral-600">Item Total</div>
                  <div class="text-lg font-bold text-neutral-900">${formatCurrency(itemTotal, item.currencyBase)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Show cart summary
  els.cartSummary.classList.remove('hidden');
  els.emptyCart.classList.add('hidden');

  // Attach event handlers
  attachCartHandlers();
}

/**
 * Shows empty cart state
 */
function showEmptyCart() {
  els.cartItems.innerHTML = '';
  els.cartSummary.classList.add('hidden');
  els.emptyCart.classList.remove('hidden');
}

/**
 * Attaches event handlers to cart item controls
 */
function attachCartHandlers() {
  // Quantity increase buttons
  els.cartItems.querySelectorAll("[data-inc]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-inc");
      state.cart.increase(id);
      saveCartToStorage();
      updateCartUI();
      showAlert('Quantity updated', 'success', 2000);
    });
  });

  // Quantity decrease buttons
  els.cartItems.querySelectorAll("[data-dec]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-dec");
      const item = state.cart.itemsById.get(id);
      const result = state.cart.decrease(id);
      saveCartToStorage();
      updateCartUI();
      
      if (!result) {
        showAlert(`${item?.name || 'Item'} removed from cart`, 'success', 2000);
      } else {
        showAlert('Quantity updated', 'success', 2000);
      }
    });
  });

  // Remove buttons
  els.cartItems.querySelectorAll("[data-rem]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-rem");
      const item = state.cart.itemsById.get(id);
      state.cart.remove(id);
      saveCartToStorage();
      updateCartUI();
      showAlert(`${item?.name || 'Item'} removed from cart`, 'success', 2000);
    });
  });
}

/**
 * Updates cart totals with current currency conversion
 */
async function updateCartTotals() {
  const items = state.cart.toArray();

  if (items.length === 0) {
    els.cartSubtotal.textContent = '—';
    els.cartTax.textContent = '—';
    els.cartTotal.textContent = '—';
    return;
  }

  try {
    const { subtotal, tax, total } = await convertList(items, state.currency, TAX_RATE);

    els.cartSubtotal.textContent = formatCurrency(subtotal, state.currency);
    els.cartTax.textContent = formatCurrency(tax, state.currency);
    els.cartTotal.textContent = formatCurrency(total, state.currency);
  } catch (error) {
    console.error('Error updating cart totals:', error);
    els.cartSubtotal.textContent = 'Error';
    els.cartTax.textContent = 'Error';
    els.cartTotal.textContent = 'Error';
  }
}

/**
 * Sets up currency selection functionality
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

    await updateCartTotals();
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
 * Sets up action buttons
 */
function setupActionButtons() {
  // Checkout button
  els.checkoutBtn?.addEventListener("click", () => {
    // Navigate to checkout (this would integrate with the main app's checkout flow)
    window.location.href = '/?checkout=true';
  });

  // Continue shopping button
  els.continueShoppingBtn?.addEventListener("click", () => {
    window.location.href = '/products';
  });
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
 * Adds an item to the cart (for external use)
 */
window.addToCart = function(product) {
  state.cart.setItem(product);
  saveCartToStorage();
  updateCartUI();
  showAlert(`${product.name} added to cart!`, 'success', 3000);
};

/**
 * Gets current cart count (for external use)
 */
window.getCartCount = function() {
  return state.cart.toArray().reduce((total, item) => total + item.qty, 0);
};

/**
 * Gets current cart items (for external use)
 */
window.getCartItems = function() {
  return state.cart.toArray();
};

/**
 * Clears the cart (for external use)
 */
window.clearCart = function() {
  state.cart.clear();
  saveCartToStorage();
  updateCartUI();
  showAlert('Cart cleared', 'success', 2000);
};

/**
 * Sets up cart drawer functionality for other pages
 */
function setupCartDrawer() {
  // Create cart drawer if it doesn't exist
  if (!document.getElementById('cartDrawer')) {
    const cartDrawer = document.createElement('div');
    cartDrawer.id = 'cartDrawer';
    cartDrawer.className = 'fixed inset-0 z-50 hidden';
    cartDrawer.innerHTML = `
      <div id="cartOverlay" class="absolute inset-0 bg-black/40 opacity-0 transition-opacity"></div>
      <aside class="absolute right-0 top-0 h-full w-full max-w-md translate-x-full transform bg-white shadow-2xl transition-transform">
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <h2 class="text-lg font-semibold">Shopping Cart</h2>
            <button id="closeCartDrawer" class="rounded-md p-2 text-neutral-600 hover:bg-neutral-100">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <div id="drawerCartItems"></div>
          </div>
          <div class="border-t border-neutral-200 px-6 py-4">
            <div class="mb-4">
              <div class="flex justify-between text-sm">
                <span>Total:</span>
                <span id="drawerCartTotal" class="font-semibold">$0.00</span>
              </div>
            </div>
            <div class="space-y-2">
              <button id="viewCartBtn" class="w-full rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200">
                View Cart
              </button>
              <button id="checkoutDrawerBtn" class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                Checkout
              </button>
            </div>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(cartDrawer);

    // Setup drawer event listeners
    document.getElementById('closeCartDrawer').addEventListener('click', closeCartDrawer);
    document.getElementById('cartOverlay').addEventListener('click', closeCartDrawer);
    document.getElementById('viewCartBtn').addEventListener('click', () => {
      window.location.href = '/cart.html';
    });
    document.getElementById('checkoutDrawerBtn').addEventListener('click', () => {
      window.location.href = '/?checkout=true';
    });
  }
}

/**
 * Opens the cart drawer
 */
window.openCartDrawer = function() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const aside = drawer.querySelector('aside');
  
  drawer.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    aside.classList.remove('translate-x-full');
  });
  
  updateDrawerCart();
};

/**
 * Closes the cart drawer
 */
function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const aside = drawer.querySelector('aside');
  
  overlay.classList.add('opacity-0');
  aside.classList.add('translate-x-full');
  setTimeout(() => drawer.classList.add('hidden'), 200);
}

/**
 * Updates the cart drawer content
 */
function updateDrawerCart() {
  const drawerItems = document.getElementById('drawerCartItems');
  const drawerTotal = document.getElementById('drawerCartTotal');
  
  if (!drawerItems || !drawerTotal) return;
  
  const items = state.cart.toArray();
  
  if (items.length === 0) {
    drawerItems.innerHTML = `
      <div class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p class="mt-2 text-sm text-neutral-600">Your cart is empty</p>
      </div>
    `;
    drawerTotal.textContent = '$0.00';
    return;
  }
  
  drawerItems.innerHTML = items.map(item => `
    <div class="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div class="h-12 w-12 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
        ${item.image ? 
          `<img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover rounded-md" />` :
          `<svg class="h-6 w-6 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>`
        }
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-neutral-900 truncate">${item.name}</p>
        <p class="text-xs text-neutral-600">Qty: ${item.qty} × ${formatCurrency(item.priceBase, item.currencyBase)}</p>
      </div>
      <div class="text-sm font-medium text-neutral-900">
        ${formatCurrency(item.priceBase * item.qty, item.currencyBase)}
      </div>
    </div>
  `).join('');
  
  const total = items.reduce((sum, item) => sum + (item.priceBase * item.qty), 0);
  drawerTotal.textContent = formatCurrency(total, items[0]?.currencyBase || 'USD');
}

/**
 * Initialize the cart page
 */
async function init() {
  // Load cart from storage first
  loadCartFromStorage();
  
  // Setup all functionality
  setupAuthUI();
  setupMobileNav();
  setupCurrencySelection();
  setupActionButtons();

  // Load initial cart state
  updateCartUI();

  // Setup cart drawer for cross-page functionality
  setupCartDrawer();

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
    const interactiveElements = document.querySelectorAll('button, a, .cart-item');
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
