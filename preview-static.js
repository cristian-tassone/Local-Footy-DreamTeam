'use strict';
// Minimal static file server for previewing standalone HTML files.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8777;
const DIR = __dirname;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon' };

http.createServer((req, res) => {
  const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = route === '/' ? 'footy-fantasy.html' : route.slice(1);
  const full = path.join(DIR, file);
  if (!full.startsWith(DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'text/plain' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => console.log('Preview static server on http://0.0.0.0:' + PORT));
