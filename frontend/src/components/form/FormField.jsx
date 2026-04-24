/**
 * Reusable labeled form input with step indicator.
 */
export default function FormField({
  label,
  step,
  error,
  hint,
  className = '',
  ...inputProps
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1.5">
        {step !== undefined && (
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-900 text-white text-[10px] font-display font-bold flex items-center justify-center">
            {step}
          </span>
        )}
        <label className="text-sm font-medium text-slate-700">{label}</label>
      </div>
      <input
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm
          placeholder:text-slate-400 text-slate-900
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:border-transparent
          ${error
            ? 'border-red-400 focus:ring-red-300'
            : 'border-sand-300 focus:ring-amber-400 hover:border-slate-400'
          }`}
        {...inputProps}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
