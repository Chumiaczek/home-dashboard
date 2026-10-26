/**
 * Radarr Movie Manager Integration
 * Uses X-Api-Key header (/api/v3/system/status, /api/v3/movie, /api/v3/queue)
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatBytes } = require('../lib/formatters');

module.exports = {
  type: 'radarr',
  name: 'Radarr',
  category: 'Media',
  defaultPort: 7878,
  icon: 'radarr',
  color: '#FFC230',
  description: 'Connect using your Radarr API Key (Settings -> General -> Security -> API Key).',
  authFields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  ],

  getDemoData() {
    return {
      online: true,
      latencyMs: 14 + Math.floor(Math.random() * 6),
      statusText: 'Idle • All Monitored',
      statusLevel: 'ok',
      version: 'v5.14.0',
      metrics: [
        { label: 'Movies Downloaded', value: '818 / 842' },
        { label: 'Missing (Monitored)', value: '12 Movies' },
        { label: 'Active Queue', value: '1 Downloading' },
        { label: 'Library Size', value: '6.8 TB' },
      ],
      badges: ['Indexers: Healthy', 'Root Folder: 9.2 TB Free'],
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
        statusText: ping.online ? 'Reachable (No API Key)' : 'Offline',
        statusLevel: ping.online ? 'ok' : 'error',
        metrics: [
          { label: 'Web UI Status', value: ping.online ? 'Online' : 'Unreachable' },
          { label: 'Response Time', value: `${ping.latencyMs} ms` },
        ],
        badges: ['Add Radarr API Key for movie & queue stats'],
      };
    }

    const headers = {
      'X-Api-Key': auth.apiKey.trim(),
    };

    const [statusRes, moviesRes, queueRes] = await Promise.all([
      request(`${baseUrl}/api/v3/system/status`, { headers, verifySsl }),
      request(`${baseUrl}/api/v3/movie`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v3/queue`, { headers, verifySsl }).catch(() => null),
    ]);

    if (!statusRes.ok) {
      throw new Error(`Radarr API error (HTTP ${statusRes.status})`);
    }

    const movies = Array.isArray(moviesRes?.data) ? moviesRes.data : [];
    const downloaded = movies.filter((m) => Boolean(m.hasFile));
    const missing = movies.filter((m) => Boolean(m.monitored) && !m.hasFile);
    const totalSize = movies.reduce((acc, m) => acc + Number(m.sizeOnDisk || 0), 0);
    const queueCount = Number(queueRes?.data?.totalRecords ?? 0);

    return {
      online: true,
      latencyMs: statusRes.latencyMs,
      statusText: queueCount > 0 ? `${queueCount} in Queue` : 'Healthy',
      statusLevel: 'ok',
      version: statusRes.data?.version ? `v${statusRes.data.version}` : undefined,
      metrics: [
        { label: 'Movies Downloaded', value: `${downloaded.length} / ${movies.length}` },
        { label: 'Missing (Monitored)', value: `${missing.length}` },
        { label: 'Active Queue', value: `${queueCount}` },
        { label: 'Library Size', value: formatBytes(totalSize) },
      ],
      badges: [
        queueCount > 0 ? `Downloading: ${queueCount}` : 'Queue: Idle',
      ],
    };
  },
};
