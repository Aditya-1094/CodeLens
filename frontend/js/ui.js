/**
 * CarbonLens SME - UI Helpers & Toast Notification System
 */

window.UI = {
  toastContainer: null,

  init() {
    this.initToastContainer();
    this.bindMobileDrawer();
  },

  initToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    this.toastContainer = container;
  },

  /**
   * Display a polished toast notification
   * @param {string} message 
   * @param {'success'|'error'|'info'|'warning'} type 
   * @param {number} duration 
   */
  showToast(message, type = 'info', duration = 3500) {
    if (!this.toastContainer) this.initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0 ${type === 'success' ? 'text-emerald-600' : type === 'error' ? 'text-red-600' : 'text-blue-600'}"></i>
      <span class="flex-1">${message}</span>
      <button type="button" class="toast-close text-gray-400 hover:text-gray-600 p-0.5">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;

    this.toastContainer.appendChild(toast);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    };

    if (closeBtn) closeBtn.addEventListener('click', removeToast);
    if (duration > 0) setTimeout(removeToast, duration);
  },

  /**
   * Mobile Sidebar Drawer Toggle
   */
  bindMobileDrawer() {
    const toggleBtn = document.getElementById('btn-toggle-mobile-sidebar');
    const closeBtn = document.getElementById('btn-close-mobile-sidebar');
    const sidebar = document.getElementById('app-sidebar');
    let overlay = document.getElementById('sidebar-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    const closeDrawer = () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
    };

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    overlay.addEventListener('click', closeDrawer);

    // Close mobile drawer on navigation click
    document.addEventListener('click', (e) => {
      if (e.target.closest('#app-sidebar .nav-link') || e.target.closest('#app-sidebar .trigger-demo-mode')) {
        closeDrawer();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar && sidebar.classList.contains('mobile-open')) {
        closeDrawer();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.UI.init();
});
