import { useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import Spinner from '../ui/Spinner';

function validate(form) {
  const e = {};
  if (!form.current_location.trim())  e.current_location  = 'Required';
  if (!form.pickup_location.trim())   e.pickup_location   = 'Required';
  if (!form.dropoff_location.trim())  e.dropoff_location  = 'Required';
  const c = parseFloat(form.current_cycle_used);
  if (isNaN(c) || c < 0 || c > 70)   e.current_cycle_used = 'Must be 0 – 70';
  return e;
}

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location:   '',
    pickup_location:    '',
    dropoff_location:   '',
    current_cycle_used: '0',
  });
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ ...form, current_cycle_used: parseFloat(form.current_cycle_used) });
  }

  const cycleVal = parseFloat(form.current_cycle_used) || 0;
  const cyclePct = (cycleVal / 70) * 100;
  const cycleWarning = cycleVal >= 60;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">

      {/* Hero heading */}
      <div className="text-center mb-8">
        <h2 className="font-display text-4xl font-bold text-navy-900 mb-2 tracking-tight">
          Plan Your Route
        </h2>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-sand-300 rounded-xl shadow-sm overflow-hidden animate-slide-up"
      >
        <div className="p-6 space-y-4">

          {/* Route fields with visual connector */}
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[9px] top-8 bottom-8 w-px bg-gradient-to-b from-navy-900 via-amber-400 to-rose-500 opacity-30 pointer-events-none" />

            <div className="space-y-3">
              <LocationAutocomplete
                label="Current Location"
                step="A"
                value={form.current_location}
                onChange={v => set('current_location', v)}
                error={errors.current_location}
                disabled={loading}
              />
              <LocationAutocomplete
                label="Pickup Location"
                step="B"
                value={form.pickup_location}
                onChange={v => set('pickup_location', v)}
                error={errors.pickup_location}
                disabled={loading}
              />
              <LocationAutocomplete
                label="Dropoff Location"
                step="C"
                value={form.dropoff_location}
                onChange={v => set('dropoff_location', v)}
                error={errors.dropoff_location}
                disabled={loading}
              />
            </div>
          </div>

          {/* Cycle hours with visual gauge */}
          <div className="pt-1 border-t border-sand-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Current Cycle Used
              </label>
              <span className={`font-mono text-sm font-bold tabular-nums ${cycleWarning ? 'text-red-600' : 'text-navy-900'}`}>
                {cycleVal.toFixed(1)}h
                <span className="text-slate-400 font-normal"> / 70h</span>
              </span>
            </div>

            {/* Gauge bar */}
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  cyclePct > 85 ? 'bg-red-500' :
                  cyclePct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${cyclePct}%` }}
              />
            </div>

            <input
              type="range"
              min="0" max="70" step="0.5"
              value={form.current_cycle_used}
              onChange={e => set('current_cycle_used', e.target.value)}
              disabled={loading}
              className="w-full accent-amber-500"
            />

            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0h (Fresh)</span>
              {cycleWarning && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  Near cycle limit — restart may be triggered
                </span>
              )}
              <span>70h (Full)</span>
            </div>
            {errors.current_cycle_used && (
              <p className="text-xs text-red-600 mt-1">{errors.current_cycle_used}</p>
            )}
          </div>
        </div>

        {/* Submit footer */}
        <div className="bg-sand-50 border-t border-sand-200 px-6 py-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5
              bg-navy-900 hover:bg-navy-800 active:bg-navy-950
              text-white font-display font-semibold text-sm
              py-3 px-6 rounded-lg
              transition-all duration-200
              shadow-sm hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="animate-pulse-soft">Calculating route…</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Calculate HOS Route
              </>
            )}
          </button>

        </div>
      </form>
    </div>
  );
}
