/**
 * Lightweight, zero-dependency HTTP/HTTPS client tailored for homelab APIs.
 * Supports self-signed SSL certificates, session cookies, custom headers,
 * form/JSON payloads, redirects, and latency measurement.
 */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

/**
 * Perform an HTTP/HTTPS request with homelab-friendly defaults.
 *
 * @param {string} urlStr - Full URL to request
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {object} [options.headers={}]
 * @param {string|Buffer|object} [options.body]
 * @param {boolean} [options.verifySsl=false] - False by default for self-signed homelab certs
 * @param {number} [options.timeoutMs=6000]
 * @param {number} [options.maxRedirects=3]
 * @returns {Promise<{ok: boolean, status: number, statusText: string, headers: object, cookies: string[], data: any, rawText: string, latencyMs: number}>}
 */
function request(urlStr, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    verifySsl = false,
    timeoutMs = 6000,
    maxRedirects = 3,
  } = options;

  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(urlStr);
    } catch (err) {
      return reject(new Error(`Invalid URL: ${urlStr}`));
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const reqHeaders = {
      'User-Agent': 'NexusHomeDashboard/1.0',
      Accept: 'application/json, text/plain, */*',
      ...headers,
    };

    let payload = null;
    if (body !== null && body !== undefined) {
      if (typeof body === 'object' && !Buffer.isBuffer(body)) {
        payload = JSON.stringify(body);
        if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
      } else {
        payload = String(body);
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const reqOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: method.toUpperCase(),
      headers: reqHeaders,
      timeout: timeoutMs,
      ...(isHttps ? { rejectUnauthorized: Boolean(verifySsl) } : {}),
    };

    const req = transport.request(reqOptions, (res) => {
      const status = res.statusCode || 0;
      const setCookieHeader = res.headers['set-cookie'] || [];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader.map((c) => c.split(';')[0])
        : [String(setCookieHeader).split(';')[0]];

      // Follow redirects if needed (for simple GET/HEAD requests)
      if (
        [301, 302, 303, 307, 308].includes(status) &&
        res.headers.location &&
        maxRedirects > 0 &&
        ['GET', 'HEAD'].includes(method.toUpperCase())
      ) {
        res.resume();
        const redirectUrl = new URL(res.headers.location, parsedUrl).toString();
        return request(redirectUrl, {
          ...options,
          maxRedirects: maxRedirects - 1,
        })
          .then(resolve)
          .catch(reject);
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const latencyMs = Math.round(performance.now() - startTime);
        const rawText = Buffer.concat(chunks).toString('utf8');
        let data = rawText;
        try {
          if (rawText && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
            data = JSON.parse(rawText);
          }
        } catch (_) {
          // Keep as rawText if not valid JSON
        }

        resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText: res.statusMessage || '',
          headers: res.headers,
          cookies,
          data,
          rawText,
          latencyMs,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Simple reachability check (HTTP/HTTPS HEAD or GET) for when no API credentials are set
 * or to test if the web UI is reachable.
 */
async function checkReachability(baseUrl, verifySsl = false, timeoutMs = 4500) {
  const startTime = performance.now();
  try {
    const res = await request(baseUrl, {
      method: 'GET',
      verifySsl,
      timeoutMs,
      maxRedirects: 3,
    });
    // Even a 401/403 from a service login page means the service HTTP server is alive and responding!
    const isAlive = res.status > 0 && res.status < 502;
    return {
      online: isAlive,
      status: res.status,
      latencyMs: res.latencyMs || Math.round(performance.now() - startTime),
    };
  } catch (err) {
    return {
      online: false,
      status: 0,
      latencyMs: Math.round(performance.now() - startTime),
      error: err.message,
    };
  }
}

function normalizeUrl(urlStr) {
  if (!urlStr) return '';
  return String(urlStr).trim().replace(/\/+$/, '');
}

module.exports = {
  request,
  checkReachability,
  normalizeUrl,
};
