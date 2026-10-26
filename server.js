/**
 * Nexus Homelab Dashboard - Server & API Proxy
 * Zero external npm dependencies required (uses native Node.js http/https/fs/path).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const {
  SECRET_MASK,
  loadConfig,
  saveConfig,
  sanitizeConfigForClient,
} = require('./src/lib/configManager');
const {
  listIntegrationSchemas,
  fetchServiceStatus,
} = require('./src/integrations');
const {
  getCredentials,
  createAuthToken,
  getAuthenticatedUser,
  buildAuthCookie,
  buildClearAuthCookie,
} = require('./src/lib/auth');
const {
  isVaultInitialized,
  encryptVaultData,
  decryptVaultData,
} = require('./src/lib/vault');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const BG_DIR = path.join(PUBLIC_DIR, 'backgrounds');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function readJsonBody(req, maxBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        return reject(new Error('Payload too large'));
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(reqPath, res) {
  const normalizedReq = reqPath === '/favicon.ico' ? '/favicon.svg' : reqPath;
  const safePath = path.normalize(normalizedReq).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // Auth Endpoint 1: GET /api/auth/session -> Check session & return public visual theme
    if (pathname === '/api/auth/session' && method === 'GET') {
      const rawConfig = loadConfig(false);
      const user = getAuthenticatedUser(req, rawConfig);
      const s = rawConfig.settings || {};
      return sendJson(res, 200, {
        authenticated: Boolean(user),
        username: user ? user.u : null,
        theme: {
          title: s.title,
          subtitle: s.subtitle,
          backgroundUrl: s.backgroundUrl,
          blurAmount: s.blurAmount,
          cardOpacity: s.cardOpacity,
          overlayOpacity: s.overlayOpacity,
        },
      });
    }

    // Auth Endpoint 2: POST /api/auth/login -> Verify credentials & issue token/cookie
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username = '', password = '', rememberDevice = true } = await readJsonBody(req);
      const rawConfig = loadConfig(false);
      const expected = getCredentials(rawConfig);

      const userMatch =
        String(username).trim().toLowerCase() === String(expected.username).trim().toLowerCase();
      const passMatch = String(password) === String(expected.password);

      if (!userMatch || !passMatch) {
        return sendJson(res, 401, { ok: false, error: 'Invalid username or password' });
      }

      const token = createAuthToken(expected.username, Boolean(rememberDevice), rawConfig);
      const cookie = buildAuthCookie(token, Boolean(rememberDevice));
      return sendJson(
        res,
        200,
        {
          ok: true,
          username: expected.username,
          token,
          rememberDevice: Boolean(rememberDevice),
        },
        { 'Set-Cookie': cookie }
      );
    }

    // Auth Endpoint 3: POST /api/auth/logout -> Clear session cookie
    if (pathname === '/api/auth/logout' && method === 'POST') {
      return sendJson(
        res,
        200,
        { ok: true },
        { 'Set-Cookie': buildClearAuthCookie() }
      );
    }

    // Protect all other /api/* endpoints
    if (pathname.startsWith('/api/')) {
      const rawConfig = loadConfig(false);
      const user = getAuthenticatedUser(req, rawConfig);
      if (!user) {
        return sendJson(res, 401, { error: 'Unauthorized. Please log in.' });
      }
    }

    // 1. GET /api/config -> Returns sanitized config & available integrations
    if (pathname === '/api/config' && method === 'GET') {
      const rawConfig = loadConfig(false);
      return sendJson(res, 200, {
        config: sanitizeConfigForClient(rawConfig),
        integrations: listIntegrationSchemas(),
      });
    }

    // 2. PUT /api/config -> Updates settings, bookmarks, or services list
    if (pathname === '/api/config' && method === 'PUT') {
      const body = await readJsonBody(req);
      const saved = saveConfig(body);
      return sendJson(res, 200, {
        ok: true,
        config: sanitizeConfigForClient(saved),
      });
    }

    // 3. POST /api/services -> Create or update a single service
    if (pathname === '/api/services' && method === 'POST') {
      const srv = await readJsonBody(req);
      if (!srv || !srv.name || !srv.url) {
        return sendJson(res, 400, { error: 'Service name and URL are required.' });
      }
      const current = loadConfig(false);
      const services = [...(current.services || [])];
      if (!srv.id) {
        srv.id = `srv-${Date.now().toString(36)}`;
      }
      const existingIdx = services.findIndex((s) => s.id === srv.id);
      if (existingIdx >= 0) {
        services[existingIdx] = { ...services[existingIdx], ...srv };
      } else {
        services.push(srv);
      }
      const saved = saveConfig({ ...current, services });
      return sendJson(res, 200, {
        ok: true,
        config: sanitizeConfigForClient(saved),
      });
    }

    // 4. DELETE /api/services/:id -> Remove a service
    if (pathname.startsWith('/api/services/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.slice('/api/services/'.length));
      const current = loadConfig(false);
      const filtered = (current.services || []).filter((s) => s.id !== id);
      const saved = saveConfig({ ...current, services: filtered });
      return sendJson(res, 200, {
        ok: true,
        config: sanitizeConfigForClient(saved),
      });
    }

    // 5. GET /api/status -> Poll all services in parallel
    if (pathname === '/api/status' && method === 'GET') {
      const config = loadConfig(true);
      const services = config.services || [];
      const results = await Promise.all(
        services.map((srv) => fetchServiceStatus(srv, config.settings))
      );
      const statusMap = {};
      results.forEach((r) => {
        statusMap[r.id] = r;
      });
      return sendJson(res, 200, {
        timestamp: new Date().toISOString(),
        demoMode: Boolean(config.settings?.demoMode),
        statuses: statusMap,
      });
    }

    // 6. GET /api/status/:id -> Poll a single service
    if (pathname.startsWith('/api/status/') && method === 'GET') {
      const id = decodeURIComponent(pathname.slice('/api/status/'.length));
      const config = loadConfig(true);
      const srv = (config.services || []).find((s) => s.id === id);
      if (!srv) {
        return sendJson(res, 404, { error: 'Service not found' });
      }
      const status = await fetchServiceStatus(srv, config.settings);
      return sendJson(res, 200, status);
    }

    // 7. POST /api/test-service -> Live connection test from Add/Edit Service modal
    if (pathname === '/api/test-service' && method === 'POST') {
      const candidate = await readJsonBody(req);
      const config = loadConfig(true);
      const existing = (config.services || []).find((s) => s.id === candidate.id);

      const mergedAuth = { ...(candidate.auth || {}) };
      if (existing && existing.auth) {
        for (const [k, v] of Object.entries(mergedAuth)) {
          if (v === SECRET_MASK) {
            mergedAuth[k] = existing.auth[k] || '';
          }
        }
      }

      const testSrv = {
        ...candidate,
        demoMode: false, // Always test real connection when clicking "Test Connection"
        auth: mergedAuth,
      };

      const status = await fetchServiceStatus(testSrv, { demoMode: false });
      return sendJson(res, 200, status);
    }

    // 8. POST /api/upload-background -> Upload custom background image from device
    if (pathname === '/api/upload-background' && method === 'POST') {
      const { dataUrl, filename } = await readJsonBody(req);
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return sendJson(res, 400, { error: 'Invalid image data URL' });
      }
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) {
        return sendJson(res, 400, { error: 'Malformed image data URL' });
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1].replace(/[^a-z0-9]/gi, '');
      const buffer = Buffer.from(match[2], 'base64');

      if (!fs.existsSync(BG_DIR)) {
        fs.mkdirSync(BG_DIR, { recursive: true });
      }

      const safeName = `wallpaper-${Date.now()}.${ext}`;
      const targetPath = path.join(BG_DIR, safeName);
      fs.writeFileSync(targetPath, buffer);

      const publicUrl = `/backgrounds/${safeName}`;
      return sendJson(res, 200, { ok: true, url: publicUrl, filename: filename || safeName });
    }

    // 9. GET /api/vault/status -> Check if encrypted credentials vault is initialized
    if (pathname === '/api/vault/status' && method === 'GET') {
      return sendJson(res, 200, { initialized: isVaultInitialized() });
    }

    // 10. POST /api/vault/setup -> Initialize encrypted vault with a Master Password
    if (pathname === '/api/vault/setup' && method === 'POST') {
      if (isVaultInitialized()) {
        return sendJson(res, 400, { error: 'Vault is already initialized.' });
      }
      const { masterPassword, seedFromServices = true } = await readJsonBody(req);
      if (!masterPassword || String(masterPassword).length < 4) {
        return sendJson(res, 400, { error: 'Master password must be at least 4 characters.' });
      }

      let initialEntries = [];
      if (seedFromServices) {
        const cfg = loadConfig(true);
        const seenUrls = new Set();
        (cfg.services || []).forEach((srv) => {
          if (seenUrls.has(srv.url)) return;
          seenUrls.add(srv.url);
          const a = srv.auth || {};
          initialEntries.push({
            id: `vlt-${srv.id}`,
            serviceName: srv.name,
            url: srv.url,
            username: a.username || (srv.type === 'proxmox' ? 'root' : ''),
            password: a.password || '',
            notes: a.apiKey
              ? `API Key configured`
              : a.tokenId
              ? `Token ID: ${a.tokenId}`
              : '',
          });
        });
      }

      encryptVaultData(initialEntries, masterPassword);
      return sendJson(res, 200, { ok: true, entries: initialEntries });
    }

    // 11. POST /api/vault/unlock -> Decrypt vault entries using Master Password
    if (pathname === '/api/vault/unlock' && method === 'POST') {
      const { masterPassword } = await readJsonBody(req);
      try {
        const entries = decryptVaultData(masterPassword);
        return sendJson(res, 200, { ok: true, entries });
      } catch (err) {
        return sendJson(res, 401, { ok: false, error: err.message || 'Invalid Master Password' });
      }
    }

    // 12. POST /api/vault/save -> Verify Master Password & save updated vault entries
    if (pathname === '/api/vault/save' && method === 'POST') {
      const { masterPassword, newMasterPassword, entries } = await readJsonBody(req);
      try {
        // Verify current master password first
        decryptVaultData(masterPassword);
        const targetPass =
          newMasterPassword && String(newMasterPassword).length >= 4
            ? newMasterPassword
            : masterPassword;
        encryptVaultData(entries, targetPass);
        return sendJson(res, 200, { ok: true, entries });
      } catch (err) {
        return sendJson(res, 401, { ok: false, error: err.message || 'Invalid Master Password' });
      }
    }

    // Static assets
    return serveStaticFile(pathname, res);
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`✨ Nexus Homelab Dashboard running at http://localhost:${PORT}`);
  });
}

module.exports = server;
