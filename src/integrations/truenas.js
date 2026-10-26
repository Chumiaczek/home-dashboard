/**
 * TrueNAS SCALE / CORE Integration
 * Uses REST API v2.0 (/api/v2.0/system/info, /api/v2.0/pool, /api/v2.0/pool/dataset, /api/v2.0/alert/list)
 * Supports selecting which storage pool to display per TrueNAS card.
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatBytes, formatUptime, clampPercent } = require('../lib/formatters');

module.exports = {
  type: 'truenas',
  name: 'TrueNAS',
  category: 'Infrastructure',
  defaultPort: 443,
  icon: 'truenas',
  color: '#0095D5',
  description: 'Connect using a TrueNAS API Key (Top-right User Icon -> API Keys) and optionally choose which ZFS pool to display.',
  authFields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      placeholder: '1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    {
      key: 'poolName',
      label: 'Storage Pool to Display (Optional)',
      type: 'text',
      placeholder: 'e.g. tank (leave blank for default pool)',
      help: 'Type the pool name (or click "Test Connection" below to see & pick from your pools).',
    },
  ],

  getDemoData(service) {
    const chosenPool = service?.auth?.poolName || 'tank';
    const poolUsed = 14.8 * 1024 ** 4;
    const poolTotal = 24.0 * 1024 ** 4;
    const pct = clampPercent((poolUsed / poolTotal) * 100);
    return {
      online: true,
      latencyMs: 15 + Math.floor(Math.random() * 5),
      statusText: `Pool ${chosenPool}: ONLINE`,
      statusLevel: 'ok',
      version: 'SCALE 24.10',
      metrics: [
        {
          label: `Pool: ${chosenPool}`,
          value: `${formatBytes(poolUsed)} / ${formatBytes(poolTotal)}`,
          progress: pct,
        },
        { label: 'Pool Status', value: 'ONLINE (Healthy)' },
        { label: 'System Load / RAM', value: 'Load 0.42 • 32 GB' },
        { label: 'Uptime', value: '63d 09h' },
      ],
      badges: ['Scrub: Clean', '0 Active Alerts'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);
    const desiredPoolName = (auth.poolName || '').trim();

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
        badges: ['Add TrueNAS API Key for ZFS pool stats'],
      };
    }

    const headers = {
      Authorization: `Bearer ${auth.apiKey.trim()}`,
    };

    const [sysRes, poolsRes, datasetsRes, alertsRes] = await Promise.all([
      request(`${baseUrl}/api/v2.0/system/info`, { headers, verifySsl }),
      request(`${baseUrl}/api/v2.0/pool`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api/v2.0/pool/dataset?extra.retrieve_children=false`, {
        headers,
        verifySsl,
      }).catch(() => null),
      request(`${baseUrl}/api/v2.0/alert/list`, { headers, verifySsl }).catch(() => null),
    ]);

    if (!sysRes.ok) {
      throw new Error(`TrueNAS API error (HTTP ${sysRes.status})`);
    }

    const sys = sysRes.data || {};
    const pools = Array.isArray(poolsRes?.data) ? poolsRes.data : [];
    const datasets = Array.isArray(datasetsRes?.data) ? datasetsRes.data : [];
    const alerts = Array.isArray(alertsRes?.data)
      ? alertsRes.data.filter((a) => !a.dismissed)
      : [];

    const availablePools = pools.map((p) => p.name).filter(Boolean);
    const healthyPools = pools.filter((p) => p.healthy && p.status === 'ONLINE');

    // Pick user-selected pool if specified, otherwise fallback to first pool (or second pool if service is 2nd instance)
    let targetPool = null;
    if (desiredPoolName) {
      targetPool =
        pools.find((p) => String(p.name).toLowerCase() === desiredPoolName.toLowerCase()) || null;
    }
    if (!targetPool) {
      if (service.PoolIndex !== undefined && pools[service.PoolIndex]) {
        targetPool = pools[service.PoolIndex];
      } else {
        targetPool = pools[0] || null;
      }
    }

    let poolCapacityMetric = {
      label: desiredPoolName ? `Pool: ${desiredPoolName}` : 'Storage Pools',
      value: desiredPoolName && !targetPool
        ? 'Pool Not Found'
        : `${healthyPools.length}/${pools.length} Online`,
    };

    let poolStatusMetric = {
      label: 'Pool Status',
      value: `${healthyPools.length}/${pools.length} Healthy`,
    };

    if (targetPool) {
      let usedBytes = Number(targetPool.allocated ?? 0);
      let totalBytes = Number(targetPool.size ?? 0);

      // TrueNAS SCALE often provides exact pool capacity on the root dataset in /api/v2.0/pool/dataset
      if (!totalBytes || totalBytes <= 0) {
        const rootDs = datasets.find(
          (d) =>
            String(d.id || d.name).toLowerCase() === String(targetPool.name).toLowerCase()
        );
        if (rootDs) {
          const dsUsed = Number(rootDs.used?.parsed ?? rootDs.usedbydataset?.parsed ?? 0);
          const dsAvail = Number(rootDs.available?.parsed ?? 0);
          if (dsUsed + dsAvail > 0) {
            usedBytes = dsUsed;
            totalBytes = dsUsed + dsAvail;
          }
        }
      }

      if (totalBytes > 0) {
        const usedPct = clampPercent((usedBytes / totalBytes) * 100);
        poolCapacityMetric = {
          label: `Pool: ${targetPool.name}`,
          value: `${formatBytes(usedBytes)} / ${formatBytes(totalBytes)} (${usedPct}%)`,
          progress: usedPct,
        };
      } else {
        poolCapacityMetric = {
          label: `Pool: ${targetPool.name}`,
          value: `${targetPool.status || 'ONLINE'}`,
        };
      }

      const healthLabel = targetPool.healthy ? 'Healthy' : 'Degraded';
      const errCount = Number(targetPool.scan?.errors || 0);
      poolStatusMetric = {
        label: `Pool: ${targetPool.name} Status`,
        value: `${targetPool.status || 'ONLINE'} (${healthLabel}${errCount > 0 ? `, ${errCount} Err` : ''})`,
      };
    }

    const loadAvg = Array.isArray(sys.loadavg) ? sys.loadavg[0]?.toFixed(2) : 'N/A';
    const poolErrors = Number(targetPool?.scan?.errors || 0);
    const isTargetHealthy = targetPool
      ? Boolean(targetPool.healthy && targetPool.status === 'ONLINE' && poolErrors === 0)
      : healthyPools.length === pools.length;

    return {
      online: true,
      latencyMs: sysRes.latencyMs,
      availablePools,
      statusText: targetPool
        ? `${targetPool.name}: ${targetPool.status || 'ONLINE'}`
        : healthyPools.length === pools.length
        ? 'Pools Healthy'
        : 'Pool Degraded',
      statusLevel: isTargetHealthy ? 'ok' : 'warning',
      version: sys.version ? String(sys.version).replace('TrueNAS-', '') : undefined,
      metrics: [
        poolCapacityMetric,
        poolStatusMetric,
        {
          label: 'System Load / RAM',
          value: `Load ${loadAvg} • ${formatBytes(sys.physmem || 0)}`,
        },
        {
          label: 'Uptime',
          value: sys.uptime_seconds ? formatUptime(sys.uptime_seconds) : sys.uptime || 'Online',
        },
      ],
      badges: [
        availablePools.length > 0 ? `Pools: ${availablePools.join(', ')}` : null,
        `${alerts.length} Active Alert${alerts.length === 1 ? '' : 's'}`,
      ].filter(Boolean),
    };
  },
};
