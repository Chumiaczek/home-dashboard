/**
 * Proxmox VE Integration
 * Supports API Token authentication (USER@REALM!TOKENID=UUID) or username/password ticket auth.
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');
const { formatBytes, formatUptime, clampPercent } = require('../lib/formatters');

module.exports = {
  type: 'proxmox',
  name: 'Proxmox VE',
  category: 'Infrastructure',
  defaultPort: 8006,
  icon: 'proxmox',
  color: '#E57000',
  description: 'Connect via Proxmox API Token (Datacenter -> Permissions -> API Tokens) or Username & Password.',
  authFields: [
    {
      key: 'tokenId',
      label: 'API Token ID',
      type: 'text',
      placeholder: 'root@pam!dashboard',
      help: 'Format: user@realm!tokenName (leave blank if using username/password)',
    },
    {
      key: 'tokenSecret',
      label: 'API Token Secret',
      type: 'password',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
    {
      key: 'username',
      label: 'Username (Optional fallback)',
      type: 'text',
      placeholder: 'root@pam',
    },
    {
      key: 'password',
      label: 'Password (Optional fallback)',
      type: 'password',
      placeholder: '••••••••',
    },
  ],

  getDemoData() {
    const jitter = Math.floor(Math.random() * 5) - 2;
    const cpu = clampPercent(18 + jitter);
    const ramUsed = 38.4 * 1024 ** 3;
    const ramTotal = 64 * 1024 ** 3;
    return {
      online: true,
      latencyMs: 12 + Math.floor(Math.random() * 6),
      statusText: 'Cluster Healthy',
      statusLevel: 'ok',
      version: 'PVE 8.2.7',
      metrics: [
        { label: 'CPU Load', value: `${cpu}%`, progress: cpu },
        {
          label: 'Memory',
          value: `${formatBytes(ramUsed)} / ${formatBytes(ramTotal)}`,
          progress: clampPercent((ramUsed / ramTotal) * 100),
        },
        { label: 'Workloads', value: '7/7 VMs • 14/15 LXCs' },
        { label: 'Uptime', value: '48d 16h' },
      ],
      badges: ['Node: pve-01', 'Quorum: OK'],
    };
  },

  async fetchStatus(service) {
    const baseUrl = normalizeUrl(service.url);
    const auth = service.auth || {};
    const verifySsl = Boolean(service.verifySsl);

    let headers = {};

    if (auth.tokenId && auth.tokenSecret) {
      headers.Authorization = `PVEAPIToken=${auth.tokenId.trim()}=${auth.tokenSecret.trim()}`;
    } else if (auth.apiKey) {
      // Allow full token string in apiKey if user pasted root@pam!id=secret
      const tokenStr = auth.apiKey.replace(/^PVEAPIToken=/i, '').trim();
      headers.Authorization = `PVEAPIToken=${tokenStr}`;
    } else if (auth.username && auth.password) {
      const formBody = new URLSearchParams({
        username: auth.username,
        password: auth.password,
      }).toString();
      const loginRes = await request(`${baseUrl}/api2/json/access/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
        verifySsl,
      });
      const ticket = loginRes.data?.data?.ticket;
      if (!ticket) {
        throw new Error(`Proxmox ticket auth failed (HTTP ${loginRes.status})`);
      }
      headers.Cookie = `PVEAuthCookie=${ticket}`;
    } else {
      // No credentials configured: check host reachability
      const ping = await checkReachability(baseUrl, verifySsl);
      return {
        online: ping.online,
        latencyMs: ping.latencyMs,
        statusText: ping.online ? 'Reachable (No API Token)' : 'Offline',
        statusLevel: ping.online ? 'ok' : 'error',
        metrics: [
          { label: 'Web UI Status', value: ping.online ? 'Online' : 'Unreachable' },
          { label: 'Response Time', value: `${ping.latencyMs} ms` },
        ],
        badges: ['Configure API Token for VM/CPU stats'],
      };
    }

    const [nodesRes, resourcesRes, versionRes] = await Promise.all([
      request(`${baseUrl}/api2/json/nodes`, { headers, verifySsl }),
      request(`${baseUrl}/api2/json/cluster/resources?type=vm`, { headers, verifySsl }).catch(() => null),
      request(`${baseUrl}/api2/json/version`, { headers, verifySsl }).catch(() => null),
    ]);

    if (!nodesRes.ok || !Array.isArray(nodesRes.data?.data)) {
      throw new Error(`Proxmox API error (HTTP ${nodesRes.status})`);
    }

    const nodes = nodesRes.data.data;
    const onlineNodes = nodes.filter((n) => n.status === 'online');

    let totalCpu = 0;
    let totalMem = 0;
    let maxMem = 0;
    let maxUptime = 0;

    onlineNodes.forEach((n) => {
      totalCpu += Number(n.cpu || 0);
      totalMem += Number(n.mem || 0);
      maxMem += Number(n.maxmem || 0);
      if (Number(n.uptime || 0) > maxUptime) maxUptime = Number(n.uptime || 0);
    });

    const avgCpu = onlineNodes.length ? clampPercent((totalCpu / onlineNodes.length) * 100) : 0;
    const memPct = maxMem > 0 ? clampPercent((totalMem / maxMem) * 100) : 0;

    let vmSummary = `${onlineNodes.length}/${nodes.length} Nodes`;
    if (resourcesRes?.ok && Array.isArray(resourcesRes.data?.data)) {
      const items = resourcesRes.data.data;
      const vms = items.filter((i) => i.type === 'qemu');
      const runningVms = vms.filter((i) => i.status === 'running');
      const lxcs = items.filter((i) => i.type === 'lxc');
      const runningLxcs = lxcs.filter((i) => i.status === 'running');
      vmSummary = `${runningVms.length}/${vms.length} VMs • ${runningLxcs.length}/${lxcs.length} LXCs`;
    }

    const version = versionRes?.data?.data?.version
      ? `PVE ${versionRes.data.data.version}`
      : undefined;

    return {
      online: onlineNodes.length > 0,
      latencyMs: nodesRes.latencyMs,
      statusText:
        onlineNodes.length === nodes.length
          ? `${onlineNodes.length} Node${ nodes.length > 1 ? 's' : '' } Online`
          : `${onlineNodes.length}/${nodes.length} Nodes Online`,
      statusLevel: onlineNodes.length === nodes.length ? 'ok' : 'warning',
      version,
      metrics: [
        { label: 'CPU Load', value: `${avgCpu}%`, progress: avgCpu },
        {
          label: 'Memory',
          value: `${formatBytes(totalMem)} / ${formatBytes(maxMem)}`,
          progress: memPct,
        },
        { label: 'Workloads', value: vmSummary },
        { label: 'Uptime', value: formatUptime(maxUptime) },
      ],
      badges: nodes.map((n) => `${n.node}: ${n.status}`),
    };
  },
};
