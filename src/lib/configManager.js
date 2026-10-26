/**
 * Configuration Manager
 * Supports loading & saving configuration via both file (config/config.json & config/config.yaml)
 * and the in-app Settings UI, with .env variable interpolation and secret masking.
 */

const fs = require('node:fs');
const path = require('node:path');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const CONFIG_JSON_PATH = path.join(CONFIG_DIR, 'config.json');
const CONFIG_EXAMPLE_JSON_PATH = path.join(CONFIG_DIR, 'config.example.json');
const CONFIG_YAML_PATH = path.join(CONFIG_DIR, 'config.yaml');
const ENV_PATH = path.join(__dirname, '..', '..', '.env');

const SECRET_KEYS = new Set(['apiKey', 'tokenSecret', 'password']);
const SECRET_MASK = '••••••••••••';

const DEFAULT_CONFIG = {
  settings: {
    title: 'Nexus Homelab',
    subtitle: 'Home Infrastructure & Media Command Center',
    backgroundUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85',
    blurAmount: 28,
    cardOpacity: 0.12,
    overlayOpacity: 0.14,
    refreshIntervalSec: 15,
    demoMode: true,
    openLinksInNewTab: true,
    showQuickBookmarks: true,
    greetingName: 'Admin',
  },
  bookmarks: [
    { id: 'bm-router', name: 'Router Gateway', url: 'https://192.168.1.1', icon: 'globe' },
    { id: 'bm-github', name: 'Homelab Docs', url: 'https://github.com', icon: 'book' },
    { id: 'bm-speedtest', name: 'Speedtest', url: 'https://fast.com', icon: 'zap' },
  ],
  services: [
    {
      id: 'srv-proxmox',
      name: 'Proxmox VE',
      type: 'proxmox',
      category: 'Infrastructure',
      url: 'https://192.168.1.10:8006',
      description: 'Hypervisor Cluster & Virtualization',
      verifySsl: false,
      auth: {
        tokenId: '',
        tokenSecret: '',
        username: '',
        password: '',
      },
    },
    {
      id: 'srv-truenas',
      name: 'TrueNAS SCALE',
      type: 'truenas',
      category: 'Infrastructure',
      url: 'https://192.168.1.20',
      description: 'ZFS Primary Storage Array',
      verifySsl: false,
      auth: {
        apiKey: '',
      },
    },
    {
      id: 'srv-homeassistant',
      name: 'Home Assistant',
      type: 'homeassistant',
      category: 'Smart Home',
      url: 'http://192.168.1.30:8123',
      description: 'Smart Home Automation & Sensors',
      verifySsl: false,
      auth: {
        apiKey: '',
        watchedEntities: '',
      },
    },
    {
      id: 'srv-unifi',
      name: 'UniFi OS',
      type: 'unifi',
      category: 'Network',
      url: 'https://192.168.1.1',
      description: 'UniFi Network Controller & Wi-Fi',
      verifySsl: false,
      auth: {
        apiKey: '',
        username: '',
        password: '',
        site: 'default',
      },
    },
    {
      id: 'srv-edgeos',
      name: 'EdgeOS Router',
      type: 'edgeos',
      category: 'Network',
      url: 'https://192.168.1.254',
      description: 'Ubiquiti EdgeRouter Core Gateway',
      verifySsl: false,
      auth: {
        username: '',
        password: '',
        wanInterface: 'eth0',
      },
    },
    {
      id: 'srv-jellyfin',
      name: 'Jellyfin',
      type: 'jellyfin',
      category: 'Media',
      url: 'http://192.168.1.40:8096',
      description: 'Media Streaming Server',
      verifySsl: false,
      auth: {
        apiKey: '',
      },
    },
    {
      id: 'srv-radarr',
      name: 'Radarr',
      type: 'radarr',
      category: 'Media',
      url: 'http://192.168.1.40:7878',
      description: 'Movie Collection Manager',
      verifySsl: false,
      auth: {
        apiKey: '',
      },
    },
    {
      id: 'srv-sonarr',
      name: 'Sonarr',
      type: 'sonarr',
      category: 'Media',
      url: 'http://192.168.1.40:8989',
      description: 'TV Series Collection Manager',
      verifySsl: false,
      auth: {
        apiKey: '',
      },
    },
    {
      id: 'srv-qbittorrent',
      name: 'qBittorrent',
      type: 'qbittorrent',
      category: 'Downloads',
      url: 'http://192.168.1.40:8080',
      description: 'BitTorrent Download Client',
      verifySsl: false,
      auth: {
        username: '',
        password: '',
      },
    },
  ],
};

function loadDotEnv() {
  try {
    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed
            .slice(eqIdx + 1)
            .trim()
            .replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (_) {
    // Ignore .env read errors
  }
}

function interpolateEnv(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => process.env[varName.trim()] || '');
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnv);
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = interpolateEnv(v);
    }
    return out;
  }
  return obj;
}

/**
 * Generates a human-friendly config.yaml mirror alongside config.json
 * so users who like browsing/editing YAML have an up-to-date reference.
 */
