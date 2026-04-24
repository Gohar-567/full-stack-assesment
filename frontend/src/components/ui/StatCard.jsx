/**
 * Summary metric card shown in the results header bar.
 * `icon` must be a Lucide React component: <StatCard icon={MapPin} ... />
 */
export default function StatCard({ icon: Icon, label, value, unit, highlight = false }) {
  return (
    <div className={`bg-white rounded-lg border px-4 py-3 flex items-center gap-3 shadow-sm
      ${highlight ? 'border-amber-300 bg-amber-50' : 'border-sand-300'}`}
    >
      <span className={`flex-shrink-0 ${highlight ? 'text-amber-500' : 'text-slate-400'}`}>
        <Icon className="w-6 h-6" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-1">
          {label}
        </p>
        <p className="font-display font-bold text-xl text-navy-900 leading-none">
          {value}
          {unit && (
            <span className="text-sm font-sans font-normal text-slate-500 ml-1">{unit}</span>
          )}
        </p>
      </div>
    </div>
  );
}
