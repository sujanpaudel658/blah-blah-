import React from 'react';
import '../leafletSetup';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const FullMapModal = ({ isMapFullScreen, selectedHotel, setIsMapFullScreen }) => {
  if (!isMapFullScreen || !selectedHotel || !selectedHotel.latitude) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col fade-in">
      <div className="h-20 px-10 flex items-center justify-between border-b border-[#E2E2E2] bg-[#1B2B41]">
        <div className="flex items-center gap-6">
          <button onClick={() => setIsMapFullScreen(false)} className="w-10 h-10 border border-[#2D4361] flex items-center justify-center text-white hover:bg-white/5 transition-all rounded-xl">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div>
            <h4 className="text-base font-bold text-white uppercase tracking-tight italic">{selectedHotel.title}</h4>
            <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">{selectedHotel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest">Location Points</span>
            <span className="text-[10px] font-bold text-[#B88E2F] uppercase">{Number(selectedHotel.latitude).toFixed(6)}, {Number(selectedHotel.longitude).toFixed(6)}</span>
          </div>
          <button onClick={() => setIsMapFullScreen(false)} className="px-8 py-3 bg-white text-[#1B2B41] font-bold text-[10px] uppercase tracking-widest rounded-xl">Close Map</button>
        </div>
      </div>
      <div className="flex-1 relative grayscale-[0.8]">
        <MapContainer center={[selectedHotel.latitude, selectedHotel.longitude]} zoom={16} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
          <Marker position={[selectedHotel.latitude, selectedHotel.longitude]} />
        </MapContainer>
      </div>
    </div>
  );
};

export default FullMapModal;
