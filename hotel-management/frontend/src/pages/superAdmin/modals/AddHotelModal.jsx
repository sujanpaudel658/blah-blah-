import React from 'react';

const AddHotelModal = ({
  showAddHotelModal,
  setShowAddHotelModal,
  hotelForm,
  setHotelForm,
  handleAddHotel,
  onCoordChange
}) => {
  if (!showAddHotelModal) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[100] bg-transparent p-4 md:p-6 fade-in"
      onClick={() => setShowAddHotelModal(false)}
      role="presentation"
    >
      <div
        className="bg-white max-w-2xl w-full shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-[#E2E8F0] overflow-hidden max-h-[90vh] flex flex-col rounded-xl ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1A2332] px-8 py-7 flex items-center justify-between text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C4993E] via-[#D4B06A] to-[#C4993E]"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold uppercase tracking-[0.15em] leading-none mb-2">Add New Hotel</h2>
            <p className="text-[10px] text-[#A0AEC0] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C4993E]"></span>
              Set up your new hotel
            </p>
          </div>
          <button onClick={() => setShowAddHotelModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 group">
            <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
          </button>
        </div>
        <div className="overflow-y-auto p-8 md:p-10 custom-scrollbar bg-[#FBFAFA]">
          <form onSubmit={handleAddHotel} className="space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-[#C4993E] text-xl">domain</span>
                <h3 className="text-xs font-black text-[#1A2332] uppercase tracking-[0.2em]">Hotel Information</h3>
                <div className="flex-1 h-[1px] bg-[#E2E8F0]"></div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="form-group">
                  <label className="admin-label !mb-2.5">Hotel Name *</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">hotel</span>
                    <input type="text" required value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} placeholder="Enter hotel name" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all placeholder:text-[#CBD5E1] placeholder:font-normal" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="admin-label !mb-2.5">Hotel Description</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-4 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">description</span>
                    <textarea rows="3" value={hotelForm.description} onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })} placeholder="Brief overview of the hotel..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-medium text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all resize-none placeholder:text-[#CBD5E1] placeholder:font-normal" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label className="admin-label !mb-2.5">Latitude</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">explore</span>
                      <input type="number" step="any" value={hotelForm.latitude} onChange={(e) => onCoordChange('latitude', e.target.value)} placeholder="e.g. 27.7172" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm transition-all" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="admin-label !mb-2.5">Longitude</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">explore</span>
                      <input type="number" step="any" value={hotelForm.longitude} onChange={(e) => onCoordChange('longitude', e.target.value)} placeholder="e.g. 85.3240" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm transition-all" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="form-group">
                    <label className="admin-label !mb-2.5">City *</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">location_city</span>
                      <input type="text" required value={hotelForm.city} onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })} placeholder="City" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="admin-label !mb-2.5">District</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">map</span>
                      <input type="text" value={hotelForm.district} onChange={(e) => setHotelForm({ ...hotelForm, district: e.target.value })} placeholder="District" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm transition-all" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="admin-label !mb-2.5">Country *</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">public</span>
                      <input type="text" required value={hotelForm.country} onChange={(e) => setHotelForm({ ...hotelForm, country: e.target.value })} placeholder="Country" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-[#C4993E] text-xl">admin_panel_settings</span>
                <h3 className="text-xs font-black text-[#1A2332] uppercase tracking-[0.2em]">Hotel Manager Details</h3>
                <div className="flex-1 h-[1px] bg-[#E2E8F0]"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="admin-label !mb-2.5">Manager Full Name *</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">person</span>
                    <input type="text" required value={hotelForm.adminName} onChange={(e) => setHotelForm({ ...hotelForm, adminName: e.target.value })} placeholder="Manager Name" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg transition-all" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="admin-label !mb-2.5">Manager Email *</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">mail</span>
                    <input type="email" required value={hotelForm.adminEmail} onChange={(e) => setHotelForm({ ...hotelForm, adminEmail: e.target.value })} placeholder="Email address" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg transition-all" />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="admin-label !mb-2.5">Temporary Manager Password *</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">lock</span>
                  <input type="password" required minLength="6" value={hotelForm.adminPassword} onChange={(e) => setHotelForm({ ...hotelForm, adminPassword: e.target.value })} placeholder="Min. 6 characters" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg transition-all" />
                </div>
                <p className="text-[9px] text-[#94A3B8] mt-2 italic flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">info</span>
                  The manager will be prompted to change this upon initial login.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-[#E2E8F0]">
              <button type="submit" className="flex-1 bg-[#1A2332] text-[#C4993E] font-black uppercase text-[11px] tracking-[0.3em] py-4 rounded-lg hover:bg-[#263345] hover:text-[#D4B06A] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3 group">
                <span>Add New Hotel</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <button type="button" onClick={() => setShowAddHotelModal(false)} className="md:px-10 py-4 bg-white border border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[11px] tracking-[0.2em] rounded-lg hover:bg-[#F8FAFC] hover:text-[#1A2332] transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddHotelModal;
