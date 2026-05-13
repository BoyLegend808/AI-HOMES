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
  cssLink.href = basePath + "enhancements.css?v=5";
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
  // 3. DARK/LIGHT MODE TOGGLE + THEME PERSISTENCE
  // =========================================
  if (!isOnboarding) {
    const sunIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const moonIcon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    const applyTheme = (isLight) => {
      document.body.classList.toggle("light-mode", isLight);
      document.querySelectorAll(".sh-theme-toggle").forEach((btn) => {
        btn.innerHTML = isLight ? moonIcon : sunIcon;
      });
      localStorage.setItem("sh_theme_mode", isLight ? "light" : "dark");
    };

    // Initial theme load
    const savedTheme = localStorage.getItem("sh_theme_mode");
    const initialIsLight = savedTheme === "light";
    if (initialIsLight) {
      applyTheme(true);
    }

    // Export wiring function for manual use (though delegation handles most)
    window.wireThemeToggle = (btn) => {
      if (!btn) return;
      const isLight = document.body.classList.contains("light-mode");
      btn.innerHTML = isLight ? moonIcon : sunIcon;
    };

    // Event delegation for all current and future toggles
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".sh-theme-toggle, .nav-theme-btn");
      if (btn) {
        const currentlyLight = document.body.classList.contains("light-mode");
        applyTheme(!currentlyLight);
      }
    });

    // Retroactive wiring for existing buttons on load
    document.querySelectorAll(".sh-theme-toggle").forEach(window.wireThemeToggle);

    const navThemeBtn = document.getElementById("nav-theme-toggle");
    if (navThemeBtn) {
      window.wireThemeToggle(navThemeBtn);
    }

    // Signal that the theme system is ready for any dynamically added buttons
    document.dispatchEvent(new CustomEvent("themeSystemReady"));

    // Watch for new toggles added dynamically (MutationObserver)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList.contains("sh-theme-toggle")) {
              window.wireThemeToggle(node);
            }
            node.querySelectorAll(".sh-theme-toggle").forEach(window.wireThemeToggle);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // =========================================
  // 4. SHARED FOOTER WITH 3-ZONE LAYOUT
  // =========================================

    // Only inject if page doesn't already have a site-footer or onboarding-footer
    const existingFooter = document.querySelector(
      ".site-footer, .onboarding-footer",
    );
    if (!existingFooter) {
      const footer = document.createElement("footer");
      footer.className = "sh-shared-footer";

      // LEFT ZONE: empty spacer (theme toggle is now in the nav)
      const leftSpacerHtml = `<div class="sh-footer-spacer"></div>`;

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
          ${leftSpacerHtml}
          ${centerZoneHtml}
          ${backToTopHtml}
        </div>
      `;

      // Append to .app-container if it exists, otherwise body
      const container =
        document.querySelector(".app-container") || document.body;
      container.appendChild(footer);

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

  const showToast = (message, type = "info", duration = 3500) => {
    const container = createToastContainer();

    // Prevent duplicate toasts with the SAME message appearing at once
    const existingToasts = Array.from(
      container.querySelectorAll(".toast-message"),
    );
    if (existingToasts.some((t) => t.textContent === message)) return;

    // If there are more than 2 toasts, remove the oldest one to prevent clutter
    const currentToasts = container.querySelectorAll(".toast");
    if (currentToasts.length >= 2) {
      const oldest = currentToasts[0];
      oldest.classList.add("toast-exit");
      setTimeout(() => oldest.remove(), 400);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success:
        '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error:
        '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning:
        '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove after duration
    const timeoutId = setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 400);
      }
    }, duration);

    // Allow clicking to dismiss
    toast.onclick = () => {
      clearTimeout(timeoutId);
      toast.classList.add("toast-exit");
      setTimeout(() => toast.remove(), 400);
    };
  };

  // Expose to global scope
  window.showToast = showToast;
})();
