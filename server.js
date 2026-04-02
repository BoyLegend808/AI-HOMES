const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
    // Get the pathname and strip query parameters (like ?v=2.0)
    let urlPath = req.url.split('?')[0];

    // Redirect root to onboarding page
    if (urlPath === '/' || urlPath === '/index.html') {
        res.writeHead(302, { 'Location': '/onboarding/onboarding.html' });
        res.end();
        return;
    }

    // Try to find the file
    let filePath = path.join(__dirname, urlPath);

    // If no extension, try adding .html or looking in subdirectories
    const ext = path.extname(filePath);
    if (!ext) {
        // Try adding .html first (e.g., /home -> /home.html)
        if (fs.existsSync(filePath + '.html')) {
            filePath += '.html';
        } else {
            // Try subdirectory (e.g., /home -> /home/home.html)
            const basename = path.basename(urlPath);
            const subDirFile = path.join(filePath, basename + '.html');
            if (fs.existsSync(subDirFile)) {
                filePath = subDirFile;
            }
        }
    }

    // If the file still doesn't exist, try a "flat" search (e.g., /home.html -> /home/home.html)
    if (!fs.existsSync(filePath) && ext === '.html') {
        const basename = path.basename(urlPath);
        const folderName = basename.replace('.html', '');
        const potentialPath = path.join(__dirname, folderName, basename);
        if (fs.existsSync(potentialPath)) {
            filePath = potentialPath;
        }
    }

    console.log(`${req.method} ${req.url} -> ${filePath}`);

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File Not Found: ' + urlPath);
            } else if (error.code === 'EISDIR') {
                // Handle directory requests (e.g., /home/ -> /home/home.html)
                const basename = path.basename(urlPath);
                const subDirFile = path.join(filePath, (basename || 'index') + '.html');
                if (fs.existsSync(subDirFile)) {
                    fs.readFile(subDirFile, (err, subContent) => {
                        if (err) {
                            res.writeHead(500);
                            res.end('Server Error');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(subContent, 'utf-8');
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end('Directory listing not allowed');
                }
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`));