import { observeAuthState, signInWithGooglePopup, signInWithGoogleRedirect, signOutUser, getCurrentUser, createOrder, emailPasswordSignIn, emailPasswordSignUp, upsertUserProfile, getUserProfile, setPreferredCurrency, getUserOrders, getUserSettings, updateUserSettings } from "./firebase.js";
import { Cart } from "./cart.js";
import { products } from "./products.js";
import { convertAmount, convertList, formatCurrency, DEFAULT_BASE } from "./currency.js";
import { Trie, mergeSort } from "./dsa.js";
import { setupRouter, navigate } from "./router.js";

const state = {
  cart: new Cart(),
  currency: "USD",
  theme: "light",
};

const els = {
  currencySelect: document.getElementById("currencySelect"),
  productGrid: document.getElementById("productGrid"),
  cartButton: document.getElementById("cartButton"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartOverlay: document.getElementById("cartOverlay"),
  closeCart: document.getElementById("closeCart"),
  cartItems: document.getElementById("cartItems"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartTax: document.getElementById("cartTax"),
  cartTotal: document.getElementById("cartTotal"),
  cartCount: document.getElementById("cartCount"),
  cartFab: document.getElementById("cartFab"),
  cartFabCount: document.getElementById("cartFabCount"),
  mobileNav: document.getElementById("mobileNav"),
  navToggle: document.getElementById("navToggle"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  checkoutModal: document.getElementById("checkoutModal"),
  checkoutOverlay: document.getElementById("checkoutOverlay"),
  closeCheckout: document.getElementById("closeCheckout"),
  checkoutSummary: document.getElementById("checkoutSummary"),
  confirmCheckout: document.getElementById("confirmCheckout"),
  authBtn: document.getElementById("authBtn"),
  userEmail: document.getElementById("userEmail"),
  cursorTrail: document.getElementById("cursorTrail"),
  // orders
  ordersView: document.getElementById("view-orders"),
  ordersList: document.getElementById("ordersList"),
  ordersEmpty: document.getElementById("ordersEmpty"),
  ordersCount: document.getElementById("ordersCount"),
  // settings
  settingsView: document.getElementById("view-settings"),
  settingsCurrency: document.getElementById("settingsCurrency"),
  settingsThemeLight: document.querySelector('input[name="theme"][value="light"]'),
  settingsThemeDark: document.querySelector('input[name="theme"][value="dark"]'),
  currentCurrencyDisplay: document.getElementById("currentCurrencyDisplay"),
  currentThemeDisplay: document.getElementById("currentThemeDisplay"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  settingsStatus: document.getElementById("settingsStatus"),
  settingsSuccess: document.getElementById("settingsSuccess"),
  settingsError: document.getElementById("settingsError"),
  settingsErrorText: document.getElementById("settingsErrorText"),
  // AI Assistant
  aiAssistant: document.getElementById("aiAssistant"),
  aiAssistantBtn: document.getElementById("aiAssistantBtn"),
  aiChatBubble: document.getElementById("aiChatBubble"),
  aiMessage: document.getElementById("aiMessage"),
  closeAiChat: document.getElementById("closeAiChat"),
  // search
  searchInput: document.getElementById("searchInput"),
  searchSuggest: document.getElementById("searchSuggest"),
  // auth modals
  signInModal: document.getElementById("signInModal"),
  signInOverlay: document.getElementById("signInOverlay"),
  closeSignIn: document.getElementById("closeSignIn"),
  signInForm: document.getElementById("signInForm"),
  signInEmail: document.getElementById("signInEmail"),
  signInPassword: document.getElementById("signInPassword"),
  googleSignIn: document.getElementById("googleSignIn"),
  switchToSignUp: document.getElementById("switchToSignUp"),
  signUpModal: document.getElementById("signUpModal"),
  signUpOverlay: document.getElementById("signUpOverlay"),
  closeSignUp: document.getElementById("closeSignUp"),
  signUpForm: document.getElementById("signUpForm"),
  signUpEmail: document.getElementById("signUpEmail"),
  signUpPassword: document.getElementById("signUpPassword"),
  switchToSignIn: document.getElementById("switchToSignIn"),
  // navbar user menu
  userMenu: document.getElementById("userMenu"),
  avatarBtn: document.getElementById("avatarBtn"),
  avatarImg: document.getElementById("avatarImg"),
  avatarFallback: document.getElementById("avatarFallback"),
  userDropdown: document.getElementById("userDropdown"),
  logoutBtn: document.getElementById("logoutBtn"),
  navUserEmail: document.getElementById("navUserEmail"),
};

// Order display helpers
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

async function loadUserOrders() {
  const user = getCurrentUser();
  if (!user) {
    els.ordersEmpty.classList.remove('hidden');
    els.ordersCount.textContent = 'Please sign in to view orders';
    return;
  }

  try {
    els.ordersCount.textContent = 'Loading...';
    els.ordersList.innerHTML = '';

    const orders = await getUserOrders(user.uid);

    if (orders.length === 0) {
      els.ordersEmpty.classList.remove('hidden');
      els.ordersCount.textContent = 'No orders yet';
      return;
    }

    els.ordersEmpty.classList.add('hidden');
    els.ordersCount.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;

    orders.forEach(order => {
      const orderCard = renderOrderCard(order);
      els.ordersList.insertAdjacentHTML('beforeend', orderCard);
    });

  } catch (error) {
    console.error('Error loading orders:', error);
    els.ordersEmpty.classList.remove('hidden');
    els.ordersCount.textContent = 'Error loading orders';
  }
}

// Settings and Theme Management
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;

  // Save to localStorage for instant persistence
  try {
    localStorage.setItem('theme', theme);
  } catch (error) {
    console.warn('Could not save theme to localStorage:', error);
  }
}

function loadSettings() {
  const user = getCurrentUser();
  if (!user) {
    // For guests, only load from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedCurrency = localStorage.getItem('currency') || 'USD';

    state.theme = savedTheme;
    state.currency = savedCurrency;

    applyTheme(savedTheme);
    updateSettingsUI(savedCurrency, savedTheme);
    return;
  }

  // For authenticated users, load from Firestore
  getUserSettings(user.uid).then(settings => {
    const theme = settings.theme || 'light';
    const currency = settings.preferredCurrency || 'USD';

    state.theme = theme;
    state.currency = currency;

    applyTheme(theme);

    // Update UI
    updateSettingsUI(currency, theme);

    // Apply currency if different from current
    if (currency !== els.currencySelect.value) {
      els.currencySelect.value = currency;
      updatePricesForCurrency();
    }
  }).catch(error => {
    console.error('Error loading settings:', error);
    // Fallback to localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedCurrency = localStorage.getItem('currency') || 'USD';

    state.theme = savedTheme;
    state.currency = savedCurrency;
    applyTheme(savedTheme);
    updateSettingsUI(savedCurrency, savedTheme);
  });
}

function updateSettingsUI(currency, theme) {
  // Update currency display
  els.currentCurrencyDisplay.textContent = currency;

  // Update theme radio buttons
  if (els.settingsThemeLight && els.settingsThemeDark) {
    els.settingsThemeLight.checked = theme === 'light';
    els.settingsThemeDark.checked = theme === 'dark';
  }

  // Update theme display
  els.currentThemeDisplay.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
}

async function saveSettings() {
  const newCurrency = els.settingsCurrency.value;
  const newTheme = document.querySelector('input[name="theme"]:checked').value;

  // Show loading state
  els.saveSettingsBtn.disabled = true;
  els.saveSettingsBtn.innerHTML = `
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
    Saving...
  `;

  // Hide previous status messages
  els.settingsStatus.classList.add('hidden');
  els.settingsSuccess.classList.add('hidden');
  els.settingsError.classList.add('hidden');

  try {
    const user = getCurrentUser();

    // Update state
    state.currency = newCurrency;
    state.theme = newTheme;

    // Apply changes instantly
    applyTheme(newTheme);
    if (newCurrency !== els.currencySelect.value) {
      els.currencySelect.value = newCurrency;
      await updatePricesForCurrency();
    }

    // Save to storage
    if (user) {
      // Save to Firestore for authenticated users
      await updateUserSettings(user.uid, {
        preferredCurrency: newCurrency,
        theme: newTheme
      }).catch(error => {
        console.error('Error saving settings to Firestore:', error);
      });
    }
    // Always save to localStorage for instant persistence
    try {
      localStorage.setItem('currency', newCurrency);
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
    }

    // Update UI
    updateSettingsUI(newCurrency, newTheme);

    // Show success message
    els.settingsSuccess.classList.remove('hidden');
    els.settingsStatus.classList.remove('hidden');

    // Auto-hide success message
    setTimeout(() => {
      els.settingsStatus.classList.add('hidden');
      els.settingsSuccess.classList.add('hidden');
    }, 3000);

  } catch (error) {
    console.error('Error saving settings:', error);

    // Show error message
    els.settingsErrorText.textContent = error.message || 'Failed to save settings';
    els.settingsError.classList.remove('hidden');
    els.settingsStatus.classList.remove('hidden');
  } finally {
    // Reset button
    els.saveSettingsBtn.disabled = false;
    els.saveSettingsBtn.innerHTML = `
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17,21 17,13 7,13 7,21"/>
        <polyline points="7,3 7,8 15,8"/>
      </svg>
      Save Settings
    `;
  }
}

function setupSettings() {
  // Load settings on page load
  loadSettings();

  // Save settings button
  if (els.saveSettingsBtn) {
    els.saveSettingsBtn.addEventListener('click', saveSettings);
  }

  // Currency selector in settings (for immediate preview)
  if (els.settingsCurrency) {
    els.settingsCurrency.addEventListener('change', (e) => {
      els.currentCurrencyDisplay.textContent = e.target.value;
    });
  }

  // Theme selectors in settings (for immediate preview)
  if (els.settingsThemeLight) {
    els.settingsThemeLight.addEventListener('change', () => {
      if (els.settingsThemeLight.checked) {
        applyTheme('light');
        els.currentThemeDisplay.textContent = 'Light';
      }
    });
  }

  if (els.settingsThemeDark) {
    els.settingsThemeDark.addEventListener('change', () => {
      if (els.settingsThemeDark.checked) {
        applyTheme('dark');
        els.currentThemeDisplay.textContent = 'Dark';
      }
    });
  }
// ============================================================================
// ENHANCED CURSOR INTERACTIONS
// ============================================================================

/**
 * Sets up custom cursor with enhanced interactions and effects
 * Creates a two-part cursor (dot + outline) with hover states and click ripples
 */
function setupEnhancedCursor() {
  const cursorDot = document.getElementById('cursorDot');
  const cursorOutline = document.getElementById('cursorOutline');
  const body = document.body;

  if (!cursorDot || !cursorOutline) return;

  // Hide default cursor and show custom cursor
  body.style.cursor = 'none';

  let mouseX = 0;
  let mouseY = 0;

  // Track mouse movement for custom cursor
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
    cursorOutline.style.left = `${mouseX}px`;
    cursorOutline.style.top = `${mouseY}px`;
  });

  // Add hover effects for interactive elements
  const interactiveElements = document.querySelectorAll('button, a, input, select, [role="button"], .btn-cta, .product-card');

  interactiveElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      body.classList.add('cursor-hover');
    });

    element.addEventListener('mouseleave', () => {
      body.classList.remove('cursor-hover');
    });
  });

  // Click ripple effect
  document.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  });

  // Show cursor when mouse leaves window (for touch devices)
  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorOutline.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    cursorDot.style.opacity = '1';
    cursorOutline.style.opacity = '1';
  });
}

