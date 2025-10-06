/**
 * Settings Page JavaScript
 *
 * Handles user preferences for currency and theme settings.
 * Integrates with Firebase for persistent storage and localStorage for instant feedback.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser, getUserSettings, updateUserSettings } from "./firebase.js";

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const els = {
  // Settings Management
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
// APPLICATION STATE
// ============================================================================

const state = {
  currency: "USD",
  theme: "light"
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Applies the selected theme by setting CSS custom properties
 * @param {string} theme - Theme name ('light' or 'dark')
 */
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

/**
 * Loads user settings from Firestore (authenticated users) or localStorage (guests)
 */
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
    updateSettingsUI(currency, theme);

    // Update main currency selector if different
    if (currency !== els.currencySelect.value) {
      els.currencySelect.value = currency;
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

/**
 * Updates the settings UI to reflect current values
 * @param {string} currency - Current currency
 * @param {string} theme - Current theme
 */
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

/**
 * Saves settings to both Firestore (authenticated users) and localStorage
 */
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
    }

    // Save to storage
    if (user) {
      // Save to Firestore for authenticated users
      await updateUserSettings(user.uid, {
        preferredCurrency: newCurrency,
        theme: newTheme
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

/**
 * Sets up event listeners for settings controls
 */
function setupSettingsControls() {
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
 * Sets up currency selection (read-only on settings page)
 */
function setupCurrencySelection() {
  // Load saved currency for display purposes
  try {
    const saved = localStorage.getItem('currency');
    if (saved) {
      state.currency = saved;
      els.currencySelect.value = saved;
    }
  } catch {}

  // Currency selection is disabled on settings page since we have our own controls
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
 * Initialize the settings page
 */
function init() {
  // Setup all functionality
  setupAuthUI();
  setupMobileNav();
  setupCurrencySelection();

  // Load initial settings
  loadSettings();

  // Setup settings controls
  setupSettingsControls();

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
    const interactiveElements = document.querySelectorAll('button, a, input, select, .settings-section');
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
