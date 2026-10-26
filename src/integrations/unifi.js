/**
 * UniFi OS / UniFi Network Controller Integration
 * Supports UniFi OS API Key (X-API-KEY) or Local Admin Username & Password.
 * Automatically adapts to AP-only / Switch setups (where WAN is handled by an external router like EdgeOS)
 * as well as full UniFi Gateway setups.
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatSpeed } = require('../lib/formatters');

module.exports = {
  type: 'unifi',
  name: 'UniFi OS',
  category: 'Network',
  defaultPort: 443,
  icon: 'unifi',
  color: '#0559C9',
  description: 'Connect via UniFi OS API Key (Settings -> Control Plane -> Integrations) or Local Admin credentials.',
  authFields: [
    {
      key: 'apiKey',
      label: 'UniFi OS API Key (Recommended)',
      type: 'password',
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      key: 'username',
      label: 'Local Admin Username (Optional fallback)',
      type: 'text',
      placeholder: 'local-admin',
    },
    {
      key: 'password',
      label: 'Local Admin Password (Optional fallback)',
      type: 'password',
      placeholder: '••••••••',
    },
    {
      key: 'site',
      label: 'Site ID (Default: default)',
      type: 'text',
      placeholder: 'default',
    },
  ],

  getDemoData() {
    const rxRate = (4.2 + Math.random() * 2.5) * 1024 * 1024;
    const txRate = (0.8 + Math.random() * 0.6) * 1024 * 1024;
    return {
      online: true,
      latencyMs: 11 + Math.floor(Math.random() * 4),
      statusText: 'WLAN Online',
      statusLevel: 'ok',
      version: 'UniFi OS 4.1',
      metrics: [
        { label: 'Wi-Fi Throughput', value: `↓ ${formatSpeed(rxRate)} • ↑ ${formatSpeed(txRate)}` },
        { label: 'Connected Clients', value: '32 Wi-Fi Clients' },
        { label: 'Access Points', value: '1 AP Online' },
        { label: 'WLAN Status', value: 'Healthy (0 Offline)' },
      ],
      badges: ['WLAN: Active'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const site = (auth.site || 'default').trim();
    const verifySsl = Boolean(service.verifySsl);

    let headers = {};

    if (auth.apiKey) {
      headers['X-API-KEY'] = auth.apiKey.trim();
    } else if (auth.username && auth.password) {
      let loginRes = await request(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        body: { username: auth.username, password: auth.password },
        verifySsl,
      }).catch(() => null);

      if (!loginRes || !loginRes.ok) {
        loginRes = await request(`${baseUrl}/api/login`, {
          method: 'POST',
          body: { username: auth.username, password: auth.password },
          verifySsl,
        });
      }

      if (!loginRes.ok || !loginRes.cookies?.length) {
        throw new Error(`UniFi login failed (HTTP ${loginRes?.status || 0})`);
      }
      headers.Cookie = loginRes.cookies.join('; ');
    } else {
      const ping = await checkReachability(baseUrl, verifySsl);
      return {
        online: ping.online,
        latencyMs: ping.latencyMs,
        statusText: ping.online ? 'Reachable (No Auth)' : 'Offline',
        statusLevel: ping.online ? 'ok' : 'error',
        metrics: [
          { label: 'Console Status', value: ping.online ? 'Online' : 'Unreachable' },
          { label: 'Response Time', value: `${ping.latencyMs} ms` },
        ],
        badges: ['Add API Key or Local Admin for WLAN/Client stats'],
      };
    }

    // Try UniFi OS proxy path first, fallback to direct controller path
    let healthRes = await request(`${baseUrl}/proxy/network/api/s/${site}/stat/health`, {
      headers,
      verifySsl,
    }).catch(() => null);

    if (!healthRes || !healthRes.ok) {
      healthRes = await request(`${baseUrl}/api/s/${site}/stat/health`, {
        headers,
        verifySsl,
      });
    }

    if (!healthRes.ok || !Array.isArray(healthRes.data?.data)) {
      throw new Error(`UniFi health API error (HTTP ${healthRes.status})`);
    }

    const subsystems = healthRes.data.data;
    const wan = subsystems.find((s) => s.subsystem === 'wan') || {};
    const wlan = subsystems.find((s) => s.subsystem === 'wlan') || {};
    const lan = subsystems.find((s) => s.subsystem === 'lan') || {};
    const www = subsystems.find((s) => s.subsystem === 'www') || {};

    const hasWanGateway = wan.status && wan.status !== 'unknown' && Number(wan.num_gw || 0) > 0;

    const wifiClients = Number(wlan.num_user || 0);
    const guestClients = Number(wlan.num_guest || 0);
    const lanClients = Number(lan.num_user || 0);
    const totalClients = wifiClients + lanClients;

    const numAp = Number(wlan.num_ap || 0);
    const disconnectedAp = Number(wlan.num_disconnected || 0);
    const numSw = Number(lan.num_sw || 0);

    // AP-only / Switch mode (no UniFi WAN Gateway present)
    if (!hasWanGateway) {
      const wlanRx = Number(wlan['rx_bytes-r'] || 0);
      const wlanTx = Number(wlan['tx_bytes-r'] || 0);
      const isWlanHealthy = wlan.status === 'ok' || (numAp > 0 && disconnectedAp === 0);

      return {
        online: true,
        latencyMs: healthRes.latencyMs,
        statusText: isWlanHealthy ? 'WLAN Online' : `WLAN: ${wlan.status || 'Active'}`,
        statusLevel: isWlanHealthy ? 'ok' : 'warning',
        metrics: [
          {
            label: 'Wi-Fi Throughput',
            value: `↓ ${formatSpeed(wlanRx)} • ↑ ${formatSpeed(wlanTx)}`,
          },
          {
            label: 'Wi-Fi Clients',
            value:
              guestClients > 0
                ? `${wifiClients} Users • ${guestClients} Guests`
                : `${wifiClients} Connected`,
          },
          {
            label: 'Access Points',
            value:
              disconnectedAp > 0
                ? `${numAp} Online (${disconnectedAp} Offline)`
                : `${numAp} AP${numAp === 1 ? '' : 's'} Online`,
          },
          {
            label: numSw > 0 ? 'Switches / LAN' : 'Radio Status',
            value:
              numSw > 0
                ? `${numSw} Switch${numSw === 1 ? '' : 'es'} • ${lanClients} LAN`
                : isWlanHealthy
                ? 'Healthy (All APs Up)'
                : String(wlan.status || 'Active').toUpperCase(),
          },
        ],
        badges: [
          `WLAN: ${String(wlan.status || 'ok').toUpperCase()}`,
          `${wifiClients} Active Client${wifiClients === 1 ? '' : 's'}`,
        ],
      };
    }

    // Full UniFi Gateway mode
    const rxRate = Number(wan['rx_bytes-r'] || 0);
    const txRate = Number(wan['tx_bytes-r'] || 0);
    const wanLatency = www.latency || wan.latency;

    return {
      online: true,
      latencyMs: healthRes.latencyMs,
      statusText: wan.status === 'ok' ? 'WAN Online' : `WAN: ${wan.status || 'Active'}`,
      statusLevel: wan.status === 'ok' ? 'ok' : 'warning',
      metrics: [
        {
          label: 'WAN Throughput',
          value: `↓ ${formatSpeed(rxRate)} • ↑ ${formatSpeed(txRate)}`,
        },
        {
          label: 'Internet Latency',
          value: wanLatency ? `${wanLatency} ms` : wan.wan_ip || 'Connected',
        },
        {
          label: 'Connected Clients',
          value: `${totalClients} (${wifiClients} Wi-Fi • ${lanClients} LAN)`,
        },
        {
          label: 'UniFi Devices',
          value: `${numAp} APs • ${numSw} Switches`,
        },
      ],
      badges: [
        wan.wan_ip ? `WAN IP: ${wan.wan_ip}` : null,
        wan.isp_name ? `ISP: ${wan.isp_name}` : null,
      ].filter(Boolean),
    };
  },
};
