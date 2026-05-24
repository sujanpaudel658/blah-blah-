/** Nepal bounding box — used to validate pins and reject bad reverse-geocode results. */
export const NEPAL_BOUNDS = {
  minLat: 26.35,
  maxLat: 30.45,
  minLng: 80.05,
  maxLng: 88.2
};

export function isInNepalBBox(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  return (
    la >= NEPAL_BOUNDS.minLat &&
    la <= NEPAL_BOUNDS.maxLat &&
    ln >= NEPAL_BOUNDS.minLng &&
    ln <= NEPAL_BOUNDS.maxLng
  );
}

/** Stable DECIMAL-friendly coordinates for DB + map marker. */
export function normalizeCoordPair(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { latitude: null, longitude: null };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { latitude: null, longitude: null };
  }
  return {
    latitude: Math.round(lat * 1e8) / 1e8,
    longitude: Math.round(lng * 1e8) / 1e8
  };
}

export function hasValidMapCoords(latitude, longitude) {
  const { latitude: lat, longitude: lng } = normalizeCoordPair(latitude, longitude);
  return lat != null && lng != null;
}

/** Reject geocode labels that contradict coordinates (e.g. China for a Nepal pin). */
export function isGeocodePlausible(place, lat, lng) {
  if (!place?.country) return true;
  if (!isInNepalBBox(lat, lng)) return true;
  return /nepal/i.test(String(place.country));
}
