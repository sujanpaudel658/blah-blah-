import React from 'react';

const ReviewModal = ({
  showReviewModal,
  selectedBookingForReview,
  setShowReviewModal,
  setReviewStarHover,
  setReviewCategoryStarHover,
  reviewStarHover,
  reviewForm,
  setReviewForm,
  reviewCategoryStarHover,
  submitReviewHandler
}) => {
  if (!showReviewModal || !selectedBookingForReview) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 fade-in"
      style={{
        background: 'linear-gradient(145deg, rgba(26, 35, 50, 0.88) 0%, rgba(17, 27, 43, 0.92) 100%)'
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 backdrop-blur-[2px]"
        aria-hidden
      />
      <div className="relative w-full max-w-[440px] max-h-[92vh] flex flex-col shadow-[0_25px_80px_-12px_rgba(27,43,65,0.45)] rounded-tl-[2rem] rounded-tr-[1.35rem] rounded-br-[2.25rem] rounded-bl-[1.25rem] overflow-hidden border border-[#E8E0D4]/90">
        <div
          className="relative overflow-y-auto custom-scrollbar flex flex-col max-h-[92vh]"
          style={{
            background: 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 48%, #F7F1E8 100%)'
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 top-24 h-40 w-40 rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #C9A227 0%, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute left-6 bottom-32 h-24 w-20 -rotate-6 rounded-[40%] opacity-[0.06] bg-[#1B2B41]"
          />

          <header className="relative px-7 pt-8 pb-2 pr-12">
            <button
              type="button"
              onClick={() => {
                setShowReviewModal(false);
                setReviewStarHover(null);
                setReviewCategoryStarHover({ key: null, star: null });
              }}
              className="absolute right-5 top-7 flex h-10 w-10 items-center justify-center rounded-full text-[#64748B] transition-all duration-200 hover:scale-105 hover:bg-black/[0.04] hover:text-[#1B2B41] active:scale-95"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
            <p className="font-['Space_Grotesk'] text-[0.65rem] font-semibold tracking-[0.12em] text-[#B88E2F]">
              Nepal Stays
            </p>
            <h3 className="mt-1 font-['Space_Grotesk'] text-[1.65rem] font-bold leading-tight tracking-tight text-[#1B2B41]">
              Rate your stay
            </h3>
            <p className="mt-3 max-w-[95%] text-[0.9rem] leading-relaxed text-[#5c6578]">
              How was your time at{' '}
              <span className="font-semibold text-[#2d3a4f]">{selectedBookingForReview.hotel_name}</span>
              ? A few honest lines help the next traveler — and the hosts who made it happen.
            </p>
          </header>

          <div className="relative px-7 pb-8 pt-4 space-y-8">
            <div className="relative flex flex-col items-center pt-2">
              <p className="mb-4 text-center text-[0.75rem] font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                Overall
              </p>
              <div
                className="flex items-end justify-center gap-1 sm:gap-1.5"
                onMouseLeave={() => setReviewStarHover(null)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const displayVal = reviewStarHover ?? reviewForm.rating;
                  const filled = displayVal >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      onMouseEnter={() => setReviewStarHover(star)}
                      className="group relative -m-0.5 rounded-xl p-1.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B88E2F]/50 active:scale-[0.92]"
                      style={{
                        transform:
                          filled && reviewStarHover === null
                            ? `translateY(${star % 2 === 0 ? -2 : 0}px)`
                            : undefined
                      }}
                    >
                      <span
                        className={`material-symbols-outlined block transition-all duration-300 ease-[cubic-bezier(0.34,1.3,0.64,1)] sm:text-[3rem] text-[2.65rem] ${
                          filled ? 'text-amber-400' : 'text-[#d4cfc4]'
                        } group-hover:scale-110 group-active:scale-95`}
                        style={{
                          fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 600`,
                          filter: filled ? 'drop-shadow(0 6px 14px rgba(201, 162, 39, 0.35))' : 'none'
                        }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-sm font-medium text-[#6b7280]">
                {(() => {
                  const r = reviewStarHover ?? reviewForm.rating;
                  const words = ['', 'Rough stay', 'Below expectations', 'It was okay', 'Really nice', 'Loved it'];
                  return `${r} of 5 — ${words[r]}`;
                })()}
              </p>
            </div>

            <div className="space-y-0 border-t border-[#E5DDD0]/80 pt-6">
              <p className="mb-4 text-[0.8125rem] font-semibold text-[#374151]">The details</p>
              {[
                { key: 'cleanliness', label: 'Cleanliness' },
                { key: 'service', label: 'Service & staff' },
                { key: 'location', label: 'Location' },
                { key: 'value', label: 'Value for money' }
              ].map((metric, idx) => (
                <div
                  key={metric.key}
                  className={`flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                    idx < 3 ? 'border-b border-[#ebe4d8]/90' : ''
                  }`}
                  onMouseLeave={() => setReviewCategoryStarHover({ key: null, star: null })}
                >
                  <span className="min-w-[8.5rem] text-[0.875rem] font-medium text-[#3d4859]">
                    {metric.label}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const h = reviewCategoryStarHover;
                      const show =
                        h.key === metric.key && h.star != null ? h.star : reviewForm[metric.key];
                      const on = show >= s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            setReviewForm({ ...reviewForm, [metric.key]: s })
                          }
                          onMouseEnter={() =>
                            setReviewCategoryStarHover({ key: metric.key, star: s })
                          }
                          className="rounded-lg p-1 transition-all duration-200 ease-out hover:scale-110 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B88E2F]/40"
                        >
                          <span
                            className={`material-symbols-outlined text-[1.35rem] transition-colors duration-200 ${
                              on ? 'text-amber-400' : 'text-[#ccc6bc]'
                            }`}
                            style={{
                              fontVariationSettings: `'FILL' ${on ? 1 : 0}`,
                              filter: on ? 'drop-shadow(0 2px 6px rgba(201, 162, 39, 0.25))' : undefined
                            }}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-5 pt-1">
              <div>
                <label
                  htmlFor="review-stay-title"
                  className="mb-2 block text-[0.8125rem] font-semibold text-[#374151]"
                >
                  Give your stay a title
                </label>
                <input
                  id="review-stay-title"
                  type="text"
                  placeholder="e.g. Quiet nights & kind hosts"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className="w-full rounded-lg border border-[#E5DDD0] bg-[#FFFCF7] px-4 py-3 text-[0.9rem] font-normal text-[#1B2B41] shadow-inner shadow-white/40 placeholder:text-[#9ca3af] transition-all duration-200 focus:border-[#B88E2F]/70 focus:bg-white focus:shadow-md focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="review-stay-comment"
                  className="mb-2 block text-[0.8125rem] font-semibold text-[#374151]"
                >
                  What stood out during your stay?
                </label>
                <textarea
                  id="review-stay-comment"
                  rows={4}
                  placeholder="Room, breakfast, the neighborhood — whatever mattered to you."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="w-full resize-none rounded-2xl border border-[#E5DDD0] bg-[#FFFCF7] px-4 py-3.5 text-[0.9rem] font-normal leading-relaxed text-[#1B2B41] shadow-inner shadow-white/40 placeholder:text-[#9ca3af] transition-all duration-200 focus:border-[#B88E2F]/70 focus:bg-white focus:shadow-md focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submitReviewHandler}
              className="group relative w-full overflow-hidden rounded-full bg-gradient-to-b from-[#c9a44a] to-[#B88E2F] py-4 text-[0.95rem] font-semibold text-white shadow-[0_8px_24px_-4px_rgba(184,142,47,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(184,142,47,0.6)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_4px_12px_-2px_rgba(184,142,47,0.45)]"
            >
              <span className="relative z-10">Submit review</span>
              <span className="pointer-events-none absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
