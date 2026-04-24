import { useState, useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';

const FIELDS = [
  { key: 'driverName',    label: 'Driver Name',            required: true,  placeholder: 'John Smith' },
  { key: 'carrierName',   label: 'Carrier / Company Name', required: true,  placeholder: 'ACME Freight LLC' },
  { key: 'truckNumber',   label: 'Truck / Tractor No.',    required: false, placeholder: 'T-1042' },
  { key: 'trailerNumber', label: 'Trailer No.(s)',         required: false, placeholder: 'TRL-8821' },
  { key: 'licensePlate',  label: 'License Plate / State',  required: false, placeholder: 'ABC 1234 / IL' },
  { key: 'homeTerminal',  label: 'Home Terminal Address',  required: false, placeholder: '100 Depot Rd, Chicago, IL 60601' },
  { key: 'officeAddress', label: 'Main Office Address',    required: false, placeholder: '200 Corp Blvd, Dallas, TX 75201' },
];

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, '']));

export default function DriverInfoModal({ open, onClose, onConfirm, generating }) {
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const firstRef = useRef(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    FIELDS.filter(f => f.required).forEach(f => {
      if (!form[f.key].trim()) errs[f.key] = 'Required';
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onConfirm(form);
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-navy-950/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="bg-navy-950 px-6 py-5">
          <h2 className="font-display text-lg font-bold text-white leading-tight">
            Driver Information
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Required for your ELD log PDF. Matches standard FMCSA log sheet fields.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center
              rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
            {/* Two-column layout for shorter fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.slice(0, 4).map((f, i) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {f.label}
                    {f.required && <span className="text-amber-500 ml-0.5">*</span>}
                  </label>
                  <input
                    ref={i === 0 ? firstRef : undefined}
                    type="text"
                    value={form[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900
                      placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent
                      transition-all duration-150
                      ${errors[f.key]
                        ? 'border-red-400 focus:ring-red-300'
                        : 'border-sand-300 focus:ring-amber-400 hover:border-slate-400'
                      }`}
                  />
                  {errors[f.key] && (
                    <p className="text-xs text-red-600 mt-0.5">{errors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Full-width fields */}
            {FIELDS.slice(4).map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-sand-300 px-3 py-2 text-sm text-slate-900
                    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400
                    focus:border-transparent hover:border-slate-400 transition-all duration-150"
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-sand-50 border-t border-sand-200 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-sand-300 text-sm font-medium
                text-slate-600 hover:bg-sand-100 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold
                transition-all duration-150 shadow-sm hover:shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30
                    border-t-white animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
