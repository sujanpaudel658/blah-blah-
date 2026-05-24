const { reverseGeocode } = require('./reverseGeocode');
const { isGeocodePlausible, isInNepalBBox, normalizeCoordPair } = require('./geoCoords');

function hasMapCoords(latitude, longitude) {
  const { latitude: lat, longitude: lng } = normalizeCoordPair(latitude, longitude);
  return lat != null && lng != null;
}

/**
 * When a map pin exists, sync city/address/country from the pin on save.
 * Keeps existing Nepal labels when geocode is implausible; always normalizes coordinates.
 */
async function resolveHotelLocationFields(fields) {
  const city = fields.city != null ? String(fields.city).trim() : '';
  const address = fields.address != null ? String(fields.address).trim() : '';
  const country = fields.country != null ? String(fields.country).trim() : 'Nepal';
  const { latitude, longitude } = normalizeCoordPair(fields.latitude, fields.longitude);

  if (!hasMapCoords(latitude, longitude)) {
    return { city, address, country: country || 'Nepal', latitude, longitude };
  }

  try {
    const place = await reverseGeocode(latitude, longitude);
    if (!place || !isGeocodePlausible(place, latitude, longitude)) {
      return { city, address, country: country || 'Nepal', latitude, longitude };
    }

    const inNepal = isInNepalBBox(latitude, longitude);
    const trustExisting = inNepal && /nepal/i.test(country) && city;

    return {
      city: trustExisting ? city : place.city || city,
      address: place.address || address,
      country: trustExisting ? country : place.country || country || 'Nepal',
      latitude,
      longitude
    };
  } catch (err) {
    console.warn('[hotelLocation] reverse geocode failed:', err.message);
    return { city, address, country: country || 'Nepal', latitude, longitude };
  }
}

module.exports = {
  hasMapCoords,
  resolveHotelLocationFields,
  normalizeCoordPair
};
