// Simple SPA Router using History API with fade transitions

const routes = {
  '/': 'view-home',
  '/products': 'view-products',
  '/cart': 'view-cart',
  '/profile': 'view-profile',
};

function getPath() {
  return window.location.pathname || '/';
}

function showView(id) {
  const views = document.querySelectorAll('[data-view]');
  views.forEach((v) => {
    if (v.id === id) return;
    v.classList.add('hidden');
    v.classList.add('opacity-0');
  });

  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  // fade in
  requestAnimationFrame(() => {
    el.classList.remove('opacity-0');
  });
}

export function navigate(path) {
  const viewId = routes[path] || routes['/'];
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  showView(viewId);
  window.dispatchEvent(new CustomEvent('routechange', { detail: { path, viewId } }));
}

export function setupRouter() {
  // initial
  const initialPath = getPath();
  navigate(initialPath);

  // handle back/forward
  window.addEventListener('popstate', () => {
    const path = getPath();
    navigate(path);
  });

  // intercept clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href == null) return;
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) {
      e.preventDefault();
      navigate(url.pathname);
    }
  });
}


