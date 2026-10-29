/* Tiny static server for the browser tests: serves the repo root under /bidding-wars/
   (index.html has <base href="/bidding-wars/">). No dependencies. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.env.BW_ROOT || path.join(__dirname, '..'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
module.exports = function serve(port = 0) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (!p.startsWith('/bidding-wars/')) { res.writeHead(404); return res.end(); }
    p = p.slice('/bidding-wars/'.length) || 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/bidding-wars/index.html' })));
};
