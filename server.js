const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const {
  securityHeaders,
  corsMiddleware,
  generalLimiter,
  authLimiter,
  configLimiter,
  bodyLimitErrorHandler,
} = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const IS_PROD = process.env.NODE_ENV === "production";

function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.set("trust proxy", 1); // Required for rate-limit to read real IP behind Vercel/proxy
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json({ limit: "50kb" }));         // Prevent large body DoS
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(bodyLimitErrorHandler);
app.use(generalLimiter);                           // Global rate limit baseline

// ─── Static Assets (whitelisted directories only) ────────────────────────────
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/js",     express.static(path.join(__dirname, "js")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// Auth routes — strict brute-force protection
app.use("/api/auth",   authLimiter,   require("./routes/auth"));

// Config route — moderate limiting (fetched on every page load)
app.use("/api/config", configLimiter, require("./routes/config"));

// Diagnostic route — admin-secret gated + not exposed in production
app.use("/api/diag", require("./routes/diag"));

// ─── HTML Page Serving ────────────────────────────────────────────────────────
app.use((req, res) => {
  const urlPath = req.path;

  // Redirect root
  if (urlPath === "/" || urlPath === "/index.html") {
    return res.redirect("/onboarding/onboarding.html");
  }

  // Unknown /api/* paths return JSON 404
  if (urlPath.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }

  // ── Path-Traversal Protection ──────────────────────────────────────────────
  // Resolve the full path and ensure it stays inside __dirname
  const requestedPath = path.join(__dirname, urlPath);
  if (!requestedPath.startsWith(path.join(__dirname))) {
    return res.status(400).json({ error: "Invalid path." });
  }

  // Try to find the HTML file
  let filePath = requestedPath;
  const ext = path.extname(filePath);

  if (!ext) {
    // /home  → try home.html then home/home.html
    if (fs.existsSync(filePath + ".html")) {
      filePath += ".html";
    } else {
      const basename = path.basename(urlPath);
      const subDirFile = path.join(filePath, basename + ".html");
      if (fs.existsSync(subDirFile)) filePath = subDirFile;
    }
  }

  // Flat search fallback: /home.html → /home/home.html
  if (!fs.existsSync(filePath) && ext === ".html") {
    const basename = path.basename(urlPath);
    const folderName = basename.replace(".html", "");
    const potentialPath = path.join(__dirname, folderName, basename);
    if (fs.existsSync(potentialPath)) filePath = potentialPath;
  }

  // Serve or 404
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  const page404 = path.join(__dirname, "404.html");
  res.status(404).sendFile(page404);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Never leak internal details to the client in production
app.use((err, req, res, _next) => {
  console.error("GLOBAL ERROR:", err);
  if (IS_PROD) {
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
  res.status(500).json({
    error: "Server error",
    message: err.message,
    path: req.path,
  });
});

// ─── Local Dev Server ─────────────────────────────────────────────────────────
if (!IS_PROD) {
  app.listen(PORT, HOST, () => {
    const localIp = getLocalIpAddress();
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`LAN access available at http://${localIp}:${PORT}/`);
  });
}

module.exports = app;
