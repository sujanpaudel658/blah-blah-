const axios = require('axios');
const { isInNepalBBox } = require('./geoCoords');

async function reverseGeocode(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const params = {
    format: 'json',
    lat: latitude,
    lon: longitude,
    zoom: 18,
    addressdetails: 1
  };
  if (isInNepalBBox(latitude, longitude)) {
    params.countrycodes = 'np';
  }

  const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params,
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'StayNepalHotelApp/1.0 (FYP; contact@nepalstays.local)'
    },
    timeout: 12000
  });

  const data = response.data;
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

  return {
    city: cityName,
    country: countryName,
    address: addressLine
  };
}

module.exports = { reverseGeocode };
