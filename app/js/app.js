/**
 * LA Real Estate Alerts — Main Application Logic
 * Handles data loading, card rendering, filtering, search, favorites, navigation, and modals.
 */

// ──────────────────────────────────────────────
// Constants & Category config
// ──────────────────────────────────────────────
const CATEGORIES = {
  zoning:       { label: 'Zonificación',  icon: '🏗️', color: '#887bb5' },
  rent:         { label: 'Rentas',        icon: '🏠', color: '#b87a91' },
  adu:          { label: 'ADU',           icon: '🏡', color: '#6aa19a' },
  construction: { label: 'Construcción',  icon: '🔨', color: '#b58c58' },
  tax:          { label: 'Impuestos',     icon: '💰', color: '#a6924b' },
  policy:       { label: 'Política',      icon: '📜', color: '#68947a' },
  legal:        { label: 'Legal',         icon: '⚖️', color: '#a35f5f' },
  other:        { label: 'Otros',         icon: '📄', color: '#6a6870' },
};

const DATA_URL = 'data/alerts.json';
const FAVORITES_KEY = 'la_alerts_favorites';
const SETTINGS_KEY = 'la_alerts_settings';

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────
let allAlerts = [];
let filteredAlerts = [];
let favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
let activeFilter = 'all';
let searchQuery = '';
let currentView = 'alerts';

// ──────────────────────────────────────────────
// DOM references
// ──────────────────────────────────────────────
const $alertsGrid = document.getElementById('alerts-grid');
const $favoritesGrid = document.getElementById('favorites-grid');
const $emptyState = document.getElementById('empty-state');
const $favoritesEmpty = document.getElementById('favorites-empty');
const $searchInput = document.getElementById('search-input');
const $filtersBar = document.getElementById('filters-bar');
const $modalBackdrop = document.getElementById('modal-backdrop');
const $modal = document.getElementById('alert-modal');
const $toastContainer = document.getElementById('toast-container');

// Stats
const $statTotal = document.getElementById('stat-total');
const $statToday = document.getElementById('stat-today');
const $statWeek = document.getElementById('stat-week');
const $statCategories = document.getElementById('stat-categories');
const $tabCountAlerts = document.getElementById('tab-count-alerts');
const $tabCountFavorites = document.getElementById('tab-count-favorites');

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return d >= weekAgo;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

// ──────────────────────────────────────────────
// Toast Notifications
// ──────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  $toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ──────────────────────────────────────────────
// Data loading
// ──────────────────────────────────────────────
async function loadAlerts() {
  try {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    allAlerts = (data.alerts || []).sort((a, b) =>
      new Date(b.published) - new Date(a.published)
    );
    applyFilters();
    updateStats();
    showToast(`${allAlerts.length} alertas cargadas`, 'success');
  } catch (err) {
    console.error('Error cargando alertas:', err);
    showToast('Error cargando alertas', 'error');
  }
}

// ──────────────────────────────────────────────
// Filtering & search
// ──────────────────────────────────────────────
function applyFilters() {
  let results = [...allAlerts];

  // Category filter
  if (activeFilter !== 'all') {
    results = results.filter(a => a.category === activeFilter);
  }

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    results = results.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.summary || '').toLowerCase().includes(q) ||
      (a.source || '').toLowerCase().includes(q)
    );
  }

  filteredAlerts = results;
  renderAlerts();
  renderFavorites();
}

// ──────────────────────────────────────────────
// Rendering alert cards
// ──────────────────────────────────────────────
function createAlertCard(alert, index) {
  const cat = CATEGORIES[alert.category] || CATEGORIES.other;
  const isFav = favorites.has(alert.id);

  const card = document.createElement('div');
  card.className = 'glass-card alert-card';
  card.setAttribute('data-category', alert.category || 'other');
  card.style.animationDelay = `${Math.min(index * 0.05, 0.6)}s`;

  card.innerHTML = `
    <div class="alert-card__header">
      <div class="alert-card__category">
        <span class="alert-card__category-icon">${cat.icon}</span>
        ${cat.label}
      </div>
      <button class="alert-card__fav ${isFav ? 'active' : ''}" 
              data-id="${alert.id}" 
              title="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
        ${isFav ? '★' : '☆'}
      </button>
    </div>
    <div class="alert-card__title">${escapeHtml(alert.title)}</div>
    <div class="alert-card__meta">
      <span class="alert-card__meta-item">📰 ${escapeHtml(alert.source)}</span>
      <span class="alert-card__meta-item">🕐 ${timeAgo(alert.published)}</span>
    </div>
  `;

  // Click card → open modal
  card.addEventListener('click', (e) => {
    if (e.target.closest('.alert-card__fav')) return;
    openModal(alert);
  });

  // Favorite button
  const favBtn = card.querySelector('.alert-card__fav');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(alert.id, favBtn);
  });

  return card;
}

function renderAlerts() {
  $alertsGrid.innerHTML = '';

  if (filteredAlerts.length === 0) {
    $emptyState.style.display = 'block';
    return;
  }

  $emptyState.style.display = 'none';
  filteredAlerts.forEach((alert, i) => {
    $alertsGrid.appendChild(createAlertCard(alert, i));
  });
}