function toYamlCommented(config) {
  const lines = [
    '# ============================================================================',
    '# Nexus Homelab Dashboard Configuration',
    '# You can edit config/config.json directly OR use the in-app Settings UI.',
    '# Environment variables like ${PROXMOX_TOKEN_SECRET} are supported in any field.',
    '# ============================================================================',
    '',
    'settings:',
  ];
  for (const [k, v] of Object.entries(config.settings || {})) {
    lines.push(`  ${k}: ${JSON.stringify(v)}`);
  }
  lines.push('', 'services:');
  for (const srv of config.services || []) {
    lines.push(`  - id: ${JSON.stringify(srv.id)}`);
    lines.push(`    name: ${JSON.stringify(srv.name)}`);
    lines.push(`    type: ${JSON.stringify(srv.type)}`);
    lines.push(`    category: ${JSON.stringify(srv.category || 'General')}`);
    lines.push(`    url: ${JSON.stringify(srv.url)}`);
    lines.push(`    description: ${JSON.stringify(srv.description || '')}`);
    lines.push(`    verifySsl: ${Boolean(srv.verifySsl)}`);
    lines.push('    auth:');
    for (const [ak, av] of Object.entries(srv.auth || {})) {
      lines.push(`      ${ak}: ${JSON.stringify(av || '')}`);
    }
  }
  return lines.join('\n') + '\n';
}

function ensureConfigExists() {
  loadDotEnv();
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_JSON_PATH)) {
    let seedConfig = DEFAULT_CONFIG;
    if (fs.existsSync(CONFIG_EXAMPLE_JSON_PATH)) {
      try {
        seedConfig = JSON.parse(fs.readFileSync(CONFIG_EXAMPLE_JSON_PATH, 'utf8'));
      } catch (_) {
        seedConfig = DEFAULT_CONFIG;
      }
    }
    fs.writeFileSync(CONFIG_JSON_PATH, JSON.stringify(seedConfig, null, 2), 'utf8');
  }
  if (!fs.existsSync(CONFIG_YAML_PATH)) {
    fs.writeFileSync(CONFIG_YAML_PATH, toYamlCommented(DEFAULT_CONFIG), 'utf8');
  }
}

function loadConfig(withEnvInterpolation = true) {
  ensureConfigExists();
  try {
    const raw = fs.readFileSync(CONFIG_JSON_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const merged = {
      settings: { ...DEFAULT_CONFIG.settings, ...(parsed.settings || {}) },
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : DEFAULT_CONFIG.bookmarks,
      services: Array.isArray(parsed.services) ? parsed.services : DEFAULT_CONFIG.services,
    };
    return withEnvInterpolation ? interpolateEnv(merged) : merged;
  } catch (err) {
    console.error('Failed to read config.json, using defaults:', err.message);
    return structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig(newConfig) {
  ensureConfigExists();
  const existing = loadConfig(false);

  const mergedSettings = {
    ...existing.settings,
    ...(newConfig.settings || {}),
  };

  const existingServicesById = new Map((existing.services || []).map((s) => [s.id, s]));

  const updatedServices = Array.isArray(newConfig.services)
    ? newConfig.services.map((srv) => {
        const prev = existingServicesById.get(srv.id);
        const cleanAuth = { ...(srv.auth || {}) };

        // Preserve secret if masked placeholder was sent back from UI
        if (prev && prev.auth) {
          for (const [k, v] of Object.entries(cleanAuth)) {
            if (SECRET_KEYS.has(k) && v === SECRET_MASK) {
              cleanAuth[k] = prev.auth[k] || '';
            }
          }
        }

        return {
          ...srv,
          auth: cleanAuth,
        };
      })
    : existing.services;

  const finalConfig = {
    settings: mergedSettings,
    bookmarks: Array.isArray(newConfig.bookmarks) ? newConfig.bookmarks : existing.bookmarks,
    services: updatedServices,
  };

  fs.writeFileSync(CONFIG_JSON_PATH, JSON.stringify(finalConfig, null, 2), 'utf8');
  try {
    fs.writeFileSync(CONFIG_YAML_PATH, toYamlCommented(finalConfig), 'utf8');
  } catch (_) {
    // Non-fatal if YAML mirror fails
  }

  return finalConfig;
}

function sanitizeConfigForClient(config) {
  const copy = structuredClone(config);
  copy.services = (copy.services || []).map((srv) => {
    const maskedAuth = {};
    let hasCredentials = false;
    for (const [k, v] of Object.entries(srv.auth || {})) {
      if (v && String(v).trim().length > 0) {
        hasCredentials = true;
      }
      if (SECRET_KEYS.has(k) && v && String(v).trim().length > 0) {
        maskedAuth[k] = SECRET_MASK;
      } else {
        maskedAuth[k] = v || '';
      }
    }
    return {
      ...srv,
      hasCredentials,
      auth: maskedAuth,
    };
  });
  return copy;
}

module.exports = {
  SECRET_MASK,
  loadConfig,
  saveConfig,
  sanitizeConfigForClient,
  CONFIG_JSON_PATH,
};
