/* ================================================
   StudentHome - Shared Enhancements
   Page transitions, back-to-top, dark/light mode,
   shared footer injection, toast notifications
   ================================================ */
(function () {
  "use strict";

  // Skip enhancements on onboarding page (it has its own full-screen layout)
  const isOnboarding = location.pathname.includes("/onboarding");

  // --- INJECT CSS ---
  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href =
    (document.querySelector('script[src*="enhancements"]')?.src || "").replace(
      "enhancements.js",
      "enhancements.css",
    ) || "../js/enhancements.css";
  // Resolve path relative to current page
  const basePath =
    document
      .querySelector('link[href*="nav.css"]')
      ?.href?.replace("nav.css", "") || "../js/";
  cssLink.href = basePath + "enhancements.css";
  document.head.appendChild(cssLink);

  // =========================================
  // 1. PAGE LOADING TRANSITION
  // =========================================
  if (!isOnboarding) {
    const loader = document.createElement("div");
    loader.className = "sh-page-loader";
    loader.innerHTML = '<div class="sh-loader-spinner"></div>';
    document.body.prepend(loader);

    const hideLoader = () => {
      loader.classList.add("loaded");
      setTimeout(() => loader.remove(), 500);
    };

    if (document.readyState === "complete") {
      hideLoader();
    } else {
      window.addEventListener("load", hideLoader);
      // Fallback: remove after 3s even if load event is slow
      setTimeout(hideLoader, 3000);
    }
  }

  // =========================================
  // 2. BACK TO TOP BUTTON (will be placed in footer)
  // =========================================
  // Button created after footer injection below

  // =========================================
  // 3. DARK/LIGHT MODE TOGGLE + 4. SHARED FOOTER WITH 3-ZONE LAYOUT
  // =========================================
  if (!isOnboarding) {
    const THEME_KEY = "sh-theme";
    const savedTheme = localStorage.getItem(THEME_KEY);

    const sunIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const moonIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    // Apply saved theme immediately (before paint)
    if (savedTheme === "light") {
      document.body.classList.add("light-mode");
    }

    // Only inject if page doesn't already have a site-footer or onboarding-footer
    const existingFooter = document.querySelector(
      ".site-footer, .onboarding-footer",
    );
    if (!existingFooter) {
      const footer = document.createElement("footer");
      footer.className = "sh-shared-footer";

      // LEFT ZONE: Theme Toggle
      const themeToggleHtml = `<button class="sh-theme-toggle" aria-label="Toggle light/dark mode">${document.body.classList.contains("light-mode") ? moonIcon : sunIcon}</button>`;

      // CENTER ZONE: Nav Links + Copyright
      const centerZoneHtml = `
        <div class="sh-footer-center">
          <div class="sh-footer-links">
            <a href="../home/home.html">Home</a>
            <a href="../about/about.html">About</a>
            <a href="../shop/shop.html">Browse Houses</a>
            <a href="../contact/contact.html">Contact</a>
            <a href="../privacy/privacy.html">Privacy</a>
            <a href="../terms/terms.html">Terms</a>
          </div>
          <p class="sh-footer-copy">&copy; 2026 StudentHome Nigeria Limited. All Rights Reserved.</p>
        </div>
      `;

      // RIGHT ZONE: Back-to-Top Button
      const backToTopHtml = `<button class="sh-back-to-top" aria-label="Back to top"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></button>`;

      footer.innerHTML = `
        <div class="sh-footer-inner">
          ${themeToggleHtml}
          ${centerZoneHtml}
          ${backToTopHtml}
        </div>
      `;

      // Append to .app-container if it exists, otherwise body
      const container =
        document.querySelector(".app-container") || document.body;
      container.appendChild(footer);

      // Theme toggle event listener
      const themeToggle = footer.querySelector(".sh-theme-toggle");
      themeToggle.addEventListener("click", () => {
        const isLight = document.body.classList.toggle("light-mode");
        localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
        themeToggle.innerHTML = isLight ? moonIcon : sunIcon;
      });

      // Back-to-top button event listener
      const backToTopBtn = footer.querySelector(".sh-back-to-top");
      backToTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      // Show/hide back-to-top on scroll
      let ticking = false;
      window.addEventListener("scroll", () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            backToTopBtn.classList.toggle("visible", window.scrollY > 400);
            ticking = false;
          });
          ticking = true;
        }
      });
    }
  }

  // =========================================
  // 5. SERVICE WORKER REGISTRATION
  // =========================================
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  // =========================================
  // 6. GLOBAL TOAST NOTIFICATION SYSTEM
  // =========================================
  const createToastContainer = () => {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  };

  const showToast = (message, type = "info", duration = 4000) => {
    const container = createToastContainer();
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  // Expose to global scope
  window.showToast = showToast;
})();
