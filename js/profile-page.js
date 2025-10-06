/**
 * Profile Page JavaScript
 *
 * Handles user profile display, authentication state, and account management.
 * Shows user information, statistics, and preferences when authenticated.
 */

// ============================================================================
// MODULE IMPORTS & DEPENDENCIES
// ============================================================================

import { observeAuthState, signInWithGooglePopup, signOutUser, getCurrentUser, getUserProfile, getUserOrders } from "./firebase.js";
import { formatCurrency } from "./currency.js";

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const els = {
  // Profile Display
  profileAvatar: document.getElementById("profileAvatar"),
  profileInitial: document.getElementById("profileInitial"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  profileStatus: document.getElementById("profileStatus"),

  // Statistics
  totalOrders: document.getElementById("totalOrders"),
  totalSpent: document.getElementById("totalSpent"),
  memberSince: document.getElementById("memberSince"),

  // Preferences
  preferredCurrency: document.getElementById("preferredCurrency"),
  preferredTheme: document.getElementById("preferredTheme"),
  accountType: document.getElementById("accountType"),

  // Actions
  signInBtn: document.getElementById("signInBtn"),

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
 * Updates the profile display for authenticated users
 * @param {Object} user - Firebase user object
 * @param {Object} profile - User profile data from Firestore
 */
async function updateAuthenticatedProfile(user, profile) {
  // Update basic info
  els.profileName.textContent = user.displayName || user.email.split('@')[0];
  els.profileEmail.textContent = user.email;
  els.profileStatus.textContent = 'Signed in';
  els.profileStatus.className = 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800';

  // Update avatar
  if (user.photoURL) {
    els.profileAvatar.src = user.photoURL;
    els.profileAvatar.classList.remove('hidden');
    els.profileInitial.classList.add('hidden');
  } else {
    const initial = (user.email || 'U').charAt(0).toUpperCase();
    els.profileInitial.textContent = initial;
    els.profileAvatar.classList.add('hidden');
    els.profileInitial.classList.remove('hidden');
  }

  // Update preferences
  const currency = profile?.preferredCurrency || 'USD';
  const theme = profile?.theme || 'light';

  els.preferredCurrency.textContent = currency;
  els.preferredTheme.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
  els.accountType.textContent = 'Authenticated';

  // Load and display statistics
  await loadUserStatistics(user.uid);
}

/**
 * Updates the profile display for guest users
 */
function updateGuestProfile() {
  els.profileName.textContent = 'Guest User';
  els.profileEmail.textContent = 'Please sign in to view your profile';
  els.profileStatus.textContent = 'Not signed in';
  els.profileStatus.className = 'inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800';

  // Show guest avatar
  els.profileAvatar.classList.add('hidden');
  els.profileInitial.classList.remove('hidden');
  els.profileInitial.textContent = 'G';

  // Set default preferences
  els.preferredCurrency.textContent = 'USD';
  els.preferredTheme.textContent = 'Light';
  els.accountType.textContent = 'Guest';

  // Reset statistics
  els.totalOrders.textContent = '0';
  els.totalSpent.textContent = '$0.00';
  els.memberSince.textContent = '-';
}

/**
 * Loads and displays user statistics (orders, spending, etc.)
 * @param {string} uid - User ID
 */
async function loadUserStatistics(uid) {
  try {
    const orders = await getUserOrders(uid);

    // Calculate statistics
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalConverted || 0), 0);
    const firstOrder = orders.length > 0 ? orders[orders.length - 1].createdAt : null;

    // Update display
    els.totalOrders.textContent = totalOrders.toString();
    els.totalSpent.textContent = formatCurrency(totalSpent, 'USD');

    if (firstOrder) {
      const memberSinceDate = firstOrder.toDate ? firstOrder.toDate() : new Date(firstOrder);
      els.memberSince.textContent = memberSinceDate.toLocaleDateString();
    }

  } catch (error) {
    console.error('Error loading user statistics:', error);
    // Set default values on error
    els.totalOrders.textContent = '0';
    els.totalSpent.textContent = '$0.00';
    els.memberSince.textContent = '-';
  }
}

/**
 * Sets up authentication UI and handlers
 */
function setupAuthUI() {
  observeAuthState(async (user) => {
    if (user) {
      // User is authenticated
      els.authBtn.classList.add("hidden");
      els.userMenu.classList.remove("hidden");
      els.navUserEmail.textContent = user.email || "User";

      // Update navbar avatar
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

      // Load user profile and update display
      try {
        const profile = await getUserProfile(user.uid);
        await updateAuthenticatedProfile(user, profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
        await updateAuthenticatedProfile(user, null);
      }
    } else {
      // User is not authenticated
      els.authBtn.classList.remove("hidden");
      els.userMenu.classList.add("hidden");
      updateGuestProfile();
    }
  });

  // Sign in button (navbar)
  els.authBtn.addEventListener("click", () => {
    signInWithGooglePopup();
  });

  // Profile page sign in button
  els.signInBtn?.addEventListener("click", () => {
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
 * Sets up currency selection (read-only on profile page)
 */
function setupCurrencySelection() {
  // Load saved currency for display purposes
  try {
    const saved = localStorage.getItem('currency');
    if (saved) {
      els.currencySelect.value = saved;
    }
  } catch {}

  // Currency selection is disabled on profile page since preferences are managed elsewhere
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
 * Initialize the profile page
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
    const interactiveElements = document.querySelectorAll('button, a, .stat-card, .profile-avatar');
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-hover');
      });
      element.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover');
      });
    });
  }

  // Load initial profile state
  const user = getCurrentUser();
  if (user) {
    try {
      const profile = await getUserProfile(user.uid);
      await updateAuthenticatedProfile(user, profile);
    } catch (error) {
      console.error('Error loading initial profile:', error);
      await updateAuthenticatedProfile(user, null);
    }
  } else {
    updateGuestProfile();
  }
}

// Start the application
init();
