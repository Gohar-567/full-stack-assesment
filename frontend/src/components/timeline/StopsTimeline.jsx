import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import EventRow from './EventRow';

function groupByDay(events) {
  const days = {};
  events.forEach(ev => {
    const day = ev.start_time.substring(0, 10);
    if (!days[day]) days[day] = [];
    days[day].push(ev);
  });
  return Object.entries(days).sort(([a], [b]) => a.localeCompare(b));
}

function formatDayHeader(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Pill legend items ──────────────────────────────────────────────────────

const LEGEND = [
  { label: 'Drive',  dot: 'bg-emerald-500' },
  { label: 'Rest',   dot: 'bg-indigo-500'  },
  { label: 'Break',  dot: 'bg-amber-400'   },
  { label: 'Stop',   dot: 'bg-sky-500'     },
];

// ─── Collapsible day section ────────────────────────────────────────────────

function DaySection({ dateStr, events }) {
  const [open, setOpen] = useState(true);
  const totalMiles = events
    .filter(e => e.event_type === 'DRIVE')
    .reduce((s, e) => s + (e.miles_driven || 0), 0);

  return (
    <div className="border border-sand-300 rounded-xl overflow-hidden">
      {/* Day header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5
          bg-sand-100 hover:bg-sand-200 transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm text-navy-900 uppercase tracking-wide">
            {formatDayHeader(dateStr)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
          {totalMiles > 0 && (
            <span className="text-[10px] font-mono font-semibold text-emerald-700
              bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              {totalMiles.toFixed(0)} mi
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Events */}
      {open && (
        <div className="p-3 bg-sand-50">
          {events.map((ev, i) => (
            <EventRow key={i} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function StopsTimeline({ events = [] }) {
  const dayGroups = useMemo(() => groupByDay(events), [events]);

  return (
    <section>
      {/* Header */}
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold text-navy-900">Event Timeline</h2>
      </div>

      {/* Day-grouped sections */}
      <div className="space-y-3">
        {dayGroups.map(([dateStr, dayEvents]) => (
          <DaySection key={dateStr} dateStr={dateStr} events={dayEvents} />
        ))}
      </div>
    </section>
  );
}