// Enhanced page load animations
function setupPageAnimations() {
  // Animate elements that come into view
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements for animation
  const animateElements = document.querySelectorAll('.order-card, .product-card');
  animateElements.forEach(el => observer.observe(el));

  // Stagger animation for product cards
  const productCards = document.querySelectorAll('.product-card');
  productCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
  });
}

// Enhanced button interactions
function setupButtonEnhancements() {
  const buttons = document.querySelectorAll('button, .btn-cta');

  buttons.forEach(button => {
    // Add ripple effect on click
    button.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.className = 'ripple';
      const rect = button.getBoundingClientRect();
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });

    // Add focus ring animation
    button.addEventListener('focus', () => {
      button.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.3)';
    });

    button.addEventListener('blur', () => {
      button.style.boxShadow = '';
    });
  });
}
const pricingInsights = [
  "💹 EUR is up 0.8% against USD today - great time to buy European imports!",
  "📈 JPY has strengthened 1.2% this week - Japanese electronics are more affordable!",
  "🔥 GBP dropped 0.5% overnight - now's the perfect moment for UK shopping!",
  "⚡ INR gained 0.3% today - Indian goods are slightly cheaper for international buyers!",
  "🚀 AUD is stable at current levels - Australian products maintaining steady pricing!",
  "💎 CAD up 0.7% this morning - Canadian items are trending upwards!",
  "🌟 USD holding strong - American products remain competitively priced globally!",
  "⚖️ EUR/USD rate unchanged - perfect stability for cross-border transactions!",
  "📊 Market volatility low today - all major currencies stable within 0.5%!",
  "🎯 Optimal exchange window: EUR and GBP both favorable for USD conversions!"
];

