/**
 * AI HOMES — Frontend Security Utilities
 * Loaded globally via: <script src="/js/security.js"></script>
 *
 * Provides:
 *   - Input sanitization (XSS prevention before inserting into the DOM)
 *   - Form validation helpers
 *   - Safe DOM insertion wrapper
 *   - Client-side rate-limit guard (prevents accidental rapid form resubmit)
 */

(function (window) {
  "use strict";

  // ─── XSS / Sanitization ─────────────────────────────────────────────────────

  const HTML_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  /**
   * Escape a string so it is safe to place inside innerHTML.
   * Always prefer textContent over innerHTML when possible.
   *
   * @param {*} str - any value
   * @returns {string} HTML-escaped string
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"'`=/]/g, (c) => HTML_ESCAPE_MAP[c] || c);
  }

  /**
   * Strip all HTML tags from a string, leaving only plain text.
   *
   * @param {string} html
   * @returns {string}
   */
  function stripTags(html) {
    if (!html) return "";
    return String(html).replace(/<[^>]*>/g, "").trim();
  }

  /**
   * Sanitize a plain-text user input (names, messages, search queries).
   * - Strips leading/trailing whitespace
   * - Enforces max length
   * - Removes control characters
   *
   * @param {*} value
   * @param {number} [maxLength=500]
   * @returns {string}
   */
  function sanitizeInput(value, maxLength = 500) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/[\x00-\x1F\x7F]/g, "") // strip control chars
      .trim()
      .slice(0, maxLength);
  }

  /**
   * Sanitize and normalise an email address.
   *
   * @param {string} email
   * @returns {string}
   */
  function sanitizeEmail(email) {
    return sanitizeInput(email, 320).toLowerCase();
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  /**
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return typeof email === "string" && re.test(email) && email.length <= 320;
  }

  /**
   * Check password strength.
   * @param {string} password
   * @returns {{ valid: boolean, reason?: string }}
   */
  function validatePassword(password) {
    if (typeof password !== "string" || !password)
      return { valid: false, reason: "Password is required." };
    if (password.length < 8)
      return { valid: false, reason: "Password must be at least 8 characters." };
    if (password.length > 128)
      return { valid: false, reason: "Password is too long (max 128 characters)." };
    if (!/[A-Za-z]/.test(password))
      return { valid: false, reason: "Password must contain at least one letter." };
    if (!/[0-9]/.test(password))
      return { valid: false, reason: "Password must contain at least one number." };
    return { valid: true };
  }

  /**
   * Check that a value is a non-empty string within a max length.
   *
   * @param {*} value
   * @param {number} [maxLength=500]
   * @returns {boolean}
   */
  function isValidText(value, maxLength = 500) {
    return (
      typeof value === "string" && value.trim().length > 0 && value.length <= maxLength
    );
  }

  /**
   * Validate a phone number (Nigerian format: 070/080/090/081 + 8 digits).
   *
   * @param {string} phone
   * @returns {boolean}
   */
  function isValidPhone(phone) {
    return /^(0[789][01]\d{8}|234[789][01]\d{8})$/.test(
      String(phone).replace(/\s+/g, "")
    );
  }

  // ─── Safe DOM Helpers ────────────────────────────────────────────────────────

  /**
   * Safely set the text content of an element (no XSS risk).
   * Prefer this over element.innerHTML = userContent.
   *
   * @param {HTMLElement} el
   * @param {*} text
   */
  function safeText(el, text) {
    if (el) el.textContent = text == null ? "" : String(text);
  }

  /**
   * Safely insert HTML built from TRUSTED template literals.
   * User-supplied values must be passed through escapeHtml() first.
   *
   * Usage:
   *   safeHTML(container, `<p>${escapeHtml(user.name)}</p>`);
   *
   * @param {HTMLElement} el
   * @param {string} trustedHtml - HTML where ALL user values are already escaped
   */
  function safeHTML(el, trustedHtml) {
    if (el) el.innerHTML = trustedHtml;
  }

  // ─── Client-Side Rate-Limit Guard ────────────────────────────────────────────

  const _submitTimestamps = {};

  /**
   * Throttle form/action submissions per key.
   * Returns true if the action is allowed; false if it's too soon.
   *
   * @param {string} key     - unique action identifier (e.g. "forgot-password")
   * @param {number} coolMs  - minimum milliseconds between submissions
   * @returns {boolean}
   */
  function canSubmit(key, coolMs = 3000) {
    const now  = Date.now();
    const last = _submitTimestamps[key] || 0;
    if (now - last < coolMs) return false;
    _submitTimestamps[key] = now;
    return true;
  }

  // ─── Export to window.Security ───────────────────────────────────────────────

  window.Security = {
    escapeHtml,
    stripTags,
    sanitizeInput,
    sanitizeEmail,
    isValidEmail,
    validatePassword,
    isValidText,
    isValidPhone,
    safeText,
    safeHTML,
    canSubmit,
  };

})(window);
