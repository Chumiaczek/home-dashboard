/**
 * Authentication & Remember-Device Token Manager
 * Uses deterministic HMAC-SHA256 signing so "Remember this device" tokens
 * remain valid even across server or Docker container restarts.
 */

const crypto = require('node:crypto');

const DEFAULT_USER = process.env.DASHBOARD_USER || 'admin';
const DEFAULT_PASS = process.env.DASHBOARD_PASSWORD || 'changeme';
const COOKIE_NAME = 'nexus_auth';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function getCredentials(config = {}) {
  const username =
    process.env.DASHBOARD_USER ||
    config?.settings?.authUsername ||
    DEFAULT_USER;
  const password =
    process.env.DASHBOARD_PASSWORD ||
    config?.settings?.authPassword ||
    DEFAULT_PASS;
  return { username, password };
}

function getSigningSecret(config = {}) {
  const { username, password } = getCredentials(config);
  return crypto
    .createHash('sha256')
    .update(`nexus-homelab-auth-v1:${username}:${password}`)
    .digest();
}

function createAuthToken(username, rememberDevice = true, config = {}) {
  const exp = rememberDevice
    ? Date.now() + ONE_YEAR_SECONDS * 1000
    : Date.now() + 24 * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp, rem: Boolean(rememberDevice) }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret(config))
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAuthToken(token, config = {}) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret(config))
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > decoded.exp) {
      return null;
    }
    const { username } = getCredentials(config);
    if (String(decoded.u).toLowerCase() !== String(username).toLowerCase()) {
      return null;
    }
    return decoded;
  } catch (_) {
    return null;
  }
}

function parseCookies(cookieHeader = '') {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

function getAuthenticatedUser(req, config = {}) {
  const cookies = parseCookies(req.headers.cookie || '');
  const headerToken = req.headers['x-auth-token'] || '';
  const token = headerToken || cookies[COOKIE_NAME];
  return verifyAuthToken(token, config);
}

function buildAuthCookie(token, rememberDevice = true) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (rememberDevice) {
    parts.push(`Max-Age=${ONE_YEAR_SECONDS}`);
  }
  return parts.join('; ');
}

function buildClearAuthCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  getCredentials,
  createAuthToken,
  verifyAuthToken,
  getAuthenticatedUser,
  buildAuthCookie,
  buildClearAuthCookie,
};
