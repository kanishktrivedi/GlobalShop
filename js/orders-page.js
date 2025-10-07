/**
 * Orders Page JavaScript
 *
 * Handles the orders history page with dynamic order loading from Firestore.
 * Displays order details, status, and provides order management functionality.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser, getUserOrders } from "./firebase.js";
import { formatCurrency } from "./currency.js";

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  currency: "USD",
  orders: [],
  isLoading: false
};

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const els = {
  // Orders Display
  ordersList: document.getElementById("ordersList"),
  ordersLoading: document.getElementById("ordersLoading"),
  ordersEmpty: document.getElementById("ordersEmpty"),
  ordersAuthRequired: document.getElementById("ordersAuthRequired"),
  ordersSignInBtn: document.getElementById("ordersSignInBtn"),

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

  // Cart
  cartButton: document.getElementById("cartButton"),
  cartCount: document.getElementById("cartCount"),

  // Mobile Navigation
  mobileNav: document.getElementById("mobileNav"),
  navToggle: document.getElementById("navToggle"),
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Loads and displays user orders from Firestore
 */
async function loadUserOrders() {
  const user = getCurrentUser();
  
  if (!user) {
    showAuthRequiredState();
    return;
  }

  try {
    state.isLoading = true;
    showLoadingState();

    console.log('🔄 Loading orders for user:', user.uid);
    
    // Try to load orders with error handling
    let orders = [];
    try {
      orders = await getUserOrders(user.uid);
    } catch (firestoreError) {
      console.error('❌ Firestore query error:', firestoreError);
      
      // If it's an index error, try alternative approach
      if (firestoreError.message.includes('index') || firestoreError.message.includes('Index')) {
        console.log('🔄 Trying alternative query method...');
        orders = await getUserOrdersAlternative(user.uid);
      } else {
        throw firestoreError;
      }
    }

    state.orders = orders;
    console.log(`📦 Loaded ${orders.length} orders`);

    if (orders.length === 0) {
      // Check if we should create demo orders for testing
      if (window.location.search.includes('demo=true')) {
        console.log('🎭 Creating demo orders for testing...');
        await createDemoOrders(user.uid);
        // Reload orders after creating demo data
        const demoOrders = await getUserOrders(user.uid).catch(() => []);
        if (demoOrders.length > 0) {
          state.orders = demoOrders;
          displayOrders(demoOrders);
          return;
        }
      }
      showEmptyState();
    } else {
      displayOrders(orders);
    }

  } catch (error) {
    console.error('❌ Error loading orders:', error);
    
    // Show more specific error message
    if (error.message.includes('index') || error.message.includes('Index')) {
      showAlert('Database setup in progress. Orders will be available shortly.', 'info', 5000);
    } else {
      showAlert('Failed to load orders. Please try again.', 'error', 4000);
    }
    
    showEmptyState();
  } finally {
    state.isLoading = false;
  }
}

/**
 * Creates demo orders for testing purposes
 */
async function createDemoOrders(userId) {
  try {
    const { createOrder } = await import("./firebase.js");
    
    const demoOrders = [
      {
        userId: userId,
        userEmail: getCurrentUser()?.email || 'demo@example.com',
        currency: 'USD',
        items: [
          {
            id: 'demo-1',
            name: 'Premium Wireless Headphones',
            qty: 1,
            unitPriceOriginal: 199.99,
            unitPriceConverted: 199.99,
            currencyOriginal: 'USD',
            currencyConverted: 'USD',
            description: 'High-quality wireless headphones with noise cancellation',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'
          },
          {
            id: 'demo-2',
            name: 'Smart Watch',
            qty: 1,
            unitPriceOriginal: 299.99,
            unitPriceConverted: 299.99,
            currencyOriginal: 'USD',
            currencyConverted: 'USD',
            description: 'Advanced fitness tracking and notifications',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'
          }
        ],
        subtotalOriginal: 499.98,
        subtotalConverted: 499.98,
        taxConverted: 35.00,
        totalConverted: 534.98,
        status: 'completed',
        paymentMethod: 'demo'
      },
      {
        userId: userId,
        userEmail: getCurrentUser()?.email || 'demo@example.com',
        currency: 'USD',
        items: [
          {
            id: 'demo-3',
            name: 'Laptop Stand',
            qty: 2,
            unitPriceOriginal: 49.99,
            unitPriceConverted: 49.99,
            currencyOriginal: 'USD',
            currencyConverted: 'USD',
            description: 'Ergonomic aluminum laptop stand',
            image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300'
          }
        ],
        subtotalOriginal: 99.98,
        subtotalConverted: 99.98,
        taxConverted: 7.00,
        totalConverted: 106.98,
        status: 'processing',
        paymentMethod: 'demo'
      }
    ];

    // Create demo orders
    for (const orderData of demoOrders) {
      await createOrder(orderData);
    }
    
    console.log('✅ Demo orders created successfully');
    showAlert('Demo orders created for testing!', 'success', 3000);
    
  } catch (error) {
    console.error('❌ Error creating demo orders:', error);
  }
}

