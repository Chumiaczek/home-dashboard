/**
 * Jellyfin Media Server Integration
 * Supports MediaBrowser Authorization header, X-Emby-Token, and ?api_key query param,
 * with automatic fallback across auth styles and /System/Info/Public.
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');

async function jellyfinGet(baseUrl, pathStr, key, verifySsl) {
  const sep = pathStr.includes('?') ? '&' : '?';
  const urlWithKey = `${baseUrl}${pathStr}${sep}api_key=${encodeURIComponent(key)}`;

  // Attempt 1: Standard X-Emby-Token + MediaBrowser Authorization + api_key query param
  const res1 = await request(urlWithKey, {
    headers: {
      'X-Emby-Token': key,
      'X-MediaBrowser-Token': key,
      Authorization: `MediaBrowser Client="HomeDashboard", Device="Server", DeviceId="homelab-dashboard-1", Version="1.0.0", Token="${key}"`,
    },
    verifySsl,
  }).catch(() => null);

  if (res1 && res1.ok) return res1;

  // Attempt 2: Query parameter ?api_key= only (in case reverse proxy alters Authorization header)
  const res2 = await request(urlWithKey, {
    verifySsl,
  }).catch(() => null);

  if (res2 && res2.ok) return res2;

  // Attempt 3: X-Emby-Token header only without query param
  const res3 = await request(`${baseUrl}${pathStr}`, {
    headers: { 'X-Emby-Token': key },
    verifySsl,
  }).catch(() => null);

  return res3 || res2 || res1;
}

module.exports = {
  type: 'jellyfin',
  name: 'Jellyfin',
  category: 'Media',
  defaultPort: 8096,
  icon: 'jellyfin',
  color: '#AA5CC3',
  description: 'Connect using a Jellyfin API Key (Dashboard -> Administration -> Advanced -> API Keys).',
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
      latencyMs: 9 + Math.floor(Math.random() * 6),
      statusText: '1 Active Stream',
      statusLevel: 'ok',
      version: 'v10.10.1',
      metrics: [
        { label: 'Active Streams', value: '1 Playing (Direct Play)' },
        { label: 'Movies', value: '842 Titles' },
        { label: 'TV Series', value: '164 Shows (5,190 Eps)' },
        { label: 'Transcoding', value: 'Idle (NVENC Ready)' },
      ],
      badges: ['Playing: Dune: Part Two (4K HDR)'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);
    const key = (auth.apiKey || '').trim();

    if (!key) {
      try {
        const pubRes = await request(`${baseUrl}/System/Info/Public`, { verifySsl });
        if (pubRes.ok && pubRes.data) {
          return {
            online: true,
            latencyMs: pubRes.latencyMs,
            statusText: 'Online (Public Info)',
            statusLevel: 'ok',
            version: pubRes.data.Version ? `v${pubRes.data.Version}` : undefined,
            metrics: [
              { label: 'Server Name', value: pubRes.data.ServerName || 'Jellyfin' },
              { label: 'Response Time', value: `${pubRes.latencyMs} ms` },
            ],
            badges: ['Add API Key for stream & library counts'],
          };
        }
      } catch (_) {}

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
        badges: ['Add Jellyfin API Key for library stats'],
      };
    }

    const [pubInfoRes, infoRes, sessionsRes, countsRes] = await Promise.all([
      request(`${baseUrl}/System/Info/Public`, { verifySsl }).catch(() => null),
      jellyfinGet(baseUrl, '/System/Info', key, verifySsl),
      jellyfinGet(baseUrl, '/Sessions', key, verifySsl),
      jellyfinGet(baseUrl, '/Items/Counts', key, verifySsl),
    ]);

    const info = (infoRes?.ok ? infoRes.data : pubInfoRes?.data) || {};
    const anyAuthOk = Boolean(infoRes?.ok || countsRes?.ok || sessionsRes?.ok);

    if (!anyAuthOk && !pubInfoRes?.ok) {
      const status = infoRes?.status || pubInfoRes?.status || 0;
      throw new Error(`Jellyfin API error (HTTP ${status})`);
    }

    if (!anyAuthOk && pubInfoRes?.ok) {
      return {
        online: true,
        latencyMs: pubInfoRes.latencyMs,
        statusText: 'Online (Public API)',
        statusLevel: 'warning',
        version: info.Version ? `v${info.Version}` : undefined,
        metrics: [
          { label: 'Server Name', value: info.ServerName || 'Jellyfin' },
          { label: 'Version', value: info.Version ? `v${info.Version}` : 'Online' },
          { label: 'Auth Status', value: `HTTP ${infoRes?.status || 401}` },
          { label: 'Response Time', value: `${pubInfoRes.latencyMs} ms` },
        ],
        badges: [`Server: ${info.ServerName || 'Jellyfin'}`],
      };
    }

    const sessions = Array.isArray(sessionsRes?.data) ? sessionsRes.data : [];
    const activeStreams = sessions.filter((s) => Boolean(s.NowPlayingItem));
    const counts = countsRes?.data || {};

    const nowPlayingBadges = activeStreams.slice(0, 2).map((s) => {
      const title = s.NowPlayingItem?.SeriesName
        ? `${s.NowPlayingItem.SeriesName} - ${s.NowPlayingItem.Name}`
        : s.NowPlayingItem?.Name || 'Media';
      return `▶ ${s.UserName || 'User'}: ${title}`;
    });

    if (nowPlayingBadges.length === 0 && info.ServerName) {
      nowPlayingBadges.push(`Server: ${info.ServerName}`);
    }

    return {
      online: true,
      latencyMs: infoRes?.latencyMs || countsRes?.latencyMs || pubInfoRes?.latencyMs || 15,
      statusText:
        activeStreams.length > 0
          ? `${activeStreams.length} Active Stream${activeStreams.length > 1 ? 's' : ''}`
          : 'Idle • Ready',
      statusLevel: 'ok',
      version: info.Version ? `v${info.Version}` : undefined,
      metrics: [
        {
          label: 'Active Streams',
          value: `${activeStreams.length} Playing`,
        },
        {
          label: 'Movies',
          value: `${counts.MovieCount ?? 0} Titles`,
        },
        {
          label: 'TV Shows',
          value: `${counts.SeriesCount ?? 0} (${counts.EpisodeCount ?? 0} Eps)`,
        },
        {
          label: 'Music / Audio',
          value: `${counts.SongCount ?? 0} Tracks`,
        },
      ],
      badges: nowPlayingBadges,
    };
  },
};
