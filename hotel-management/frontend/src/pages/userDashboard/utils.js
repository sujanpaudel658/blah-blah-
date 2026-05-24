import { formatHotelLocationShort, withDisplayLocation } from '../../utils/hotelLocation';

export function mapHotelFromApi(hotel) {
  let hotelImages = [];
  if (hotel.image) {
    try { hotelImages = JSON.parse(hotel.image); }
    catch (e) { hotelImages = [hotel.image]; }
  }
  const locationLine = formatHotelLocationShort(hotel);

  return withDisplayLocation({
    id: hotel.id,
    title: hotel.name,
    city: hotel.city,
    country: hotel.country,
    address: hotel.address,
    location: locationLine,
    description: `${hotel.city || ''}, ${hotel.country || ''} - ${hotel.address || ''}`,
    images: hotelImages,
    fullDescription: hotel.description,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    rating: hotel.rating
  });
}

export function getMultiRoomGroupKey(bookingReference) {
  if (!bookingReference || typeof bookingReference !== 'string') return null;
  const m = bookingReference.match(/^(BK-\d+)-\d+$/);
  return m ? m[1] : null;
}

export function groupMyBookingsForDisplay(bookings) {
  if (!bookings?.length) return [];
  const byKey = new Map();
  for (const b of bookings) {
    const gk = getMultiRoomGroupKey(b.booking_reference);
    const key = gk || `solo:${b.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(b);
  }
  const out = [];
  for (const [, members] of byKey) {
    members.sort((a, c) => {
      const ea = /-(\d+)$/.exec(a.booking_reference || '');
      const ec = /-(\d+)$/.exec(c.booking_reference || '');
      if (ea && ec) return Number(ea[1]) - Number(ec[1]);
      return a.id - c.id;
    });
    const primary = members[0];
    const isMulti = members.length > 1;
    const totalAmt = members.reduce((s, m) => s + Number(m.total_amount || 0), 0);
    const loyaltyDiscountSum = members.reduce((s, m) => s + Number(m.loyalty_discount || 0), 0);
    out.push({
      ...primary,
      total_amount: totalAmt,
      loyalty_discount: loyaltyDiscountSum,
      loyalty_free_night: members.some((m) => Number(m.loyalty_free_night) === 1) ? 1 : 0,
      booking_reference: isMulti
        ? `${getMultiRoomGroupKey(primary.booking_reference)} · ${members.length} rooms`
        : primary.booking_reference,
      _groupBookings: isMulti ? members : null,
      _groupIds: members.map((m) => m.id)
    });
  }
  out.sort((a, b) => {
    const listA = a._groupBookings || [a];
    const listB = b._groupBookings || [b];
    const ta = Math.max(...listA.map((x) => new Date(x.created_at).getTime()));
    const tb = Math.max(...listB.map((x) => new Date(x.created_at).getTime()));
    return tb - ta;
  });
  return out;
}

export function getEditBookingGuestBounds(booking) {
  const members = booking._groupBookings || [booking];
  const minGuests = members.length;
  const maxGuests = members.reduce((s, m) => s + Number(m.room_max_occupancy || 99), 0);
  return { minGuests, maxGuests, roomCount: members.length };
}

export function mapGroupedRoomSearchToHotel(g) {
  const images = g.image ? [g.image] : [];
  const price = Math.round(Number(g.startingPrice) || 0);
  const mapped = withDisplayLocation({
    id: g.id,
    title: g.name,
    city: g.city,
    country: g.country || '',
    address: g.address || '',
    images,
    fullDescription: '',
    latitude: g.latitude != null ? g.latitude : null,
    longitude: g.longitude != null ? g.longitude : null,
    rating: g.rating,
    startingPrice: g.startingPrice
  });
  const place = formatHotelLocationShort(mapped) || mapped.city || 'Nepal';
  return { ...mapped, description: `${place} · from NPR ${price}` };
}

export function filterHotelsByLocationTerm(hotels, locationTerm) {
  const term = String(locationTerm || '').trim().toLowerCase();
  if (!term) return hotels || [];
  return (hotels || []).filter((h) => {
    const hay = [h.city, h.country, h.address, h.location, h.title, h.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(term);
  });
}

export function groupRoomsByHotelFromSearch(roomRows) {
  return (roomRows || []).reduce((acc, room) => {
    const hotelId = room.hotel_id;
    if (!acc[hotelId]) {
      let parsedAmenities = [];
      if (room.amenities) {
        try {
          parsedAmenities =
            typeof room.amenities === 'string'
              ? JSON.parse(room.amenities)
              : Array.isArray(room.amenities)
                ? room.amenities
                : [];
        } catch (e) {
          parsedAmenities = [];
        }
      }
      acc[hotelId] = {
        id: room.hotel_id,
        name: room.hotel_name,
        image: room.hotel_image,
        city: room.hotel_city,
        address: room.hotel_address || '',
        country: room.hotel_country || '',
        latitude: room.hotel_latitude,
        longitude: room.hotel_longitude,
        startingPrice: Number(room.base_price),
        totalUnits: 0,
        amenities: Array.isArray(parsedAmenities) ? parsedAmenities : [],
        rating: room.rating
      };
    }
    acc[hotelId].totalUnits += 1;
    if (Number(room.base_price) < acc[hotelId].startingPrice) {
      acc[hotelId].startingPrice = Number(room.base_price);
    }
    return acc;
  }, {});
}
