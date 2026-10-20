/**
 * StudySync formatters and helpers.
 */

const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE_URL || 'http://localhost:5000';

/**
 * Returns a full URL for media stored on the backend.
 * If url already starts with http/https, returns as is.
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${UPLOADS_BASE}${cleanPath}`;
}

/**
 * Formats bytes to human-readable string (KB, MB).
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Level tiers — matching backend LEVEL_TIERS in points.service.js
 */
export const LEVEL_TIERS = [
  { level: 1, minPoints: 0, name: 'Beginner', badgeColor: 'bg-surface-100 text-surface-700 border-surface-200' },
  { level: 2, minPoints: 10, name: 'Learner', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { level: 3, minPoints: 50, name: 'Contributor', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { level: 4, minPoints: 150, name: 'Knowledge Sharer', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { level: 5, minPoints: 400, name: 'Scholar', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
];

/**
 * Calculates student level tier info from points based on backend single source of truth.
 */
export function getLevelTier(points = 0) {
  const p = Math.max(0, points || 0);
  let tierIndex = LEVEL_TIERS.length - 1;
  while (tierIndex > 0 && LEVEL_TIERS[tierIndex].minPoints > p) {
    tierIndex -= 1;
  }
  const current = LEVEL_TIERS[tierIndex];
  const next = LEVEL_TIERS[tierIndex + 1] || null;

  return {
    level: current.level,
    name: current.name,
    minPoints: current.minPoints,
    badgeColor: current.badgeColor,
    nextLevel: next ? next.level : null,
    nextLevelName: next ? next.name : null,
    nextLevelMinPoints: next ? next.minPoints : null,
    pointsToNextLevel: next ? next.minPoints - p : null,
  };
}

/**
 * Formats relative date or standard date string.
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
