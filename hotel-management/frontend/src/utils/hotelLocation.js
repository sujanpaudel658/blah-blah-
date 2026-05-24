/**
 * Guest-facing hotel location labels.
 * Map position always uses DB latitude/longitude; text prefers saved DB fields when valid.
 */

import { reverseGeocode } from './reverseGeocode';
import { hasValidMapCoords, isGeocodePlausible, isInNepalBBox, normalizeCoordPair } from './geoCoords';

const pick = (hotel, ...keys) => {
  if (!hotel) return '';
  for (const key of keys) {
    const v = hotel[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const addressMatchesCity = (address, city) => {
  if (!address || !city) return false;
  const addr = address.toLowerCase();
  const tokens = city
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length > 3);
  return tokens.some((t) => addr.includes(t));
};

export const hasMapCoords = (hotel) =>
  hasValidMapCoords(hotel?.latitude, hotel?.longitude);

/** Apply normalized coordinates for Leaflet markers / map center. */
export function withNormalizedCoords(hotel) {
  if (!hotel) return hotel;
  const { latitude, longitude } = normalizeCoordPair(hotel.latitude, hotel.longitude);
  return { ...hotel, latitude, longitude };
}

/** Refresh card `location` and `description` from city / address / country. */
export function withDisplayLocation(hotel) {
  if (!hotel) return hotel;
  const base = withNormalizedCoords(hotel);
  const locationLine = formatHotelLocationShort(base);
  const city = pick(base, 'city', 'hotel_city');
  const country = pick(base, 'country', 'hotel_country') || 'Nepal';
  const address = pick(base, 'address', 'hotel_address');
  const syncedDesc =
    [city, country, address].filter(Boolean).join(' - ') || locationLine;
  return {
    ...base,
    location: locationLine,
    description: syncedDesc
  };
}

function shouldTrustDbLocation(hotel, lat, lng) {
  const country = pick(hotel, 'country', 'hotel_country');
  const city = pick(hotel, 'city', 'hotel_city');
  if (!country || !city) return false;
  if (isInNepalBBox(lat, lng) && /nepal/i.test(country)) return true;
  return Boolean(city && country);
}

/** Card / search result — city and country (matches map area). */
export function formatHotelLocationShort(hotel) {
  const city = pick(hotel, 'city', 'hotel_city');
  const country = pick(hotel, 'country', 'hotel_country') || 'Nepal';
  if (city) {
    return country && !city.toLowerCase().includes(country.toLowerCase())
      ? `${city}, ${country}`
      : city;
  }
  const address = pick(hotel, 'address', 'hotel_address');
  return address || country;
}

/**
 * Fill missing location text from the pin; never replace good Nepal DB rows with bad geocode.
 */
export async function enrichHotelLocationFromCoords(hotel) {
  if (!hotel || !hasMapCoords(hotel)) return withDisplayLocation(hotel);

  const { latitude: lat, longitude: lng } = normalizeCoordPair(hotel.latitude, hotel.longitude);
  const normalized = { ...hotel, latitude: lat, longitude: lng };

  if (shouldTrustDbLocation(normalized, lat, lng)) {
    return withDisplayLocation(normalized);
  }

  try {
    const place = await reverseGeocode(lat, lng);
    if (!place || !isGeocodePlausible(place, lat, lng)) {
      return withDisplayLocation(normalized);
    }
    return withDisplayLocation({
      ...normalized,
      city: pick(normalized, 'city', 'hotel_city') || place.city || normalized.city,
      address: pick(normalized, 'address', 'hotel_address') || place.address || normalized.address,
      country: pick(normalized, 'country', 'hotel_country') || place.country || 'Nepal'
    });
  } catch {
    return withDisplayLocation(normalized);
  }
}

/** Sync many hotels sequentially (Nominatim rate limits). */
export async function enrichHotelsList(hotels) {
  if (!Array.isArray(hotels) || hotels.length === 0) return [];
  const out = [];
  for (let i = 0; i < hotels.length; i++) {
    out.push(await enrichHotelLocationFromCoords(hotels[i]));
    if (i < hotels.length - 1 && hasMapCoords(hotels[i + 1])) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return out;
}

/** Detail modal — prefer map-synced city; never show mismatched signup address. */
export function formatHotelLocationFull(hotel) {
  if (hasMapCoords(hotel)) {
    const city = pick(hotel, 'city', 'hotel_city');
    const address = pick(hotel, 'address', 'hotel_address');
    const country = pick(hotel, 'country', 'hotel_country') || 'Nepal';
    if (address && city && addressMatchesCity(address, city)) {
      return [address, city, country].filter(Boolean).join(', ');
    }
    return formatHotelLocationShort(hotel);
  }

  const city = pick(hotel, 'city', 'hotel_city');
  const address = pick(hotel, 'address', 'hotel_address');
  const country = pick(hotel, 'country', 'hotel_country') || 'Nepal';

  if (address && city && addressMatchesCity(address, city)) {
    return [address, city, country].filter(Boolean).join(', ');
  }
  return formatHotelLocationShort(hotel);
}
