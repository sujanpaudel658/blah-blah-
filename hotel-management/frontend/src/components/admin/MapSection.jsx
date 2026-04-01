import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

// Component to handle map clicks and draggability
const LocationMarker = ({ isEditing, setLatitude, setLongitude, latitude, longitude, updateCityFromCoords }) => {
    const markerRef = React.useRef(null);

    const eventHandlers = React.useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const latLng = marker.getLatLng();
                    setLatitude(latLng.lat);
                    setLongitude(latLng.lng);
                    updateCityFromCoords(latLng.lat, latLng.lng);
                }
            },
        }),
        [setLatitude, setLongitude, updateCityFromCoords]
    );

    useMapEvents({
        click(e) {
            if (!isEditing) return;
            setLatitude(e.latlng.lat);
            setLongitude(e.latlng.lng);
            updateCityFromCoords(e.latlng.lat, e.latlng.lng);
        },
    });

    return latitude && longitude ? (
        <Marker
            position={[latitude, longitude]}
            draggable={isEditing}
            eventHandlers={isEditing ? eventHandlers : {}}
            ref={markerRef}
        />
    ) : null;
};

const MapRecenter = ({ center, showDirections }) => {
    const map = useMap();
    React.useEffect(() => {
        if (!showDirections) {
            map.setView(center);
        }
    }, [center, map, showDirections]);
    return null;
};

const MapSection = ({
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    city,
    setCity,
    isEditing,
    userLocation,
    getUserLocation,
    showDirections
}) => {
    // Reverse Geocoding: Coordinate -> City Name
    const updateCityFromCoords = async (lat, lon) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            if (data && data.address) {
                // Common OSM city/location labels
                const cityName = data.address.city ||
                    data.address.town ||
                    data.address.village ||
                    data.address.municipality ||
                    data.address.suburb ||
                    'Nepal';
                setCity(cityName);
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    };
    const mapCenter = (latitude && longitude) ? [latitude, longitude] : [28.3949, 84.1240];
    const mapZoom = (latitude && longitude) ? 15 : 6;

    return (
        <div className="admin-card overflow-hidden bg-white flex flex-col lg:flex-row h-[500px]">
            {/* Map Area - 60% */}
            <div className="flex-1 relative border-r border-[#E2E2E2]">
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    <LocationMarker
                        isEditing={isEditing}
                        setLatitude={setLatitude}
                        setLongitude={setLongitude}
                        latitude={latitude}
                        longitude={longitude}
                        updateCityFromCoords={updateCityFromCoords}
                    />
                    <MapRecenter center={mapCenter} showDirections={showDirections} />
                </MapContainer>

                {isEditing && (
                    <div className="absolute top-4 left-4 z-[401] bg-[#1B2B41] text-white text-[10px] font-bold px-3 py-1.5 rounded-sm shadow-md uppercase tracking-wider">
                        MANUAL OVERRIDE: CLICK OR DRAG TO PIN
                    </div>
                )}

                {(!latitude || !longitude) && (
                    <div className="absolute bottom-4 left-4 right-4 z-[401] bg-[#B88E2F] text-white text-[10px] font-bold px-4 py-3 rounded-sm shadow-xl uppercase tracking-widest flex items-center gap-3">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        IMPORTANT: Property location NOT set. Please click on the map to pin your hotel's exact position.
                    </div>
                )}
            </div>

            {/* Info Side - 40% */}
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
                                <p className="text-[10px] text-[#94A3B8] mt-1 italic">Automatically updated via map pin</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group mb-0">
                                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">LATITUDE</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                                        disabled={!isEditing}
                                        className="admin-input bg-white"
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">LONGITUDE</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
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
                        <span className="w-2 h-2 bg-[#108548] rounded-full"></span>
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">MAP SYNC STATUS: NOMINAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapSection;
