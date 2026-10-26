/**
 * Formatting utilities for homelab metrics (bytes, transfer speeds, uptime, percentages)
 */

function formatBytes(bytes, decimals = 1) {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}

function formatSpeed(bytesPerSec, decimals = 1) {
  if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0) return '0 KB/s';
  return `${formatBytes(bytesPerSec, decimals)}/s`;
}

function formatUptime(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function clampPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.min(100, Math.max(0, Math.round(val)));
}

function getByPath(obj, pathStr) {
  if (!obj || !pathStr) return undefined;
  return pathStr.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    const arrMatch = part.match(/^([^\[\]]+)\[(\d+)\]$/);
    if (arrMatch) {
      const target = acc[arrMatch[1]];
      return Array.isArray(target) ? target[Number(arrMatch[2])] : undefined;
    }
    return acc[part];
  }, obj);
}

module.exports = {
  formatBytes,
  formatSpeed,
  formatUptime,
  clampPercent,
  getByPath,
};
