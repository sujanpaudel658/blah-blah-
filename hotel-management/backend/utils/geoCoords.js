const NEPAL_BOUNDS = {
  minLat: 26.35,
  maxLat: 30.45,
  minLng: 80.05,
  maxLng: 88.2
};

function isInNepalBBox(lat, lng) {
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

function normalizeCoordPair(latitude, longitude) {
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

function isGeocodePlausible(place, lat, lng) {
  if (!place?.country) return true;
  if (!isInNepalBBox(lat, lng)) return true;
  return /nepal/i.test(String(place.country));
}

module.exports = {
  NEPAL_BOUNDS,
  isInNepalBBox,
  normalizeCoordPair,
  isGeocodePlausible
};
