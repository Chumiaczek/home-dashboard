/**
 * Nexus Homelab Dashboard - Frontend Application
 */

(function () {
  const WALLPAPER_PRESETS = [
    {
      name: 'Dark Mystic Mountains',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Aurora Borealis Night',
      url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Cyberpunk Neon Horizon',
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Deep Space Nebula',
      url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Midnight Forest Fog',
      url: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Abstract Dark Waves',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Ocean Twilight',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85',
    },
    {
      name: 'Minimalist Dolomites',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85',
    },
  ];

  const state = {
    config: {
      settings: {},
      bookmarks: [],
      services: [],
    },
    integrations: [],
    statuses: {},
    activeCategory: 'All',
    searchQuery: '',
    pollTimer: null,
  };

  // DOM Elements
  const el = {
    dashboardTitle: document.getElementById('dashboardTitle'),
    dashboardSubtitle: document.getElementById('dashboardSubtitle'),
    onlineCountText: document.getElementById('onlineCountText'),
    summaryPills: document.getElementById('summaryPills'),
    clockTime: document.getElementById('clockTime'),
    clockDate: document.getElementById('clockDate'),
    toggleDemoBtn: document.getElementById('toggleDemoBtn'),
    demoModeLabel: document.getElementById('demoModeLabel'),
    refreshAllBtn: document.getElementById('refreshAllBtn'),
    addServiceBtn: document.getElementById('addServiceBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    categoryTabs: document.getElementById('categoryTabs'),
    searchInput: document.getElementById('searchInput'),
    bookmarksRibbon: document.getElementById('bookmarksRibbon'),
    servicesContainer: document.getElementById('servicesContainer'),

    // Service Modal
    serviceModal: document.getElementById('serviceModal'),
    serviceModalTitle: document.getElementById('serviceModalTitle'),
    closeServiceModalBtn: document.getElementById('closeServiceModalBtn'),
    serviceForm: document.getElementById('serviceForm'),
    srvId: document.getElementById('srvId'),
    srvType: document.getElementById('srvType'),
    srvCategory: document.getElementById('srvCategory'),
    srvName: document.getElementById('srvName'),
    srvUrl: document.getElementById('srvUrl'),
    srvDesc: document.getElementById('srvDesc'),
    srvVerifySsl: document.getElementById('srvVerifySsl'),
    integrationHint: document.getElementById('integrationHint'),
    dynamicAuthFields: document.getElementById('dynamicAuthFields'),
    testResultBox: document.getElementById('testResultBox'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    deleteServiceBtn: document.getElementById('deleteServiceBtn'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
    settingsForm: document.getElementById('settingsForm'),
    setTitle: document.getElementById('setTitle'),
    setSubtitle: document.getElementById('setSubtitle'),
    setBgUrl: document.getElementById('setBgUrl'),
    bgFileInput: document.getElementById('bgFileInput'),
    wallpaperPresets: document.getElementById('wallpaperPresets'),
    setBlur: document.getElementById('setBlur'),
    setBlurVal: document.getElementById('setBlurVal'),
    setCardOpacity: document.getElementById('setCardOpacity'),
    setCardOpacityVal: document.getElementById('setCardOpacityVal'),
    setOverlayOpacity: document.getElementById('setOverlayOpacity'),
    setOverlayOpacityVal: document.getElementById('setOverlayOpacityVal'),
    setRefresh: document.getElementById('setRefresh'),
    setDemoMode: document.getElementById('setDemoMode'),
    setNewTab: document.getElementById('setNewTab'),

    toastContainer: document.getElementById('toastContainer'),

    // Login & Shell
    appShell: document.getElementById('appShell'),
    loginScreen: document.getElementById('loginScreen'),
    loginForm: document.getElementById('loginForm'),
    loginTitle: document.getElementById('loginTitle'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginRemember: document.getElementById('loginRemember'),
    loginError: document.getElementById('loginError'),
    loginSubmitBtn: document.getElementById('loginSubmitBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Encrypted Credentials Vault Modal
    openVaultBtn: document.getElementById('openVaultBtn'),
    vaultModal: document.getElementById('vaultModal'),
    closeVaultModalBtn: document.getElementById('closeVaultModalBtn'),
    vaultSetupView: document.getElementById('vaultSetupView'),
    vaultSetupForm: document.getElementById('vaultSetupForm'),
    vaultSetupPass: document.getElementById('vaultSetupPass'),
    vaultSetupPassConfirm: document.getElementById('vaultSetupPassConfirm'),
    vaultSeedCheckbox: document.getElementById('vaultSeedCheckbox'),
    vaultSetupError: document.getElementById('vaultSetupError'),
    vaultSetupSubmitBtn: document.getElementById('vaultSetupSubmitBtn'),
    vaultUnlockView: document.getElementById('vaultUnlockView'),
    vaultUnlockForm: document.getElementById('vaultUnlockForm'),
    vaultUnlockPass: document.getElementById('vaultUnlockPass'),
    vaultUnlockError: document.getElementById('vaultUnlockError'),
    vaultUnlockSubmitBtn: document.getElementById('vaultUnlockSubmitBtn'),
    vaultContentView: document.getElementById('vaultContentView'),
    vaultSearchInput: document.getElementById('vaultSearchInput'),
    vaultAddEntryBtn: document.getElementById('vaultAddEntryBtn'),
    vaultChangePassBtn: document.getElementById('vaultChangePassBtn'),
    vaultLockBtn: document.getElementById('vaultLockBtn'),
    vaultEntryFormWrap: document.getElementById('vaultEntryFormWrap'),
    vaultEntryFormTitle: document.getElementById('vaultEntryFormTitle'),
    vaultEntryForm: document.getElementById('vaultEntryForm'),
    vaultEntryId: document.getElementById('vaultEntryId'),
    vaultEntryService: document.getElementById('vaultEntryService'),
    vaultEntryCategory: document.getElementById('vaultEntryCategory'),
    vaultEntryUsername: document.getElementById('vaultEntryUsername'),
    vaultEntryPassword: document.getElementById('vaultEntryPassword'),
    vaultEntryUrl: document.getElementById('vaultEntryUrl'),
    vaultEntryNotes: document.getElementById('vaultEntryNotes'),
    vaultEntryCancelBtn: document.getElementById('vaultEntryCancelBtn'),
    vaultChangePassWrap: document.getElementById('vaultChangePassWrap'),
    vaultChangePassForm: document.getElementById('vaultChangePassForm'),
    vaultNewMasterPass: document.getElementById('vaultNewMasterPass'),
    vaultNewMasterPassConfirm: document.getElementById('vaultNewMasterPassConfirm'),
    vaultChangePassCancelBtn: document.getElementById('vaultChangePassCancelBtn'),
    vaultEntriesList: document.getElementById('vaultEntriesList'),
  };

  // Ephemeral in-memory vault state (Immediately wiped whenever the Vault modal is closed or locked)
  let vaultMasterPassword = '';
  let vaultEntries = [];
  let vaultRevealedIds = new Set();
  let vaultSearchQuery = '';

  const AUTH_STORAGE_KEY = 'nexus_auth_token';

  function getStoredToken() {
    try {
      return (
        localStorage.getItem(AUTH_STORAGE_KEY) ||
        sessionStorage.getItem(AUTH_STORAGE_KEY) ||
        ''
      );
    } catch (_) {
      return '';
    }
  }

  function storeToken(token, rememberDevice) {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      if (!token) return;
      if (rememberDevice) {
        localStorage.setItem(AUTH_STORAGE_KEY, token);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, token);
      }
    } catch (_) {}
  }

  async function apiFetch(url, options = {}) {
    const token = getStoredToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { 'X-Auth-Token': token } : {}),
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      showLoginScreen();
      throw new Error('Unauthorized');
    }
    return res;
  }

  function showLoginScreen(theme = null) {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
    if (theme) {
      applyVisualSettings(theme);
      if (el.loginTitle && theme.title) {
        el.loginTitle.textContent = theme.title;
      }
    }
    if (el.appShell) el.appShell.style.display = 'none';
    if (el.loginScreen) el.loginScreen.style.display = 'flex';
    if (el.loginUsername) el.loginUsername.focus();
  }

  function showDashboardShell() {
    if (el.loginScreen) el.loginScreen.style.display = 'none';
    if (el.appShell) el.appShell.style.display = 'block';
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    el.toastContainer.appendChild(t);
    setTimeout(() => {
      t.remove();
    }, 3200);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Clock Updater
  function updateClock() {
    const now = new Date();
    el.clockTime.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    el.clockDate.textContent = now.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // Apply Visual Theme Settings to CSS Custom Properties
  function applyVisualSettings(settings = {}) {
    const root = document.documentElement;
    if (settings.backgroundUrl) {
      const safeUrl = settings.backgroundUrl.replace(/'/g, "\\'");
      root.style.setProperty('--bg-url', `url('${safeUrl}')`);
    }
    if (settings.blurAmount !== undefined) {
      root.style.setProperty('--glass-blur', `${Number(settings.blurAmount)}px`);
    }
    if (settings.cardOpacity !== undefined) {
      root.style.setProperty('--card-opacity', Number(settings.cardOpacity));
    }
    if (settings.overlayOpacity !== undefined) {
      root.style.setProperty('--overlay-opacity', Number(settings.overlayOpacity));
    }

    el.dashboardTitle.textContent = settings.title || 'Nexus Homelab';
    el.dashboardSubtitle.textContent =
      settings.subtitle || 'Home Infrastructure & Media Command Center';
    document.title = settings.title || 'Nexus Homelab Dashboard';

    const isDemo = Boolean(settings.demoMode);
    el.demoModeLabel.textContent = isDemo ? 'Demo Mode' : 'Live API Mode';
    el.toggleDemoBtn.classList.toggle('live', !isDemo);
  }

  // Render Bookmarks Ribbon
  function renderBookmarks() {
    const bookmarks = state.config.bookmarks || [];
    const show = state.config.settings?.showQuickBookmarks !== false && bookmarks.length > 0;
    if (!show) {
      el.bookmarksRibbon.style.display = 'none';
      return;
    }
    el.bookmarksRibbon.style.display = 'flex';
    const target = state.config.settings?.openLinksInNewTab !== false ? '_blank' : '_self';
    el.bookmarksRibbon.innerHTML = bookmarks
      .map(
        (b) => `
        <a class="bookmark-chip" href="${escapeHtml(b.url)}" target="${target}" rel="noopener noreferrer">
          <span>🔗</span>
          <span>${escapeHtml(b.name)}</span>
        </a>
      `
      )
      .join('');
  }

  // Render Category Filter Pills
  function renderCategoryTabs() {
    const services = state.config.services || [];
    const categories = ['All'];
    services.forEach((s) => {
      const cat = s.category || 'General';
      if (!categories.includes(cat)) categories.push(cat);
    });

    if (!categories.includes(state.activeCategory)) {
      state.activeCategory = 'All';
    }

    el.categoryTabs.innerHTML = categories
      .map(
        (cat) => `
        <button
          type="button"
          class="cat-tab ${state.activeCategory === cat ? 'active' : ''}"
          data-category="${escapeHtml(cat)}"
        >
          ${escapeHtml(cat)}
        </button>
      `
      )
      .join('');

    el.categoryTabs.querySelectorAll('.cat-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeCategory = btn.dataset.category;
        renderCategoryTabs();
        renderServices();
      });
    });
  }

  // Update Header Online Summary Counter
  function updateSummaryCounter() {
    const services = state.config.services || [];
    let onlineCount = 0;
    let warnCount = 0;

    services.forEach((srv) => {
      const st = state.statuses[srv.id];
      if (st && st.online) {
        onlineCount++;
        if (st.statusLevel === 'warning') warnCount++;
      }
    });

    const total = services.length;
    const allOnline = onlineCount === total && total > 0;

    el.summaryPills.innerHTML = `
      <span class="summary-pill">
        <span class="dot ${allOnline ? 'dot-ok' : onlineCount > 0 ? 'dot-warn' : 'dot-err'}"></span>
        <span>${onlineCount}/${total} Online</span>
      </span>
      ${
        warnCount > 0
          ? `<span class="summary-pill"><span class="dot dot-warn"></span><span>${warnCount} Warning</span></span>`
          : ''
      }
    `;
  }

  // Render Service Cards Grouped by Category
  function renderServices() {
    const services = state.config.services || [];
    const q = state.searchQuery.trim().toLowerCase();
    const target = state.config.settings?.openLinksInNewTab !== false ? '_blank' : '_self';

    const filtered = services.filter((srv) => {
      const matchesCat =
        state.activeCategory === 'All' || (srv.category || 'General') === state.activeCategory;
      const matchesQuery =
        !q ||
        srv.name.toLowerCase().includes(q) ||
        (srv.type && srv.type.toLowerCase().includes(q)) ||
        (srv.description && srv.description.toLowerCase().includes(q)) ||
        (srv.category && srv.category.toLowerCase().includes(q)) ||
        (srv.url && srv.url.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      el.servicesContainer.innerHTML = `
        <div class="service-card" style="text-align: center; padding: 2.5rem;">
          <p style="font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem;">No matching services found</p>
          <p style="font-size: 0.84rem; color: var(--text-muted);">Try clearing your search filter or click "Add Service" to add a new integration.</p>
        </div>
      `;
      return;
    }

    // Group by category
    const groups = new Map();
    filtered.forEach((srv) => {
      const cat = srv.category || 'General';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(srv);
    });

    const integrationMap = new Map(state.integrations.map((i) => [i.type, i]));

    let html = '';
    for (const [category, items] of groups.entries()) {
      html += `
        <section class="category-section">
          <div class="category-header">
            <div class="category-title">
              <span>${escapeHtml(category)}</span>
              <span class="category-count">${items.length}</span>
            </div>
          </div>
          <div class="services-grid">
            ${items.map((srv) => renderSingleServiceCard(srv, integrationMap.get(srv.type), target)).join('')}
          </div>
        </section>
      `;
    }

    el.servicesContainer.innerHTML = html;

    // Bind Edit buttons
    el.servicesContainer.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openServiceModal(btn.dataset.editId);
      });
    });
  }

  function renderSingleServiceCard(srv, integrationSchema, linkTarget) {
    const st = state.statuses[srv.id];
    const color = integrationSchema?.color || '#38BDF8';
    const iconSvg = window.getServiceIcon(srv.type);

    const isLoading = !st;
    const isOnline = st ? Boolean(st.online) : false;
    const statusLevel = isLoading ? 'warning' : st.statusLevel || (isOnline ? 'ok' : 'error');
    const statusText = isLoading ? 'Checking...' : st.statusText || (isOnline ? 'Online' : 'Offline');

    const metrics = Array.isArray(st?.metrics) && st.metrics.length > 0
      ? st.metrics
      : [
          { label: 'Endpoint', value: srv.url },
          { label: 'Status', value: isLoading ? 'Polling API...' : 'No Data' },
        ];

    const badges = Array.isArray(st?.badges) ? st.badges : [];
    const latency = st?.latencyMs !== undefined ? `${st.latencyMs}ms` : '';

    return `
      <article class="service-card" style="--service-color: ${escapeHtml(color)};">
        <div>
          <div class="card-top">
            <a
              class="service-identity"
              href="${escapeHtml(srv.url)}"
              target="${linkTarget}"
              rel="noopener noreferrer"
              title="Open ${escapeHtml(srv.name)} (${escapeHtml(srv.url)})"
            >
              <div class="service-icon-wrap">
                ${iconSvg}
              </div>
              <div class="service-title-group">
                <div class="service-name-row">
                  <span class="service-name">${escapeHtml(srv.name)}</span>
                  <svg class="external-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
                <div class="service-desc">${escapeHtml(srv.description || srv.url)}</div>
              </div>
            </a>

            <div class="card-status-cluster">
              <span class="status-badge ${escapeHtml(statusLevel)}">
                <span class="dot ${
                  statusLevel === 'ok' ? 'dot-ok' : statusLevel === 'warning' ? 'dot-warn' : 'dot-err'
                }"></span>
                <span>${escapeHtml(statusText)}</span>
              </span>
              <button
                type="button"
                class="card-action-btn"
                data-edit-id="${escapeHtml(srv.id)}"
                title="Edit ${escapeHtml(srv.name)} settings & API credentials"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="metrics-grid">
            ${metrics
              .slice(0, 4)
              .map((m) => {
                const hasProgress = typeof m.progress === 'number' && !isNaN(m.progress);
                const pct = hasProgress ? Math.min(100, Math.max(0, Math.round(m.progress))) : 0;
                return `
                  <div class="metric-box">
                    <div class="metric-label" title="${escapeHtml(m.label)}">${escapeHtml(m.label)}</div>
                    <div class="metric-value" title="${escapeHtml(m.value)}">${escapeHtml(m.value)}</div>
                    ${
                      hasProgress
                        ? `<div class="metric-progress">
                             <div class="metric-progress-bar ${pct >= 85 ? 'high' : ''}" style="width: ${pct}%"></div>
                           </div>`
                        : ''
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="card-footer">
          <div class="card-badges">
            ${
              st?.version
                ? `<span class="mini-badge">${escapeHtml(st.version)}</span>`
                : ''
            }
            ${badges
              .slice(0, 2)
              .map((b) => `<span class="mini-badge" title="${escapeHtml(b)}">${escapeHtml(b)}</span>`)
              .join('')}
          </div>
          <div class="card-meta-right">
            ${latency ? `<span>⚡ ${escapeHtml(latency)}</span>` : ''}
            <a
              class="launch-link"
              href="${escapeHtml(srv.url)}"
              target="${linkTarget}"
              rel="noopener noreferrer"
            >
              Open ↗
            </a>
          </div>
        </div>
      </article>
    `;
  }

  // ==========================================================================
  // API Polling & Data Loading
  // ==========================================================================
  async function loadDashboardConfig() {
    const res = await apiFetch('/api/config');
    const data = await res.json();
    state.config = data.config;
    state.integrations = data.integrations || [];

    applyVisualSettings(state.config.settings);
    renderBookmarks();
    renderCategoryTabs();
    renderServices();
    schedulePolling();
  }

  async function pollAllStatuses() {
    try {
      el.refreshAllBtn.style.opacity = '0.6';
      const res = await apiFetch('/api/status');
      const data = await res.json();
      if (data && data.statuses) {
        state.statuses = data.statuses;
        updateSummaryCounter();
        renderServices();
      }
    } catch (err) {
      console.error('Status polling failed:', err);
    } finally {
      el.refreshAllBtn.style.opacity = '1';
    }
  }

  function schedulePolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
    }
    const sec = Math.max(5, Number(state.config.settings?.refreshIntervalSec || 15));
    state.pollTimer = setInterval(pollAllStatuses, sec * 1000);
  }

  // ==========================================================================
  // Service Add / Edit Modal
  // ==========================================================================
  function populateIntegrationTypes() {
    el.srvType.innerHTML = state.integrations
      .map((item) => `<option value="${escapeHtml(item.type)}">${escapeHtml(item.name)}</option>`)
      .join('');
  }

  function renderAuthFieldsForType(type, authValues = {}) {
    const schema =
      state.integrations.find((i) => i.type === type) ||
      state.integrations[0] ||
      { authFields: [] };

    el.integrationHint.textContent = schema.description || '';

    const fields = schema.authFields || [];
    if (fields.length === 0) {
      el.dynamicAuthFields.innerHTML = '';
      return;
    }

    el.dynamicAuthFields.innerHTML = fields
      .map(
        (f) => `
        <div class="form-group ${fields.length === 1 ? 'full' : ''}">
          <label class="form-label" for="auth_${escapeHtml(f.key)}">${escapeHtml(f.label)}</label>
          <input
            type="${escapeHtml(f.type || 'text')}"
            class="form-input"
            id="auth_${escapeHtml(f.key)}"
            data-auth-key="${escapeHtml(f.key)}"
            placeholder="${escapeHtml(f.placeholder || '')}"
            value="${escapeHtml(authValues[f.key] || '')}"
            autocomplete="off"
          />
          ${f.help ? `<span class="form-help">${escapeHtml(f.help)}</span>` : ''}
        </div>
      `
      )
      .join('');
  }

  async function openServiceModal(serviceId = null) {
    try {
      const cfgRes = await apiFetch('/api/config');
      const cfgData = await cfgRes.json();
      if (cfgData?.config) {
        state.config = cfgData.config;
      }
      if (cfgData?.integrations) {
        state.integrations = cfgData.integrations;
      }
    } catch (_) {
      // Ignore fetch error and use cached state
    }
    populateIntegrationTypes();
    el.testResultBox.style.display = 'none';
    el.testResultBox.textContent = '';

    const existing = serviceId
      ? (state.config.services || []).find((s) => s.id === serviceId)
      : null;

    if (existing) {
      el.serviceModalTitle.textContent = `Edit ${existing.name}`;
      el.srvId.value = existing.id;
      el.srvType.value = existing.type;
      el.srvCategory.value = existing.category || 'General';
      el.srvName.value = existing.name;
      el.srvUrl.value = existing.url;
      el.srvDesc.value = existing.description || '';
      el.srvVerifySsl.checked = Boolean(existing.verifySsl);
      el.deleteServiceBtn.style.display = 'inline-flex';
      renderAuthFieldsForType(existing.type, existing.auth || {});
    } else {
      const defaultSchema = state.integrations[0] || {
        type: 'proxmox',
        name: 'Proxmox VE',
        category: 'Infrastructure',
        defaultPort: 8006,
      };
      el.serviceModalTitle.textContent = 'Add Service Integration';
      el.srvId.value = '';
      el.srvType.value = defaultSchema.type;
      el.srvCategory.value = defaultSchema.category || 'Infrastructure';
      el.srvName.value = defaultSchema.name;
      el.srvUrl.value = `https://192.168.1.10:${defaultSchema.defaultPort || 443}`;
      el.srvDesc.value = '';
      el.srvVerifySsl.checked = false;
      el.deleteServiceBtn.style.display = 'none';
      renderAuthFieldsForType(defaultSchema.type, {});
    }

    el.serviceModal.classList.add('open');
  }

  function closeServiceModal() {
    el.serviceModal.classList.remove('open');
  }

  function collectServiceFormPayload() {
    const auth = {};
    el.dynamicAuthFields.querySelectorAll('[data-auth-key]').forEach((input) => {
      auth[input.dataset.authKey] = input.value.trim();
    });

    return {
      id: el.srvId.value || undefined,
      type: el.srvType.value,
      category: el.srvCategory.value.trim() || 'General',
      name: el.srvName.value.trim(),
      url: el.srvUrl.value.trim(),
      description: el.srvDesc.value.trim(),
      verifySsl: el.srvVerifySsl.checked,
      auth,
    };
  }

  // ==========================================================================
  // Appearance & Global Settings Modal
  // ==========================================================================
  function renderWallpaperPresets(currentUrl) {
    el.wallpaperPresets.innerHTML = WALLPAPER_PRESETS.map(
      (p) => `
      <div
        class="wallpaper-thumb ${p.url === currentUrl ? 'active' : ''}"
        style="background-image: url('${escapeHtml(p.url)}');"
        title="${escapeHtml(p.name)}"
        data-bg-url="${escapeHtml(p.url)}"
      ></div>
    `
    ).join('');

    el.wallpaperPresets.querySelectorAll('.wallpaper-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const url = thumb.dataset.bgUrl;
        el.setBgUrl.value = url;
        el.wallpaperPresets.querySelectorAll('.wallpaper-thumb').forEach((t) =>
          t.classList.toggle('active', t === thumb)
        );
        applyVisualSettings({ ...state.config.settings, backgroundUrl: url });
      });
    });
  }

  function openSettingsModal() {
    const s = state.config.settings || {};
    el.setTitle.value = s.title || 'Nexus Homelab';
    el.setSubtitle.value = s.subtitle || '';
    el.setBgUrl.value = s.backgroundUrl || '';
    el.setBlur.value = s.blurAmount ?? 28;
    el.setBlurVal.textContent = `${el.setBlur.value}px`;

    el.setCardOpacity.value = s.cardOpacity ?? 0.12;
    el.setCardOpacityVal.textContent = `${Math.round(Number(el.setCardOpacity.value) * 100)}%`;

    el.setOverlayOpacity.value = s.overlayOpacity ?? 0.14;
    el.setOverlayOpacityVal.textContent = `${Math.round(Number(el.setOverlayOpacity.value) * 100)}%`;

    el.setRefresh.value = String(s.refreshIntervalSec || 15);
    el.setDemoMode.checked = Boolean(s.demoMode);
    el.setNewTab.checked = s.openLinksInNewTab !== false;

    renderWallpaperPresets(s.backgroundUrl);
    el.settingsModal.classList.add('open');
  }

  function closeSettingsModal() {
    applyVisualSettings(state.config.settings);
    el.settingsModal.classList.remove('open');
  }

  // ==========================================================================
  // Encrypted Credentials Vault (Requires Master Password on Every Open)
  // ==========================================================================
  function wipeVaultMemory() {
    vaultMasterPassword = '';
    vaultEntries = [];
    vaultRevealedIds.clear();
    vaultSearchQuery = '';
    if (el.vaultUnlockPass) el.vaultUnlockPass.value = '';
    if (el.vaultSetupPass) el.vaultSetupPass.value = '';
    if (el.vaultSetupPassConfirm) el.vaultSetupPassConfirm.value = '';
    if (el.vaultNewMasterPass) el.vaultNewMasterPass.value = '';
    if (el.vaultNewMasterPassConfirm) el.vaultNewMasterPassConfirm.value = '';
    if (el.vaultSearchInput) el.vaultSearchInput.value = '';
    if (el.vaultEntriesList) el.vaultEntriesList.innerHTML = '';
    if (el.vaultEntryFormWrap) el.vaultEntryFormWrap.style.display = 'none';
    if (el.vaultChangePassWrap) el.vaultChangePassWrap.style.display = 'none';
    if (el.vaultUnlockError) el.vaultUnlockError.style.display = 'none';
    if (el.vaultSetupError) el.vaultSetupError.style.display = 'none';
  }

  async function openVaultModal() {
    wipeVaultMemory();
    el.vaultSetupView.style.display = 'none';
    el.vaultUnlockView.style.display = 'none';
    el.vaultContentView.style.display = 'none';
    el.vaultModal.classList.add('open');

    try {
      const res = await apiFetch('/api/vault/status');
      const data = await res.json();
      if (data.initialized) {
        el.vaultUnlockView.style.display = 'block';
        setTimeout(() => el.vaultUnlockPass?.focus(), 60);
      } else {
        el.vaultSetupView.style.display = 'block';
        setTimeout(() => el.vaultSetupPass?.focus(), 60);
      }
    } catch (err) {
      el.vaultUnlockView.style.display = 'block';
    }
  }

  function closeVaultModal() {
    wipeVaultMemory();
    el.vaultModal.classList.remove('open');
  }

  async function copyToClipboard(text, label) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast(`Copied ${label} to clipboard`);
    } catch (_) {
      showToast(`Failed to copy ${label}`);
    }
  }

  function renderVaultEntries() {
    if (!el.vaultEntriesList) return;
    const q = vaultSearchQuery.trim().toLowerCase();
    const filtered = vaultEntries.filter((item) => {
      if (!q) return true;
      return (
        (item.serviceName || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.url || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      el.vaultEntriesList.innerHTML = `
        <div class="vault-entry-card" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          ${q ? 'No saved logins match your search.' : 'No logins saved yet. Click "+ Add Login" above to add your first credential.'}
        </div>
      `;
      return;
    }

    el.vaultEntriesList.innerHTML = filtered
      .map((item) => {
        const isRevealed = vaultRevealedIds.has(item.id);
        const hasPassword = Boolean(item.password);
        const maskedPass = hasPassword ? '••••••••••••' : '—';
        const shownPass = hasPassword ? item.password : '—';

        return `
          <div class="vault-entry-card" data-vault-id="${escapeHtml(item.id)}">
            <div class="vault-entry-top">
              <div class="vault-entry-title-group">
                <span class="vault-entry-name">${escapeHtml(item.serviceName)}</span>
                ${
                  item.category
                    ? `<span class="mini-badge">${escapeHtml(item.category)}</span>`
                    : ''
                }
                ${
                  item.url
                    ? `<a class="vault-entry-url" href="${escapeHtml(
                        item.url
                      )}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)} ↗</a>`
                    : ''
                }
              </div>
              <div class="vault-entry-actions">
                <button type="button" class="vault-mini-btn" data-vault-edit="${escapeHtml(
                  item.id
                )}">Edit</button>
                <button type="button" class="vault-mini-btn" style="color: #FCA5A5;" data-vault-delete="${escapeHtml(
                  item.id
                )}">Delete</button>
              </div>
            </div>

            <div class="vault-fields-grid">
              <div class="vault-field-box">
                <div class="vault-field-info">
                  <div class="vault-field-label">Username / Login</div>
                  <div class="vault-field-val">${escapeHtml(item.username || '—')}</div>
                </div>
                ${
                  item.username
                    ? `<div class="vault-field-btns">
                        <button type="button" class="vault-mini-btn" data-vault-copy-user="${escapeHtml(
                          item.id
                        )}">Copy</button>
                      </div>`
                    : ''
                }
              </div>

              <div class="vault-field-box">
                <div class="vault-field-info">
                  <div class="vault-field-label">Password</div>
                  <div class="vault-field-val">${escapeHtml(
                    isRevealed ? shownPass : maskedPass
                  )}</div>
                </div>
                ${
                  hasPassword
                    ? `<div class="vault-field-btns">
                        <button type="button" class="vault-mini-btn" data-vault-toggle-pass="${escapeHtml(
                          item.id
                        )}">${isRevealed ? 'Hide' : 'Show'}</button>
                        <button type="button" class="vault-mini-btn" data-vault-copy-pass="${escapeHtml(
                          item.id
                        )}">Copy</button>
                      </div>`
                    : ''
                }
              </div>
            </div>

            ${
              item.notes
                ? `<div class="vault-notes-row"><strong>Notes:</strong> ${escapeHtml(
                    item.notes
                  )}</div>`
                : ''
            }
          </div>
        `;
      })
      .join('');

    // Bind button actions inside rendered cards
    el.vaultEntriesList.querySelectorAll('[data-vault-copy-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = vaultEntries.find((e) => e.id === btn.dataset.vaultCopyUser);
        if (entry?.username) copyToClipboard(entry.username, `${entry.serviceName} username`);
      });
    });

    el.vaultEntriesList.querySelectorAll('[data-vault-copy-pass]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = vaultEntries.find((e) => e.id === btn.dataset.vaultCopyPass);
        if (entry?.password) copyToClipboard(entry.password, `${entry.serviceName} password`);
      });
    });

    el.vaultEntriesList.querySelectorAll('[data-vault-toggle-pass]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.vaultTogglePass;
        if (vaultRevealedIds.has(id)) {
          vaultRevealedIds.delete(id);
        } else {
          vaultRevealedIds.add(id);
        }
        renderVaultEntries();
      });
    });

    el.vaultEntriesList.querySelectorAll('[data-vault-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = vaultEntries.find((e) => e.id === btn.dataset.vaultEdit);
        if (!entry) return;
        el.vaultChangePassWrap.style.display = 'none';
        el.vaultEntryFormTitle.textContent = `Edit ${entry.serviceName} Login`;
        el.vaultEntryId.value = entry.id;
        el.vaultEntryService.value = entry.serviceName || '';
        el.vaultEntryCategory.value = entry.category || '';
        el.vaultEntryUsername.value = entry.username || '';
        el.vaultEntryPassword.value = entry.password || '';
        el.vaultEntryUrl.value = entry.url || '';
        el.vaultEntryNotes.value = entry.notes || '';
        el.vaultEntryFormWrap.style.display = 'block';
        el.vaultEntryService.focus();
      });
    });

    el.vaultEntriesList.querySelectorAll('[data-vault-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.vaultDelete;
        const entry = vaultEntries.find((e) => e.id === id);
        if (!entry) return;
        const nextEntries = vaultEntries.filter((e) => e.id !== id);
        await persistVaultEntries(nextEntries, null, `Removed ${entry.serviceName} from vault`);
      });
    });
  }

  async function persistVaultEntries(nextEntries, newMasterPassword = null, toastMessage = 'Vault updated') {
    try {
      const res = await apiFetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword: vaultMasterPassword,
          newMasterPassword: newMasterPassword || undefined,
          entries: nextEntries,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(data.error || 'Failed to save encrypted vault');
        return false;
      }
      if (newMasterPassword) {
        vaultMasterPassword = newMasterPassword;
      }
      vaultEntries = data.entries || nextEntries;
      renderVaultEntries();
      showToast(toastMessage);
      return true;
    } catch (err) {
      showToast(`Vault error: ${err.message}`);
      return false;
    }
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================
  function bindEvents() {
    // Search input + '/' keyboard shortcut
    el.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderServices();
    });

    window.addEventListener('keydown', (e) => {
      if (
        e.key === '/' &&
        document.activeElement !== el.searchInput &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        el.searchInput.focus();
      } else if (e.key === 'Escape') {
        closeServiceModal();
        closeSettingsModal();
        closeVaultModal();
      }
    });

    // Header buttons
    el.refreshAllBtn.addEventListener('click', () => {
      pollAllStatuses();
      showToast('Refreshing service statuses...');
    });

    el.toggleDemoBtn.addEventListener('click', async () => {
      const nextDemo = !state.config.settings?.demoMode;
      const updatedSettings = { ...state.config.settings, demoMode: nextDemo };
      const res = await apiFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.config, settings: updatedSettings }),
      });
      const data = await res.json();
      if (data.ok) {
        state.config = data.config;
        applyVisualSettings(state.config.settings);
        await pollAllStatuses();
        showToast(
          nextDemo
            ? 'Switched to Simulated Demo Mode'
            : 'Switched to Live API Mode (calling service endpoints)'
        );
      }
    });

    el.addServiceBtn.addEventListener('click', () => openServiceModal(null));
    el.closeServiceModalBtn.addEventListener('click', closeServiceModal);
    el.serviceModal.addEventListener('click', (e) => {
      if (e.target === el.serviceModal) closeServiceModal();
    });

    // When changing Integration Type in Add Mode, update default name, category, port & auth fields
    el.srvType.addEventListener('change', () => {
      const selectedType = el.srvType.value;
      const schema = state.integrations.find((i) => i.type === selectedType);
      if (schema && !el.srvId.value) {
        el.srvName.value = schema.name;
        el.srvCategory.value = schema.category || 'General';
        const isHttps = [443, 8006, 8443].includes(schema.defaultPort);
        el.srvUrl.value = `${isHttps ? 'https' : 'http'}://192.168.1.10:${schema.defaultPort || 80}`;
      }
      renderAuthFieldsForType(selectedType, {});
    });

    // Test Connection button inside Service Modal
    el.testConnectionBtn.addEventListener('click', async () => {
      const payload = collectServiceFormPayload();
      if (!payload.url) {
        showToast('Please enter a Service URL first');
        return;
      }
      el.testConnectionBtn.disabled = true;
      el.testConnectionBtn.textContent = 'Testing...';
      el.testResultBox.style.display = 'block';
      el.testResultBox.textContent = 'Connecting to service endpoint...';

      try {
        const res = await apiFetch('/api/test-service', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const status = await res.json();
        const metricsPreview = (status.metrics || [])
          .map((m) => `${m.label}: ${m.value}`)
          .join(' • ');
        const poolsHtml =
          Array.isArray(status.availablePools) && status.availablePools.length > 0
            ? `<div style="margin-top: 0.45rem; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                 <span style="font-size: 0.75rem; color: var(--text-muted);">Click to select pool:</span>
                 ${status.availablePools
                   .map(
                     (p) =>
                       `<button type="button" class="btn" style="padding: 0.2rem 0.55rem; font-size: 0.74rem;" data-pick-pool="${escapeHtml(
                         p
                       )}">${escapeHtml(p)}</button>`
                   )
                   .join('')}
               </div>`
            : '';
        el.testResultBox.style.borderColor = status.online
          ? 'rgba(16, 185, 129, 0.5)'
          : 'rgba(239, 68, 68, 0.5)';
        el.testResultBox.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 0.25rem; color: ${
            status.online ? '#A7F3D0' : '#FCA5A5'
          };">
            ${status.online ? '✓ Connection Successful' : '✕ Connection Failed'} — ${escapeHtml(
          status.statusText
        )} (${status.latencyMs || 0} ms)
          </div>
          <div style="color: var(--text-secondary); font-size: 0.76rem;">
            ${escapeHtml(metricsPreview)}
          </div>
          ${poolsHtml}
        `;
        el.testResultBox.querySelectorAll('[data-pick-pool]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const poolInput = document.getElementById('auth_poolName');
            if (poolInput) {
              poolInput.value = btn.dataset.pickPool;
              showToast(`Selected pool: ${btn.dataset.pickPool}`);
            }
          });
        });
      } catch (err) {
        el.testResultBox.textContent = `Error: ${err.message}`;
      } finally {
        el.testConnectionBtn.disabled = false;
        el.testConnectionBtn.textContent = 'Test Connection';
      }
    });

    // Save Service Form
    el.serviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = collectServiceFormPayload();
      const res = await apiFetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        state.config = data.config;
        closeServiceModal();
        renderCategoryTabs();
        renderServices();
        pollAllStatuses();
        showToast(`Saved ${payload.name}`);
      }
    });

    // Delete Service
    el.deleteServiceBtn.addEventListener('click', async () => {
      const id = el.srvId.value;
      if (!id) return;
      const res = await apiFetch(`/api/services/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        state.config = data.config;
        closeServiceModal();
        renderCategoryTabs();
        renderServices();
        updateSummaryCounter();
        showToast('Service removed');
      }
    });

    // Settings Modal
    el.openSettingsBtn.addEventListener('click', openSettingsModal);
    el.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    el.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    el.settingsModal.addEventListener('click', (e) => {
      if (e.target === el.settingsModal) closeSettingsModal();
    });

    // Live Preview Sliders in Settings Modal
    el.setBlur.addEventListener('input', () => {
      el.setBlurVal.textContent = `${el.setBlur.value}px`;
      document.documentElement.style.setProperty('--glass-blur', `${el.setBlur.value}px`);
    });

    el.setCardOpacity.addEventListener('input', () => {
      el.setCardOpacityVal.textContent = `${Math.round(Number(el.setCardOpacity.value) * 100)}%`;
      document.documentElement.style.setProperty('--card-opacity', el.setCardOpacity.value);
    });

    el.setOverlayOpacity.addEventListener('input', () => {
      el.setOverlayOpacityVal.textContent = `${Math.round(Number(el.setOverlayOpacity.value) * 100)}%`;
      document.documentElement.style.setProperty('--overlay-opacity', el.setOverlayOpacity.value);
    });

    el.setBgUrl.addEventListener('input', () => {
      const url = el.setBgUrl.value.trim();
      if (url) {
        document.documentElement.style.setProperty('--bg-url', `url('${url.replace(/'/g, "\\'")}')`);
      }
    });

    // Upload Local Wallpaper Image
    el.bgFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await apiFetch('/api/upload-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl: reader.result, filename: file.name }),
          });
          const data = await res.json();
          if (data.ok && data.url) {
            el.setBgUrl.value = data.url;
            document.documentElement.style.setProperty('--bg-url', `url('${data.url}')`);
            showToast('Custom background uploaded!');
          }
        } catch (err) {
          showToast('Failed to upload background image');
        }
      };
      reader.readAsDataURL(file);
    });

    // Save Settings Form
    el.settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedSettings = {
        ...state.config.settings,
        title: el.setTitle.value.trim() || 'Nexus Homelab',
        subtitle: el.setSubtitle.value.trim(),
        backgroundUrl: el.setBgUrl.value.trim(),
        blurAmount: Number(el.setBlur.value),
        cardOpacity: Number(el.setCardOpacity.value),
        overlayOpacity: Number(el.setOverlayOpacity.value),
        refreshIntervalSec: Number(el.setRefresh.value),
        demoMode: el.setDemoMode.checked,
        openLinksInNewTab: el.setNewTab.checked,
      };

      const res = await apiFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.config, settings: updatedSettings }),
      });
      const data = await res.json();
      if (data.ok) {
        state.config = data.config;
        applyVisualSettings(state.config.settings);
        schedulePolling();
        pollAllStatuses();
        el.settingsModal.classList.remove('open');
        showToast('Appearance & settings saved!');
      }
    });

    // Login Form Submit
    if (el.loginForm) {
      el.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.loginError.style.display = 'none';
        el.loginSubmitBtn.disabled = true;
        el.loginSubmitBtn.textContent = 'Signing in...';

        try {
          const username = el.loginUsername.value.trim();
          const password = el.loginPassword.value;
          const rememberDevice = el.loginRemember.checked;

          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, rememberDevice }),
          });
          const data = await res.json();

          if (!res.ok || !data.ok) {
            el.loginError.textContent = data.error || 'Invalid username or password';
            el.loginError.style.display = 'block';
            return;
          }

          storeToken(data.token, rememberDevice);
          el.loginPassword.value = '';
          showDashboardShell();
          await loadDashboardConfig();
          await pollAllStatuses();
        } catch (err) {
          el.loginError.textContent = 'Connection error. Please try again.';
          el.loginError.style.display = 'block';
        } finally {
          el.loginSubmitBtn.disabled = false;
          el.loginSubmitBtn.textContent = 'Sign In';
        }
      });
    }

    // Logout Button
    if (el.logoutBtn) {
      el.logoutBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (_) {}
        closeVaultModal();
        storeToken('', false);
        showLoginScreen(state.config.settings);
        showToast('Signed out');
      });
    }

    // ========================================================================
    // Encrypted Credentials Vault Event Listeners
    // ========================================================================
    if (el.openVaultBtn) {
      el.openVaultBtn.addEventListener('click', openVaultModal);
    }
    if (el.closeVaultModalBtn) {
      el.closeVaultModalBtn.addEventListener('click', closeVaultModal);
    }
    if (el.vaultModal) {
      el.vaultModal.addEventListener('click', (e) => {
        if (e.target === el.vaultModal) closeVaultModal();
      });
    }
    if (el.vaultLockBtn) {
      el.vaultLockBtn.addEventListener('click', () => {
        wipeVaultMemory();
        el.vaultContentView.style.display = 'none';
        el.vaultUnlockView.style.display = 'block';
        setTimeout(() => el.vaultUnlockPass?.focus(), 50);
        showToast('Vault locked');
      });
    }

    // First-time Vault Setup Submit
    if (el.vaultSetupForm) {
      el.vaultSetupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.vaultSetupError.style.display = 'none';
        const p1 = el.vaultSetupPass.value;
        const p2 = el.vaultSetupPassConfirm.value;

        if (!p1 || p1.length < 4) {
          el.vaultSetupError.textContent = 'Master Password must be at least 4 characters.';
          el.vaultSetupError.style.display = 'block';
          return;
        }
        if (p1 !== p2) {
          el.vaultSetupError.textContent = 'Master Passwords do not match.';
          el.vaultSetupError.style.display = 'block';
          return;
        }

        el.vaultSetupSubmitBtn.disabled = true;
        el.vaultSetupSubmitBtn.textContent = 'Encrypting...';
        try {
          const res = await apiFetch('/api/vault/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              masterPassword: p1,
              seedFromServices: el.vaultSeedCheckbox.checked,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            el.vaultSetupError.textContent = data.error || 'Failed to initialize vault';
            el.vaultSetupError.style.display = 'block';
            return;
          }
          vaultMasterPassword = p1;
          vaultEntries = data.entries || [];
          el.vaultSetupPass.value = '';
          el.vaultSetupPassConfirm.value = '';
          el.vaultSetupView.style.display = 'none';
          el.vaultContentView.style.display = 'block';
          renderVaultEntries();
          showToast('Encrypted Vault initialized!');
        } catch (err) {
          el.vaultSetupError.textContent = err.message;
          el.vaultSetupError.style.display = 'block';
        } finally {
          el.vaultSetupSubmitBtn.disabled = false;
          el.vaultSetupSubmitBtn.textContent = 'Initialize & Encrypt Vault';
        }
      });
    }

    // Unlock Vault Submit (Required every time the modal opens)
    if (el.vaultUnlockForm) {
      el.vaultUnlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        el.vaultUnlockError.style.display = 'none';
        const pass = el.vaultUnlockPass.value;
        if (!pass) return;

        el.vaultUnlockSubmitBtn.disabled = true;
        el.vaultUnlockSubmitBtn.textContent = 'Decrypting...';
        try {
          const res = await apiFetch('/api/vault/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterPassword: pass }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            el.vaultUnlockError.textContent = data.error || 'Invalid Vault Master Password';
            el.vaultUnlockError.style.display = 'block';
            el.vaultUnlockPass.select();
            return;
          }
          vaultMasterPassword = pass;
          vaultEntries = data.entries || [];
          el.vaultUnlockPass.value = '';
          el.vaultUnlockView.style.display = 'none';
          el.vaultContentView.style.display = 'block';
          renderVaultEntries();
        } catch (err) {
          el.vaultUnlockError.textContent = 'Failed to unlock vault';
          el.vaultUnlockError.style.display = 'block';
        } finally {
          el.vaultUnlockSubmitBtn.disabled = false;
          el.vaultUnlockSubmitBtn.textContent = 'Unlock Logins';
        }
      });
    }

    // Search inside unlocked vault
    if (el.vaultSearchInput) {
      el.vaultSearchInput.addEventListener('input', (e) => {
        vaultSearchQuery = e.target.value;
        renderVaultEntries();
      });
    }

    // Open Add Login subpanel
    if (el.vaultAddEntryBtn) {
      el.vaultAddEntryBtn.addEventListener('click', () => {
        el.vaultChangePassWrap.style.display = 'none';
        el.vaultEntryFormTitle.textContent = 'Add Saved Login';
        el.vaultEntryId.value = '';
        el.vaultEntryService.value = '';
        el.vaultEntryCategory.value = '';
        el.vaultEntryUsername.value = '';
        el.vaultEntryPassword.value = '';
        el.vaultEntryUrl.value = '';
        el.vaultEntryNotes.value = '';
        el.vaultEntryFormWrap.style.display = 'block';
        el.vaultEntryService.focus();
      });
    }

    if (el.vaultEntryCancelBtn) {
      el.vaultEntryCancelBtn.addEventListener('click', () => {
        el.vaultEntryFormWrap.style.display = 'none';
      });
    }

    // Save Added / Edited Login Entry
    if (el.vaultEntryForm) {
      el.vaultEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const existingId = el.vaultEntryId.value;
        const entryObj = {
          id: existingId || `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          serviceName: el.vaultEntryService.value.trim() || 'Untitled Service',
          category: el.vaultEntryCategory.value.trim() || 'General',
          username: el.vaultEntryUsername.value.trim(),
          password: el.vaultEntryPassword.value,
          url: el.vaultEntryUrl.value.trim(),
          notes: el.vaultEntryNotes.value.trim(),
        };

        let nextEntries;
        if (existingId) {
          nextEntries = vaultEntries.map((item) => (item.id === existingId ? entryObj : item));
        } else {
          nextEntries = [entryObj, ...vaultEntries];
        }

        const ok = await persistVaultEntries(
          nextEntries,
          null,
          `Saved ${entryObj.serviceName} to encrypted vault`
        );
        if (ok) {
          el.vaultEntryFormWrap.style.display = 'none';
        }
      });
    }

    // Change Vault Master Password subpanel
    if (el.vaultChangePassBtn) {
      el.vaultChangePassBtn.addEventListener('click', () => {
        el.vaultEntryFormWrap.style.display = 'none';
        el.vaultNewMasterPass.value = '';
        el.vaultNewMasterPassConfirm.value = '';
        el.vaultChangePassWrap.style.display = 'block';
        el.vaultNewMasterPass.focus();
      });
    }

    if (el.vaultChangePassCancelBtn) {
      el.vaultChangePassCancelBtn.addEventListener('click', () => {
        el.vaultChangePassWrap.style.display = 'none';
      });
    }

    if (el.vaultChangePassForm) {
      el.vaultChangePassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const np1 = el.vaultNewMasterPass.value;
        const np2 = el.vaultNewMasterPassConfirm.value;
        if (!np1 || np1.length < 4) {
          showToast('New Master Password must be at least 4 characters');
          return;
        }
        if (np1 !== np2) {
          showToast('New Master Passwords do not match');
          return;
        }
        const ok = await persistVaultEntries(
          vaultEntries,
          np1,
          'Vault re-encrypted with new Master Password!'
        );
        if (ok) {
          el.vaultNewMasterPass.value = '';
          el.vaultNewMasterPassConfirm.value = '';
          el.vaultChangePassWrap.style.display = 'none';
        }
      });
    }
  }

  async function checkSessionAndBoot() {
    try {
      const res = await apiFetch('/api/auth/session');
      const data = await res.json();
      if (data?.theme) {
        applyVisualSettings(data.theme);
        if (el.loginTitle && data.theme.title) {
          el.loginTitle.textContent = data.theme.title;
        }
      }
      if (data?.authenticated) {
        showDashboardShell();
        await loadDashboardConfig();
        await pollAllStatuses();
      } else {
        showLoginScreen(data?.theme);
      }
    } catch (_) {
      showLoginScreen();
    }
  }

  // Initialize
  updateClock();
  setInterval(updateClock, 1000);
  bindEvents();
  checkSessionAndBoot();
})();
