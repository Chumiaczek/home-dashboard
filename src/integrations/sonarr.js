/**
 * Sonarr TV Series Manager Integration
 * Uses X-Api-Key header (/api/v3/system/status, /api/v3/series, /api/v3/queue, /api/v3/wanted/missing)
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatBytes } = require('../lib/formatters');

module.exports = {
  type: 'sonarr',
  name: 'Sonarr',
  category: 'Media',
  defaultPort: 8989,
  icon: 'sonarr',
  color: '#35C5F4',
  description: 'Connect using your Sonarr API Key (Settings -> General -> Security -> API Key).',
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
      latencyMs: 13 + Math.floor(Math.random() * 5),
      statusText: '2 in Queue',
      statusLevel: 'ok',
      version: 'v4.0.10',
      metrics: [
        { label: 'TV Series', value: '164 Monitored' },
        { label: 'Episodes on Disk', value: '5,190 / 5,214' },
        { label: 'Active Queue', value: '2 Downloading' },
        { label: 'Library Size', value: '7.4 TB' },
      ],
      badges: ['Missing: 24 Episodes', 'RSS Sync: Active'],
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
        badges: ['Add Sonarr API Key for series & queue stats'],
      };
    }

    const headers = {
      'X-Api-Key': auth.apiKey.trim(),
    };

    const [statusRes, seriesRes, queueRes, missingRes] = await Promise.all([
      request(`${baseUrl}/api/v3/system/status`, { headers, verifySsl }),
      request(`${baseUrl}/api/v3/series`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v3/queue`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v3/wanted/missing?pageSize=1`, { headers, verifySsl }).catch(() => null),
    ]);

    if (!statusRes.ok) {
      throw new Error(`Sonarr API error (HTTP ${statusRes.status})`);
    }

    const series = Array.isArray(seriesRes?.data) ? seriesRes.data : [];
    let totalEpisodes = 0;
    let downloadedEpisodes = 0;
    let totalSize = 0;

    series.forEach((s) => {
      const stats = s.statistics || {};
      totalEpisodes += Number(stats.episodeCount || 0);
      downloadedEpisodes += Number(stats.episodeFileCount || 0);
      totalSize += Number(stats.sizeOnDisk || 0);
    });

    const queueCount = Number(queueRes?.data?.totalRecords ?? 0);
    const missingCount = Number(
      missingRes?.data?.totalRecords ?? Math.max(0, totalEpisodes - downloadedEpisodes)
    );

    return {
      online: true,
      latencyMs: statusRes.latencyMs,
      statusText: queueCount > 0 ? `${queueCount} in Queue` : 'Healthy',
      statusLevel: 'ok',
      version: statusRes.data?.version ? `v${statusRes.data.version}` : undefined,
      metrics: [
        { label: 'TV Series', value: `${series.length} Total` },
        { label: 'Episodes on Disk', value: `${downloadedEpisodes} / ${totalEpisodes}` },
        { label: 'Active Queue', value: `${queueCount}` },
        { label: 'Library Size', value: formatBytes(totalSize) },
      ],
      badges: [`Missing: ${missingCount} Ep${missingCount === 1 ? '' : 's'}`],
    };
  },
};
