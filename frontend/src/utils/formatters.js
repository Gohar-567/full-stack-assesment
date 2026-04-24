/**
 * Shared formatting utilities used across timeline, stats, and log components.
 */

/** "6h 30m" | "45m" | "6h" */
export function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "504.2 mi" */
export function formatDistance(miles) {
  return `${miles.toLocaleString('en-US', { maximumFractionDigits: 1 })} mi`;
}

/** "08:00 AM" */
export function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** "Apr 23, 08:00 AM" */
export function formatDatetime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** "Wednesday, April 23, 2026" */
export function formatFullDate(dateStr) {
  // dateStr is "YYYY-MM-DD" — parse as local to avoid TZ shift
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Apr 23" */
export function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Human-friendly label for event_type */
export const EVENT_LABELS = {
  DRIVE:       'Driving',
  PICKUP:      'Pickup',
  DROPOFF:     'Dropoff',
  FUEL:        'Fuel Stop',
  REST_30:     '30-min Break',
  REST_10H:    '10h Rest',
  RESTART_34H: '34h Restart',
};