function getRandomInsight() {
  return pricingInsights[Math.floor(Math.random() * pricingInsights.length)];
}

function showAiChat() {
  els.aiChatBubble.classList.remove('hidden');
  els.aiMessage.textContent = getRandomInsight();

  // Auto-hide after 8 seconds
  setTimeout(() => {
    if (!els.aiChatBubble.classList.contains('hidden')) {
      hideAiChat();
    }
  }, 8000);
}

function hideAiChat() {
  els.aiChatBubble.classList.add('hidden');
}

function setupAiAssistant() {
  if (!els.aiAssistantBtn || !els.aiChatBubble || !els.closeAiChat) return;

  // Show random insight when clicking the AI button
  els.aiAssistantBtn.addEventListener('click', showAiChat);

  // Hide chat when clicking close button
  els.closeAiChat.addEventListener('click', hideAiChat);

  // Auto-show random insights periodically (every 45-75 seconds)
  setInterval(() => {
    if (Math.random() < 0.3 && els.aiChatBubble.classList.contains('hidden')) { // 30% chance
      showAiChat();
    }
  }, 45000 + Math.random() * 30000); // 45-75 seconds

  // Show first insight after 10 seconds for engagement
  setTimeout(() => {
    if (els.aiChatBubble.classList.contains('hidden')) {
      showAiChat();
    }
  }, 10000);
}
  const sorted = sortProducts(products);
  els.productGrid.innerHTML = sorted
    .map((p) => {
      return `
        <li class="product-card" data-id="${p.id}">
          <div class="product-image-wrap">
            <img src="${p.image}" alt="${p.name}" class="product-image" />
          </div>
          <div class="product-body">
            <h3 class="product-title">${p.name}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-row">
              <span data-price data-id="${p.id}" class="product-price">${formatCurrency(p.priceBase, DEFAULT_BASE)}</span>
              <button data-add data-id="${p.id}" class="btn-cta" data-tooltip="Cha-ching! Currency converted!">Add to Cart</button>
            </div>
          </div>
        </li>`;
    })
    .join("");

  // attach add handlers
  els.productGrid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const p = products.find((x) => x.id === id);
      
      // Add visual feedback
      const button = e.currentTarget;
      const originalText = button.textContent;
      button.textContent = 'Added!';
      button.classList.add('bg-success-600', 'hover:bg-success-700');
      button.classList.remove('bg-neutral-900', 'hover:bg-neutral-800');
      
      state.cart.setItem(p);
      
      // Save to localStorage
      try {
        const cartData = state.cart.toArray();
        localStorage.setItem('cart', JSON.stringify(cartData));
      } catch (error) {
        console.warn('Could not save cart to storage:', error);
      }
      
      await updatePricesForCurrency();
      updateCartUI();
      
      // Show success alert
      showAlert(`${p.name} added to cart!`, 'success', 3000);
      
      // Reset button after delay
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-success-600', 'hover:bg-success-700');
        button.classList.add('bg-neutral-900', 'hover:bg-neutral-800');
      }, 1500);
      
      openCart();
    });
  });
}

