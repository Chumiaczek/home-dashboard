/**
 * Home Assistant Integration
 * Uses Long-Lived Access Token via REST API (/api/config and /api/states)
 */

const { request, checkReachability, normalizeUrl } = require('../lib/httpClient');

module.exports = {
  type: 'homeassistant',
  name: 'Home Assistant',
  category: 'Smart Home',
  defaultPort: 8123,
  icon: 'homeassistant',
  color: '#18BCF2',
  description: 'Connect using a Long-Lived Access Token (Profile -> Security -> Long-Lived Access Tokens).',
  authFields: [
    {
      key: 'apiKey',
      label: 'Long-Lived Access Token',
      type: 'password',
      placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
    {
      key: 'watchedEntities',
      label: 'Pinned Entities (Optional, comma-separated)',
      type: 'text',
      placeholder: 'sensor.living_room_temperature, sensor.home_power',
    },
  ],

  getDemoData() {
    const activeLights = 4 + (Math.floor(Date.now() / 60000) % 3);
    return {
      online: true,
      latencyMs: 18 + Math.floor(Math.random() * 8),
      statusText: 'Running',
      statusLevel: 'ok',
      version: 'Core 2026.10.2',
      metrics: [
        { label: 'Active Lights', value: `${activeLights} On` },
        { label: 'Climate / Temp', value: '21.8 °C • 46% RH' },
        { label: 'Power Draw', value: '385 W' },
        { label: 'Entities', value: '412 Tracked' },
      ],
      badges: ['Automations: 38 Active', 'Home: 2 Present'],
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
        statusText: ping.online ? 'Reachable (No Token)' : 'Offline',
        statusLevel: ping.online ? 'ok' : 'error',
        metrics: [
          { label: 'Web UI Status', value: ping.online ? 'Online' : 'Unreachable' },
          { label: 'Response Time', value: `${ping.latencyMs} ms` },
        ],
        badges: ['Add Long-Lived Token for entity stats'],
      };
    }

    const headers = {
      Authorization: `Bearer ${auth.apiKey.trim()}`,
    };

    const [configRes, statesRes] = await Promise.all([
      request(`${baseUrl}/api/config`, { headers, verifySsl }),
      request(`${baseUrl}/api/states`, { headers, verifySsl }).catch(() => null),
    ]);

    if (!configRes.ok) {
      throw new Error(`Home Assistant API error (HTTP ${configRes.status})`);
    }

    const cfg = configRes.data || {};
    const states = Array.isArray(statesRes?.data) ? statesRes.data : [];

    const lights = states.filter((s) => s.entity_id?.startsWith('light.'));
    const lightsOn = lights.filter((s) => s.state === 'on');

    const switches = states.filter((s) => s.entity_id?.startsWith('switch.'));
    const switchesOn = switches.filter((s) => s.state === 'on');

    const persons = states.filter((s) => s.entity_id?.startsWith('person.'));
    const personsHome = persons.filter((s) => s.state === 'home');

    const automations = states.filter((s) => s.entity_id?.startsWith('automation.') && s.state === 'on');

    const metrics = [
      { label: 'Lights On', value: `${lightsOn.length} / ${lights.length}` },
      { label: 'Switches On', value: `${switchesOn.length} / ${switches.length}` },
    ];

    // If user specified watchedEntities, include up to 2 of them directly in the card
    if (auth.watchedEntities && states.length > 0) {
      const watchedList = auth.watchedEntities
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      for (const entityId of watchedList.slice(0, 2)) {
        const found = states.find((s) => s.entity_id === entityId);
        if (found) {
          const name = found.attributes?.friendly_name || entityId.split('.')[1] || entityId;
          const unit = found.attributes?.unit_of_measurement ? ` ${found.attributes.unit_of_measurement}` : '';
          metrics.push({
            label: name,
            value: `${found.state}${unit}`,
          });
        }
      }
    }

    while (metrics.length < 4) {
      if (metrics.length === 2) {
        metrics.push({
          label: 'People Home',
          value: persons.length > 0 ? `${personsHome.length} / ${persons.length}` : 'N/A',
        });
      } else {
        metrics.push({ label: 'Total Entities', value: `${states.length}` });
      }
    }

    return {
      online: true,
      latencyMs: configRes.latencyMs,
      statusText: cfg.state === 'RUNNING' ? 'Running' : cfg.state || 'Online',
      statusLevel: 'ok',
      version: cfg.version ? `Core ${cfg.version}` : undefined,
      metrics: metrics.slice(0, 4),
      badges: [
        cfg.location_name ? `Location: ${cfg.location_name}` : null,
        automations.length ? `${automations.length} Automations` : null,
      ].filter(Boolean),
    };
  },
};
