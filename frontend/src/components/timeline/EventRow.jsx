import { Truck, Coffee, Moon, RefreshCw, Package, Flag, Fuel, Circle } from 'lucide-react';
import { formatTime, formatDuration, formatDistance } from '../../utils/formatters';

// ─── Per-event-type config ─────────────────────────────────────────────────

const EVENT_CONFIG = {
  DRIVE: {
    label:      'Driving',
    bar:        'bg-emerald-500',
    iconBg:     'bg-emerald-50',
    iconColor:  'text-emerald-600',
    labelColor: 'text-emerald-700',
    Icon:       Truck,
  },
  REST_30: {
    label:      '30-min Break',
    bar:        'bg-amber-400',
    iconBg:     'bg-amber-50',
    iconColor:  'text-amber-500',
    labelColor: 'text-amber-700',
    Icon:       Coffee,
  },
  REST_10H: {
    label:      '10h Rest',
    bar:        'bg-indigo-500',
    iconBg:     'bg-indigo-50',
    iconColor:  'text-indigo-600',
    labelColor: 'text-indigo-700',
    Icon:       Moon,
  },
  RESTART_34H: {
    label:      '34h Restart',
    bar:        'bg-purple-500',
    iconBg:     'bg-purple-50',
    iconColor:  'text-purple-600',
    labelColor: 'text-purple-700',
    Icon:       RefreshCw,
  },
  PICKUP: {
    label:      'Pickup',
    bar:        'bg-sky-500',
    iconBg:     'bg-sky-50',
    iconColor:  'text-sky-600',
    labelColor: 'text-sky-700',
    Icon:       Package,
  },
  DROPOFF: {
    label:      'Dropoff',
    bar:        'bg-rose-500',
    iconBg:     'bg-rose-50',
    iconColor:  'text-rose-600',
    labelColor: 'text-rose-700',
    Icon:       Flag,
  },
  FUEL: {
    label:      'Fuel Stop',
    bar:        'bg-orange-500',
    iconBg:     'bg-orange-50',
    iconColor:  'text-orange-500',
    labelColor: 'text-orange-700',
    Icon:       Fuel,
  },
};

const DEFAULT_CFG = {
  label: 'Event', bar: 'bg-slate-400', iconBg: 'bg-slate-50',
  iconColor: 'text-slate-500', labelColor: 'text-slate-700',
  Icon: Circle,
};

// ─── Single event row ───────────────────────────────────────────────────────

export default function EventRow({ event }) {
  const cfg    = EVENT_CONFIG[event.event_type] || DEFAULT_CFG;
  const { Icon } = cfg;
  const startT = formatTime(event.start_time);
  const endT   = formatTime(event.end_time);
  const dur    = formatDuration(event.duration_hours);

  return (
    <div className="flex items-stretch rounded-lg overflow-hidden border border-sand-200 bg-white mb-2 shadow-sm">

      {/* Icon square */}
      <div className={`flex-shrink-0 flex items-center justify-center w-11 ${cfg.iconBg}`}>
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        {/* Row 1: event type label + time range */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold text-sm ${cfg.labelColor}`}>{cfg.label}</span>
          <span className="text-[11px] text-slate-400 font-mono">{startT} → {endT}</span>
        </div>
        {/* Row 2: location */}
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug break-words" title={event.location_name}>
          {event.location_name}
        </p>
      </div>

      {/* Right: duration + miles */}
      <div className="flex-shrink-0 flex flex-col items-end justify-center px-3 py-2.5 gap-0.5">
        <span className="font-mono text-base font-bold text-navy-900 leading-none">{dur}</span>
        {event.event_type === 'DRIVE' && event.miles_driven > 0 && (
          <span className="text-[10px] font-mono text-emerald-600 leading-none">
            {formatDistance(event.miles_driven)}
          </span>
        )}
      </div>
    </div>
  );
}
