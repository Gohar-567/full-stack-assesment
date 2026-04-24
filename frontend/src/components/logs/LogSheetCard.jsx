import { useState } from 'react';
import { Eye, Download, X } from 'lucide-react';
import { formatFullDate } from '../../utils/formatters';

// ── Lightbox preview modal ────────────────────────────────────────────────────
function PreviewModal({ open, date, imageBase64, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative max-w-[95vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-navy-950 border-b border-navy-800">
          <p className="font-display font-bold text-sm text-white">{formatFullDate(date)} — ELD Log Sheet</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10
              hover:bg-white/20 text-white transition-colors"
            aria-label="Close preview"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        {/* Image */}
        <div className="p-4 overflow-auto">
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt={`ELD log — ${date}`}
            className="max-w-full max-h-[80vh] rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export default function LogSheetCard({ date, imageBase64, index }) {
  const [preview, setPreview] = useState(false);
  const fullDate = formatFullDate(date);

  function handleDownload() {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `eld-log-${date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <PreviewModal
        open={preview}
        date={date}
        imageBase64={imageBase64}
        onClose={() => setPreview(false)}
      />

      <div className="bg-white border border-sand-300 rounded-xl overflow-hidden shadow-sm
        hover:shadow-md transition-shadow duration-200 animate-fade-in">

        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand-200 bg-sand-50">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Day {index + 1} · ELD Log Sheet
            </p>
            <p className="font-display font-bold text-sm text-navy-900 leading-tight">{fullDate}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Preview button */}
            <button
              onClick={() => setPreview(true)}
              title="Preview full size"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand-300
                text-slate-500 hover:text-navy-900 hover:bg-sand-100 hover:border-navy-200
                transition-all duration-150"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Download icon button */}
            <button
              onClick={handleDownload}
              title={`Download ELD log PNG for ${date}`}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand-300
                text-slate-500 hover:text-navy-900 hover:bg-sand-100 hover:border-navy-200
                transition-all duration-150"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail — click to preview */}
        <button
          onClick={() => setPreview(true)}
          className="block w-full p-3 bg-white hover:bg-sand-50 transition-colors duration-150 text-left"
          title="Click to preview"
        >
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt={`ELD Daily Log Sheet — ${fullDate}`}
            className="w-full rounded-lg border border-sand-200"
            loading="lazy"
          />
        </button>
      </div>
    </>
  );
}