// Stable merge sort by base price ascending
// Time: O(n log n), Space: O(n)
function sortProducts(items) {
  return mergeSort(items, (a, b) => {
    if (a.priceBase < b.priceBase) return -1;
    if (a.priceBase > b.priceBase) return 1;
    return 0;
  });
}

async function updatePricesForCurrency() {
  // Update product display prices
  const priceEls = els.productGrid.querySelectorAll("[data-price]");
  for (const priceEl of priceEls) {
    const id = priceEl.getAttribute("data-id");
    const p = products.find((x) => x.id === id);
    const converted = await convertAmount(p.priceBase, p.currencyBase, state.currency);
    priceEl.textContent = formatCurrency(converted, state.currency);
  }
}

function updateCartUI() {
  const items = state.cart.toArray();
  els.cartCount.textContent = items.reduce((a, it) => a + it.qty, 0);
  if (els.cartFabCount) {
    els.cartFabCount.textContent = els.cartCount.textContent;
  }
  els.cartItems.innerHTML = items
    .map(
      (it) => `
      <li class="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3">
        <div>
          <div class="text-sm font-medium">${it.name}</div>
          <div class="text-xs text-neutral-600">${formatCurrency(it.priceBase, it.currencyBase)} · Qty ${it.qty}</div>
        </div>
        <div class="flex items-center gap-2">
          <button data-dec="${it.id}" class="rounded-md border border-neutral-300 px-2 py-1 text-xs">-</button>
          <button data-inc="${it.id}" class="rounded-md border border-neutral-300 px-2 py-1 text-xs">+</button>
          <button data-rem="${it.id}" class="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">Remove</button>
        </div>
      </li>`
    )
    .join("");

  // bind qty controls
  els.cartItems.querySelectorAll("[data-inc]").forEach((b) =>
    b.addEventListener("click", (e) => {
      state.cart.increase(e.currentTarget.getAttribute("data-inc"));
      // Save to localStorage
      try {
        const cartData = state.cart.toArray();
        localStorage.setItem('cart', JSON.stringify(cartData));
      } catch {}
      updateCartUI();
      updateCartTotals();
    })
  );
  els.cartItems.querySelectorAll("[data-dec]").forEach((b) =>
    b.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-dec");
      const item = state.cart.itemsById.get(id);
      const result = state.cart.decrease(id);
      // Save to localStorage
      try {
        const cartData = state.cart.toArray();
        localStorage.setItem('cart', JSON.stringify(cartData));
      } catch {}
      updateCartUI();
      updateCartTotals();
      if (!result && item) {
        showAlert(`${item.name} removed from cart`, 'success', 2000);
      }
    })
  );
  els.cartItems.querySelectorAll("[data-rem]").forEach((b) =>
    b.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-rem");
      const item = state.cart.itemsById.get(id);
      state.cart.remove(id);
      // Save to localStorage
      try {
        const cartData = state.cart.toArray();
        localStorage.setItem('cart', JSON.stringify(cartData));
      } catch {}
      updateCartUI();
      updateCartTotals();
      if (item) {
        showAlert(`${item.name} removed from cart`, 'success', 2000);
      }
    })
  );

  updateCartTotals();
}

