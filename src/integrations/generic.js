/**
 * Extensible Generic & Additional Homelab Integrations
 * Includes Prowlarr, Pi-hole, Plex, Portainer, and a fully customizable JSON/HTTP integration
 * so new services can be added either via UI configuration or by adding a module in src/integrations/.
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { getByPath } = require('../lib/formatters');

const prowlarrIntegration = {
  type: 'prowlarr',
  name: 'Prowlarr',
  category: 'Downloads',
  defaultPort: 9696,
  icon: 'prowlarr',
  color: '#E66000',
  description: 'Connect using your Prowlarr API Key (Settings -> General -> API Key).',
  authFields: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
  ],
  getDemoData() {
    return {
      online: true,
      latencyMs: 12,
      statusText: 'Indexers Healthy',
      statusLevel: 'ok',
      version: 'v1.25.4',
      metrics: [
        { label: 'Active Indexers', value: '14 / 14 Enabled' },
        { label: 'Queries (24h)', value: '1,284 Searches' },
        { label: 'Grabs (24h)', value: '38 Grabs' },
        { label: 'Failing Indexers', value: '0 Failing' },
      ],
      badges: ['Sync: Full'],
    };
  },
  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);
    if (!auth.apiKey) {
      const ping = await checkReachability(baseUrl, verifySsl);
      return {
        online: ping.online,
        latencyMs: ping.latencyMs,
        statusText: ping.online ? 'Reachable' : 'Offline',
        statusLevel: ping.online ? 'ok' : 'error',
        metrics: [
          { label: 'Web UI Status', value: ping.online ? 'Online' : 'Unreachable' },
          { label: 'Latency', value: `${ping.latencyMs} ms` },
        ],
        badges: ['Add API Key for indexer stats'],
      };
    }
    const headers = { 'X-Api-Key': auth.apiKey.trim() };
    const [statusRes, indexersRes, statusHealthRes] = await Promise.all([
      request(`${baseUrl}/api/v1/system/status`, { headers, verifySsl }),
      request(`${baseUrl}/api/v1/indexer`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v1/indexerstatus`, { headers, verifySsl }).catch(() => null),
    ]);
    if (!statusRes.ok) throw new Error(`Prowlarr API error (HTTP ${statusRes.status})`);
    const indexers = Array.isArray(indexersRes?.data) ? indexersRes.data : [];
    const enabled = indexers.filter((i) => i.enable);
    const failing = Array.isArray(statusHealthRes?.data) ? statusHealthRes.data.length : 0;
    return {
      online: true,
      latencyMs: statusRes.latencyMs,
      statusText: failing === 0 ? 'Indexers Healthy' : `${failing} Degraded`,
      statusLevel: failing === 0 ? 'ok' : 'warning',
      version: statusRes.data?.version ? `v${statusRes.data.version}` : undefined,
      metrics: [
        { label: 'Enabled Indexers', value: `${enabled.length} / ${indexers.length}` },
        { label: 'Failing Indexers', value: `${failing}` },
        { label: 'Response Time', value: `${statusRes.latencyMs} ms` },
        { label: 'App Status', value: 'Online' },
      ],
      badges: [`Total Indexers: ${indexers.length}`],
    };
  },
};

const piholeIntegration = {
  type: 'pihole',
  name: 'Pi-hole',
  category: 'Network',
  defaultPort: 80,
  icon: 'pihole',
  color: '#96060C',
  description: 'Connect to Pi-hole v5/v6 API using API Token / App Password.',
  authFields: [
    { key: 'apiKey', label: 'API Token / Password', type: 'password', placeholder: 'Optional or Web Password' },
  ],
  getDemoData() {
    return {
      online: true,
      latencyMs: 5,
      statusText: 'Blocking Active',
      statusLevel: 'ok',
      version: 'v6.0',
      metrics: [
        { label: 'Queries Today', value: '68,420' },
        { label: 'Ads Blocked', value: '14,912 (21.8%)', progress: 22 },
        { label: 'Blocklist Domains', value: '412,850' },
        { label: 'Active Clients', value: '34 Clients' },
      ],
      badges: ['DNS: Active'],
    };
  },
  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);
    const tokenParam = auth.apiKey ? `&auth=${encodeURIComponent(auth.apiKey.trim())}` : '';
    const res = await request(`${baseUrl}/admin/api.php?summaryRaw${tokenParam}`, { verifySsl }).catch(() => null);
    if (res && res.ok && res.data && res.data.dns_queries_today !== undefined) {
      const d = res.data;
      const pct = Number(d.ads_percentage_today || 0);
      return {
        online: true,
        latencyMs: res.latencyMs,
        statusText: d.status === 'enabled' ? 'Blocking Active' : 'Blocking Disabled',
        statusLevel: d.status === 'enabled' ? 'ok' : 'warning',
        metrics: [
          { label: 'Queries Today', value: Number(d.dns_queries_today || 0).toLocaleString() },
          { label: 'Blocked', value: `${pct.toFixed(1)}% (${Number(d.ads_blocked_today || 0).toLocaleString()})`, progress: Math.round(pct) },
          { label: 'Blocklist', value: Number(d.domains_being_blocked || 0).toLocaleString() },
          { label: 'Clients', value: `${d.unique_clients || 0}` },
        ],
        badges: [`Status: ${d.status || 'enabled'}`],
      };
    }
    const ping = await checkReachability(baseUrl, verifySsl);
    return {
      online: ping.online,
      latencyMs: ping.latencyMs,
      statusText: ping.online ? 'DNS UI Reachable' : 'Offline',
      statusLevel: ping.online ? 'ok' : 'error',
      metrics: [
        { label: 'Status', value: ping.online ? 'Online' : 'Unreachable' },
        { label: 'Latency', value: `${ping.latencyMs} ms` },
      ],
      badges: ['Pi-hole'],
    };
  },
};

const genericIntegration = {
  type: 'generic',
  name: 'Custom HTTP / JSON Service',
  category: 'Custom',
  defaultPort: 80,
  icon: 'generic',
  color: '#6366F1',
  description: 'Monitor any HTTP/HTTPS URL or custom JSON REST endpoint using dot-notation paths.',
  authFields: [
    {
      key: 'endpoint',
      label: 'Custom API Path (Optional)',
      type: 'text',
      placeholder: '/api/status or leave blank to ping main URL',
    },
    {
      key: 'headerName',
      label: 'Auth Header Name (Optional)',
      type: 'text',
      placeholder: 'Authorization or X-Api-Key',
    },
    {
      key: 'apiKey',
      label: 'Auth Header Value / Token (Optional)',
      type: 'password',
      placeholder: 'Bearer xxx...',
    },
    {
      key: 'jsonMetrics',
      label: 'JSON Metric Mappings (Optional: Label=json.path, ...)',
      type: 'text',
      placeholder: 'Version=version, Uptime=stats.uptime, Users=active_users',
    },
  ],

  getDemoData() {
    return {
      online: true,
      latencyMs: 10,
      statusText: 'Service Online',
      statusLevel: 'ok',
      metrics: [
        { label: 'HTTP Status', value: '200 OK' },
        { label: 'Response Time', value: '10 ms' },
      ],
      badges: ['Custom Endpoint'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);

    const targetUrl = auth.endpoint
      ? `${baseUrl}/${auth.endpoint.replace(/^\/+/, '')}`
      : baseUrl;

    const headers = {};
    if (auth.headerName && auth.apiKey) {
      headers[auth.headerName.trim()] = auth.apiKey.trim();
    } else if (auth.apiKey) {
      headers.Authorization = auth.apiKey.startsWith('Bearer ')
        ? auth.apiKey.trim()
        : `Bearer ${auth.apiKey.trim()}`;
    }

    const res = await request(targetUrl, { headers, verifySsl });
    const isAlive = res.status > 0 && res.status < 500;

    const metrics = [
      { label: 'HTTP Status', value: `${res.status} ${res.statusText || 'OK'}` },
      { label: 'Latency', value: `${res.latencyMs} ms` },
    ];

    if (auth.jsonMetrics && typeof res.data === 'object' && res.data !== null) {
      const pairs = auth.jsonMetrics
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const pair of pairs) {
        const [label, pathStr] = pair.split('=').map((s) => s.trim());
        if (label && pathStr) {
          const val = getByPath(res.data, pathStr);
          if (val !== undefined) {
            metrics.push({ label, value: String(val) });
          }
        }
      }
    }

    return {
      online: isAlive,
      latencyMs: res.latencyMs,
      statusText: isAlive ? 'Online' : `HTTP ${res.status}`,
      statusLevel: isAlive ? 'ok' : 'error',
      metrics: metrics.slice(0, 4),
      badges: [auth.endpoint ? `Endpoint: ${auth.endpoint}` : 'HTTP Monitor'],
    };
  },
};

module.exports = {
  prowlarrIntegration,
  piholeIntegration,
  genericIntegration,
};
