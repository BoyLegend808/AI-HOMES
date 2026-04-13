const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// API Routes
app.use("/api/auth", require("./routes/auth"));

// Handle all other routes by serving the appropriate HTML files
app.use((req, res) => {
  let urlPath = req.path;

  // Redirect root to onboarding page
  if (urlPath === "/" || urlPath === "/index.html") {
    return res.redirect("/onboarding/onboarding.html");
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

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}/`),
);
