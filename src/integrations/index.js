/**
 * Integration Registry
 * Central plugin registry for all homelab integrations.
 * Supports live reload of integration modules when mounted in Docker.
 */

const path = require('node:path');

const MODULE_PATHS = {
  proxmox: './proxmox',
  homeassistant: './homeassistant',
  truenas: './truenas',
  jellyfin: './jellyfin',
  unifi: './unifi',
  edgeos: './edgeos',
  radarr: './radarr',
  sonarr: './sonarr',
  qbittorrent: './qbittorrent',
};

const registry = new Map();

function registerIntegration(plugin) {
  if (!plugin || !plugin.type) {
    throw new Error('Invalid integration plugin: missing type');
  }
  registry.set(plugin.type.toLowerCase(), plugin);
}

function reloadCorePlugins() {
  for (const relPath of Object.values(MODULE_PATHS)) {
    try {
      const fullPath = require.resolve(path.join(__dirname, relPath));
      delete require.cache[fullPath];
      registerIntegration(require(fullPath));
    } catch (_) {
      // Fallback to cached if reload fails
    }
  }
  try {
    const genericPath = require.resolve(path.join(__dirname, './generic'));
    delete require.cache[genericPath];
    const {
      prowlarrIntegration,
      piholeIntegration,
      genericIntegration,
    } = require(genericPath);
    [prowlarrIntegration, piholeIntegration, genericIntegration].forEach(registerIntegration);
  } catch (_) {}
}

// Initial registration
reloadCorePlugins();

function getIntegration(type) {
  const key = String(type || 'generic').toLowerCase();
  if (MODULE_PATHS[key]) {
    try {
      const fullPath = require.resolve(path.join(__dirname, MODULE_PATHS[key]));
      delete require.cache[fullPath];
      const fresh = require(fullPath);
      registry.set(key, fresh);
      return fresh;
    } catch (_) {}
  }
  return registry.get(key) || registry.get('generic');
}

function listIntegrationSchemas() {
  reloadCorePlugins();
  return Array.from(registry.values()).map((plugin) => ({
    type: plugin.type,
    name: plugin.name,
    category: plugin.category,
    defaultPort: plugin.defaultPort,
    icon: plugin.icon || plugin.type,
    color: plugin.color || '#6366F1',
    description: plugin.description || '',
    authFields: plugin.authFields || [],
  }));
}

/**
 * Fetch status for a single configured service.
 * Supports live API execution as well as simulated demo data when demoMode is enabled.
 */
async function fetchServiceStatus(service, globalSettings = {}) {
  const plugin = getIntegration(service.type);
  const useDemo =
    service.demoMode === true ||
    (service.demoMode !== false && Boolean(globalSettings.demoMode));

  if (useDemo && typeof plugin.getDemoData === 'function') {
    const demo = plugin.getDemoData(service);
    return {
      id: service.id,
      type: plugin.type,
      demo: true,
      checkedAt: new Date().toISOString(),
      ...demo,
    };
  }

  const start = performance.now();
  try {
    const result = await plugin.fetchStatus(service);
    return {
      id: service.id,
      type: plugin.type,
      demo: false,
      checkedAt: new Date().toISOString(),
      ...result,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      id: service.id,
      type: plugin.type,
      demo: false,
      online: false,
      latencyMs,
      statusText: 'Connection Error',
      statusLevel: 'error',
      error: err.message || 'Failed to connect',
      checkedAt: new Date().toISOString(),
      metrics: [
        { label: 'Status', value: 'Unreachable / Error' },
        { label: 'Details', value: String(err.message || 'Error').slice(0, 38) },
      ],
      badges: ['Check URL / API Credentials'],
    };
  }
}

module.exports = {
  registerIntegration,
  getIntegration,
  listIntegrationSchemas,
  fetchServiceStatus,
};
