/**
 * Color-coded status/event badge.
 * Usage: <Badge label="Driving" /> or <Badge label="REST_10H" />
 */
const STYLES = {
  // Duty statuses
  'Driving':               'bg-emerald-100 text-emerald-800 ring-emerald-300',
  'Off Duty':              'bg-slate-100   text-slate-600   ring-slate-300',
  'Sleeper Berth':         'bg-indigo-100  text-indigo-700  ring-indigo-300',
  'On Duty (Not Driving)': 'bg-amber-100   text-amber-800   ring-amber-300',
  // Event types
  DRIVE:       'bg-emerald-100 text-emerald-800 ring-emerald-300',
  PICKUP:      'bg-sky-100     text-sky-800     ring-sky-300',
  DROPOFF:     'bg-rose-100    text-rose-800    ring-rose-300',
  FUEL:        'bg-orange-100  text-orange-800  ring-orange-300',
  REST_30:     'bg-yellow-100  text-yellow-800  ring-yellow-300',
  REST_10H:    'bg-indigo-100  text-indigo-700  ring-indigo-300',
  RESTART_34H: 'bg-purple-100  text-purple-800  ring-purple-300',
};

const LABEL_MAP = {
  DRIVE:       'Driving',
  PICKUP:      'Pickup',
  DROPOFF:     'Dropoff',
  FUEL:        'Fuel Stop',
  REST_30:     '30-min Break',
  REST_10H:    '10h Rest',
  RESTART_34H: '34h Restart',
};

export default function Badge({ label, size = 'sm' }) {
  const cls = STYLES[label] ?? 'bg-gray-100 text-gray-600 ring-gray-300';
  const display = LABEL_MAP[label] ?? label;
  const sizeClass = size === 'xs'
    ? 'px-1.5 py-0 text-[10px]'
    : 'px-2.5 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded ring-1 font-medium font-mono ${sizeClass} ${cls}`}>
      {display}
    </span>
  );
}