/**
 * Alternative method to get user orders without complex queries
 */
async function getUserOrdersAlternative(uid) {
  try {
    // Import Firestore functions
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
    const { db } = await import("./firebase.js");
    
    // Get all orders and filter in JavaScript
    const ordersCol = collection(db, "orders");
    const querySnapshot = await getDocs(ordersCol);
    
    // Filter for user's orders and sort
    const userOrders = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(order => order.userId === uid)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.seconds || b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
    
    return userOrders;
  } catch (error) {
    console.error('Alternative query also failed:', error);
    return [];
  }
}

/**
 * Displays the list of orders
 */
function displayOrders(orders) {
  hideAllStates();

  els.ordersList.innerHTML = orders
    .map(order => renderOrderCard(order))
    .join("");

  els.ordersList.classList.remove('hidden');
}

/**
 * Renders a single order card
 */
function renderOrderCard(order) {
  const orderDate = formatOrderDate(order.createdAt);
  const statusColor = getStatusColor(order.status);
  const statusText = getStatusText(order.status);

  return `
    <div class="order-card rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <!-- Order Header -->
      <div class="mb-4 flex items-start justify-between">
        <div>
          <h3 class="text-lg font-semibold text-neutral-900">Order #${order.id.slice(-8)}</h3>
          <p class="text-sm text-neutral-600">${orderDate}</p>
          <p class="text-xs text-neutral-500 mt-1">${order.userEmail}</p>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}">
            ${statusText}
          </span>
          <div class="mt-1 text-lg font-bold text-neutral-900">
            ${formatCurrency(order.totalConverted, order.currency)}
          </div>
        </div>
      </div>

      <!-- Order Items -->
      <div class="mb-4">
        <h4 class="mb-3 text-sm font-medium text-neutral-700">Items (${order.items.length})</h4>
        <div class="space-y-2">
          ${order.items.map(item => `
            <div class="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-md bg-neutral-200 flex items-center justify-center overflow-hidden">
                  ${item.image ? 
                    `<img src="${item.image}" alt="${item.name}" class="h-full w-full object-cover" />` :
                    `<svg class="h-5 w-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>`
                  }
                </div>
                <div>
                  <p class="text-sm font-medium text-neutral-900">${item.name}</p>
                  <p class="text-xs text-neutral-600">Qty: ${item.qty}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-neutral-900">
                  ${formatCurrency(item.unitPriceConverted, item.currencyConverted)}
                </p>
                <p class="text-xs text-neutral-500">
                  Total: ${formatCurrency(item.unitPriceConverted * item.qty, item.currencyConverted)}
                </p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Order Summary -->
      <div class="border-t border-neutral-200 pt-4">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-neutral-600">Subtotal</span>
            <span class="font-medium">${formatCurrency(order.subtotalConverted, order.currency)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-neutral-600">Tax</span>
            <span class="font-medium">${formatCurrency(order.taxConverted, order.currency)}</span>
          </div>
          <div class="flex justify-between text-base font-semibold">
            <span class="text-neutral-900">Total</span>
            <span class="text-neutral-900">${formatCurrency(order.totalConverted, order.currency)}</span>
          </div>
        </div>

        <!-- Order Actions -->
        <div class="mt-4 flex gap-2">
          <button onclick="reorderItems('${order.id}')" class="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
            Reorder
          </button>
          <button onclick="viewOrderDetails('${order.id}')" class="flex-1 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
            View Details
          </button>
        </div>
      </div>

      <!-- Order Metadata -->
      <div class="mt-4 pt-4 border-t border-neutral-100">
        <div class="grid grid-cols-2 gap-4 text-xs text-neutral-500">
          <div>
            <span class="font-medium">Payment:</span> ${order.paymentMethod || 'Card'}
          </div>
          <div>
            <span class="font-medium">Currency:</span> ${order.currency}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Formats order date for display
 */
function formatOrderDate(timestamp) {
  if (!timestamp) return 'Unknown date';
  
  let date;
  if (timestamp.toDate) {
    // Firestore Timestamp
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    // Firestore Timestamp object
    date = new Date(timestamp.seconds * 1000);
  } else {
    // Regular Date or timestamp
    date = new Date(timestamp);
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Gets status color classes
 */
function getStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-100';
    case 'processing':
      return 'text-blue-700 bg-blue-100';
    case 'shipped':
      return 'text-purple-700 bg-purple-100';
    case 'cancelled':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

/**
 * Gets status display text
 */
function getStatusText(status) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'processing':
      return 'Processing';
    case 'shipped':
      return 'Shipped';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Shows loading state
 */
function showLoadingState() {
  hideAllStates();
  els.ordersLoading.classList.remove('hidden');
}

/**
 * Shows empty orders state
 */
function showEmptyState() {
  hideAllStates();
  els.ordersEmpty.classList.remove('hidden');
}

/**
 * Shows authentication required state
 */
function showAuthRequiredState() {
  hideAllStates();
  els.ordersAuthRequired.classList.remove('hidden');
}

/**
 * Hides all state elements
 */
function hideAllStates() {
  els.ordersLoading.classList.add('hidden');
  els.ordersEmpty.classList.add('hidden');
  els.ordersAuthRequired.classList.add('hidden');
  els.ordersList.classList.add('hidden');
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

      // Load orders when user signs in
      loadUserOrders();
    } else {
      els.authBtn.classList.remove("hidden");
      els.userMenu.classList.add("hidden");
      showAuthRequiredState();
    }
  });

  // Sign in button
  els.authBtn.addEventListener("click", () => {
    showSignInModal();
  });

  // Orders page sign in button
  els.ordersSignInBtn?.addEventListener("click", () => {
    showSignInModal();
  });

  // Demo orders button
  const createDemoOrdersBtn = document.getElementById('createDemoOrdersBtn');
  createDemoOrdersBtn?.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) {
      showAlert('Please sign in first', 'error', 3000);
      return;
    }
    
    createDemoOrdersBtn.disabled = true;
    createDemoOrdersBtn.innerHTML = 'Creating...';
    
    try {
      await createDemoOrders(user.uid);
      // Reload orders
      await loadUserOrders();
    } catch (error) {
      console.error('Error creating demo orders:', error);
      showAlert('Failed to create demo orders', 'error', 3000);
    } finally {
      createDemoOrdersBtn.disabled = false;
      createDemoOrdersBtn.innerHTML = `
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Create Demo Orders
      `;
    }
  });

  // Modal handlers
  setupAuthModals();

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
 * Sets up cart functionality
 */