async function updateCartTotals() {
  const items = state.cart.toArray();
  const { subtotal, tax, total } = await convertList(items, state.currency, TAX_RATE);
  els.cartSubtotal.textContent = formatCurrency(subtotal, state.currency);
  els.cartTax.textContent = formatCurrency(tax, state.currency);
  els.cartTotal.textContent = formatCurrency(total, state.currency);
}

function openCart() {
  els.cartDrawer.classList.remove("hidden");
  requestAnimationFrame(() => {
    els.cartOverlay.classList.remove("opacity-0");
    const aside = els.cartDrawer.querySelector("aside");
    aside.classList.remove("translate-x-full");
  });
}

function closeCart() {
  els.cartOverlay.classList.add("opacity-0");
  const aside = els.cartDrawer.querySelector("aside");
  aside.classList.add("translate-x-full");
  setTimeout(() => els.cartDrawer.classList.add("hidden"), 200);
}

function openCheckout() {
  els.checkoutModal.classList.remove("hidden");
  requestAnimationFrame(() => {
    els.checkoutOverlay.classList.remove("opacity-0");
  });
  renderCheckoutSummary();
}

function closeCheckout() {
  els.checkoutOverlay.classList.add("opacity-0");
  setTimeout(() => els.checkoutModal.classList.add("hidden"), 200);
}

async function renderCheckoutSummary() {
  const items = state.cart.toArray();
  const converted = await convertList(items, state.currency, TAX_RATE);
  els.checkoutSummary.innerHTML = `
    <ul class="divide-y divide-neutral-200">
      ${converted.items
        .map(
          (it) => `
        <li class="flex items-center justify-between py-3">
          <div class="text-sm">
            <div class="font-medium">${it.name}</div>
            <div class="text-neutral-600">Qty ${it.qty}</div>
          </div>
          <div class="text-sm font-medium">${formatCurrency(it.unitConverted, state.currency)}</div>
        </li>`
        )
        .join("")}
    </ul>
    <div class="mt-4 flex items-center justify-between text-sm">
      <span class="text-neutral-600">Subtotal</span>
      <span class="font-semibold">${formatCurrency(converted.subtotal, state.currency)}</span>
    </div>
    <div class="mt-2 flex items-center justify-between text-sm">
      <span class="text-neutral-600">Tax</span>
      <span class="font-semibold">${formatCurrency(converted.tax, state.currency)}</span>
    </div>
    <div class="mt-2 flex items-center justify-between text-sm">
      <span class="font-medium">Total</span>
      <span class="font-semibold">${formatCurrency(converted.total, state.currency)}</span>
    </div>
  `;
}

async function handleCheckout() {
  const user = getCurrentUser();
  if (!user) {
    await signInWithGooglePopup();
  }
  const finalUser = getCurrentUser();
  els.userEmail.textContent = finalUser?.email || "Guest";
  closeCart();
  openCheckout();
}

