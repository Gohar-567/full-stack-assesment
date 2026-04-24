import { ArrowLeft } from 'lucide-react';

/**
 * App-wide header.
 * Shows app logo/brand + optional "New Trip" back button.
 */
export default function Header({ onNewTrip, showNewTrip = false }) {
  return (
    <header className="bg-navy-950 border-b border-navy-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-base font-bold text-white leading-none tracking-tight">
              ELD Trip Planner
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 tracking-widest uppercase">
              FMCSA HOS Route Calculator
            </p>
          </div>
        </div>

        {/* Right slot */}
        <div className="flex items-center gap-3">
          {showNewTrip && (
            <button
              onClick={onNewTrip}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors duration-150 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              New Trip
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
