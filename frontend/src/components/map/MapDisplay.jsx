import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MapBounds from './MapBounds';
import { formatDatetime, formatDuration } from '../../utils/formatters';

// ─── Custom SVG pin factory ────────────────────────────────────────────────

function pinIcon(bgColor, textColor, letter, size = 30) {
  const html = `
    <div style="
      width:${size}px; height:${size}px;
      background:${bgColor};
      border:2.5px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      display:flex; align-items:center; justify-content:center;
    ">
      <span style="
        transform:rotate(45deg);
        font-size:${Math.round(size * 0.38)}px;
        font-weight:700;
        color:${textColor};
        font-family:'Syne',sans-serif;
        line-height:1;
      ">${letter}</span>
    </div>`;
  return L.divIcon({
    className: '',
    html,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -(size + 4)],
  });
}

function circleIcon(bgColor, emoji, size = 26) {
  const html = `
    <div style="
      width:${size}px; height:${size}px;
      background:${bgColor};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.22);
      display:flex; align-items:center; justify-content:center;
      font-size:${Math.round(size * 0.5)}px;
      line-height:1;
    ">${emoji}</div>`;
  return L.divIcon({
    className: '',
    html,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 4)],
  });
}

// Pre-built icon set
const ICONS = {
  current: pinIcon('#102a43', '#f59e0b', 'A'),
  pickup:  pinIcon('#16a34a', 'white',   'B'),
  dropoff: pinIcon('#dc2626', 'white',   'C'),
  fuel:    circleIcon('#d97706', '⛽'),
  rest10h: circleIcon('#4f46e5', '🛌'),
  rest34h: circleIcon('#7c3aed', '🔄'),
  rest30:  circleIcon('#0369a1', '☕'),
};

// ─── Map legend ────────────────────────────────────────────────────────────

function MapLegend() {
  const items = [
    { color: '#102a43', label: 'Current Location' },
    { color: '#16a34a', label: 'Pickup' },
    { color: '#dc2626', label: 'Dropoff' },
    { color: '#d97706', label: 'Fuel Stop' },
    { color: '#4f46e5', label: '10h Rest' },
    { color: '#7c3aed', label: '34h Restart' },
  ];
  return (
    <div className="absolute bottom-3 left-3 z-[1000] bg-white bg-opacity-90 backdrop-blur-sm
      border border-sand-300 rounded-lg px-3 py-2 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Legend</p>
      <div className="flex flex-col gap-1">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <span className="text-[10px] text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function MapDisplay({ data }) {
  const {
    route_to_pickup,
    route_to_dropoff,
    current_location,
    pickup_location,
    dropoff_location,
    events = [],
  } = data;

  // Collect all bounds-relevant coordinates
  const allCoords = useMemo(() => {
    const pts = [];
    (route_to_pickup?.geometry  || []).forEach(p => pts.push(p));
    (route_to_dropoff?.geometry || []).forEach(p => pts.push(p));
    return pts;
  }, [route_to_pickup, route_to_dropoff]);

  // Rest/fuel stop markers extracted from events
  const stopMarkers = useMemo(() => {
    return events
      .filter(ev => ['FUEL', 'REST_10H', 'RESTART_34H', 'REST_30'].includes(ev.event_type))
      .map(ev => ({
        lat:          ev.lat,
        lng:          ev.lng,
        event_type:   ev.event_type,
        location_name: ev.location_name,
        start_time:   ev.start_time,
        duration_hours: ev.duration_hours,
      }));
  }, [events]);

  function stopIcon(eventType) {
    if (eventType === 'FUEL')        return ICONS.fuel;
    if (eventType === 'REST_10H')    return ICONS.rest10h;
    if (eventType === 'RESTART_34H') return ICONS.rest34h;
    if (eventType === 'REST_30')     return ICONS.rest30;
    return ICONS.fuel;
  }

  function stopLabel(eventType) {
    const map = {
      FUEL: 'Fuel Stop', REST_10H: '10h Mandatory Rest',
      RESTART_34H: '34h Cycle Restart', REST_30: '30-min Break',
    };
    return map[eventType] || eventType;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-sand-300 shadow-sm relative">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: '480px', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to route */}
        {allCoords.length > 0 && <MapBounds bounds={allCoords} />}

        {/* Route polylines */}
        {route_to_pickup?.geometry && (
          <Polyline
            positions={route_to_pickup.geometry}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }}
          />
        )}
        {route_to_dropoff?.geometry && (
          <Polyline
            positions={route_to_dropoff.geometry}
            pathOptions={{ color: '#16a34a', weight: 4, opacity: 0.8 }}
          />
        )}

        {/* Location markers */}
        {current_location && (
          <Marker position={[current_location.lat, current_location.lng]} icon={ICONS.current}>
            <Popup>
              <div className="font-sans text-sm">
                <p className="font-bold text-navy-900 mb-0.5">📍 Current Location</p>
                <p className="text-slate-600">{current_location.display_name}</p>
              </div>
            </Popup>
          </Marker>
        )}
        {pickup_location && (
          <Marker position={[pickup_location.lat, pickup_location.lng]} icon={ICONS.pickup}>
            <Popup>
              <div className="font-sans text-sm">
                <p className="font-bold text-emerald-700 mb-0.5">📦 Pickup</p>
                <p className="text-slate-600">{pickup_location.display_name}</p>
              </div>
            </Popup>
          </Marker>
        )}
        {dropoff_location && (
          <Marker position={[dropoff_location.lat, dropoff_location.lng]} icon={ICONS.dropoff}>
            <Popup>
              <div className="font-sans text-sm">
                <p className="font-bold text-red-700 mb-0.5">🏁 Dropoff</p>
                <p className="text-slate-600">{dropoff_location.display_name}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Stop markers */}
        {stopMarkers.map((stop, i) => (
          <Marker
            key={`stop-${i}`}
            position={[stop.lat, stop.lng]}
            icon={stopIcon(stop.event_type)}
          >
            <Popup>
              <div className="font-sans text-sm min-w-[160px]">
                <p className="font-bold text-navy-900 mb-1">{stopLabel(stop.event_type)}</p>
                <p className="text-slate-600 text-xs mb-0.5">{stop.location_name}</p>
                <p className="text-slate-500 text-xs">
                  {formatDatetime(stop.start_time)} · {formatDuration(stop.duration_hours)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating legend */}
      <MapLegend />

      {/* Route info bar */}
      <div className="flex items-center divide-x divide-sand-200 border-t border-sand-300 bg-white">
        <div className="flex items-center gap-1.5 px-4 py-2 flex-1">
          <span className="w-3 h-1 rounded-full bg-blue-600 inline-block"></span>
          <span className="text-xs text-slate-600">
            To Pickup: <span className="font-mono font-medium text-slate-900">
              {route_to_pickup?.distance_miles?.toFixed(1)} mi
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2 flex-1">
          <span className="w-3 h-1 rounded-full bg-emerald-600 inline-block"></span>
          <span className="text-xs text-slate-600">
            To Dropoff: <span className="font-mono font-medium text-slate-900">
              {route_to_dropoff?.distance_miles?.toFixed(1)} mi
            </span>
          </span>
        </div>
        <div className="px-4 py-2 text-xs text-slate-400">
          © OpenStreetMap
        </div>
      </div>
    </div>
  );
}