async function handleConfirmPay() {
  const user = getCurrentUser();
  const items = state.cart.toArray();
  const converted = await convertList(items, state.currency, TAX_RATE);
  const orderId = await createOrder({
    userId: user ? user.uid : null,
    currency: state.currency,
    items: converted.items.map((it) => ({
      id: it.id,
      name: it.name,
      qty: it.qty,
      unitPriceOriginal: it.priceBase,
      unitPriceConverted: it.unitConverted,
      currencyOriginal: it.currencyBase,
      currencyConverted: state.currency,
    })),
    subtotalOriginal: items.reduce((a, it) => a + it.priceBase * it.qty, 0),
    subtotalConverted: converted.subtotal,
    taxConverted: converted.tax,
    totalConverted: converted.total,
  });

  // reset cart and close
  state.cart.clear();
  // Clear cart from localStorage
  try {
    localStorage.removeItem('cart');
  } catch {}
  updateCartUI();
  closeCheckout();

  // Show success message and navigate to orders
  showAlert(`Order placed successfully! Order #${orderId.slice(-8)} — Total ${formatCurrency(converted.total, state.currency)}`, 'success', 4000);

  // Navigate to orders page after a brief delay
  setTimeout(() => {
    navigate('/orders');
  }, 1500);
}

function setupAuthUI() {
  observeAuthState((user) => {
    if (user) {
      // Ensure user profile exists/updates
      upsertUserProfile(user).catch(() => {});

      els.authBtn.classList.add("hidden");
      els.userMenu.classList.remove("hidden");
      els.navUserEmail.textContent = user.email || "User";
      els.userEmail.textContent = user.email || "User";
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
      getUserProfile(user.uid).then((profile) => {
        if (profile && profile.preferredCurrency && profile.preferredCurrency !== state.currency) {
          state.currency = profile.preferredCurrency;
          els.currencySelect.value = state.currency;
          try { localStorage.setItem('currency', state.currency); } catch {}
          updatePricesForCurrency();
          updateCartTotals();
        }
      });

      // Close any open auth modals on successful sign-in
      if (els.signInModal && !els.signInModal.classList.contains('hidden')) {
        closeModal(els.signInModal, els.signInOverlay);
      }
      if (els.signUpModal && !els.signUpModal.classList.contains('hidden')) {
        closeModal(els.signUpModal, els.signUpOverlay);
      }
    } else {
      els.authBtn.classList.remove("hidden");
      els.userMenu.classList.add("hidden");
      els.userEmail.textContent = "Guest";
    }
  });

  // open sign-in modal
  els.authBtn.addEventListener("click", () => openModal(els.signInModal, els.signInOverlay));

  // dropdown toggle and outside click
  els.avatarBtn.addEventListener("click", () => {
    els.userDropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!els.userMenu.contains(e.target)) {
      els.userDropdown.classList.add("hidden");
    }
  });

  // logout
  els.logoutBtn.addEventListener("click", async () => {
    await signOutUser();
  });
}

// Auth modals: handlers for email/password and Google flows
function setupAuthModals() {
  if (!els.signInModal || !els.signUpModal) return;

  // Open sign-in modal from navbar button already set in setupAuthUI

  // Close buttons and overlays
  els.closeSignIn?.addEventListener('click', () => closeModal(els.signInModal, els.signInOverlay));
  els.signInOverlay?.addEventListener('click', () => closeModal(els.signInModal, els.signInOverlay));
  els.closeSignUp?.addEventListener('click', () => closeModal(els.signUpModal, els.signUpOverlay));
  els.signUpOverlay?.addEventListener('click', () => closeModal(els.signUpModal, els.signUpOverlay));

  // Switch between modals
  els.switchToSignUp?.addEventListener('click', () => {
    closeModal(els.signInModal, els.signInOverlay);
    openModal(els.signUpModal, els.signUpOverlay);
  });
  els.switchToSignIn?.addEventListener('click', () => {
    closeModal(els.signUpModal, els.signUpOverlay);
    openModal(els.signInModal, els.signInOverlay);
  });

  // Google sign-in
  els.googleSignIn?.addEventListener('click', async () => {
    try {
      const res = await signInWithGooglePopup();
      if (res?.user) {
        await upsertUserProfile(res.user);
      }
      showAlert('Successfully signed in with Google!', 'success', 3000);
    } catch (err) {
      console.error('Google sign-in failed', err);
      showAlert('Google sign in failed. Please try again.', 'error', 4000);
      // Fallback to redirect for unauthorized-domain/popup issues
      if (err && err.code === 'auth/unauthorized-domain') {
        try {
          await signInWithGoogleRedirect();
        } catch (e) {
          console.error('Google redirect sign-in failed', e);
        }
      }
    }
  });

  // Email/password sign-in
  els.signInForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = els.signInEmail?.value?.trim();
    const password = els.signInPassword?.value;
    if (!email || !password) return;
    try {
      const res = await emailPasswordSignIn(email, password);
      if (res?.user) {
        await upsertUserProfile(res.user);
      }
      showAlert('Successfully signed in!', 'success', 3000);
    } catch (err) {
      console.error('Email sign-in failed', err);
      showAlert('Sign in failed. Please check your credentials.', 'error', 4000);
    }
  });

  // Email/password sign-up
  els.signUpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = els.signUpEmail?.value?.trim();
    const password = els.signUpPassword?.value;
    if (!email || !password) return;
    try {
      const res = await emailPasswordSignUp(email, password);
      if (res?.user) {
        await upsertUserProfile(res.user);
      }
      showAlert('Account created successfully!', 'success', 3000);
    } catch (err) {
      console.error('Email sign-up failed', err);
      showAlert('Sign up failed. Please try again.', 'error', 4000);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.signInModal && !els.signInModal.classList.contains('hidden')) {
        closeModal(els.signInModal, els.signInOverlay);
      }
      if (els.signUpModal && !els.signUpModal.classList.contains('hidden')) {
        closeModal(els.signUpModal, els.signUpOverlay);
      }
    }
  });
}

