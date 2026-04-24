import { useState } from 'react';
import { FileDown } from 'lucide-react';
import LogSheetCard from './LogSheetCard';
import DriverInfoModal from './DriverInfoModal';
import { generateTripPDF } from '../../utils/pdfGenerator';

/**
 * Grid of ELD log sheet cards, one per calendar day.
 * "Download All" opens the driver-info modal, then generates a full PDF.
 */
export default function LogSheets({ logSheets = [], tripData = {}, tripInput = {} }) {
  const [modalOpen, setModalOpen]   = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!logSheets.length) return null;

  async function handleConfirm(driverInfo) {
    setGenerating(true);
    try {
      // jsPDF is synchronous; wrap in tiny timeout so spinner renders first
      await new Promise(r => setTimeout(r, 50));
      generateTripPDF({ driverInfo, tripData, logSheets, tripInput });
    } finally {
      setGenerating(false);
      setModalOpen(false);
    }
  }

  return (
    <>
      <DriverInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        generating={generating}
      />

      <section>
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-navy-900">
              ELD Log Sheets
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {logSheets.length} day{logSheets.length > 1 ? 's' : ''} of logs generated
            </p>
          </div>

          {logSheets.length >= 1 && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white
                bg-navy-900 hover:bg-navy-800 px-4 py-2 rounded-lg
                transition-all duration-150 shadow-sm hover:shadow-md"
            >
              <FileDown className="w-4 h-4" />
              Download Report
            </button>
          )}
        </div>

        {/* Cards — 1 col on mobile, 2 on lg, 3 on xl */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {logSheets.map((sheet, i) => (
            <LogSheetCard
              key={sheet.date}
              date={sheet.date}
              imageBase64={sheet.image_base64}
              index={i}
            />
          ))}
        </div>
      </section>
    </>
  );
}
