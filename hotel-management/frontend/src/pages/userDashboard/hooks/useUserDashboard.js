import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupedBookings from './useGroupedBookings';
import {
  mapGroupedRoomSearchToHotel,
  mapHotelFromApi,
  groupRoomsByHotelFromSearch
} from '../utils';
import {
  getHotels,
  getHotelReviews as getHotelReviewsApi,
  getMyBookings as getMyBookingsApi,
  getQrToken,
  searchRooms,
  getRooms as getRoomsApi,
  getLoyaltyStatus as getLoyaltyStatusApi,
  initiatePayment as initiatePaymentApi,
  cancelBooking as cancelBookingApi,
  verifyPayment as verifyPaymentApi,
  payOnlineForBooking as payOnlineForBookingApi,
  extendStay as extendStayApi,
  updateBookingGuestDetails,
  updateBookingNumGuests,
  rescheduleBooking,
  submitReview as submitReviewApi
} from '../services';

export default function useUserDashboard() {
const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('explore');

  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);


  const [isReserving, setIsReserving] = useState(false);
  const [bookingDates, setBookingDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [numGuests, setNumGuests] = useState(1);
  const [numRooms, setNumRooms] = useState(1);

  const [searchLocation, setSearchLocation] = useState('');
  const [hotelSearchLoading, setHotelSearchLoading] = useState(false);
  const [exploreSearchActive, setExploreSearchActive] = useState(false);

  const [myBookings, setMyBookings] = useState([]);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [passRoomIndex, setPassRoomIndex] = useState(0);
  const [selectedBill, setSelectedBill] = useState(null);
  const [qrToken, setQrToken] = useState(null);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendTarget, setExtendTarget] = useState(null);
  const [extendNights, setExtendNights] = useState(1);
  const [extendMethod, setExtendMethod] = useState('khalti');
  const [extendSubmitting, setExtendSubmitting] = useState(false);
  const [payOnlineBookingId, setPayOnlineBookingId] = useState(null);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editBookingTarget, setEditBookingTarget] = useState(null);
  const [editBookingSubmitting, setEditBookingSubmitting] = useState(false);
  const [editBookingForm, setEditBookingForm] = useState({
    guest_name: '',
    guest_phone: '',
    special_requests: '',
    check_in_date: '',
    check_out_date: '',
    num_guests: 1
  });

  const [loyaltyStatus, setLoyaltyStatus] = useState(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [hotelReviews, setHotelReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
    cleanliness: 5,
    service: 5,
    location: 5,
    value: 5
  });
  const [reviewStarHover, setReviewStarHover] = useState(null);
  const [reviewCategoryStarHover, setReviewCategoryStarHover] = useState({ key: null, star: null });

  const contentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Receipt-${selectedBill?.booking_reference || 'Booking'}`,
  });

  useEffect(() => {
    getHotels()
      .then(res => {
        const mapped = (res.data.hotels || []).map(mapHotelFromApi);
        setHotels(mapped);
        setSearchResults(mapped);
        return mapped;
      })
      .catch(err => {
        console.error('Initial hotels data load error:', err);
      });
  }, []);

  const fetchHotelReviews = async (hotelId) => {
    try {
      const res = await getHotelReviewsApi(hotelId);
      if (res.data.success) {
        setHotelReviews(res.data.reviews);
      }
    } catch (err) {
      console.error('Review Error:', err.message);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (parsedUser.role === 'superadmin') {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }

    setUser(parsedUser);
    fetchMyBookings();

    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [navigate, location]);

  const displayBookings = useGroupedBookings(myBookings);

  useEffect(() => {
    if (showPassModal && selectedPass) {
      const slots = selectedPass._groupBookings?.length ? selectedPass._groupBookings : [selectedPass];
      const slot = slots[Math.min(passRoomIndex, slots.length - 1)] || selectedPass;
      const fetchToken = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await getQrToken(slot.id, token);
          if (res.data.success) setQrToken(res.data.qrToken);
        } catch (err) {
          console.error('Failed to generate secure QR signature:', err);
        }
      };
      fetchToken();
    } else {
      setQrToken(null);
    }
  }, [showPassModal, selectedPass, passRoomIndex]);

  const fetchMyBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await getMyBookingsApi(token);
      if (res.data.success) {
        const mapped = res.data.bookings.map(b => {
          let hotel_image = null;
          if (b.hotel_image) {
            try {
              const images = JSON.parse(b.hotel_image);
              hotel_image = images[0];
            } catch (e) {
              hotel_image = b.hotel_image;
            }
          }
          return { ...b, hotel_image };
        });
        setMyBookings(mapped);
      }
    } catch (error) {
      console.error('Registry Error:', error.message);
    }
  };

  const handleSearch = (results) => setSearchResults(results);

  const fetchAndApplyRoomSearch = async (locationOverride) => {
    const loc =
      locationOverride !== undefined && locationOverride !== null
        ? String(locationOverride).trim()
        : searchLocation.trim();
    setHotelSearchLoading(true);
    try {
      const params = new URLSearchParams({
        location: loc,
        guests: numGuests ? String(numGuests) : '',
        checkIn: bookingDates.checkIn || '',
        checkOut: bookingDates.checkOut || ''
      });
      const { data } = await searchRooms(params);
      if (!data.success) throw new Error(data.message || 'Search failed');
      const grouped = groupRoomsByHotelFromSearch(data.rooms || []);
      setSearchResults(Object.values(grouped).map(mapGroupedRoomSearchToHotel));
      setExploreSearchActive(true);
      setTimeout(() => {
        document.getElementById('dashboard-hotel-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err) {
      console.error('Hotel search error:', err);
      setSearchResults(hotels);
      setExploreSearchActive(false);
    } finally {
      setHotelSearchLoading(false);
    }
  };

  const runExploreHotelSearch = (e) => {
    e?.preventDefault?.();
    fetchAndApplyRoomSearch(searchLocation);
  };

  const quickExploreSearch = (locationName) => {
    setSearchLocation(locationName);
    fetchAndApplyRoomSearch(locationName);
  };

  const clearExploreHotelSearch = () => {
    setSearchLocation('');
    setExploreSearchActive(false);
    setSearchResults(hotels);
    if (!hotels.length) {
      getHotels()
        .then((res) => {
          const mapped = (res.data.hotels || []).map(mapHotelFromApi);
          setHotels(mapped);
          setSearchResults(mapped);
        })
        .catch((err) => {
          console.error('Clear search hotel reload error:', err);
        });
    }
  };

  const visibleHotels = exploreSearchActive ? searchResults : (hotels.length ? hotels : searchResults);
  const hotelsToRender =
    exploreSearchActive && searchResults.length === 0 && hotels.length > 0 ? hotels : visibleHotels;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleHotelClick = (hotel) => {
    setSelectedHotel(hotel);
    setActiveImageIndex(0);
    setShowModal(true);
    setLoyaltyStatus(null);
    fetchRooms(hotel.id);
    fetchHotelReviews(hotel.id);
    fetchLoyaltyStatus(hotel.id);
  };


  useEffect(() => {
    if (showModal && selectedHotel && bookingDates.checkIn && bookingDates.checkOut) {
      fetchRooms(selectedHotel.id);
    }
  }, [bookingDates.checkIn, bookingDates.checkOut, showModal, selectedHotel]);

  const fetchRooms = async (hotelId) => {
    try {
      const token = localStorage.getItem('token');
      const { checkIn, checkOut } = bookingDates;
      const res = await getRoomsApi(hotelId, checkIn, checkOut, token);
      if (res.data.success) {
        const roomsByType = res.data.rooms.reduce((acc, room) => {
          if (!acc[room.room_type_id]) {
            acc[room.room_type_id] = { ...room, available_count: 0, room_ids: [] };
          }
          acc[room.room_type_id].available_count += 1;
          acc[room.room_type_id].room_ids.push(room.id);
          return acc;
        }, {});

        const typeList = Object.values(roomsByType);
        setRooms(typeList);

        if (typeList.length > 0) {
          const stillAvailable = selectedRoom && typeList.find(t => t.room_type_id === selectedRoom.room_type_id);
          if (!stillAvailable) setSelectedRoom(typeList[0]);
        } else {
          setSelectedRoom(null);
        }
      }
    } catch (error) {
      console.error('Inventory Query Error:', error);
    }
  };

  const fetchLoyaltyStatus = async (hotelId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await getLoyaltyStatusApi(hotelId, token);
      if (res.data.success) {
        setLoyaltyStatus(res.data.loyalty);
      }
    } catch (err) {
      console.error('Loyalty status fetch error:', err.message);
      setLoyaltyStatus(null);
    }
  };

  const processBooking = async (method = 'khalti') => {
    if (!selectedRoom) return alert('Please select a room first');

    const checkIn = new Date(bookingDates.checkIn);
    const checkOut = new Date(bookingDates.checkOut);

    if (checkOut <= checkIn) return alert('Check-out date must be after check-in date');

    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let totalAmount = selectedRoom.base_price * totalNights * numRooms;

    // loyalty: one free night per room when eligible
    const loyaltyEligible = loyaltyStatus && loyaltyStatus.is_eligible;
    const loyaltyDiscount = loyaltyEligible ? selectedRoom.base_price * numRooms : 0;
    totalAmount = totalAmount - loyaltyDiscount;

    setIsReserving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        amount: totalAmount,
        purchase_order_id: `BK-${Date.now()}`,
        purchase_order_name: `${selectedHotel.title} - ${selectedRoom.type_name}`,
        customer_info: {
          name: user.fullName || user.full_name || 'Guest User',
          email: user.email,
          phone: user.phone || '9800000000'
        },
        hotel_id: selectedHotel.id,
        room_type_id: selectedRoom.room_type_id,
        check_in_date: bookingDates.checkIn,
        check_out_date: bookingDates.checkOut,
        num_guests: numGuests,
        num_rooms: numRooms,
        payment_method: method,
        apply_loyalty: loyaltyEligible
      };

      const res = await initiatePaymentApi(payload, token);

      if (res.data.success) {
        if (method === 'khalti') {
          const payUrl = res.data.payment?.payment_url;
          if (payUrl) {
            window.location.href = payUrl;
          } else {
            alert(
              'Payment did not return a link. Check that KHALTI_SECRET_KEY is set on the server, then try again.'
            );
          }
        } else if (method === 'cash') {
          alert('Booking confirmed successfully! Please pay at the hotel upon arrival.');
          setShowModal(false);
          fetchMyBookings();
        } else {
          alert('Booking successful!');
          setShowModal(false);
          fetchMyBookings();
        }
      } else {
        alert('Booking Failed: ' + (res.data.message || 'Something went wrong.'));
      }
    } catch (error) {
      if (error.response?.data?.code === 'EXCEEDS_CAPACITY') {
        const confirmMultiple = window.confirm(
          `Error: This room block only accommodates ${error.response.data.max_occupancy} people, but you requested ${numGuests} guests for ${numRooms} room(s).\n\nWould you like to book for ${error.response.data.max_occupancy} people instead, and then return to book an additional room for the rest?`
        );
        if (confirmMultiple) {
          setNumGuests(error.response.data.max_occupancy);
          alert(`Guest count automatically adjusted to ${error.response.data.max_occupancy}. Please click 'Process Reservation' again to secure this room block.`);
        }
        return;
      }
      console.error('Reservation Fault:', error);
      const d = error.response?.data;
      const backendMsg = d?.message || d?.detail;
      const extra =
        typeof d?.error === 'string'
          ? d.error
          : d?.error && typeof d.error === 'object'
            ? JSON.stringify(d.error)
            : '';
      alert(
        [backendMsg, extra].filter(Boolean).join(' ') ||
          'Payment connection error. Please try again.'
      );
    } finally {
      setIsReserving(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    const ids = booking._groupIds?.length ? booking._groupIds : [booking.id];
    const paid = booking.payment_status === 'paid';
    const multi = ids.length > 1;
    const msg = paid
      ? multi
        ? `Cancel all ${ids.length} rooms? If you already paid, a refund request will be sent for each room for admin approval. This cannot be undone.`
        : 'Cancel this booking? If you already paid, a refund request will be sent for admin approval. This cannot be undone.'
      : multi
        ? `Cancel this reservation (${ids.length} rooms)? This action cannot be undone.`
        : 'Cancel this booking? This action cannot be undone.';
    if (!window.confirm(msg)) return;
    try {
      const token = localStorage.getItem('token');
      let lastMsg = '';
      for (const id of ids) {
        const res = await cancelBookingApi(id, token);
        if (res.data?.success) lastMsg = res.data.message || lastMsg;
        else {
          alert(res.data?.message || 'Cancel failed.');
          fetchMyBookings();
          return;
        }
      }
      alert(lastMsg || 'Booking(s) cancelled.');
      fetchMyBookings();
    } catch (error) {
      const m = error.response?.data?.message;
      alert(m || 'Cancel failed. Please try again.');
    }
  };

  const handleVerifyPayment = async (booking) => {
    try {
      const ids = booking._groupIds?.length ? booking._groupIds : [booking.id];
      const purchase_order_id = ids.length > 1 ? ids.join('-') : booking.id;
      const res = await verifyPaymentApi(purchase_order_id);
      if (res.data.success) {
        alert('Payment Verified: Booking confirmed.');
        fetchMyBookings();
      } else {
        alert('Status: ' + (res.data.message || 'Pending verification.'));
      }
    } catch (error) {
      const d = error.response?.data;
      const details =
        typeof d?.details === 'string'
          ? d.details
          : d?.details?.detail || d?.details?.message || null;
      const msg =
        d?.message ||
        (error.code === 'ECONNABORTED'
          ? 'Verification request timed out. Please try again.'
          : null) ||
        error.message ||
        'Verification failed.';
      alert(details ? `${msg}\n\nDetails: ${details}` : msg);
    }
  };

  const handlePayOnlineForBooking = async (booking) => {
    const ids = booking._groupIds?.length ? booking._groupIds : [booking.id];
    setPayOnlineBookingId(booking.id);
    try {
      const token = localStorage.getItem('token');
      const res = await payOnlineForBookingApi(
        ids.length > 1 ? { bookingIds: ids } : { bookingId: ids[0] },
        token
      );
      if (res.data.success && res.data.payment?.payment_url) {
        window.location.href = res.data.payment.payment_url;
        return;
      }
      if (res.data?.code === 'KHALTI_NOT_CONFIGURED') {
        alert(res.data.message || 'Online payment is not set up. You can still pay at the hotel.');
        return;
      }
      alert(res.data?.message || 'Could not start online payment.');
    } catch (error) {
      const d = error.response?.data;
      alert(d?.message || 'Could not start online payment. Try again or pay at the hotel.');
    } finally {
      setPayOnlineBookingId(null);
    }
  };

  const canExtendStay = (b) => {
    if (b.status !== 'checked_in') return false;
    const today = new Date().toISOString().split('T')[0];
    let co = b.check_out_date;
    if (co && typeof co === 'string') co = co.slice(0, 10);
    else if (co) co = new Date(co).toISOString().split('T')[0];
    return co && today >= co;
  };

  const openExtendModal = (booking) => {
    setExtendTarget(booking);
    setExtendNights(1);
    setExtendMethod('khalti');
    setShowExtendModal(true);
  };

  const handleExtendStay = async () => {
    if (!extendTarget || extendNights < 1) return;
    setExtendSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await extendStayApi(
        {
          bookingId: extendTarget.id,
          additional_nights: Number(extendNights),
          payment_method: extendMethod
        },
        token
      );
      if (res.data.success) {
        if (extendMethod === 'khalti') {
          const payUrl = res.data.payment?.payment_url;
          if (payUrl) {
            window.location.href = payUrl;
            return;
          }
          alert('Extension payment did not return a link. Check Khalti configuration on the server.');
          return;
        }
        alert(res.data.message || 'Stay extended.');
        setShowExtendModal(false);
        setExtendTarget(null);
        fetchMyBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not extend stay.');
    } finally {
      setExtendSubmitting(false);
    }
  };

  const openEditBookingModal = (booking) => {
    const parseDateOnly = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return value.slice(0, 10);
      return new Date(value).toISOString().split('T')[0];
    };
    const members = booking._groupBookings || [booking];
    const totalGuests =
      members.reduce((s, m) => s + Number(m.num_guests || 0), 0) ||
      Number(booking.num_guests || 1) ||
      1;
    setEditBookingTarget(booking);
    setEditBookingForm({
      guest_name: booking.guest_name || '',
      guest_phone: booking.guest_phone || '',
      special_requests: booking.special_requests || '',
      check_in_date: parseDateOnly(booking.check_in_date),
      check_out_date: parseDateOnly(booking.check_out_date),
      num_guests: Math.max(members.length, totalGuests)
    });
    setShowEditBookingModal(true);
  };

  const handleUpdateBooking = async () => {
    if (!editBookingTarget) return;
    if (!window.confirm('Save these booking changes?')) return;
    const targets = editBookingTarget._groupBookings?.length
      ? editBookingTarget._groupBookings
      : [editBookingTarget];
    const n = targets.length;
    const totalRequested = Math.max(1, parseInt(editBookingForm.num_guests, 10) || 0);
    if (totalRequested < n) {
      alert(`You have ${n} room(s). At least one guest per room is required (${n} minimum).`);
      return;
    }
    const base = Math.floor(totalRequested / n);
    const rem = totalRequested % n;
    const distribution = targets.map((_, i) => base + (i < rem ? 1 : 0));
    const maxCapSum = targets.reduce((s, t) => s + Number(t.room_max_occupancy || 99), 0);
    if (totalRequested > maxCapSum) {
      alert(`Total guests cannot exceed ${maxCapSum} for this reservation (room capacities).`);
      return;
    }
    for (let i = 0; i < n; i++) {
      const cap = Number(targets[i].room_max_occupancy || 99);
      if (distribution[i] > cap) {
        alert(
          `With ${totalRequested} total guests, one room would need ${distribution[i]} guests but room ${targets[i].room_number || i + 1} allows at most ${cap}. Try a lower total or contact the hotel.`
        );
        return;
      }
    }
    setEditBookingSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        await updateBookingGuestDetails(
          {
            bookingId: t.id,
            guest_name: editBookingForm.guest_name,
            guest_phone: editBookingForm.guest_phone,
            special_requests: editBookingForm.special_requests
          },
          token
        );
        await updateBookingNumGuests(
          {
            bookingId: t.id,
            num_guests: distribution[i]
          },
          token
        );
        await rescheduleBooking(
          {
            bookingId: t.id,
            check_in_date: editBookingForm.check_in_date,
            check_out_date: editBookingForm.check_out_date
          },
          token
        );
      }
      alert(targets.length > 1 ? 'All rooms in this reservation were updated.' : 'Booking updated successfully.');
      setShowEditBookingModal(false);
      setEditBookingTarget(null);
      fetchMyBookings();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update booking.');
    } finally {
      setEditBookingSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedHotel(null);
    setLoyaltyStatus(null);
  };

  const submitReviewHandler = async () => {
    try {
      const token = localStorage.getItem('token');
      await submitReviewApi(
        {
          booking_id: selectedBookingForReview.id,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          title: reviewForm.title,
          cleanliness_rating: reviewForm.cleanliness,
          service_rating: reviewForm.service,
          location_rating: reviewForm.location,
          value_rating: reviewForm.value
        },
        token
      );

      alert('Thank you! Your review has been submitted.');
      setShowReviewModal(false);
      setReviewStarHover(null);
      setReviewCategoryStarHover({ key: null, star: null });
      fetchMyBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not submit your review. Please try again.');
    }
  };
  return {
    navigate,
    location,
    user,
    setUser,
    hotels,
    setHotels,
    searchResults,
    setSearchResults,
    activeTab,
    setActiveTab,
    selectedHotel,
    setSelectedHotel,
    showModal,
    setShowModal,
    isMapFullScreen,
    setIsMapFullScreen,
    rooms,
    setRooms,
    selectedRoom,
    setSelectedRoom,
    activeImageIndex,
    setActiveImageIndex,
    isReserving,
    setIsReserving,
    bookingDates,
    setBookingDates,
    numGuests,
    setNumGuests,
    numRooms,
    setNumRooms,
    searchLocation,
    setSearchLocation,
    hotelSearchLoading,
    setHotelSearchLoading,
    exploreSearchActive,
    setExploreSearchActive,
    myBookings,
    setMyBookings,
    showPassModal,
    setShowPassModal,
    showBillModal,
    setShowBillModal,
    selectedPass,
    setSelectedPass,
    passRoomIndex,
    setPassRoomIndex,
    selectedBill,
    setSelectedBill,
    qrToken,
    setQrToken,
    showExtendModal,
    setShowExtendModal,
    extendTarget,
    setExtendTarget,
    extendNights,
    setExtendNights,
    extendMethod,
    setExtendMethod,
    extendSubmitting,
    setExtendSubmitting,
    payOnlineBookingId,
    setPayOnlineBookingId,
    showEditBookingModal,
    setShowEditBookingModal,
    editBookingTarget,
    setEditBookingTarget,
    editBookingSubmitting,
    setEditBookingSubmitting,
    editBookingForm,
    setEditBookingForm,
    loyaltyStatus,
    setLoyaltyStatus,
    showReviewModal,
    setShowReviewModal,
    selectedBookingForReview,
    setSelectedBookingForReview,
    hotelReviews,
    setHotelReviews,
    reviewForm,
    setReviewForm,
    reviewStarHover,
    setReviewStarHover,
    reviewCategoryStarHover,
    setReviewCategoryStarHover,
    contentRef,
    handlePrint,
    fetchHotelReviews,
    displayBookings,
    fetchMyBookings,
    handleSearch,
    fetchAndApplyRoomSearch,
    runExploreHotelSearch,
    quickExploreSearch,
    clearExploreHotelSearch,
    visibleHotels,
    hotelsToRender,
    handleLogout,
    handleHotelClick,
    fetchRooms,
    fetchLoyaltyStatus,
    processBooking,
    handleCancelBooking,
    handleVerifyPayment,
    handlePayOnlineForBooking,
    canExtendStay,
    openExtendModal,
    handleExtendStay,
    openEditBookingModal,
    handleUpdateBooking,
    closeModal,
    submitReviewHandler
  };

}