function renderFavorites() {
  const favAlerts = allAlerts.filter(a => favorites.has(a.id));
  $favoritesGrid.innerHTML = '';

  if (favAlerts.length === 0) {
    $favoritesEmpty.style.display = 'block';
  } else {
    $favoritesEmpty.style.display = 'none';
    favAlerts.forEach((alert, i) => {
      $favoritesGrid.appendChild(createAlertCard(alert, i));
    });
  }

  $tabCountFavorites.textContent = favorites.size;
}

// ──────────────────────────────────────────────
// Favorites
// ──────────────────────────────────────────────
function toggleFavorite(id, btnEl) {
  if (favorites.has(id)) {
    favorites.delete(id);
    if (btnEl) {
      btnEl.classList.remove('active');
      btnEl.innerHTML = '☆';
      btnEl.title = 'Agregar a favoritos';
    }
    showToast('Quitado de favoritos', 'info');
  } else {
    favorites.add(id);
    if (btnEl) {
      btnEl.classList.add('active');
      btnEl.innerHTML = '★';
      btnEl.title = 'Quitar de favoritos';
    }
    showToast('Guardado en favoritos ⭐', 'success');
  }
  saveFavorites();
  $tabCountFavorites.textContent = favorites.size;

  // Re-render favorites view if it's active
  if (currentView === 'favorites') {
    renderFavorites();
  }
}

// ──────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────
function updateStats() {
  const total = allAlerts.length;
  const today = allAlerts.filter(a => isToday(a.published)).length;
  const week = allAlerts.filter(a => isThisWeek(a.published)).length;
  const cats = new Set(allAlerts.map(a => a.category)).size;

  // Animate count up
  animateCounter($statTotal, total);
  animateCounter($statToday, today);
  animateCounter($statWeek, week);
  animateCounter($statCategories, cats);
  $tabCountAlerts.textContent = total;
}

function animateCounter(el, target) {
  let current = 0;
  const step = Math.max(1, Math.floor(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 30);
}

// ──────────────────────────────────────────────
// Modal
// ──────────────────────────────────────────────
let currentModalAlert = null;

function openModal(alert) {
  currentModalAlert = alert;
  const cat = CATEGORIES[alert.category] || CATEGORIES.other;

  document.getElementById('modal-category').innerHTML =
    `<span style="color: ${cat.color}">${cat.icon} ${cat.label}</span>`;
  document.getElementById('modal-title').textContent = alert.title;
  document.getElementById('modal-meta').innerHTML = `
    <span>📰 ${escapeHtml(alert.source)}</span>
    <span>📅 ${formatDate(alert.published)}</span>
  `;
  document.getElementById('modal-summary').textContent = alert.summary || 'Sin resumen disponible.';
  document.getElementById('modal-link').href = alert.link;

  const modalFavBtn = document.getElementById('modal-fav-btn');
  const isFav = favorites.has(alert.id);
  modalFavBtn.textContent = isFav ? '★ Guardado' : '⭐ Guardar';

  $modalBackdrop.classList.add('visible');
  $modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $modalBackdrop.classList.remove('visible');
  $modal.classList.remove('visible');
  document.body.style.overflow = '';
  currentModalAlert = null;
}

// ──────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────
function switchView(viewName) {
  currentView = viewName;

  // Update tab state (desktop)
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });

  // Update bottom nav (mobile)
  document.querySelectorAll('.bottom-nav__item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Show/hide sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });
  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) targetSection.classList.add('active');

  // Trigger section-specific init
  if (viewName === 'stats' && allAlerts.length > 0) {
    if (typeof initCharts === 'function') initCharts(allAlerts);
  }
  if (viewName === 'map') {
    if (typeof initMap === 'function') initMap(allAlerts);
  }
  if (viewName === 'favorites') {
    renderFavorites();
  }
}

// ──────────────────────────────────────────────
// Event listeners
// ──────────────────────────────────────────────
function setupEventListeners() {
  // Search
  let searchTimeout;
  $searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value;
      applyFilters();
    }, 250);
  });

  // Filter chips
  $filtersBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    $filtersBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    applyFilters();
  });

  // Nav tabs (desktop)
  document.getElementById('nav-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.nav-tab');
    if (tab) switchView(tab.dataset.view);
  });

  // Bottom nav (mobile)
  document.getElementById('bottom-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.bottom-nav__item');
    if (item) switchView(item.dataset.view);
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  $modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Modal favorite
  document.getElementById('modal-fav-btn').addEventListener('click', () => {
    if (!currentModalAlert) return;
    const isFav = favorites.has(currentModalAlert.id);
    toggleFavorite(currentModalAlert.id, null);
    const btn = document.getElementById('modal-fav-btn');
    btn.textContent = !isFav ? '★ Guardado' : '⭐ Guardar';
    // Also update card in grid
    applyFilters();
  });

  // Refresh
  document.getElementById('btn-refresh').addEventListener('click', () => {
    loadAlerts();
  });

  // PWA install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('btn-install').style.display = '';
  });

  document.getElementById('btn-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('¡App instalada! 🎉', 'success');
    }
    deferredPrompt = null;
    document.getElementById('btn-install').style.display = 'none';
  });

  // Notification toggle
  document.getElementById('toggle-notifications').addEventListener('change', async (e) => {
    if (e.target.checked) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          e.target.checked = false;
          showToast('Permiso de notificaciones denegado', 'error');
        } else {
          showToast('Notificaciones activadas 🔔', 'success');
        }
      }
    }
  });
}

// ──────────────────────────────────────────────
// Service Worker registration
// ──────────────────────────────────────────────
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker registrado');
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  }
}

// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAlerts();
  registerSW();
});
