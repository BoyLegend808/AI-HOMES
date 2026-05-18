/**
 * AI HOMES - Central Security Middleware
 * Covers: Rate Limiting, Security Headers, CORS, Input Sanitization, Admin Guard
 */

const rateLimit = require('express-rate-limit');

const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Allowed Origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://ai-homes.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',   // VS Code Live Server
  'http://127.0.0.1:5500',
];

// ─── Security Headers ─────────────────────────────────────────────────────────
const securityHeaders = (req, res, next) => {
  // Hide server identity
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy — no camera/mic/geo access
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS (only in production, 1 year)
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content Security Policy
  const supabaseHost = process.env.SUPABASE_URL
    ? new URL(process.env.SUPABASE_URL).host
    : 'loapruxjeolxyngmcszf.supabase.co';

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    `img-src 'self' data: blob: https://${supabaseHost} https://ai-homes.vercel.app https://images.unsplash.com https://via.placeholder.com`,
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  next();
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    // Same-origin requests (no Origin header) — allow
    res.setHeader('Access-Control-Allow-Origin', 'same-origin');
  }
  // If origin is set but NOT in allowlist → no header → browser blocks it

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hrs preflight cache

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
};

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// STRICT: Auth endpoints — brute-force / credential stuffing protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
  skipSuccessfulRequests: false,
});

// MODERATE: Config endpoint — fetched on every page load
const configLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many config requests. Please try again shortly.' },
});

// GENERAL: Everything else
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

// ─── Input Sanitization ───────────────────────────────────────────────────────

/**
 * Strip characters that could enable XSS in HTML contexts.
 * @param {*} str - value to sanitize
 * @param {number} maxLength - maximum allowed length
 * @returns {string}
 */
const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>'"&]/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
      '&': '&amp;',
    }[c]))
    .trim()
    .slice(0, maxLength);
};

/**
 * Normalize and constrain an email address.
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().slice(0, 320);
};

/**
 * Validate an email string (RFC 5322 simplified).
 */
const isValidEmail = (email) => {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return typeof email === 'string' && re.test(email) && email.length <= 320;
};

/**
 * Validate a password reset token — must be exactly 64 lowercase hex chars.
 */
const isValidToken = (token) => {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
};

/**
 * Validate password strength.
 * Returns { valid: boolean, reason?: string }
 */
const validatePassword = (password) => {
  if (typeof password !== 'string') return { valid: false, reason: 'Password must be a string.' };
  if (password.length < 8) return { valid: false, reason: 'Password must be at least 8 characters long.' };
  if (password.length > 128) return { valid: false, reason: 'Password must not exceed 128 characters.' };
  if (!/[A-Za-z]/.test(password)) return { valid: false, reason: 'Password must contain at least one letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, reason: 'Password must contain at least one number.' };
  return { valid: true };
};

// ─── Admin Secret Guard ───────────────────────────────────────────────────────
/**
 * Gate an endpoint behind ADMIN_SECRET header.
 * In production it returns 404 so the endpoint isn't discoverable.
 */
const requireAdminSecret = (req, res, next) => {
  const provided = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    // ADMIN_SECRET not set — always block
    return IS_PROD
      ? res.status(404).json({ error: 'Not found' })
      : res.status(503).json({ error: 'ADMIN_SECRET not configured in .env' });
  }

  if (!provided || provided !== expected) {
    return IS_PROD
      ? res.status(404).json({ error: 'Not found' })
      : res.status(401).json({ error: 'Unauthorized: invalid or missing X-Admin-Secret header.' });
  }

  next();
};

// ─── Request Body Size Guard ──────────────────────────────────────────────────
/**
 * Reject oversized bodies before they even hit route handlers.
 */
const bodyLimitErrorHandler = (err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }
  next(err);
};

module.exports = {
  securityHeaders,
  corsMiddleware,
  authLimiter,
  configLimiter,
  generalLimiter,
  sanitizeString,
  sanitizeEmail,
  isValidEmail,
  isValidToken,
  validatePassword,
  requireAdminSecret,
  bodyLimitErrorHandler,
};
