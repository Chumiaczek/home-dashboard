/**
 * Ubiquiti EdgeOS (EdgeRouter) Integration
 * Authenticates via EdgeOS session (beaker.session.id) and streams live
 * system-stats (CPU, RAM, Uptime) & interface throughput via /ws/stats + /api/edge/data.json.
 */

const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatSpeed, formatUptime, clampPercent } = require('../lib/formatters');

/**
 * Encode a client-to-server masked WebSocket text frame (RFC 6455)
 */
function encodeWsTextFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  const maskKey = crypto.randomBytes(4);

  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = 0x80 | len; // Masked + length
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  const maskedPayload = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    maskedPayload[i] = payload[i] ^ maskKey[i % 4];
  }

  return Buffer.concat([header, maskKey, maskedPayload]);
}

/**
 * Connect to EdgeOS /ws/stats WebSocket to read live CPU, RAM, Uptime, and WAN interface stats.
 */
function fetchEdgeOsWsStats(baseUrl, cookieHeader, sessionId, verifySsl = false, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(baseUrl);
    } catch (_) {
      return resolve({});
    }

    const isHttps = parsed.protocol === 'https:';
    const port = Number(parsed.port || (isHttps ? 443 : 80));
    const host = parsed.hostname;
    const wsKey = crypto.randomBytes(16).toString('base64');

    const result = {
      systemStats: null,
      interfaces: null,
    };

    let settled = false;
    let socket = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        if (socket) socket.destroy();
      } catch (_) {}
      resolve(result);
    };

    const timer = setTimeout(finish, timeoutMs);

    const onConnect = () => {
      const upgradeReq = [
        'GET /ws/stats HTTP/1.1',
        `Host: ${parsed.host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Origin: ${baseUrl}`,
        `Cookie: ${cookieHeader}`,
        `Sec-WebSocket-Key: ${wsKey}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n');

      socket.write(upgradeReq);
    };

    socket = isHttps
      ? tls.connect(
          {
            host,
            port,
            servername: host,
            rejectUnauthorized: Boolean(verifySsl),
          },
          onConnect
        )
      : net.connect({ host, port }, onConnect);

    let upgraded = false;
    let rawBuffer = Buffer.alloc(0);
    let textAccumulator = '';

    socket.on('data', (chunk) => {
      rawBuffer = Buffer.concat([rawBuffer, chunk]);

      if (!upgraded) {
        const headerEnd = rawBuffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        const headerStr = rawBuffer.slice(0, headerEnd).toString('utf8');
        rawBuffer = rawBuffer.slice(headerEnd + 4);

        if (!headerStr.includes('101')) {
          clearTimeout(timer);
          return finish();
        }

        upgraded = true;
        const subMsg = JSON.stringify({
          SUBSCRIBE: [{ name: 'system-stats' }, { name: 'interfaces' }],
          UNSUBSCRIBE: [],
          SESSION_ID: sessionId,
        });
        const framedSub = `${Buffer.byteLength(subMsg)}\n${subMsg}`;
        socket.write(encodeWsTextFrame(framedSub));
      }

      // Parse incoming server-to-client WebSocket frames
      while (rawBuffer.length >= 2) {
        const secondByte = rawBuffer[1];
        const isMasked = (secondByte & 0x80) !== 0;
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (rawBuffer.length < 4) break;
          payloadLen = rawBuffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (rawBuffer.length < 10) break;
          payloadLen = Number(rawBuffer.readBigUInt64BE(2));
          offset = 10;
        }

        if (isMasked) offset += 4;
        if (rawBuffer.length < offset + payloadLen) break;

        const frameData = rawBuffer.slice(offset, offset + payloadLen);
        rawBuffer = rawBuffer.slice(offset + payloadLen);

        textAccumulator += frameData.toString('utf8');

        // Extract JSON objects from EdgeOS length-prefixed stream (<len>\n{...})
        const jsonMatches = textAccumulator.match(/\{[\s\S]*?\}(?=\s*(?:\d+\n|$))/g) || [];
        for (const candidate of jsonMatches) {
          try {
            const parsedJson = JSON.parse(candidate);
            if (parsedJson['system-stats']) {
              result.systemStats = parsedJson['system-stats'];
            }
            if (parsedJson.interfaces) {
              result.interfaces = parsedJson.interfaces;
            }
          } catch (_) {
            // Partial JSON chunk, wait for more data
          }
        }

        if (result.systemStats && result.interfaces) {
          clearTimeout(timer);
          return finish();
        }
      }
    });

    socket.on('error', () => {
      clearTimeout(timer);
      finish();
    });

    socket.on('close', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

module.exports = {
  type: 'edgeos',
  name: 'EdgeOS',
  category: 'Network',
  defaultPort: 443,
  icon: 'edgeos',
  color: '#00A0DF',
  description: 'Connect to Ubiquiti EdgeRouter via Web UI credentials or monitor router HTTPS reachability.',
  authFields: [
    {
      key: 'username',
      label: 'Username',
      type: 'text',
      placeholder: 'ubnt',
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      placeholder: '••••••••',
    },
    {
      key: 'wanInterface',
      label: 'WAN Interface (Default: eth0)',
      type: 'text',
      placeholder: 'eth0',
    },
  ],

  getDemoData() {
    const cpu = clampPercent(9 + Math.floor(Math.random() * 6));
    const mem = 41;
    return {
      online: true,
      latencyMs: 6 + Math.floor(Math.random() * 4),
      statusText: 'Routing Active',
      statusLevel: 'ok',
      version: 'EdgeOS v2.0.9-hotfix.7',
      metrics: [
        { label: 'Router CPU', value: `${cpu}%`, progress: cpu },
        { label: 'Router Memory', value: `${mem}%`, progress: mem },
        { label: 'WAN (eth0)', value: 'UP • 1000 Mbps Full' },
        { label: 'System Uptime', value: '112d 04h' },
      ],
      badges: ['HW Offload: Enabled', 'Firewall: Active'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);
    const wanIface = (auth.wanInterface || 'eth0').trim();

    if (!auth.username || !auth.password) {
      const ping = await checkReachability(baseUrl, verifySsl);
      return {
        online: ping.online,
        latencyMs: ping.latencyMs,
        statusText: ping.online ? 'Router Reachable' : 'Offline',
        statusLevel: ping.online ? 'ok' : 'error',
        metrics: [
          { label: 'Gateway Status', value: ping.online ? 'Online' : 'Unreachable' },
          { label: 'Ping / HTTP Latency', value: `${ping.latencyMs} ms` },
        ],
        badges: ['Add EdgeOS credentials for CPU/RAM stats'],
      };
    }

    const startTime = performance.now();

    // Step 1: Authenticate at POST / to obtain beaker.session.id & X-CSRF-TOKEN
    const formBody = new URLSearchParams({
      username: auth.username,
      password: auth.password,
    }).toString();

    const loginRes = await request(`${baseUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${baseUrl}/`,
        Origin: baseUrl,
      },
      body: formBody,
      verifySsl,
      maxRedirects: 0,
    });

    const cookies = loginRes.cookies || [];
    const cookieHeader = cookies.join('; ');
    const sessionCookie = cookies.find((c) => c.startsWith('beaker.session.id='));
    const sessionId = sessionCookie ? sessionCookie.split('=')[1] : '';
    const csrfCookie = cookies.find((c) => c.startsWith('X-CSRF-TOKEN='));
    const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : '';

    if (!sessionId) {
      throw new Error('EdgeOS login failed (invalid credentials or no session cookie)');
    }

    const apiHeaders = {
      Cookie: cookieHeader,
      ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${baseUrl}/`,
    };

    // Step 2: Fetch live stats from /ws/stats and firmware info from /api/edge/data.json?data=sys_info in parallel
    const [wsData, sysInfoRes] = await Promise.all([
      fetchEdgeOsWsStats(baseUrl, cookieHeader, sessionId, verifySsl, 3800),
      request(`${baseUrl}/api/edge/data.json?data=sys_info`, {
        headers: apiHeaders,
        verifySsl,
      }).catch(() => null),
    ]);

    const latencyMs = loginRes.latencyMs || Math.round(performance.now() - startTime);
    const sysStats = wsData.systemStats || {};
    const interfaces = wsData.interfaces || {};
    const wan = interfaces[wanIface] || {};
    const sysInfo = sysInfoRes?.data?.output || {};

    const cpu = clampPercent(Number(sysStats.cpu ?? sysInfo.cpu ?? 0));
    const mem = clampPercent(Number(sysStats.mem ?? sysInfo.mem ?? 0));
    const uptimeSec = Number(sysStats.uptime ?? sysInfo.uptime ?? 0);

    // Format WAN status & live throughput if available
    let wanValue = 'UP • Connected';
    if (wan.stats && (wan.stats.rx_bps !== undefined || wan.stats.tx_bps !== undefined)) {
      const rxBytesSec = Number(wan.stats.rx_bps || 0);
      const txBytesSec = Number(wan.stats.tx_bps || 0);
      wanValue = `↓ ${formatSpeed(rxBytesSec)} • ↑ ${formatSpeed(txBytesSec)}`;
    } else if (wan.speed) {
      wanValue = `UP • ${wan.speed} Mbps`;
    }

    const swVer = sysInfo.sw_ver
      ? String(sysInfo.sw_ver).split('.').slice(2, 5).join('.') || String(sysInfo.sw_ver)
      : undefined;

    const wanIp = Array.isArray(wan.addresses) && wan.addresses[0]
      ? wan.addresses[0].split('/')[0]
      : null;

    return {
      online: true,
      latencyMs,
      statusText: 'Routing Active',
      statusLevel: 'ok',
      version: swVer,
      metrics: [
        { label: 'Router CPU', value: `${cpu}%`, progress: cpu },
        { label: 'Router RAM', value: `${mem}%`, progress: mem },
        { label: `WAN (${wanIface})`, value: wanValue },
        { label: 'Uptime', value: uptimeSec ? formatUptime(uptimeSec) : 'Online' },
      ],
      badges: [
        wanIp ? `WAN IP: ${wanIp}` : `Interface: ${wanIface}`,
        wan.speed ? `Link: ${wan.speed} Mbps` : null,
      ].filter(Boolean),
    };
  },
};
