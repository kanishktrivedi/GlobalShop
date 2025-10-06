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
    .map(item => `
      <div class="cart-item rounded-lg border border-neutral-200 bg-white p-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4 flex-1">
            <div class="h-16 w-16 rounded-md bg-neutral-100 flex items-center justify-center">
              <svg class="h-8 w-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-neutral-900">${item.name}</h3>
              <p class="text-sm text-neutral-600">${formatCurrency(item.priceBase, item.currencyBase)}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="quantity-controls flex items-center gap-2">
              <button data-dec="${item.id}" class="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                −
              </button>
              <span class="quantity-display w-8 text-center text-sm font-medium">${item.qty}</span>
              <button data-inc="${item.id}" class="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                +
              </button>
            </div>

            <button data-rem="${item.id}" class="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
              Remove
            </button>
          </div>
        </div>
      </div>
    `)
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
      updateCartUI();
    });
  });

  // Quantity decrease buttons
  els.cartItems.querySelectorAll("[data-dec]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-dec");
      state.cart.decrease(id);
      updateCartUI();
    });
  });

  // Remove buttons
  els.cartItems.querySelectorAll("[data-rem]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-rem");
      state.cart.remove(id);
      updateCartUI();
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
 * Initialize the cart page
 */
async function init() {
  // Setup all functionality
  setupAuthUI();
  setupMobileNav();
  setupCurrencySelection();
  setupActionButtons();

  // Load initial cart state
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
