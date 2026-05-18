const nodemailer = require("nodemailer");

const VERIFY_TTL_MS = 5 * 60 * 1000;
let transporter = null;
let verifyCache = { ok: null, reason: null, code: null, checkedAt: 0 };

function buildTransportConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    return {
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    };
  }

  // Gmail / Google Workspace — use explicit SMTP + App Password (not account password)
  return {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  };
}

function getTransporter() {
  if (transporter) return transporter;
  const config = buildTransportConfig();
  if (!config) return null;
  transporter = nodemailer.createTransport(config);
  return transporter;
}

function getFromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  const user = process.env.EMAIL_USER?.trim();
  if (from) {
    return from.includes("<") ? from : `"AI HOMES Support" <${from}>`;
  }
  if (user) return `"AI HOMES Support" <${user}>`;
  return '"AI HOMES Support" <no-reply@ai-homes.local>';
}

function isEmailConfigured() {
  return Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
}

async function verifyEmailTransport(force = false) {
  if (
    !force &&
    verifyCache.checkedAt &&
    Date.now() - verifyCache.checkedAt < VERIFY_TTL_MS &&
    verifyCache.ok !== null
  ) {
    return verifyCache;
  }

  if (!isEmailConfigured()) {
    verifyCache = {
      ok: false,
      reason: "EMAIL_USER or EMAIL_PASS is not set",
      code: "NOT_CONFIGURED",
      checkedAt: Date.now(),
    };
    return verifyCache;
  }

  const t = getTransporter();
  if (!t) {
    verifyCache = {
      ok: false,
      reason: "Could not create mail transporter",
      code: "TRANSPORT_ERROR",
      checkedAt: Date.now(),
    };
    return verifyCache;
  }

  try {
    await t.verify();
    verifyCache = { ok: true, reason: null, code: null, checkedAt: Date.now() };
  } catch (err) {
    let reason = err.message || "SMTP verification failed";
    if (err.code === "EAUTH") {
      reason =
        "SMTP login failed. For Gmail, use an App Password (Google Account → Security → App passwords), not your normal password.";
    }
    verifyCache = {
      ok: false,
      reason,
      code: err.code || "VERIFY_FAILED",
      checkedAt: Date.now(),
    };
  }

  return verifyCache;
}

function mapSendError(err) {
  if (err.code === "EAUTH") {
    return {
      code: "EAUTH",
      message:
        "Email login failed. Check EMAIL_USER and EMAIL_PASS in Vercel (Gmail needs an App Password).",
    };
  }
  if (err.code === "ECONNECTION" || err.code === "ETIMEDOUT") {
    return {
      code: err.code,
      message: "Could not reach the mail server. Check SMTP settings or try again later.",
    };
  }
  return {
    code: err.code || "SEND_FAILED",
    message: err.message || "Failed to send email.",
  };
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    const err = new Error("EMAIL_NOT_CONFIGURED");
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  return t.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text: text || undefined,
  });
}

module.exports = {
  isEmailConfigured,
  verifyEmailTransport,
  sendMail,
  mapSendError,
  getFromAddress,
};
