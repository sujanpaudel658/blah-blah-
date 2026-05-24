/** Guest dashboard deep links (survive Khalti redirect better than router state). */

export function guestDashboardBookingsReceiptUrl(refHint) {
  const params = new URLSearchParams({ tab: 'bookings', receipt: '1' });
  if (refHint) params.set('ref', String(refHint).trim());
  return `/guest/dashboard?${params.toString()}`;
}

export function guestDashboardExploreUrl() {
  return '/guest/dashboard?tab=explore';
}
