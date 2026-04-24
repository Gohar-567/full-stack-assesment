import { MapPin, Clock, Moon, FileText, AlertTriangle } from 'lucide-react';

import TripForm from '../components/form/TripForm';
import MapDisplay from '../components/map/MapDisplay';
import StopsTimeline from '../components/timeline/StopsTimeline';
import LogSheets from '../components/logs/LogSheets';
import StatCard from '../components/ui/StatCard';
import { formatDuration, formatDistance } from '../utils/formatters';

// ─── Results summary bar ────────────────────────────────────────────────────

function SummaryBar({ data }) {
  const totalMiles = data.total_distance_miles || 0;
  const totalHours = data.total_duration_hours || 0;
  const restCount  = (data.events || []).filter(e =>
    ['REST_10H', 'RESTART_34H', 'REST_30'].includes(e.event_type)
  ).length;
  const logCount = data.log_sheets?.length || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in">
      <StatCard icon={MapPin}   label="Total Distance" value={formatDistance(totalMiles)} />
      <StatCard icon={Clock}    label="Drive Duration" value={formatDuration(totalHours)} />
      <StatCard icon={Moon}     label="Rest Stops"     value={restCount} unit="stops" highlight={restCount > 0} />
      <StatCard icon={FileText} label="Log Sheets"     value={logCount}  unit="days" />
    </div>
  );
}

// ─── Error card ─────────────────────────────────────────────────────────────

function ErrorCard({ message, onReset }) {
  return (
    <div className="max-w-lg mx-auto mt-16 animate-fade-in">
      <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="font-display font-bold text-navy-900 mb-1">Route Error</h3>
        <p className="text-sm text-slate-600 mb-5">{message}</p>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800
            text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-150"
        >
          ← Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function TripPlannerPage({ state, tripData, tripInput, errorMsg, plan, reset }) {
  return (
    <>
      {/* ── Idle / Loading: show form ── */}
      {(state === 'idle' || state === 'loading') && (
        <TripForm onSubmit={plan} loading={state === 'loading'} />
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <ErrorCard message={errorMsg} onReset={reset} />
      )}

      {/* ── Results ── */}
      {state === 'results' && tripData && (
        <div className="animate-slide-up space-y-8">

          {/* Summary stats */}
          <SummaryBar data={tripData} />

          {/* Map + Timeline side-by-side on large screens */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <h2 className="font-display text-lg font-bold text-navy-900 mb-3">
                Route Map
              </h2>
              <MapDisplay data={tripData} />
            </div>

            <div className="xl:col-span-1">
              <div className="xl:max-h-[560px] xl:overflow-y-auto xl:pr-1">
                <StopsTimeline events={tripData.events} />
              </div>
            </div>
          </div>

          {/* ELD log sheets — full width */}
          <LogSheets logSheets={tripData.log_sheets} tripData={tripData} tripInput={tripInput} />

        </div>
      )}
    </>
  );
}
