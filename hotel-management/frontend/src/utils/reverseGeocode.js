import { isInNepalBBox } from './geoCoords';

/** Reverse geocode map pin → city / address / country (Nominatim, Nepal-biased when applicable). */
export async function reverseGeocode(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const params = new URLSearchParams({
    format: 'json',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1'
  });
  if (isInNepalBBox(latitude, longitude)) {
    params.set('countrycodes', 'np');
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    { headers: { 'Accept-Language': 'en', 'User-Agent': 'StayNepalHotelApp/1.0' } }
  );
  if (!response.ok) return null;

  const data = await response.json();
  if (!data?.address) return null;

  const a = data.address;
  const cityName =
    a.city ||
    a.municipality ||
    a.town ||
    a.village ||
    a.suburb ||
    a.state_district ||
    a.county ||
    '';
  const countryName = a.country || '';
  const roadLine = [a.house_number, a.road, a.pedestrian].filter(Boolean).join(' ').trim();
  const areaLine = [a.neighbourhood, a.quarter, a.suburb].filter(Boolean).join(', ');
  const addressLine =
    roadLine ||
    areaLine ||
    (data.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : '');

  return { city: cityName, country: countryName, address: addressLine };
}
