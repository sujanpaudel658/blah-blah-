import React from 'react';
import { getEditBookingGuestBounds } from '../utils';

const EditBookingModal = ({
  showEditBookingModal,
  editBookingTarget,
  editBookingForm,
  setEditBookingForm,
  setShowEditBookingModal,
  setEditBookingTarget,
  editBookingSubmitting,
  handleUpdateBooking
}) => {
  if (!showEditBookingModal || !editBookingTarget) return null;

  return (
    <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
      <div className="max-w-lg w-full bg-white border border-[#E2E2E2] rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#1B2B41] px-8 py-6 border-b-4 border-[#B88E2F]">
          <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em]">Edit booking</h3>
          <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest mt-2">
            Update your guest details and travel dates before check-in
          </p>
          {editBookingTarget._groupBookings?.length > 1 && (
            <p className="text-[9px] text-[#B88E2F] font-bold uppercase tracking-widest mt-2">
              Applies to all {editBookingTarget._groupBookings.length} rooms in this reservation
            </p>
          )}
        </div>
        <div className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Check-in</label>
              <input
                type="date"
                value={editBookingForm.check_in_date}
                onChange={(e) => setEditBookingForm((prev) => ({ ...prev, check_in_date: e.target.value }))}
                className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Check-out</label>
              <input
                type="date"
                value={editBookingForm.check_out_date}
                min={editBookingForm.check_in_date}
                onChange={(e) => setEditBookingForm((prev) => ({ ...prev, check_out_date: e.target.value }))}
                className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
              />
            </div>
          </div>
          {(() => {
            const { minGuests, maxGuests, roomCount } = getEditBookingGuestBounds(editBookingTarget);
            return (
              <div>
                <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">
                  Total guests arriving
                </label>
                <input
                  type="number"
                  min={minGuests}
                  max={maxGuests}
                  value={editBookingForm.num_guests}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    const n = Number.isFinite(v) ? v : minGuests;
                    setEditBookingForm((prev) => ({
                      ...prev,
                      num_guests: Math.min(maxGuests, Math.max(minGuests, n))
                    }));
                  }}
                  className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
                />
                <p className="text-[10px] text-[#64748B] mt-2 leading-relaxed">
                  {roomCount > 1
                    ? `Across ${roomCount} rooms (min ${minGuests}, max ${maxGuests} by room capacity). Guests are split the same way as when you booked.`
                    : `Must be between ${minGuests} and ${maxGuests} for this room type.`}
                </p>
              </div>
            );
          })()}
          <div>
            <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Guest name</label>
            <input
              type="text"
              value={editBookingForm.guest_name}
              onChange={(e) => setEditBookingForm((prev) => ({ ...prev, guest_name: e.target.value }))}
              className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Guest phone</label>
            <input
              type="text"
              value={editBookingForm.guest_phone}
              onChange={(e) => setEditBookingForm((prev) => ({ ...prev, guest_phone: e.target.value }))}
              className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Special requests</label>
            <textarea
              value={editBookingForm.special_requests}
              onChange={(e) => setEditBookingForm((prev) => ({ ...prev, special_requests: e.target.value }))}
              className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm text-[#1B2B41] min-h-[90px]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowEditBookingModal(false); setEditBookingTarget(null); }}
              className="flex-1 py-4 border border-[#E2E2E2] text-[10px] font-bold uppercase tracking-widest rounded-xl text-[#64748B]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editBookingSubmitting}
              onClick={handleUpdateBooking}
              className="flex-1 py-4 bg-[#1B2B41] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#2D3748] disabled:opacity-50"
            >
              {editBookingSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditBookingModal;