function setupShell() {
  // cart drawer
  els.cartButton.addEventListener("click", openCart);
  els.cartFab?.addEventListener("click", openCart);
  els.closeCart.addEventListener("click", closeCart);
  els.cartOverlay.addEventListener("click", closeCart);

  // checkout modal
  els.checkoutBtn.addEventListener("click", handleCheckout);
  els.closeCheckout.addEventListener("click", closeCheckout);
  els.checkoutOverlay.addEventListener("click", closeCheckout);
  els.confirmCheckout.addEventListener("click", handleConfirmPay);

  // CTA tooltips on hover
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    showTooltip(target, target.getAttribute('data-tooltip'));
  });
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    hideTooltip(target);
  });

  // currency select
  els.currencySelect.addEventListener("change", async (e) => {
    state.currency = e.target.value;
    try { localStorage.setItem('currency', state.currency); } catch {}
    await updatePricesForCurrency();
    updateCartTotals();
    const user = getCurrentUser();
    if (user) {
      await setPreferredCurrency(user.uid, state.currency);
    }
  });

  // mobile nav toggle
  els.navToggle?.addEventListener('click', () => {
    els.mobileNav.classList.toggle('hidden');
  });
}

async function init() {
  // initialize currency from localStorage
  try {
    const saved = localStorage.getItem('currency');
    if (saved) {
      state.currency = saved;
    }
  } catch {}

  // Load cart from localStorage
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

  setupAuthUI();
  setupAuthModals();
  setupShell();
  setupSettings(); // Load settings on app start
  if (typeof setupAiAssistant === 'function') {
    setupAiAssistant(); // Initialize AI assistant (guarded)
  }
  setupEnhancedCursor(); // Enhanced cursor interactions
  setupPageAnimations(); // Page load animations
  setupButtonEnhancements(); // Enhanced button interactions
  setupRouter();
  renderProducts();
  // reflect currency into UI select early
  if (els.currencySelect) {
    els.currencySelect.value = state.currency;
  }
  await updatePricesForCurrency();

  // Update cart/profile views on route change
  window.addEventListener('routechange', async (e) => {
    const id = e.detail?.viewId;
    if (id === 'view-cart') {
      const items = state.cart.toArray();
      const { subtotal, tax, total } = await convertList(items, state.currency, TAX_RATE);
      const list = document.getElementById('cartViewItems');
      list.innerHTML = items.map(it => `<li class=\"flex items-center justify-between border-b py-2 text-sm\"><span>${it.name} × ${it.qty}</span><span>${formatCurrency(it.priceBase, it.currencyBase)}</span></li>`).join('');
      document.getElementById('cartViewSubtotal').textContent = formatCurrency(subtotal, state.currency);
      document.getElementById('cartViewTax').textContent = formatCurrency(tax, state.currency);
      document.getElementById('cartViewTotal').textContent = formatCurrency(total, state.currency);
    }
    if (id === 'view-profile') {
      const user = getCurrentUser();
      document.getElementById('profileEmail').textContent = user?.email || 'Guest';
      document.getElementById('profileCurrency').textContent = state.currency;
    }
    if (id === 'view-orders') {
      await loadUserOrders();
    }
    if (id === 'view-settings') {
      setupSettings();
    }
  });
  // Neon cursor trail
  if (els.cursorTrail) {
    const particles = [];
    const maxParticles = 24;
    document.addEventListener('mousemove', (ev) => {
      spawnParticle(ev.clientX, ev.clientY);
      cleanupParticles();
    });

    function spawnParticle(x, y) {
      const dot = document.createElement('div');
      dot.className = 'pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      const hue = Math.floor((Date.now() / 20) % 360);
      dot.style.background = `radial-gradient(circle, hsla(${hue},100%,70%,0.9) 0%, hsla(${hue},100%,50%,0.4) 60%, transparent 70%)`;
      dot.style.filter = 'blur(1px)';
      dot.style.opacity = '1';
      dot.style.transition = 'transform 600ms ease, opacity 700ms ease';
      els.cursorTrail.appendChild(dot);
      requestAnimationFrame(() => {
        dot.style.transform = 'translate(-50%, -50%) scale(0.4)';
        dot.style.opacity = '0';
      });
      particles.push(dot);
    }

    function cleanupParticles() {
      while (particles.length > maxParticles) {
        const p = particles.shift();
        if (p && p.parentNode) p.parentNode.removeChild(p);
      }
      setTimeout(() => {
        particles.forEach((p) => {
          if (p && p.style.opacity === '0' && p.parentNode) p.parentNode.removeChild(p);
        });
      }, 800);
    }
  }

  // Build Trie for product name auto-suggest
  const trie = new Trie();
  for (const p of products) {
    trie.insert(p.name.toLowerCase(), p.id);
  }
  if (els.searchInput) {
    els.searchInput.addEventListener("input", () => {
      const q = els.searchInput.value.trim().toLowerCase();
      if (!q) {
        els.searchSuggest.classList.add("hidden");
        els.searchSuggest.innerHTML = "";
        return;
      }
      const suggestions = trie.suggest(q, 6);
      if (!suggestions.length) {
        els.searchSuggest.classList.add("hidden");
        els.searchSuggest.innerHTML = "";
        return;
      }
      els.searchSuggest.innerHTML = suggestions
        .map((s) => `<button data-sugg="${s.word}" class="block w-full px-3 py-2 text-left hover:bg-neutral-50">${s.word}</button>`)
        .join("");
      els.searchSuggest.classList.remove("hidden");
      els.searchSuggest.querySelectorAll('[data-sugg]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const word = e.currentTarget.getAttribute('data-sugg');
          els.searchInput.value = word;
          els.searchSuggest.classList.add('hidden');
          const prod = products.find(p => p.name.toLowerCase() === word);
          if (prod) {
            const target = els.productGrid.querySelector(`[data-id="${prod.id}"]`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    });
  }
}

init();

function openModal(container, overlay) {
  container.classList.remove("hidden");
  document.body.style.overflow = 'hidden';
  
  requestAnimationFrame(() => {
    overlay.classList.remove("opacity-0");
    const modalContent = container.querySelector('.transform');
    if (modalContent) {
      modalContent.style.transform = 'scale(1)';
      modalContent.style.opacity = '1';
    }
  });
}

function closeModal(container, overlay) {
  const modalContent = container.querySelector('.transform');
  if (modalContent) {
    modalContent.style.transform = 'scale(0.95)';
    modalContent.style.opacity = '0';
  }
  
  overlay.classList.add("opacity-0");
  
  setTimeout(() => {
    container.classList.add("hidden");
    document.body.style.overflow = '';
  }, 300);
}

// Tooltips
function showTooltip(target, text) {
  if (!text) return;
  let tip = target._tip;
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'pointer-events-none absolute z-[70] rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 shadow-lg';
    document.body.appendChild(tip);
    target._tip = tip;
  }
  tip.textContent = text;
  const rect = target.getBoundingClientRect();
  const top = rect.top - 8;
  const left = rect.left + rect.width / 2;
  tip.style.transform = 'translate(-50%, -6px)';
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
  tip.style.opacity = '0';
  tip.style.transition = 'opacity 120ms ease, transform 160ms ease';
  requestAnimationFrame(() => {
    tip.style.opacity = '1';
    tip.style.transform = 'translate(-50%, -12px)';
  });
}

function hideTooltip(target) {
  const tip = target._tip;
  if (!tip) return;
  tip.style.opacity = '0';
  tip.addEventListener('transitionend', () => {
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
    target._tip = null;
  }, { once: true });
}



// Alerts API
export function showAlert(message, type = 'success', timeoutMs = 3000) {
  if (!els.alerts) return;
  const wrap = document.createElement('div');
  wrap.className = 'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md';
  if (type === 'error') {
    wrap.className += ' border-rose-200 bg-rose-50 text-rose-800';
  } else {
    wrap.className += ' border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  wrap.style.animation = 'alert-in 160ms ease both';
  wrap.textContent = message;
  els.alerts.appendChild(wrap);
  const hide = () => {
    wrap.style.animation = 'alert-out 200ms ease forwards';
    wrap.addEventListener('animationend', () => wrap.remove(), { once: true });
  };
  if (timeoutMs > 0) setTimeout(hide, timeoutMs);
  wrap.addEventListener('click', hide);
}



