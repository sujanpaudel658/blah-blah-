import React from 'react';
import { API_URL } from '../../../config/api';

const HotelDetailModal = ({
  hotelDetailOpen,
  closeHotelDetail,
  hotelDetailLoading,
  hotelDetailError,
  hotelDetailData,
  adminEmailEdits,
  setAdminEmailEdits,
  saveAdminEmail,
  savingAdminId
}) => {
  if (!hotelDetailOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9998] bg-transparent p-4 sm:p-6 fade-in"
      onClick={closeHotelDetail}
      role="presentation"
    >
      <div
        className="bg-white max-w-5xl w-full max-h-[94vh] overflow-hidden rounded-xl flex flex-col shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1B2B41] px-6 sm:px-8 py-6 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-[0.08em]">Hotel details</h2>
            <p className="text-xs sm:text-sm text-white/80 font-semibold uppercase tracking-[0.12em] mt-2 leading-snug">
              Registry record &amp; manager sign-in email
            </p>
          </div>
          <button
            type="button"
            onClick={closeHotelDetail}
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar p-6 sm:p-8 md:p-10 space-y-8 sm:space-y-10 bg-[#FAFBFC] text-[#1B2B41]">
          {hotelDetailLoading && (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-2 border-[#E2E8F0] border-t-[#B88E2F] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-[#64748B] uppercase tracking-widest">Loading hotel…</p>
            </div>
          )}
          {hotelDetailError && !hotelDetailLoading && (
            <p className="text-base font-bold text-[#B91C1C]">{hotelDetailError}</p>
          )}
          {hotelDetailData?.hotel && !hotelDetailLoading && (
            <>
              <div className="border border-[#E2E8F0] rounded-xl bg-white p-6 sm:p-8 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-[0.15em] border-b border-[#F1F5F9] pb-3">
                  Property
                </h3>
                {(() => {
                  const h = hotelDetailData.hotel;
                  let imgs = [];
                  if (h.image) {
                    try { imgs = JSON.parse(h.image); } catch (e) { imgs = [h.image]; }
                  }
                  const first = imgs[0];
                  const src = first
                    ? (first.startsWith('data:') ? first : first.startsWith('http') ? first : `${API_URL.replace('/api', '')}${first}`)
                    : null;
                  const labelClass = 'block text-xs font-bold text-[#64748B] uppercase tracking-[0.12em] mb-1.5';
                  const valueClass = 'text-base text-[#1B2B41] leading-relaxed';
                  return (
                    <>
                      {src && (
                        <div className="relative h-52 sm:h-60 rounded-xl overflow-hidden bg-slate-100 mb-2">
                          <img src={src} alt={h.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        <div className="md:col-span-2">
                          <span className={labelClass}>Name</span>
                          <span className="text-xl sm:text-2xl font-bold text-[#1B2B41] leading-tight block">{h.name}</span>
                        </div>
                        <div>
                          <span className={labelClass}>Hotel ID</span>
                          <span className={valueClass}>{h.id}</span>
                        </div>
                        <div>
                          <span className={labelClass}>Status</span>
                          <span className="text-base uppercase font-bold text-[#108548]">{h.status || '—'}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className={labelClass}>Address</span>
                          <span className={valueClass}>{h.address || '—'}</span>
                        </div>
                        <div>
                          <span className={labelClass}>City / Country</span>
                          <span className={valueClass}>{h.city || '—'}, {h.country || '—'}</span>
                        </div>
                        <div>
                          <span className={labelClass}>Phone</span>
                          <span className={valueClass}>{h.phone || '—'}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className={labelClass}>Hotel contact email</span>
                          <span className={`${valueClass} break-all`}>{h.email || '—'}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className={labelClass}>Description</span>
                          <span className="text-[#475569] text-base leading-relaxed whitespace-pre-wrap">{h.description || '—'}</span>
                        </div>
                        <div>
                          <span className={labelClass}>Latitude</span>
                          <span className={valueClass}>{h.latitude != null ? h.latitude : '—'}</span>
                        </div>
                        <div>
                          <span className={labelClass}>Longitude</span>
                          <span className={valueClass}>{h.longitude != null ? h.longitude : '—'}</span>
                        </div>
                        {h.created_at && (
                          <div className="md:col-span-2 pt-2 border-t border-[#F1F5F9]">
                            <span className={labelClass}>Registered</span>
                            <span className="text-sm text-[#64748B]">{new Date(h.created_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="border border-[#E2E8F0] rounded-xl bg-white p-6 sm:p-8 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-[#64748B] uppercase tracking-[0.15em] border-b border-[#F1F5F9] pb-3">
                  Hotel managers (login email)
                </h3>
                <p className="text-base text-[#475569] leading-relaxed">
                  The <strong className="text-[#1B2B41] font-semibold">login email</strong> is used with their password to access the hotel dashboard.
                  Changing it does not change the hotel&apos;s public contact email above.
                </p>
                {hotelDetailData.admins?.length === 0 ? (
                  <p className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest py-8 text-center border border-dashed border-[#E2E8F0] rounded-xl">
                    No manager account linked to this hotel yet
                  </p>
                ) : (
                  <div className="space-y-5">
                    {hotelDetailData.admins.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col gap-4 p-5 sm:p-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                      >
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-lg font-bold text-[#1B2B41]">{a.full_name}</p>
                          <p className="text-sm text-[#64748B]">
                            User ID {a.id}
                            {a.phone ? ` · ${a.phone}` : ''}
                            {a.created_at && ` · since ${new Date(a.created_at).toLocaleDateString()}`}
                          </p>
                          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-[0.12em] mt-4" htmlFor={`admin-email-${a.id}`}>
                            Sign-in email
                          </label>
                          <div className="flex flex-col lg:flex-row lg:items-end gap-3 mt-2">
                            <input
                              id={`admin-email-${a.id}`}
                              type="email"
                              value={adminEmailEdits[a.id] ?? a.email}
                              onChange={(e) =>
                                setAdminEmailEdits((prev) => ({ ...prev, [a.id]: e.target.value }))
                              }
                              className="flex-1 min-w-0 px-4 py-3.5 rounded-lg border-2 border-[#E2E8F0] text-base text-[#1B2B41] outline-none focus:border-[#B88E2F] focus:ring-4 focus:ring-[#B88E2F]/15"
                            />
                            <button
                              type="button"
                              onClick={() => saveAdminEmail(a.id)}
                              disabled={
                                savingAdminId === a.id ||
                                (adminEmailEdits[a.id] ?? a.email).trim() === (a.email || '').trim()
                              }
                              className="shrink-0 w-full lg:w-auto min-h-[48px] px-8 py-3 bg-[#1B2B41] text-white text-sm font-bold uppercase tracking-[0.12em] rounded-lg hover:bg-[#263345] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {savingAdminId === a.id ? 'Saving…' : 'Save email'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelDetailModal;
