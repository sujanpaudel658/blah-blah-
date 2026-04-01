import React, { useEffect, useState, useRef } from 'react';
import Footer from '../components/Footer';
import { useReactToPrint } from 'react-to-print';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { QRCodeCanvas } from 'qrcode.react';
import { API_URL } from '../config/api';
import { getImageUrl } from '../utils/helpers';

// Fix for default marker icon issues in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * UserDashboard Component
 * 
 * Central Guest Console for the StayNepal system.   * Manages hotel search, room booking, and reservation history.
 * 
 * Aesthetic: Formal Architectural Hospitality (2016-2019)
 */
const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // -- USER & SEARCH STATE --
  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('explore');

  // -- HOTEL SELECTION STATE --
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);


  // -- BOOKING DATES --
  const [isReserving, setIsReserving] = useState(false);
  const [bookingDates, setBookingDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [numGuests, setNumGuests] = useState(1);
  const [numRooms, setNumRooms] = useState(1);

  // -- MY BOOKINGS STATE --
  const [myBookings, setMyBookings] = useState([]);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [qrToken, setQrToken] = useState(null);

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendTarget, setExtendTarget] = useState(null);
  const [extendNights, setExtendNights] = useState(1);
  const [extendMethod, setExtendMethod] = useState('khalti');
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  // -- LOYALTY PROGRAM STATE --
  const [loyaltyStatus, setLoyaltyStatus] = useState(null);

  // -- HOTEL REQUEST STATE --
  const [showRequestHotelModal, setShowRequestHotelModal] = useState(false);
  const [requestHotelForm, setRequestHotelForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    description: '',
    image: ''
  });

  // -- REVIEWS & FEEDBACK --
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

  // -- PRINT SERVICES --
  const contentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Receipt-${selectedBill?.booking_reference || 'Booking'}`,
  });

  /**
   * INITIALIZATION: Load Hotels
   */
  useEffect(() => {
    axios.get(`${API_URL}/hotels`)
      .then(res => {
        const mapped = (res.data.hotels || []).map(hotel => {
          let hotelImages = [];
          if (hotel.image) {
            try { hotelImages = JSON.parse(hotel.image); }
            catch (e) { hotelImages = [hotel.image]; }
          }
          return {
            id: hotel.id,
            title: hotel.name,
            description: `${hotel.city || ''}, ${hotel.country || ''} - ${hotel.address || ''}`,
            images: hotelImages,
            fullDescription: hotel.description,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            rating: hotel.rating
          };
        });
        setHotels(mapped);
        setSearchResults(mapped);
        return mapped;
      })
      .catch(err => {
        console.error('Initial hotels data load error:', err);
      });
  }, []);

  /**
   * REVIEWS: Load guest reviews for the hotel
   */
  const fetchHotelReviews = async (hotelId) => {
    try {
      const res = await axios.get(`${API_URL}/reviews/hotel/${hotelId}`);
      if (res.data.success) {
        setHotelReviews(res.data.reviews);
      }
    } catch (err) {
      console.error('Review Error:', err.message);
    }
  };

  /**
   * AUTHENTICATION & SESSION LOAD
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchMyBookings();

    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [navigate, location]);

  /**
   * QR SECURITY: Fetch signed token for the digital pass
   */
  useEffect(() => {
    if (showPassModal && selectedPass) {
      const fetchToken = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/payments/qr-token/${selectedPass.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.success) setQrToken(res.data.qrToken);
        } catch (err) {
          console.error('Failed to generate secure QR signature:', err);
        }
      };
      fetchToken();
    } else {
      setQrToken(null);
    }
  }, [showPassModal, selectedPass]);

  /**
   * LOAD: My Booking History
   */
  const fetchMyBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/users/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Simple single image support for now, stored as JSON array string to match backend expectation if needed
        // But backend createHotel expects 'image' field.
        // Let's store as base64 string in array for consistency with other parts if they use arrays.
        // Or just the base64 string if the backend handles it.
        // Looking at backend: createHotel takes 'image' and stores it.
        // UserDashboard frontend parses it: try { hotelImages = JSON.parse(hotel.image); }
        // So we should stringify an array.
        const base64 = reader.result;
        setRequestHotelForm({ ...requestHotelForm, image: JSON.stringify([base64]) });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRequestHotelSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/hotels/request`, requestHotelForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Hotel request submitted! Waiting for Super Admin verification.');
      setShowRequestHotelModal(false);
      setRequestHotelForm({
        name: '', address: '', city: '', country: '',
        phone: '', email: '', description: '', image: ''
      });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit request');
    }
  };

  const handleSearch = (results) => setSearchResults(results);

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


  /**
   * CHECK AVAILABILITY: Live room check
   */
  useEffect(() => {
    if (showModal && selectedHotel && bookingDates.checkIn && bookingDates.checkOut) {
      fetchRooms(selectedHotel.id);
    }
  }, [bookingDates.checkIn, bookingDates.checkOut, showModal, selectedHotel]);

  const fetchRooms = async (hotelId) => {
    try {
      const token = localStorage.getItem('token');
      const { checkIn, checkOut } = bookingDates;
      const res = await axios.get(`${API_URL}/rooms?hotelId=${hotelId}&checkIn=${checkIn}&checkOut=${checkOut}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  /**
   * LOYALTY: Fetch loyalty status for a specific hotel
   */
  const fetchLoyaltyStatus = async (hotelId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API_URL}/loyalty/status/${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setLoyaltyStatus(res.data.loyalty);
      }
    } catch (err) {
      console.error('Loyalty status fetch error:', err.message);
      setLoyaltyStatus(null);
    }
  };

  /**
   * PAYMENT: Khalti Payment Gateway Integration
   */
  const processBooking = async (method = 'khalti') => {
    if (!selectedRoom) return alert('Please select a room first');

    const checkIn = new Date(bookingDates.checkIn);
    const checkOut = new Date(bookingDates.checkOut);

    if (checkOut <= checkIn) return alert('Check-out date must be after check-in date');

    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let totalAmount = selectedRoom.base_price * totalNights * numRooms;

    // Apply loyalty discount if eligible (1 free night per room)
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

      const res = await axios.post(`${API_URL}/payments/initiate`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

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

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/payments/cancel`, { bookingId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyBookings();
    } catch (error) { alert('Cancel failed. Please try again.'); }
  };

  const handleRefundRequest = async (bookingId, amount) => {
    if (!window.confirm(`Request a refund for NRS ${amount}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/refund`, { bookingId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert('Refund request submitted successfully.');
        fetchMyBookings();
      }
    } catch (error) { alert('Refund request failed. Please contact support.'); }
  };

  const handleVerifyPayment = async (booking) => {
    try {
      const res = await axios.post(`${API_URL}/payments/verify`, { purchase_order_id: booking.id });
      if (res.data.success) {
        alert('Payment Verified: Booking confirmed.');
        fetchMyBookings();
      } else {
        alert('Status: ' + (res.data.message || 'Pending verification.'));
      }
    } catch (error) { alert('Verification link timeout.'); }
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
      const res = await axios.post(
        `${API_URL}/payments/extend-stay`,
        {
          bookingId: extendTarget.id,
          additional_nights: Number(extendNights),
          payment_method: extendMethod
        },
        { headers: { Authorization: `Bearer ${token}` } }
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

  const closeModal = () => {
    setShowModal(false);
    setSelectedHotel(null);
    setLoyaltyStatus(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#2D3748] font-sans antialiased">
      <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; }
            .fade-in { animation: fadeIn 0.2s ease-out; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

      <Navbar
        user={user}
        onLogout={handleLogout}
        searchPlaceholder="Find your hotel..."
        hotelSuggestions={hotels}
        onSearch={handleSearch}
      />

      {/* Primary Navigation Sub-Bar */}
      <div className="w-full bg-white border-b border-[#E2E2E2] sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-10">
            <button
              onClick={() => setActiveTab('explore')}
              className={`py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'explore' ? 'text-[#1B2B41]' : 'text-[#A0AEC0] hover:text-[#1B2B41]'}`}
            >
              Explore Hotels
              {activeTab === 'explore' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#B88E2F]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'bookings' ? 'text-[#1B2B41]' : 'text-[#A0AEC0] hover:text-[#1B2B41]'}`}
            >
              My Bookings
              {myBookings.length > 0 && <span className="bg-[#1B2B41] text-white px-2 py-0.5 rounded-sm text-[8px]">{myBookings.length}</span>}
              {activeTab === 'bookings' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#B88E2F]"></div>}
            </button>
            <button
              type="button"
              onClick={() => navigate('/guest/profile')}
              className="py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0AEC0] hover:text-[#1B2B41] transition-all relative"
            >
              My profile
            </button>
            <button
              onClick={() => setShowRequestHotelModal(true)}
              className="py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0AEC0] hover:text-[#B88E2F] transition-all ml-auto border border-[#B88E2F] px-4 rounded-sm"
            >
              Partner With Us
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'explore' ? (
        <>
          {/* Full-width Video Background Section (Edge-to-Edge) */}
          <section className="relative w-full overflow-hidden min-h-[580px] flex items-center">
            {/* Absolute Video Background Layer */}
            <div className="absolute inset-0 z-0 w-full h-full">
              <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-30 grayscale-[20%]"
              >
                <source src="/videos/857267-hd_1920_1080_24fps.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-b from-[#F5F3EF]/80 via-[#F5F3EF]/40 to-[#F5F3EF]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-6">
                  <span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-[0.4em]">Integrated Booking Portal</span>
                  <h1 className="text-5xl lg:text-7xl font-bold text-[#1B2B41] leading-none tracking-tight">
                    Perfect <br />
                    Stay <br />
                    Finder<span className="text-[#B88E2F]">.</span>
                  </h1>
                  <p className="text-base text-[#64748B] max-w-md leading-relaxed font-medium">
                    Direct access to Nepal's best hotels. Verified rooms for your business or vacation needs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <main className="max-w-7xl mx-auto px-6 py-12">
            {/* Results Grid Node */}
            <div className="space-y-8">
            <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight italic border-b border-[#F1F1F1] pb-4">Available Hotels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {searchResults.map(hotel => (
                <div key={hotel.id} className="bg-white border border-[#E2E2E2] overflow-hidden cursor-pointer hover:border-[#B88E2F] transition-all rounded-2xl group shadow-sm hover:shadow-xl" onClick={() => handleHotelClick(hotel)}>
                  {hotel.images && hotel.images.length > 0 && (
                    <div className="relative h-56 overflow-hidden bg-[#F1F1F1]">
                      <img
                        src={hotel.images[0].startsWith('data:') ? hotel.images[0] : (hotel.images[0].startsWith('http') ? hotel.images[0] : `${API_URL.replace('/api', '')}${hotel.images[0]}`)}
                        className="w-full h-full object-cover grayscale-[0.05] group-hover:scale-110 transition-transform duration-700"
                        alt={hotel.title}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                  )}
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-base font-bold text-[#1B2B41] uppercase leading-tight tracking-tight">{hotel.title}</h3>
                      <div className="flex items-center gap-1 bg-[#1B2B41]/5 px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[12px] text-yellow-400">star</span>
                        <span className="text-[10px] font-bold text-[#1B2B41]">{Number(hotel.rating || 0).toFixed(1)}</span>
                      </div>
                      <span className="text-[9px] font-bold text-[#A0AEC0] bg-[#F5F3EF] px-2 py-1 rounded-md">ID-{hotel.id}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="material-symbols-outlined text-[14px] text-[#B88E2F]">location_on</span>
                      <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">{hotel.city ? `${hotel.city}${hotel.country ? `, ${hotel.country}` : ''}` : 'Location Available'}</p>
                    </div>
                    <button className="w-full mt-2 py-4 border border-[#E2E2E2] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-[#1B2B41] hover:text-white transition-all rounded-xl">
                      View Hotel Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </main>
        </>
      ) : (
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col gap-10">
            <div className="space-y-2 border-b border-[#F1F1F1] pb-6">
              <h2 className="text-2xl font-bold text-[#1B2B41] uppercase tracking-tight italic">My Bookings</h2>
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">History of your past and current hotel bookings</p>
            </div>

            {myBookings.length > 0 ? (
              <div className="space-y-6">
                {myBookings.map(booking => (
                  <div key={booking.id} className={`bg-white border p-10 flex flex-col md:flex-row gap-12 rounded-2xl shadow-sm hover:border-[#1B2B41] transition-all hover:shadow-lg ${booking.status === 'checked_out' || booking.status === 'cancelled' ? 'opacity-80' : ''}`}>
                    <div className="shrink-0 space-y-4">
                      <div className="w-20 h-20 bg-[#F9FAFB] border border-[#E2E2E2] flex items-center justify-center text-[#1B2B41] rounded-2xl">
                        <span className="material-symbols-outlined text-4xl font-light">
                          {booking.status === 'checked_out' ? 'history' : 'inventory_2'}
                        </span>
                      </div>
                      <div className={`px-4 py-2 border text-[9px] font-bold uppercase tracking-widest text-center rounded-lg ${booking.status === 'checked_out' ? 'bg-slate-100 border-slate-300 text-slate-500' :
                        booking.status === 'confirmed' ? 'bg-[#E7F3ED] border-[#108548] text-[#108548]' :
                          booking.status === 'checked_in' ? 'bg-[#E8EEF8] border-[#3B5BA9] text-[#3B5BA9]' :
                          'bg-[#FEEDEC] border-[#B91C1C] text-[#B91C1C]'
                        }`}>
                        {booking.status.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest mb-1 font-mono">HOTEL_BOOKING</p>
                          <h4 className="text-base font-bold text-[#1B2B41] uppercase tracking-tight">{booking.hotel_name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[#64748B] text-[10px] font-bold uppercase">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          <span>{booking.hotel_city}, NEPAL</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-10 py-6 md:py-0 border-y md:border-y-0 md:border-x border-[#F1F1F1] md:px-10">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Check-in</p>
                          <p className="text-xs font-bold text-[#1B2B41]">{new Date(booking.check_in_date).toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Check-out</p>
                          <p className="text-xs font-bold text-[#1B2B41]">{new Date(booking.check_out_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-6">
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest mb-1">Total Price (Paid)</p>
                          <p className="text-2xl font-bold text-[#1B2B41]">NRS {Number(booking.total_amount).toLocaleString()}</p>
                          {booking.loyalty_free_night === 1 && (
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <span className="material-symbols-outlined text-[12px] text-[#B88E2F]" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                              <span className="text-[8px] font-bold text-[#B88E2F] uppercase tracking-widest">Loyalty Reward Applied (-NRS {Number(booking.loyalty_discount || 0).toLocaleString()})</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap md:flex-nowrap justify-end gap-3 w-full md:w-auto">
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => { setSelectedPass(booking); setShowPassModal(true); }}
                              className="px-6 py-4 bg-[#1B2B41] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#2D3748] transition-all rounded-xl shadow-md flex items-center gap-3"
                            >
                              <span className="material-symbols-outlined text-sm">vpn_key</span>
                              Access Pass
                            </button>
                          )}
                          {booking.payment_status === 'paid' && (
                            <button
                              onClick={() => { setSelectedBill(booking); setShowBillModal(true); }}
                              className="px-6 py-4 bg-white border border-[#E2E2E2] text-[#1B2B41] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F9FAFB] transition-all rounded-xl flex items-center gap-3"
                            >
                              <span className="material-symbols-outlined text-sm">receipt_long</span>
                              Invoice
                            </button>
                          )}
                          {['checked_in', 'checked_out'].includes(booking.status) && !booking.is_reviewed && (
                            <button
                              onClick={() => {
                                setSelectedBookingForReview(booking);
                                setShowReviewModal(true);
                              }}
                              className="px-6 py-4 bg-[#B88E2F]/10 border border-[#B88E2F] text-[#B88E2F] text-[10px] font-bold uppercase tracking-widest hover:bg-[#B88E2F] hover:text-white transition-all rounded-xl flex items-center gap-3"
                            >
                              <span className="material-symbols-outlined text-sm">star</span>
                              Rate Experience
                            </button>
                          )}
                          {booking.is_reviewed > 0 && (
                            <div className="px-6 py-4 bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-3">
                              <span className="material-symbols-outlined text-sm">verified</span>
                               Review Submitted
                            </div>
                          )}
                          {booking.status === 'confirmed' && booking.payment_status === 'paid' && (
                            <button
                              onClick={() => handleRefundRequest(booking.id, booking.total_amount)}
                              className="px-5 py-3 border border-rose-200 text-rose-600 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-50 transition-all rounded-sm"
                            >
                              Refund Request
                            </button>
                          )}
                          {booking.status === 'pending' && (
                            <button onClick={() => handleVerifyPayment(booking)} className="px-5 py-3 bg-[#B88E2F] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#9E7A28] transition-all rounded-sm">
                               Verify Payment
                            </button>
                          )}
                          {canExtendStay(booking) && (
                            <button
                              type="button"
                              onClick={() => openExtendModal(booking)}
                              className="px-6 py-4 bg-[#3B5BA9] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#2d4780] transition-all rounded-xl flex items-center gap-3"
                            >
                              <span className="material-symbols-outlined text-sm">event_repeat</span>
                              Extend stay
                            </button>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-[#A0AEC0] uppercase font-mono tracking-tighter">REF: {booking.booking_reference}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 bg-white border border-[#E2E2E2] text-center rounded-sm">
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.3em]">No bookings found</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL: Digital Access Pass (Security Permit Style) */}
      {showPassModal && selectedPass && (
        <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
          <div className="max-w-md w-full bg-white border border-[#E2E2E2] rounded-sm shadow-2xl overflow-hidden">
            <div className="bg-[#1B2B41] px-10 py-8 border-b-4 border-[#B88E2F]">
              <h3 className="text-white text-lg font-bold uppercase tracking-[0.2em]">{selectedPass.hotel_name}</h3>
              <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-[0.3em] mt-2">Official Hotel Entry Pass</p>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">Holder</span>
                  <p className="text-xs font-bold text-[#1B2B41] uppercase">{selectedPass.guest_name}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">Unit Allocation</span>
                  <p className="text-xs font-bold text-[#B88E2F] uppercase">{selectedPass.room_number || 'PENDING'}</p>
                </div>
              </div>

              <div className="py-6 border-y border-[#F1F1F1] grid grid-cols-2 gap-10">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">Start Date</span>
                  <p className="text-xs font-bold text-[#1B2B41]">{new Date(selectedPass.check_in_date).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">End Date</span>
                  <p className="text-xs font-bold text-[#1B2B41]">{new Date(selectedPass.check_out_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex flex-col items-center py-6">
                <div className="p-6 bg-[#F9FAFB] border border-[#E2E2E2] rounded-sm">
                  {qrToken ? (
                    <QRCodeCanvas
                      value={qrToken}
                      size={160} level={"H"} fgColor="#1B2B41"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center bg-slate-100 animate-pulse text-[10px] font-bold text-slate-400">
                      GENERATING SECURE KEY...
                    </div>
                  )}
                </div>
                <p className="text-[9px] font-bold text-[#1B2B41] mt-6 uppercase tracking-[0.3em] font-mono">{selectedPass.booking_reference}</p>
              </div>

              <button
                onClick={() => setShowPassModal(false)}
                className="w-full py-5 bg-[#1B2B41] text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#2D3748] transition-all rounded-xl shadow-lg"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Experience Rating Interface */}
      {showReviewModal && selectedBookingForReview && (
        <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
          <div className="max-w-2xl w-full bg-white border border-[#E2E2E2] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1B2B41] px-10 py-8 border-b-4 border-[#B88E2F]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white text-lg font-bold uppercase tracking-[0.2em]">Rate Your Stay</h3>
                  <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-[0.3em] mt-2">Review stay at {selectedBookingForReview.hotel_name}</p>
                </div>
                <button onClick={() => setShowReviewModal(false)} className="text-[#A0AEC0] hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-[#1B2B41] uppercase tracking-widest">Global Experience Score</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="transition-transform hover:scale-125 focus:outline-none"
                      >
                        <span className={`material-symbols-outlined text-4xl ${reviewForm.rating >= star ? 'text-yellow-400' : 'text-slate-300'} fill-current`} style={{ fontVariationSettings: `'FILL' ${reviewForm.rating >= star ? 1 : 0}` }}>
                          star_rate
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-1">Dimensional Metrics</label>
                    {[
                      { key: 'cleanliness', label: 'Cleanliness' },
                      { key: 'service', label: 'Service Quality' },
                      { key: 'location', label: 'Location' },
                      { key: 'value', label: 'Value for Money' }
                    ].map((metric) => (
                      <div key={metric.key} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <span className="text-[10px] font-bold text-[#1B2B41] uppercase">{metric.label}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              onClick={() => setReviewForm({ ...reviewForm, [metric.key]: s })}
                              className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${reviewForm[metric.key] === s ? 'bg-[#1B2B41] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Entry Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Exceptional Hospitality..."
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Detailed Commentary</label>
                      <textarea
                        rows="4"
                        placeholder="How was your stay? Tell us about your experience..."
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl resize-none"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/reviews`, {
                      booking_id: selectedBookingForReview.id,
                      rating: reviewForm.rating,
                      comment: reviewForm.comment,
                      title: reviewForm.title,
                      cleanliness_rating: reviewForm.cleanliness,
                      service_rating: reviewForm.service,
                      location_rating: reviewForm.location,
                      value_rating: reviewForm.value
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });

                    alert('Thank you! Your review has been submitted.');
                    setShowReviewModal(false);
                    fetchMyBookings();
                  } catch (err) {
                    alert(err.response?.data?.message || 'Synchronization failure.');
                  }
                }}
                className="w-full py-5 bg-[#B88E2F] text-white text-[12px] font-bold uppercase tracking-[0.3em] hover:bg-[#9E7A28] transition-all rounded-xl shadow-lg transform active:scale-[0.98]"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Invoice Interface */}
      {showBillModal && selectedBill && (
        <div className="fixed inset-0 bg-[#111B2B]/90 flex items-center justify-center z-[1000] p-6 fade-in overflow-y-auto">
          <div className="max-w-4xl w-full bg-white border border-[#E2E2E2] flex flex-col md:flex-row shadow-2xl rounded-sm">
            <div className="flex-1 bg-[#F5F3EF] p-12 overflow-y-auto rounded-l-2xl">
              <div className="max-w-[400px] mx-auto bg-white border border-[#E2E2E2] shadow-sm p-10 rounded-xl">
                <div ref={contentRef} className="font-mono text-[11px] text-[#1B2B41] leading-relaxed">
                  <div className="text-center space-y-2 mb-8 border-b border-dashed border-[#E2E2E2] pb-6">
                    <span className="text-[9px] font-bold text-[#B88E2F] uppercase block">Official Statement</span>
                    <h1 className="text-lg font-bold uppercase">{selectedBill.hotel_name}</h1>
                    <p className="text-[9px] text-[#64748B] uppercase">{selectedBill.hotel_city}, NEPAL</p>
                    <p className="text-[10px] font-bold uppercase py-2 bg-[#F9FAFB] border-y border-dashed border-[#E2E2E2]">*** GUEST COPY ***</p>
                  </div>

                  <div className="space-y-1 mb-6 uppercase">
                    <div className="flex justify-between"><span>REF NO:</span><span className="font-bold">{selectedBill.booking_reference}</span></div>
                    <div className="flex justify-between"><span>DATE:</span><span>{new Date().toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span>TIME:</span><span>{new Date().toLocaleTimeString()}</span></div>
                  </div>

                  <div className="border-t border-dashed border-[#E2E2E2] pt-6 space-y-4 mb-8">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-[#A0AEC0] uppercase">Guest Entity</span>
                      <span className="font-bold uppercase">{selectedBill.guest_name}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-[#E2E2E2] pt-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-[#A0AEC0] uppercase block">{selectedBill.room_type}</span>
                        <span>{selectedBill.total_nights} Nights x NRS {Number(selectedBill.price_per_night || (selectedBill.total_amount + Number(selectedBill.loyalty_discount || 0)) / selectedBill.total_nights).toLocaleString()}</span>
                      </div>
                      <span className="font-bold">NRS {Number(Number(selectedBill.total_amount) + Number(selectedBill.loyalty_discount || 0)).toLocaleString()}</span>
                    </div>
                    {selectedBill.loyalty_free_night === 1 && Number(selectedBill.loyalty_discount) > 0 && (
                      <div className="flex justify-between border-t border-dashed border-[#E2E2E2] pt-4 text-green-600">
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold uppercase block">★ LOYALTY REWARD</span>
                          <span>1 Free Night Discount</span>
                        </div>
                        <span className="font-bold">-NRS {Number(selectedBill.loyalty_discount).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#1B2B41] pt-4 space-y-2">
                    <div className="flex justify-between text-base font-bold"><span>TOTAL PRICE:</span><span>NRS {Number(selectedBill.total_amount).toLocaleString()}</span></div>
                    <div className="flex justify-between text-[10px] italic"><span>PAYMENT:</span><span className="font-bold uppercase">{selectedBill.payment_method || 'KHALTI PAYMENT'}</span></div>
                    {selectedBill.loyalty_free_night === 1 && (
                      <div className="flex justify-between text-[10px] italic text-[#B88E2F]"><span>LOYALTY:</span><span className="font-bold uppercase">FREE NIGHT REDEEMED</span></div>
                    )}
                  </div>

                  <div className="mt-10 pt-10 border-t border-dashed border-[#E2E2E2] text-center space-y-8">
                    <div className="flex flex-col items-center">
                      <QRCodeCanvas value={selectedBill.booking_reference} size={80} fgColor="#1B2B41" />
                      <p className="text-[8px] mt-2 font-bold text-[#A0AEC0]">VERIFIED BY STAYNEPAL</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-tight italic">Booking Complete. Safe Travels.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-72 bg-[#1B2B41] p-10 flex flex-col justify-center gap-6 rounded-r-2xl">
              <button onClick={handlePrint} className="w-full py-4 bg-[#B88E2F] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#9E7A28] rounded-xl transition-all shadow-lg">
                Print Receipt
              </button>
              <button onClick={() => setShowBillModal(false)} className="w-full py-4 border border-[#2D4361] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/5 rounded-xl transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showExtendModal && extendTarget && (
        <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
          <div className="max-w-md w-full bg-white border border-[#E2E2E2] rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#1B2B41] px-8 py-6 border-b-4 border-[#B88E2F]">
              <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em]">Extend your stay</h3>
              <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest mt-2">
                Available from your scheduled check-out while you remain checked in
              </p>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                {extendTarget.hotel_name} — Room {extendTarget.room_number}. Extra nights use your current nightly rate; the platform fee (10%) applies to the extension the same as a new booking.
              </p>
              <div>
                <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Additional nights (1–90)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={extendNights}
                  onChange={(e) => setExtendNights(Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
                />
              </div>
              <p className="text-xs font-bold text-[#1B2B41]">
                Estimated extension: NRS {Math.round(Number(extendTarget.price_per_night) * Number(extendNights) * 100) / 100}
              </p>
              <div className="space-y-3">
                <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Payment</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="extendPay" checked={extendMethod === 'khalti'} onChange={() => setExtendMethod('khalti')} />
                  <span className="text-[11px] font-bold text-[#1B2B41]">Khalti (online)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="extendPay" checked={extendMethod === 'cash'} onChange={() => setExtendMethod('cash')} />
                  <span className="text-[11px] font-bold text-[#1B2B41]">Pay at hotel (cash)</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowExtendModal(false); setExtendTarget(null); }}
                  className="flex-1 py-4 border border-[#E2E2E2] text-[10px] font-bold uppercase tracking-widest rounded-xl text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={extendSubmitting}
                  onClick={handleExtendStay}
                  className="flex-1 py-4 bg-[#3B5BA9] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#2d4780] disabled:opacity-50"
                >
                  {extendSubmitting ? '…' : extendMethod === 'khalti' ? 'Continue to pay' : 'Confirm extension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOTEL DETAILS MODAL */}
      {showModal && selectedHotel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 fade-in">
          <div className="bg-white max-w-6xl w-full max-h-[95vh] overflow-hidden rounded-2xl flex flex-col relative shadow-2xl">
            {/* Close Trigger */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-[110] w-10 h-10 bg-white/90 backdrop-blur-md text-[#1B2B41] flex items-center justify-center hover:bg-[#1B2B41] hover:text-white transition-all rounded-full shadow-lg"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              {/* IMMERSIVE HERO SECTION */}
              <div className="relative h-[300px] md:h-[450px] overflow-hidden">
                {selectedHotel.images && selectedHotel.images.length > 0 ? (
                  <>
                    <img
                      src={selectedHotel.images[activeImageIndex].startsWith('data:') ? selectedHotel.images[activeImageIndex] : (selectedHotel.images[activeImageIndex].startsWith('http') ? selectedHotel.images[activeImageIndex] : `${API_URL.replace("/api", "")}${selectedHotel.images[activeImageIndex]}`)}
                      className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                      alt={`Hotel Image ${activeImageIndex + 1}`}
                      key={activeImageIndex}
                    />

                    {/* Navigation Arrows */}
                    {selectedHotel.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) => (prev === 0 ? selectedHotel.images.length - 1 : prev - 1));
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] w-12 h-12 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all rounded-full border border-white/30"
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) => (prev === selectedHotel.images.length - 1 ? 0 : prev + 1));
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] w-12 h-12 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all rounded-full border border-white/30"
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[110] flex gap-2">
                          {selectedHotel.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIndex ? 'bg-white w-6' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (

                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-8xl">image</span>
                  </div>
                )}
                {/* Gradient Overlay for Text Legibility */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent"></div>

                <div className="absolute bottom-8 left-8 text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-[#B88E2F] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">Premium Hotel</span>
                    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold">
                      <span className="material-symbols-outlined text-[14px] text-yellow-400">star</span>
                      <span>{Number(selectedHotel.rating || 0).toFixed(1)} Rating</span>
                    </div>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-bold tracking-tight drop-shadow-md">{selectedHotel.title}</h3>
                </div>
              </div>

              {/* CONTENT GRID */}
              <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                  {/* LEFT COLUMN: INFORMATION & AMENITIES */}
                  <div className="lg:col-span-2 space-y-12">

                    {/* Location & Summary */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#B88E2F]">
                        <span className="material-symbols-outlined text-xl">location_on</span>
                        <span className="text-sm font-semibold tracking-wide uppercase">
                          {selectedHotel.city ? `${selectedHotel.city}${selectedHotel.country ? `, ${selectedHotel.country}` : ''}` : 'Location Available'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-6 py-6 border-y border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#1B2B41]">
                            <span className="material-symbols-outlined">hotel</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase">Configuration</span>
                            <span className="text-sm font-semibold text-[#1B2B41]">Available Rooms</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#1B2B41]">
                            <span className="material-symbols-outlined">verified_user</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase">Verification</span>
                            <span className="text-sm font-semibold text-[#1B2B41]">StayNepal Certified</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#1B2B41]">
                            <span className="material-symbols-outlined">schedule</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase">Check-In</span>
                            <span className="text-sm font-semibold text-[#1B2B41]">14:00 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About Hotel */}
                    <section>
                      <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest mb-4 border-l-4 border-[#B88E2F] pl-4">About This Hotel</h4>
                      <p className="text-lg text-slate-600 leading-relaxed">
                        {selectedHotel.fullDescription || "Hotel information is arriving soon. Our team is verifying this hotel to ensure a high standard of hospitality for your stay."}
                      </p>
                    </section>

                    {/* Amenities Checklist */}
                    <section>
                      <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest mb-6 border-l-4 border-[#B88E2F] pl-4 font-inter">Amenities & Facilities</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                          { icon: 'wifi', label: 'High Speed WiFi' },
                          { icon: 'ac_unit', label: 'Air Conditioning' },
                          { icon: 'local_parking', label: 'secure Parking' },
                          { icon: 'restaurant', label: 'Fine Dining' },
                          { icon: 'pool', label: 'Infinity Pool' },
                          { icon: 'fitness_center', label: 'Wellness Club' },
                          { icon: 'local_laundry_service', label: 'Housekeeping' },
                          { icon: 'support_agent', label: '24/7 Concierge' }
                        ].map((amenity, i) => (
                          <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-all group">
                            <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-[#B88E2F] transition-colors">{amenity.icon}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{amenity.label}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Guest Reviews Section */}
                    <section className="space-y-8 pb-12">
                      <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-4">
                        <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest border-l-4 border-[#B88E2F] pl-4 font-inter">Guest Reviews</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-[#1B2B41]">
                            {hotelReviews.length > 0
                              ? (hotelReviews.reduce((acc, r) => acc + Number(r.rating), 0) / hotelReviews.length).toFixed(1)
                              : Number(selectedHotel.rating || 0).toFixed(1)}
                          </span>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => {
                              const avg = hotelReviews.length > 0
                                ? (hotelReviews.reduce((acc, r) => acc + Number(r.rating), 0) / hotelReviews.length)
                                : Number(selectedHotel.rating || 0);
                              return (
                                <span key={i} className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: `'FILL' ${i < Math.round(avg) ? 1 : 0}` }}>
                                  star_rate
                                </span>
                              );
                            })}
                          </div>
                          <span className="text-[10px] font-bold text-[#A0AEC0] uppercase tracking-tighter">({hotelReviews.length} Reviews)</span>
                        </div>
                      </div>

                      {hotelReviews.length === 0 ? (
                        <div className="py-12 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                          <span className="material-symbols-outlined text-slate-300 text-4xl mb-3">rate_review</span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No verified reviews in our registry yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {hotelReviews.map((review) => (
                            <div key={review.id} className="p-8 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                              <div className="flex justify-between items-start mb-4 gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  {review.reviewer_profile_image ? (
                                    <img
                                      src={getImageUrl(review.reviewer_profile_image)}
                                      alt=""
                                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-11 h-11 rounded-full bg-[#1B2B41] text-[#B88E2F] flex items-center justify-center text-sm font-bold shrink-0">
                                      {(review.reviewer_name || 'G').trim().charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <h5 className="text-sm font-bold text-[#1B2B41] uppercase mb-1">{review.title || 'Exceptional Stay'}</h5>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                          <span key={i} className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: `'FILL' ${i < Number(review.rating) ? 1 : 0}` }}>
                                            star_rate
                                          </span>
                                        ))}
                                      </div>
                                      <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">{review.reviewer_name}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-tighter shrink-0">{new Date(review.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-[#64748B] leading-relaxed italic">"{review.comment}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Geographical Context */}
                    <section className="space-y-6">
                      <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest border-l-4 border-[#B88E2F] pl-4 font-inter">Hotel Location</h4>
                      <div className="h-[350px] shadow-sm rounded-2xl overflow-hidden relative group">
                        <MapContainer
                          center={[selectedHotel.latitude, selectedHotel.longitude]}
                          zoom={15}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={true}
                          zoomControl={true}
                          dragging={true}
                        >
                          <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
                          <Marker position={[selectedHotel.latitude, selectedHotel.longitude]} />
                        </MapContainer>

                        {/* Interactive Overlay Actions */}
                        <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
                          <button
                            onClick={() => setIsMapFullScreen(true)}
                            className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-100 shadow-xl text-[10px] font-bold text-[#1B2B41] flex items-center gap-2 hover:bg-[#1B2B41] hover:text-white transition-all transform hover:scale-105"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_full</span>
                            OPEN FULL MAP
                          </button>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedHotel.latitude},${selectedHotel.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#B88E2F] px-4 py-2 rounded-lg shadow-xl text-[10px] font-bold text-white flex items-center gap-2 hover:bg-[#a17a26] transition-all transform hover:scale-105"
                          >
                            <span className="material-symbols-outlined text-sm">directions</span>
                            GET DIRECTIONS
                          </a>
                        </div>

                        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-100 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-bold text-[#1B2B41]">INTERACTIVE MAP</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">North Reference</span>
                          <p className="text-xs font-mono font-bold text-[#1B2B41]">{Number(selectedHotel.latitude)?.toFixed(6) || '---'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">East Reference</span>
                          <p className="text-xs font-mono font-bold text-[#1B2B41]">{Number(selectedHotel.longitude)?.toFixed(6) || '---'}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* RIGHT COLUMN: BOOKING CARD */}
                  <aside className="relative">
                    <div className="lg:sticky lg:top-0 space-y-6">
                      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Starting From</span>
                            <span className="text-3xl font-bold text-[#1B2B41]">NRS {rooms.length > 0 ? Math.min(...rooms.map(r => Number(r.base_price))).toFixed(2) : '---'}</span>
                            <span className="text-xs text-slate-400 font-semibold italic ml-1">/ Night</span>
                          </div>
                        </div>

                        {/* Booking Controls */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Check-In</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">calendar_today</span>
                                <input
                                  type="date"
                                  value={bookingDates.checkIn}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setBookingDates(prev => ({ ...prev, checkIn: e.target.value }))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                                />
                              </div>
                            </div>
                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Check-Out</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">event</span>
                                <input
                                  type="date"
                                  value={bookingDates.checkOut}
                                  min={bookingDates.checkIn}
                                  onChange={(e) => setBookingDates(prev => ({ ...prev, checkOut: e.target.value }))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Rooms Needed</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">bed</span>
                                <select
                                  value={numRooms}
                                  onChange={(e) => setNumRooms(parseInt(e.target.value))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-8 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl cursor-pointer appearance-none"
                                >
                                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Room' : 'Rooms'}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Total Guests</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">group</span>
                                <select
                                  value={numGuests}
                                  onChange={(e) => setNumGuests(parseInt(e.target.value))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-8 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl cursor-pointer appearance-none"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Inventory Scroll */}
                        <div className="space-y-4">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1 text-center font-inter">Room Availability</label>
                          <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {rooms.length === 0 ? (
                              <div className="p-6 bg-slate-50 rounded-xl text-center">
                                <span className="material-symbols-outlined text-slate-300 mb-2">sensor_door</span>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No availability for selected dates</p>
                              </div>
                            ) : (
                              rooms.map(room => (
                                <div
                                  key={room.room_type_id}
                                  onClick={() => setSelectedRoom(room)}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer group/room ${selectedRoom?.room_type_id === room.room_type_id
                                    ? 'bg-[#1B2B41] border-[#1B2B41] text-white shadow-lg'
                                    : 'bg-white border-slate-100 hover:border-[#B88E2F] hover:bg-slate-50'
                                    }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[11px] font-bold uppercase tracking-tight ${selectedRoom?.room_type_id === room.room_type_id ? 'text-white' : 'text-[#1B2B41]'}`}>{room.type_name}</span>
                                    <span className={`text-xs font-bold ${selectedRoom?.room_type_id === room.room_type_id ? 'text-[#F6C768]' : 'text-[#B88E2F]'}`}>NRS {room.base_price}</span>
                                  </div>
                                  <div className="flex justify-between text-[8px] font-bold uppercase opacity-60">
                                    <span>{room.available_count} Rooms Available</span>
                                    <span>Max Guests: {room.max_occupancy}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* LOYALTY PROGRAM BADGE */}
                        {loyaltyStatus && (
                          <div className={`p-5 rounded-xl border ${loyaltyStatus.is_eligible 
                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-[#B88E2F]/30' 
                            : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${loyaltyStatus.is_eligible ? 'bg-[#B88E2F] text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-[#1B2B41] uppercase tracking-widest">Loyalty Program</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                  {loyaltyStatus.is_eligible 
                                    ? '🎉 1 FREE NIGHT REWARD AVAILABLE!' 
                                    : `${loyaltyStatus.progress}/${loyaltyStatus.threshold} stays this year`}
                                </p>
                              </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ease-out ${loyaltyStatus.is_eligible ? 'bg-gradient-to-r from-[#B88E2F] to-[#D4A843]' : 'bg-[#1B2B41]'}`}
                                style={{ width: `${(loyaltyStatus.progress / loyaltyStatus.threshold) * 100}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-2">
                              {[...Array(loyaltyStatus.threshold)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${i < loyaltyStatus.progress 
                                  ? (loyaltyStatus.is_eligible ? 'bg-[#B88E2F] text-white' : 'bg-[#1B2B41] text-white')
                                  : 'bg-slate-200 text-slate-400'}`}>
                                  {i < loyaltyStatus.progress ? '✓' : i + 1}
                                </div>
                              ))}
                            </div>
                            {loyaltyStatus.is_eligible && (
                              <p className="text-[9px] font-bold text-[#B88E2F] mt-3 text-center uppercase tracking-wider animate-pulse">
                                ★ 1 Night Free on this booking ★
                              </p>
                            )}
                            {!loyaltyStatus.is_eligible && loyaltyStatus.threshold - loyaltyStatus.progress <= 2 && loyaltyStatus.progress > 0 && (
                              <p className="text-[8px] font-bold text-slate-400 mt-2 text-center uppercase tracking-wider">
                                Only {loyaltyStatus.threshold - loyaltyStatus.progress} more stay{loyaltyStatus.threshold - loyaltyStatus.progress > 1 ? 's' : ''} for a free night!
                              </p>
                            )}
                          </div>
                        )}

                        {/* Final Calculation & CTA */}
                        <div className="pt-8 border-t border-slate-50 space-y-6">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Stay Cost</p>
                              {(() => {
                                if (!selectedRoom) return <p className="text-3xl font-bold text-[#1B2B41] tracking-tighter">---</p>;
                                const totalNights = Math.max(1, Math.ceil((new Date(bookingDates.checkOut) - new Date(bookingDates.checkIn)) / (1000 * 60 * 60 * 24)));
                                const originalTotal = selectedRoom.base_price * totalNights * numRooms;
                                const loyaltyDisc = (loyaltyStatus && loyaltyStatus.is_eligible) ? selectedRoom.base_price * numRooms : 0;
                                const finalTotal = originalTotal - loyaltyDisc;
                                return (
                                  <div>
                                    {loyaltyDisc > 0 && (
                                      <p className="text-sm font-bold text-slate-400 line-through mb-1">NRS {originalTotal.toLocaleString()}</p>
                                    )}
                                    <p className={`text-3xl font-bold tracking-tighter ${loyaltyDisc > 0 ? 'text-green-600' : 'text-[#1B2B41]'}`}>
                                      NRS {finalTotal.toLocaleString()}
                                    </p>
                                    {loyaltyDisc > 0 && (
                                      <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                                        Loyalty Discount: -NRS {loyaltyDisc.toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-[#B88E2F] uppercase tracking-widest">Safe Payment</p>
                            </div>
                          </div>

                          <button
                            onClick={() => processBooking('khalti')}
                            disabled={isReserving || !selectedRoom}
                            className={`w-full py-4 text-[12px] font-bold uppercase tracking-[0.2em] transition-all rounded-xl shadow-xl transform active:scale-[0.98] ${!selectedRoom
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                              : 'bg-[#B88E2F] text-white hover:bg-[#a17a26] hover:shadow-[#B88E2F]/20'
                              }`}
                          >
                            {isReserving ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing...</span>
                              </div>
                            ) : (
                              selectedRoom ? 'Secure Payment / Book Now' : 'Select a Room'
                            )}
                          </button>

                          <button
                            onClick={() => processBooking('cash')}
                            disabled={isReserving || !selectedRoom}
                            className={`w-full py-4 text-[12px] font-bold uppercase tracking-[0.2em] transition-all rounded-xl border-2 transform active:scale-[0.98] ${!selectedRoom
                              ? 'border-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-[#1B2B41] text-[#1B2B41] hover:bg-[#1B2B41] hover:text-white'
                              }`}
                          >
                            {isReserving ? 'Processing...' : 'Reserve & Pay at Hotel'}
                          </button>

                          <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">Secure Payment Powered by StayNepal</p>
                        </div>
                      </div>
                    </div>
                  </aside>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Immersive Map Viewer Overlay */}
      {isMapFullScreen && selectedHotel && selectedHotel.latitude && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col fade-in">
          <div className="h-20 px-10 flex items-center justify-between border-b border-[#E2E2E2] bg-[#1B2B41]">
            <div className="flex items-center gap-6">
              <button onClick={() => setIsMapFullScreen(false)} className="w-10 h-10 border border-[#2D4361] flex items-center justify-center text-white hover:bg-white/5 transition-all rounded-xl">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
              <div>
                <h4 className="text-base font-bold text-white uppercase tracking-tight italic">{selectedHotel.title}</h4>
                <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">{selectedHotel.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-10">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest">Location Points</span>
                <span className="text-[10px] font-bold text-[#B88E2F] uppercase">{Number(selectedHotel.latitude).toFixed(6)}, {Number(selectedHotel.longitude).toFixed(6)}</span>
              </div>
              <button onClick={() => setIsMapFullScreen(false)} className="px-8 py-3 bg-white text-[#1B2B41] font-bold text-[10px] uppercase tracking-widest rounded-xl">Close Map</button>
            </div>
          </div>
          <div className="flex-1 relative grayscale-[0.8]">
            <MapContainer center={[selectedHotel.latitude, selectedHotel.longitude]} zoom={16} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
              <Marker position={[selectedHotel.latitude, selectedHotel.longitude]} />
            </MapContainer>
          </div>
        </div>
      )}
      {/* MODAL: Request Hotel Listing */}
      {showRequestHotelModal && (
        <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
          <div className="max-w-2xl w-full bg-white border border-[#E2E2E2] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1B2B41] px-10 py-8 border-b-4 border-[#B88E2F]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white text-lg font-bold uppercase tracking-[0.2em]">List Your Hotel</h3>
                  <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-[0.3em] mt-2">Send your hotel details to our team</p>
                </div>
                <button onClick={() => setShowRequestHotelModal(false)} className="text-[#A0AEC0] hover:text-white transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleRequestHotelSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="group">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Hotel Name</label>
                    <input
                      type="text" required
                      value={requestHotelForm.name}
                      onChange={(e) => setRequestHotelForm({ ...requestHotelForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">City</label>
                      <input
                        type="text" required
                        value={requestHotelForm.city}
                        onChange={(e) => setRequestHotelForm({ ...requestHotelForm, city: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Country</label>
                      <input
                        type="text" required
                        value={requestHotelForm.country}
                        onChange={(e) => setRequestHotelForm({ ...requestHotelForm, country: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Address</label>
                    <input
                      type="text"
                      value={requestHotelForm.address}
                      onChange={(e) => setRequestHotelForm({ ...requestHotelForm, address: e.target.value })}
                      className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Phone</label>
                      <input
                        type="tel"
                        value={requestHotelForm.phone}
                        onChange={(e) => setRequestHotelForm({ ...requestHotelForm, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                      />
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Email</label>
                      <input
                        type="email"
                        value={requestHotelForm.email}
                        onChange={(e) => setRequestHotelForm({ ...requestHotelForm, email: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Description</label>
                    <textarea
                      rows="3"
                      value={requestHotelForm.description}
                      onChange={(e) => setRequestHotelForm({ ...requestHotelForm, description: e.target.value })}
                      className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl resize-none"
                    ></textarea>
                  </div>

                  <div className="group">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Hotel Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] px-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-[#B88E2F] text-white text-[12px] font-bold uppercase tracking-[0.3em] hover:bg-[#9E7A28] transition-all rounded-xl shadow-lg transform active:scale-[0.98]"
                >
                  Send Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default UserDashboard;
