import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet-routing-machine';
import { reverseGeocode } from '../../utils/reverseGeocode';
import { hasValidMapCoords, normalizeCoordPair } from '../../utils/geoCoords';

const DEFAULT_CENTER = [28.3949, 84.124];

function toMapCenter(latitude, longitude) {
  const { latitude: lat, longitude: lng } = normalizeCoordPair(latitude, longitude);
  if (lat == null || lng == null) return DEFAULT_CENTER;
  return [lat, lng];
}

const applyCoords = (lat, lon, setLatitude, setLongitude) => {
  const next = normalizeCoordPair(lat, lon);
  if (next.latitude == null || next.longitude == null) return;
  setLatitude(next.latitude);
  setLongitude(next.longitude);
  return next;
};

const LocationMarker = ({
  isEditing,
  setLatitude,
  setLongitude,
  latitude,
  longitude,
  updatePlaceFromCoords
}) => {
  const markerRef = React.useRef(null);
  const pin = normalizeCoordPair(latitude, longitude);
  const position =
    pin.latitude != null && pin.longitude != null ? [pin.latitude, pin.longitude] : null;

  React.useEffect(() => {
    if (!position || !markerRef.current) return;
    markerRef.current.setLatLng(position);
  }, [position?.[0], position?.[1]]);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker == null) return;
        const latLng = marker.getLatLng();
        const next = applyCoords(latLng.lat, latLng.lng, setLatitude, setLongitude);
        if (next) updatePlaceFromCoords(next.latitude, next.longitude);
      }
    }),
    [setLatitude, setLongitude, updatePlaceFromCoords]
  );

  useMapEvents({
    click(e) {
      if (!isEditing) return;
      const next = applyCoords(e.latlng.lat, e.latlng.lng, setLatitude, setLongitude);
      if (next) updatePlaceFromCoords(next.latitude, next.longitude);
    }
  });

  if (!position) return null;

  return (
    <Marker
      position={position}
      draggable={isEditing}
      eventHandlers={isEditing ? eventHandlers : {}}
      ref={markerRef}
    />
  );
};

const MapRecenter = ({ center, showDirections, enabled }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!enabled || showDirections) return;
    const lat = Number(center?.[0]);
    const lng = Number(center?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      map.setView([lat, lng], map.getZoom() >= 14 ? map.getZoom() : 15);
    } catch (err) {
      console.warn('Map recenter skipped:', err.message);
    }
  }, [center?.[0], center?.[1], map, showDirections, enabled]);

  return null;
};

const MapSection = ({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
  city,
  onPlaceResolved,
  isEditing,
  getUserLocation,
  showDirections
}) => {
  const updatePlaceFromCoords = async (lat, lon) => {
    if (typeof onPlaceResolved !== 'function') return;
    try {
      const place = await reverseGeocode(lat, lon);
      if (place) onPlaceResolved(place);
    } catch (error) {
      console.error('Geocode sync failed:', error);
    }
  };

  const hasPin = hasValidMapCoords(latitude, longitude);
  const mapCenter = React.useMemo(
    () => toMapCenter(latitude, longitude),
    [latitude, longitude]
  );
  const mapZoom = hasPin ? 16 : 6;

  return (
    <div className="admin-card overflow-hidden bg-white flex flex-col lg:flex-row h-[500px]">
      <div className="flex-1 relative border-r border-[#E2E2E2]">
        <MapContainer
          key={hasPin ? 'map-pinned' : 'map-default'}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <LocationMarker
            isEditing={isEditing}
            setLatitude={setLatitude}
            setLongitude={setLongitude}
            latitude={latitude}
            longitude={longitude}
            updatePlaceFromCoords={updatePlaceFromCoords}
          />
          <MapRecenter center={mapCenter} showDirections={showDirections} enabled={hasPin} />
        </MapContainer>

        {isEditing && (
          <div className="absolute top-4 left-4 z-[401] bg-[#1B2B41] text-white text-[10px] font-bold px-3 py-1.5 rounded-sm shadow-md uppercase tracking-wider">
            MANUAL OVERRIDE: CLICK OR DRAG TO PIN
          </div>
        )}

        {!hasPin && (
          <div className="absolute bottom-4 left-4 right-4 z-[401] bg-[#B88E2F] text-white text-[10px] font-bold px-4 py-3 rounded-sm shadow-xl uppercase tracking-widest flex items-center gap-3">
            <span className="material-symbols-outlined text-sm">warning</span>
            IMPORTANT: Property location NOT set. Please click on the map to pin your hotel&apos;s exact position.
          </div>
        )}
      </div>

      <div className="w-full lg:w-[40%] flex flex-col bg-[#F9FAFB] p-6 overflow-y-auto">
        <div className="mb-6">
          <span className="admin-label">Spatial Records</span>
          <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Geographic Data</h3>
        </div>

        <div className="space-y-6 flex-1">
          <div className="bg-white border border-[#E2E2E2] p-4 rounded-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#108548] text-[20px]">location_on</span>
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Global Coordinates</span>
            </div>

            <div className="space-y-4">
              <div className="form-group mb-0">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">CITY / DISTRICT</label>
                <input
                  type="text"
                  value={city}
                  readOnly
                  className="admin-input bg-[#F1F5F9] font-bold border-none"
                />
                <p className="text-[10px] text-[#94A3B8] mt-1 italic">
                  Updated when you move the pin (address &amp; city sync to the map)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">LATITUDE</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        setLatitude(null);
                        return;
                      }
                      const n = Number(v);
                      if (Number.isFinite(n)) setLatitude(n);
                    }}
                    onBlur={() => {
                      if (!isEditing) return;
                      const next = normalizeCoordPair(latitude, longitude);
                      if (next.latitude == null) return;
                      setLatitude(next.latitude);
                      setLongitude(next.longitude);
                      updatePlaceFromCoords(next.latitude, next.longitude);
                    }}
                    disabled={!isEditing}
                    className="admin-input bg-white"
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">LONGITUDE</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        setLongitude(null);
                        return;
                      }
                      const n = Number(v);
                      if (Number.isFinite(n)) setLongitude(n);
                    }}
                    onBlur={() => {
                      if (!isEditing) return;
                      const next = normalizeCoordPair(latitude, longitude);
                      if (next.longitude == null) return;
                      setLatitude(next.latitude);
                      setLongitude(next.longitude);
                      updatePlaceFromCoords(next.latitude, next.longitude);
                    }}
                    disabled={!isEditing}
                    className="admin-input bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E2E2] p-4 rounded-sm">
            <span className="admin-label mb-2">Operational Tasks</span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={getUserLocation}
                className="w-full admin-button admin-button-secondary text-xs"
              >
                <span className="material-symbols-outlined text-sm">near_me</span>
                FETCH CURRENT LOCATION
              </button>
              <p className="text-[10px] text-[#94A3B8] text-center font-medium italic">
                Uses device GPS for triangulation
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-[#E2E2E2]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#108548] rounded-full" />
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">MAP SYNC STATUS: NOMINAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSection;