function setupCart() {
  // Load cart count from localStorage
  try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cartData = JSON.parse(savedCart);
      const itemCount = cartData.reduce((total, item) => total + item.qty, 0);
      els.cartCount.textContent = itemCount;
    }
  } catch (error) {
    console.warn('Could not load cart count:', error);
  }

  // Cart button click handler
  els.cartButton?.addEventListener('click', () => {
    window.location.href = '/cart.html';
  });
}

/**
 * Sets up auth modal functionality
 */
function setupAuthModals() {
  const signInModal = document.getElementById('signInModal');
  const signInOverlay = document.getElementById('signInOverlay');
  const closeSignIn = document.getElementById('closeSignIn');
  const googleSignIn = document.getElementById('googleSignIn');

  // Close modal handlers
  closeSignIn?.addEventListener('click', () => closeModal(signInModal, signInOverlay));
  signInOverlay?.addEventListener('click', () => closeModal(signInModal, signInOverlay));

  // Google sign in
  googleSignIn?.addEventListener('click', async () => {
    try {
      await signInWithGooglePopup();
      closeModal(signInModal, signInOverlay);
      showAlert('Successfully signed in!', 'success', 3000);
    } catch (error) {
      console.error('Sign in error:', error);
      showAlert('Sign in failed. Please try again.', 'error', 4000);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && signInModal && !signInModal.classList.contains('hidden')) {
      closeModal(signInModal, signInOverlay);
    }
  });
}

