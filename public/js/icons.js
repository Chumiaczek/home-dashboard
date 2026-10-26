/**
 * Brand & Service SVG Icons for Nexus Homelab Dashboard
 */

window.SERVICE_ICONS = {
  proxmox: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 5l6.5 7L4 19" stroke="#E57000" stroke-width="2.5"/>
      <path d="M20 5l-6.5 7L20 19" stroke="#E57000" stroke-width="2.5"/>
      <path d="M8.5 5L12 8.8 15.5 5" stroke="currentColor" stroke-width="2"/>
      <path d="M8.5 19L12 15.2 15.5 19" stroke="currentColor" stroke-width="2"/>
    </svg>
  `,
  homeassistant: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z" stroke="#18BCF2"/>
      <path d="M12 18v-7" stroke="currentColor"/>
      <path d="M9 14l3-3 3 3" stroke="currentColor"/>
      <circle cx="9" cy="11" r="1" fill="#18BCF2" stroke="none"/>
      <circle cx="15" cy="11" r="1" fill="#18BCF2" stroke="none"/>
      <circle cx="12" cy="8" r="1" fill="#18BCF2" stroke="none"/>
    </svg>
  `,
  truenas: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" stroke="#0095D5"/>
      <polyline points="3.3 7 12 12 20.7 7" stroke="currentColor"/>
      <line x1="12" y1="22" x2="12" y2="12" stroke="#0095D5"/>
    </svg>
  `,
  jellyfin: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3C7.5 11 4 16 4 18.5C4 20.5 7.5 21 12 21C16.5 21 20 20.5 20 18.5C20 16 16.5 11 12 3Z" stroke="#AA5CC3"/>
      <path d="M12 9.5C10 13 8.5 15.5 8.5 16.8C8.5 17.8 10 18 12 18C14 18 15.5 17.8 15.5 16.8C15.5 15.5 14 13 12 9.5Z" stroke="currentColor"/>
    </svg>
  `,
  unifi: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" stroke="#0559C9"/>
      <path d="M8.5 14.5a5 5 0 0 1 7 0" stroke="currentColor"/>
      <path d="M6.5 12a8 8 0 0 1 11 0" stroke="#0559C9"/>
      <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  `,
  edgeos: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="13" width="20" height="7" rx="2" stroke="#00A0DF"/>
      <line x1="6" y1="16.5" x2="6.01" y2="16.5" stroke="currentColor" stroke-width="2.5"/>
      <line x1="10" y1="16.5" x2="10.01" y2="16.5" stroke="currentColor" stroke-width="2.5"/>
      <path d="M7 13V6l5-2 5 2v7" stroke="currentColor"/>
    </svg>
  `,
  radarr: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="#FFC230"/>
      <line x1="7" y1="4" x2="7" y2="20" stroke="currentColor"/>
      <line x1="17" y1="4" x2="17" y2="20" stroke="currentColor"/>
      <polygon points="10.5 9.5 15 12 10.5 14.5 10.5 9.5" fill="#FFC230" stroke="none"/>
    </svg>
  `,
  sonarr: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="#35C5F4"/>
      <polyline points="8 2 12 6 16 2" stroke="currentColor"/>
      <circle cx="12" cy="13" r="3" stroke="#35C5F4"/>
    </svg>
  `,
  qbittorrent: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" stroke="#388BFF"/>
      <path d="M9 12l3 3 3-3" stroke="currentColor"/>
      <path d="M12 8v7" stroke="currentColor"/>
    </svg>
  `,
  prowlarr: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7" stroke="#E66000"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2.5"/>
    </svg>
  `,
  pihole: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#EF4444"/>
      <path d="M9 12l2 2 4-4" stroke="currentColor"/>
    </svg>
  `,
  generic: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="#818CF8"/>
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor"/>
    </svg>
  `,
};

window.getServiceIcon = function getServiceIcon(type) {
  const key = String(type || 'generic').toLowerCase();
  return window.SERVICE_ICONS[key] || window.SERVICE_ICONS.generic;
};
