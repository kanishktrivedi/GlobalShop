/**
 * Orders Page JavaScript
 *
 * Handles the orders history page with order display, filtering, and user authentication.
 * Integrates with Firebase for order data and user management.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser, getUserOrders } from "./firebase.js";
import { formatCurrency } from "./currency.js";

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const els = {
  // Orders Management
  ordersList: document.getElementById("ordersList"),
  ordersLoading: document.getElementById("ordersLoading"),
  ordersEmpty: document.getElementById("ordersEmpty"),
  ordersAuthRequired: document.getElementById("ordersAuthRequired"),
  ordersSignInBtn: document.getElementById("ordersSignInBtn"),

  // Navigation and Layout
  currencySelect: document.getElementById("currencySelect"),
  cartCount: document.getElementById("cartCount"),

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
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Formats Firestore timestamp into a human-readable date/time string
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Formatted date/time string
 */
function formatOrderDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Renders a single order card with complete order information
 * @param {Object} order - Order object from Firestore
 * @returns {string} HTML string for the order card
 */
function renderOrderCard(order) {
  const orderDate = formatOrderDate(order.createdAt);
  const statusColor = order.status === 'completed' ? 'text-green-700 bg-green-100' : 'text-yellow-700 bg-yellow-100';

  return `
    <div class="order-card rounded-lg border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-neutral-900">Order #${order.id.slice(-8)}</h3>
          <p class="text-sm text-neutral-500">${orderDate}</p>
        </div>
        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}">
          ${order.status || 'completed'}
        </span>
      </div>

      <div class="mb-4">
        <h4 class="mb-2 text-sm font-medium text-neutral-700">Items</h4>
        <ul class="space-y-2">
          ${order.items.map(item => `
            <li class="flex items-center justify-between text-sm">
              <span class="text-neutral-600">${item.name} × ${item.qty}</span>
              <span class="font-medium">${formatCurrency(item.unitPriceConverted, order.currency)}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="border-t border-neutral-200 pt-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-neutral-600">Subtotal</span>
          <span class="font-medium">${formatCurrency(order.subtotalConverted, order.currency)}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-neutral-600">Tax</span>
          <span class="font-medium">${formatCurrency(order.taxConverted, order.currency)}</span>
        </div>
        <div class="flex items-center justify-between text-lg font-semibold">
          <span class="text-neutral-900">Total</span>
          <span class="text-neutral-900">${formatCurrency(order.totalConverted, order.currency)}</span>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-neutral-100">
        <div class="text-xs text-neutral-500">
          Currency: ${order.currency} • ${order.items.length} item${order.items.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Loads and displays user orders from Firestore
 */
async function loadUserOrders() {
  const user = getCurrentUser();

  // Show loading state
  els.ordersLoading.classList.remove('hidden');
  els.ordersEmpty.classList.add('hidden');
  els.ordersAuthRequired.classList.add('hidden');
  els.ordersList.innerHTML = '';

  if (!user) {
    // User not authenticated
    els.ordersLoading.classList.add('hidden');
    els.ordersAuthRequired.classList.remove('hidden');
    return;
  }

  try {
    const orders = await getUserOrders(user.uid);

    // Hide loading state
    els.ordersLoading.classList.add('hidden');

    if (orders.length === 0) {
      // No orders found
      els.ordersEmpty.classList.remove('hidden');
      return;
    }

    // Render orders
    orders.forEach(order => {
      const orderCard = renderOrderCard(order);
      els.ordersList.insertAdjacentHTML('beforeend', orderCard);
    });

  } catch (error) {
    console.error('Error loading orders:', error);
    els.ordersLoading.classList.add('hidden');
    els.ordersEmpty.classList.remove('hidden');
  }
}

/**
 * Sets up authentication UI and handlers
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

      // Load orders when user signs in
      loadUserOrders();
    } else {
      els.authBtn.classList.remove("hidden");
      els.userMenu.classList.add("hidden");
      els.ordersAuthRequired.classList.remove('hidden');
      els.ordersLoading.classList.add('hidden');
      els.ordersEmpty.classList.add('hidden');
    }
  });

  // Sign in button
  els.authBtn.addEventListener("click", () => {
    signInWithGooglePopup();
  });

  // Orders page specific sign in
  els.ordersSignInBtn?.addEventListener("click", () => {
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
 * Sets up currency selection (read-only on orders page)
 */
function setupCurrencySelection() {
  // Load saved currency for display purposes
  try {
    const saved = localStorage.getItem('currency');
    if (saved) {
      els.currencySelect.value = saved;
    }
  } catch {}

  // Currency selection is disabled on orders page since orders show their original currency
  els.currencySelect.disabled = true;
}

/**
 * Updates cart count display
 */
function updateCartUI() {
  // This would typically get cart data from localStorage or state
  // For now, we'll set it to 0 since we don't have cart state here
  els.cartCount.textContent = '0';
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the orders page
 */
async function init() {
  // Setup all functionality
  setupAuthUI();
  setupMobileNav();
  setupCurrencySelection();

  // Load initial cart UI
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
    const interactiveElements = document.querySelectorAll('button, a, .order-card');
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-hover');
      });
      element.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover');
      });
    });
  }

  // Load orders if user is already authenticated
  const user = getCurrentUser();
  if (user) {
    await loadUserOrders();
  }
}

// Start the application
init();