/**
 * Shows the sign-in modal
 */
function showSignInModal() {
  const signInModal = document.getElementById('signInModal');
  const signInOverlay = document.getElementById('signInOverlay');
  
  if (signInModal) {
    signInModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    requestAnimationFrame(() => {
      signInOverlay.classList.remove('opacity-0');
      const modalContent = signInModal.querySelector('.transform');
      if (modalContent) {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
      }
    });
  }
}

/**
 * Closes a modal
 */
function closeModal(container, overlay) {
  const modalContent = container.querySelector('.transform');
  if (modalContent) {
    modalContent.style.transform = 'scale(0.95)';
    modalContent.style.opacity = '0';
  }
  
  overlay.classList.add('opacity-0');
  
  setTimeout(() => {
    container.classList.add('hidden');
    document.body.style.overflow = '';
  }, 300);
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
// GLOBAL FUNCTIONS FOR ORDER ACTIONS
// ============================================================================

/**
 * Reorders items from a previous order
 */
window.reorderItems = function(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) {
    showAlert('Order not found', 'error', 3000);
    return;
  }

  // Add items to cart
  try {
    let cartData = [];
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        cartData = JSON.parse(savedCart);
      }
    } catch {}

    // Add order items to cart
    order.items.forEach(item => {
      const existingIndex = cartData.findIndex(cartItem => cartItem.id === item.id);
      if (existingIndex >= 0) {
        cartData[existingIndex].qty += item.qty;
      } else {
        cartData.push({
          id: item.id,
          name: item.name,
          priceBase: item.unitPriceOriginal,
          currencyBase: item.currencyOriginal,
          qty: item.qty,
          description: item.description || '',
          image: item.image || ''
        });
      }
    });

    localStorage.setItem('cart', JSON.stringify(cartData));
    showAlert(`${order.items.length} items added to cart!`, 'success', 3000);

    // Navigate to cart after a delay
    setTimeout(() => {
      window.location.href = '/cart.html';
    }, 1500);

  } catch (error) {
    console.error('Reorder error:', error);
    showAlert('Failed to add items to cart', 'error', 3000);
  }
};

/**
 * Shows detailed view of an order
 */
window.viewOrderDetails = function(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) {
    showAlert('Order not found', 'error', 3000);
    return;
  }

  // For now, just show an alert with order details
  // In a real app, this would open a detailed modal or navigate to a details page
  showAlert(`Order #${orderId.slice(-8)} - ${order.items.length} items - ${formatCurrency(order.totalConverted, order.currency)}`, 'info', 5000);
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the orders page
 */
async function init() {
  try {
    // Setup all functionality
    setupAuthUI();
    setupMobileNav();
    setupCart();

    // Load currency preference
    try {
      const saved = localStorage.getItem('currency');
      if (saved) {
        state.currency = saved;
        els.currencySelect.value = saved;
      }
    } catch {}

    // Check if user just placed an order
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('newOrder') === 'true') {
      showAlert('Order placed successfully! Your order will appear below.', 'success', 5000);
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    console.log('🚀 Orders page initialized successfully');

  } catch (error) {
    console.error('❌ Error initializing orders page:', error);
    showAlert('Failed to initialize page. Please refresh.', 'error');
  }
}

// Start the application
init();