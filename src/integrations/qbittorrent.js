/**
 * qBittorrent WebUI Integration
 * Supports SID cookie auth (/api/v2/auth/login) and local subnet auth bypass
 * Fetches transfer speeds (/api/v2/transfer/info) and torrent states (/api/v2/torrents/info)
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatBytes, formatSpeed } = require('../lib/formatters');

module.exports = {
  type: 'qbittorrent',
  name: 'qBittorrent',
  category: 'Downloads',
  defaultPort: 8080,
  icon: 'qbittorrent',
  color: '#2F67BA',
  description: 'Connect using your qBittorrent WebUI Username & Password (or leave blank if local subnet bypass is enabled).',
  authFields: [
    {
      key: 'username',
      label: 'WebUI Username',
      type: 'text',
      placeholder: 'admin',
    },
    {
      key: 'password',
      label: 'WebUI Password',
      type: 'password',
      placeholder: '••••••••',
    },
  ],

  getDemoData() {
    const dlSpeed = (28.4 + Math.random() * 6.2) * 1024 * 1024;
    const upSpeed = (4.1 + Math.random() * 1.4) * 1024 * 1024;
    return {
      online: true,
      latencyMs: 8 + Math.floor(Math.random() * 5),
      statusText: '3 Downloading',
      statusLevel: 'ok',
      version: 'v5.0.1',
      metrics: [
        { label: 'Download Speed', value: `↓ ${formatSpeed(dlSpeed)}` },
        { label: 'Upload Speed', value: `↑ ${formatSpeed(upSpeed)}` },
        { label: 'Active Torrents', value: '3 DL • 84 Seeding' },
        { label: 'Session Data', value: '↓ 142 GB • ↑ 318 GB' },
      ],
      badges: ['Status: Connected', 'DHT: 412 Nodes'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);

    const headers = {
      Referer: baseUrl,
      Origin: baseUrl,
    };

    if (auth.username && auth.password) {
      const formBody = new URLSearchParams({
        username: auth.username,
        password: auth.password,
      }).toString();

      const loginRes = await request(`${baseUrl}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        verifySsl,
      });

      if (loginRes.cookies && loginRes.cookies.length > 0) {
        headers.Cookie = loginRes.cookies.join('; ');
      }
    }

    const [transferRes, torrentsRes, versionRes] = await Promise.all([
      request(`${baseUrl}/api/v2/transfer/info`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v2/torrents/info`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v2/app/version`, { headers, verifySsl }).catch(() => null),
    ]);

    if (!transferRes || !transferRes.ok) {
      // If unauthorized because no credentials were provided yet, check reachability
      if (!auth.username && !auth.password) {
        const ping = await checkReachability(baseUrl, verifySsl);
        return {
          online: ping.online,
          latencyMs: ping.latencyMs,
          statusText: ping.online ? 'Reachable (Auth Required)' : 'Offline',
          statusLevel: ping.online ? 'ok' : 'error',
          metrics: [
            { label: 'Web UI Status', value: ping.online ? 'Online' : 'Unreachable' },
            { label: 'Response Time', value: `${ping.latencyMs} ms` },
          ],
          badges: ['Add WebUI credentials for live speeds'],
        };
      }
      throw new Error(`qBittorrent API error (HTTP ${transferRes?.status || 0})`);
    }

    const transfer = transferRes.data || {};
    const torrents = Array.isArray(torrentsRes?.data) ? torrentsRes.data : [];

    const downloadingStates = new Set([
      'downloading',
      'metaDL',
      'forcedDL',
      'queuedDL',
      'stalledDL',
      'checkingDL',
    ]);
    const seedingStates = new Set([
      'uploading',
      'forcedUP',
      'stalledUP',
      'queuedUP',
      'checkingUP',
    ]);

    const dlCount = torrents.filter((t) => downloadingStates.has(t.state)).length;
    const seedCount = torrents.filter((t) => seedingStates.has(t.state)).length;

    const dlSpeed = Number(transfer.dl_info_speed || 0);
    const upSpeed = Number(transfer.up_info_speed || 0);
    const dlData = Number(transfer.dl_info_data || 0);
    const upData = Number(transfer.up_info_data || 0);

    return {
      online: true,
      latencyMs: transferRes.latencyMs,
      statusText: dlCount > 0 ? `${dlCount} Downloading` : 'Seeding / Idle',
      statusLevel: transfer.connection_status === 'disconnected' ? 'warning' : 'ok',
      version:
        versionRes?.ok && typeof versionRes.data === 'string'
          ? versionRes.data.trim()
          : undefined,
      metrics: [
        { label: 'Download Speed', value: `↓ ${formatSpeed(dlSpeed)}` },
        { label: 'Upload Speed', value: `↑ ${formatSpeed(upSpeed)}` },
        {
          label: 'Torrents',
          value: `${dlCount} DL • ${seedCount} Seed (${torrents.length} Total)`,
        },
        {
          label: 'Session Traffic',
          value: `↓ ${formatBytes(dlData)} • ↑ ${formatBytes(upData)}`,
        },
      ],
      badges: [
        transfer.connection_status ? `Connection: ${transfer.connection_status}` : null,
        transfer.dht_nodes !== undefined ? `DHT: ${transfer.dht_nodes} nodes` : null,
      ].filter(Boolean),
    };
  },
};
