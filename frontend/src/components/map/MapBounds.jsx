import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Child component that auto-fits the Leaflet map view to the given bounds.
 * Must be rendered inside a <MapContainer>.
 */
export default function MapBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds || bounds.length === 0) return;
    try {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } catch (_) {
      // bounds may be invalid for very short routes — safe to ignore
    }
  }, [map, bounds]);

  return null;
}
