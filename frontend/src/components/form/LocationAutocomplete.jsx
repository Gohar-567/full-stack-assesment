import { useState, useRef, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { autocompleteAddress } from '../../api/tripApi';

/**
 * Address autocomplete input.
 *
 * Props:
 *   label        — field label
 *   step         — A / B / C step badge
 *   value        — controlled string value (the display name)
 *   onChange(str)— called with the selected / typed string
 *   disabled
 *   error        — validation error string
 */
export default function LocationAutocomplete({
  label,
  step,
  value = '',
  onChange,
  disabled = false,
  error,
}) {
  const [inputVal, setInputVal]       = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [fetching, setFetching]       = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const justSelected = useRef(false);

  const debouncedQuery = useDebounce(inputVal, 280);

  // ── Sync external value changes (e.g. quick-fill example buttons) ────────
  useEffect(() => {
    setInputVal(value);
  }, [value]);

  // ── Fetch suggestions ─────────────────────────────────────────────────────
  useEffect(() => {
    // Block refetch triggered by selecting a suggestion
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    autocompleteAddress(debouncedQuery)
      .then(data => {
        if (!cancelled) {
          setSuggestions(data);
          setOpen(data.length > 0);
          setActiveIdx(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function onOutside(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // ── Select a suggestion ───────────────────────────────────────────────────
  function select(suggestion) {
    justSelected.current = true;
    setInputVal(suggestion.display_name);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
    onChange(suggestion.display_name);
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">

      {/* Label row */}
      <div className="flex items-center gap-2 mb-1.5">
        {step !== undefined && (
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-900 text-white
            text-[10px] font-display font-bold flex items-center justify-center">
            {step}
          </span>
        )}
        <label className="text-sm font-medium text-slate-700">{label}</label>

        {/* Spinner while fetching */}
        {fetching && (
          <span className="ml-auto w-3 h-3 rounded-full border border-amber-400
            border-t-transparent animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => {
            setInputVal(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          autoComplete="off"
          placeholder="Start typing a city or address…"
          className={`w-full rounded-md border bg-white pl-3 py-2.5 text-sm
            placeholder:text-slate-400 text-slate-900
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${inputVal ? 'pr-16' : 'pr-8'}
            ${error
              ? 'border-red-400 focus:ring-red-300'
              : 'border-sand-300 focus:ring-amber-400 hover:border-slate-400'
            }`}
        />
        {/* Right-side icons */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear button — only shown when there's a value */}
          {inputVal && !disabled && (
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                justSelected.current = true;
                setInputVal('');
                setSuggestions([]);
                setOpen(false);
                onChange('');
                inputRef.current?.focus();
              }}
              className="w-4 h-4 flex items-center justify-center rounded-full
                bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700
                transition-colors duration-100 flex-shrink-0"
              aria-label="Clear"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
          {/* Map pin icon */}
          <MapPin className="w-4 h-4 text-slate-400 pointer-events-none flex-shrink-0" />
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-sand-300
            rounded-lg shadow-xl overflow-hidden animate-fade-in"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => select(s)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-3 py-2.5 text-sm cursor-pointer flex items-start gap-2.5
                border-b border-sand-200 last:border-0 transition-colors duration-75
                ${i === activeIdx ? 'bg-amber-50 text-navy-900' : 'text-slate-700 hover:bg-sand-50'}`}
            >
              <span className={`mt-0.5 flex-shrink-0 text-xs
                ${i === activeIdx ? 'text-amber-500' : 'text-slate-400'}`}>
                ●
              </span>
              <span className="leading-snug">{s.display_name}</span>
            </li>
          ))}

          <li className="px-3 py-1.5 bg-sand-50 border-t border-sand-200">
            <p className="text-[10px] text-slate-400">
              Powered by OpenStreetMap / OpenRouteService
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}
