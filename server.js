const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
console.log("SERVER STATUS:", process.env.VERCEL ? "Production (Vercel)" : "Local Development");
// Serve static assets from specific directories only
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));


// API Routes
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/config", require("./routes/config"));
app.use("/api/diag", require("./routes/diag"));


// Handle all other routes by serving the appropriate HTML files
app.use((req, res) => {
  let urlPath = req.path;

  // Redirect root to onboarding page
  if (urlPath === "/" || urlPath === "/index.html") {
    return res.redirect("/onboarding/onboarding.html");
  }

  // DO NOT handle /api routes here - they are handled by previous routes
  if (urlPath.startsWith('/api/')) {
    return res.status(404).json({ error: "API route not found: " + urlPath });
  }

  // Try to find the file
  let filePath = path.join(__dirname, urlPath);

  // If no extension, try adding .html or looking in subdirectories
  const ext = path.extname(filePath);
  if (!ext) {
    // Try adding .html first (e.g., /home -> /home.html)
    if (fs.existsSync(filePath + ".html")) {
      filePath += ".html";
    } else {
      // Try subdirectory (e.g., /home -> /home/home.html)
      const basename = path.basename(urlPath);
      const subDirFile = path.join(filePath, basename + ".html");
      if (fs.existsSync(subDirFile)) {
        filePath = subDirFile;
      }
    }
  }

  // If the file still doesn't exist, try a "flat" search (e.g., /home.html -> /home/home.html)
  if (!fs.existsSync(filePath) && ext === ".html") {
    const basename = path.basename(urlPath);
    const folderName = basename.replace(".html", "");
    const potentialPath = path.join(__dirname, folderName, basename);
    if (fs.existsSync(potentialPath)) {
      filePath = potentialPath;
    }
  }

  // Serve the file or 404
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File Not Found: " + urlPath);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ 
    error: "Global server error", 
    message: err.message,
    path: req.path
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}/`),
  );
}

module.exports = app;
