import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Components
import AdminLayout from '../components/admin/AdminLayout';
import StatCard from '../components/admin/StatCard';
import BookingTable from '../components/admin/BookingTable';
import HotelProfile from '../components/admin/HotelProfile';
import MapSection from '../components/admin/MapSection';
import QRScanner from '../components/admin/QRScanner';

// Utils
import { parseHotelImages, getImageUrl, compressImage } from '../utils/helpers';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(27.7172);
  const [longitude, setLongitude] = useState(85.3240);
  const [city, setCity] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hotelBookings, setHotelBookings] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: '0',
    liveBookings: '0',
    occupancyRate: '0%',
    estRevenue: '0',
    platformFee: '0'
  });

  // UI State
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBooking, setScannedBooking] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);

  // Initial Auth & Data Fetch
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token || !storedUser) {
        navigate('/login');
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== 'admin' && parsedUser.role !== 'superadmin') {
        navigate('/guest/dashboard');
        return;
      }

      try {
        const res = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const freshUser = res.data.user;
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));

        if (freshUser.hotel_id) {
          fetchHotelData(freshUser.hotel_id);
        }
      } catch (err) {
        console.error('Auth refresh failed:', err);
        setUser(parsedUser);
        if (parsedUser.hotel_id) fetchHotelData(parsedUser.hotel_id);
      }
    };

    init();
  }, [navigate]);

  const fetchHotelData = async (hotelId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/hotels/${hotelId}`);
      const h = res.data.hotel;
      setHotel(h);
      setDescription(h.description || '');
      setLatitude(parseFloat(h.latitude) || 27.7172);
      setLongitude(parseFloat(h.longitude) || 85.3240);
      setCity(h.city || '');

      const parsedImages = parseHotelImages(h.image);
      setImagePreviews(parsedImages.map(img => getImageUrl(img)));

      fetchAnalytics(hotelId);
    } catch (err) {
      console.error('Fetch hotel error:', err);
    }
  };

  /* 
     HOTEL STATISTICS
     ----------------
     Shows how your hotel is performing.
  */
  const fetchAnalytics = async (hotelId) => {
    try {
      const token = localStorage.getItem('token');
      const [bookingsRes, roomsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/payments/hotel/${hotelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:5000/api/rooms?hotelId=${hotelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (bookingsRes.data.success) {
        // Safety patch: ensure bookings is always an array to prevent .filter() errors
        const bookings = bookingsRes.data.bookings || [];
        setHotelBookings(bookings);

        // 1. Revenue Calculation: Only count completed payments
        const paidBookings = bookings.filter(b => b?.payment_status === 'paid');
        const revenueTotal = paidBookings.reduce((sum, b) => sum + Number(b?.total_amount || 0), 0);
        const commissionTotal = paidBookings.reduce((sum, b) => sum + Number(b?.commission_amount || 0), 0);

        // 2. Room & Booking Stats
        const roomList = roomsRes.data.rooms || [];
        const totalRooms = roomList.length;

        // Note: 'confirmed' status means the guest has a valid booking
        const activeBookings = bookings.filter(b => b?.status === 'confirmed').length;

        // Calculate percentage (guard against division by zero)
        let occupancyPercent = '0%';
        if (totalRooms > 0) {
          occupancyPercent = ((activeBookings / totalRooms) * 100).toFixed(0) + '%';
        }

        setDashboardStats({
          totalRooms: `${totalRooms}`,
          liveBookings: `${activeBookings}`,
          occupancyRate: occupancyPercent,
          estRevenue: `${(revenueTotal - commissionTotal).toLocaleString()}`,
          platformFee: `${commissionTotal.toLocaleString()}`
        });
      }
    } catch (err) {
      console.error('Analytics fetch fail - potential network or auth sync issue:', err);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      let finalImages = parseHotelImages(hotel.image);

      if (images.length > 0) {
        const compressed = await Promise.all(
          images.map(img => compressImage(img, 1024, 0.7))
        );
        finalImages = [...finalImages, ...compressed];
      }

      const payload = {
        ...hotel,
        description,
        latitude,
        longitude,
        city,
        image: JSON.stringify(imagePreviews)
      };

      const res = await axios.put(`http://localhost:5000/api/hotels/${hotel.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setHotel(res.data.hotel);
      setImages([]);
      setImagePreviews(parseHotelImages(res.data.hotel.image).map(img => getImageUrl(img)));
      setIsEditing(false);
      showNotification('Profile updated successfully');
    } catch (err) {
      console.error('Save error:', err);
      alert('Action failed. Please try again.');
    }
  };

  const updateBookingStatus = async (bookingId, endpoint, data = {}) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/payments/${endpoint}`, { bookingId, ...data }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        showNotification('Update successful');
        fetchAnalytics(hotel.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Transaction error');
    }
  };

  const handleScanSuccess = async (decodedText) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/payments/scan-checkin`, 
        { qrToken: decodedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setScannedBooking({
          guest_name: res.data.guest.name,
          booking_reference: res.data.booking.reference,
          room_number: res.data.room.number,
          check_in_date: new Date().toISOString(), // Shows today as check-in mapping for display
          payment_status: 'PAID'
        });
        showNotification(res.data.message);
        fetchAnalytics(hotel.id); // Refresh dashboard to show new occupancy
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Could not validate QR code.';
      alert(`Scan Failed: ${errorMessage}`);
      setShowScanner(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setShowDirections(true);
        },
        () => alert('Could not find your location')
      );
    }
  };

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <AdminLayout
      user={user}
      hotel={hotel}
      onLogout={handleLogout}
      title="HOTEL DASHBOARD"
      subtitle="SYSTEM ONLINE"
    >
      <div className="space-y-8 pb-12">
        {/* Success feedback message */}
        {successMessage && (
          <div className="bg-[#E7F3ED] border border-[#108548] p-4 flex items-center gap-3 text-[#108548] font-bold text-xs uppercase tracking-widest mb-6 fade-in">
            <span className="material-symbols-outlined text-sm">verified</span>
            {successMessage}
          </div>
        )}

        {/* 1. STATISTICS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-2">
            <StatCard
              label="SYSTEM BALANCE"
              value={`Rs. ${Number(hotel?.balance || 0).toLocaleString()}`}
              icon="account_balance"
              trend={Number(hotel?.balance) < 0 ? "Owed to Platform" : "Available to Withdraw"}
              isMajor={true}
            />
          </div>
          <div className="lg:col-span-1">
            <StatCard
              label="NET EARNINGS"
              value={`Rs. ${dashboardStats.estRevenue}`}
              icon="payments"
              trend="Total Collected"
            />
          </div>
          <div className="lg:col-span-1">
            <StatCard label="TOTAL ROOMS" value={dashboardStats.totalRooms} icon="inventory" />
          </div>
          <div className="lg:col-span-1">
            <StatCard label="ACTIVE BOOKINGS" value={dashboardStats.liveBookings} icon="confirmation_number" trend="Live" />
          </div>
          <div className="lg:col-span-1">
            <StatCard label="OCCUPANCY RATE" value={dashboardStats.occupancyRate} icon="percent" />
          </div>
        </div>

        {/* 2. BOOKING LIST */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1B2B41] uppercase tracking-[0.2em]">Booking List</h2>
          </div>
          <BookingTable
            bookings={hotelBookings}
            onScan={() => setShowScanner(true)}
            onConfirm={(id) => updateBookingStatus(id, 'confirm-manual')}
            onReject={(id) => updateBookingStatus(id, 'cancel')}
            onCheckIn={(id) => updateBookingStatus(id, 'check-in')}
            onCheckOut={(id) => updateBookingStatus(id, 'check-out')}
            onRefund={(id) => updateBookingStatus(id, 'refund')}
          />
        </div>

        {/* 3. HOTEL MANAGEMENT */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#1B2B41] uppercase tracking-[0.2em]">Hotel Profile</h2>
            <HotelProfile
              hotel={hotel}
              description={description}
              setDescription={setDescription}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              imagePreviews={imagePreviews}
              onImageChange={handleImageChange}
              onRemoveImage={handleRemoveImage}
              onSave={handleSaveProfile}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#1B2B41] uppercase tracking-[0.2em]">Hotel Location</h2>
            <MapSection
              latitude={latitude}
              setLatitude={setLatitude}
              longitude={longitude}
              setLongitude={setLongitude}
              city={city}
              setCity={setCity}
              isEditing={isEditing}
              userLocation={userLocation}
              getUserLocation={getUserLocation}
              showDirections={showDirections}
            />
          </div>
        </div>
      </div>

      <QRScanner
        isOpen={showScanner}
        onClose={() => { setShowScanner(false); setScannedBooking(null); }}
        onScanSuccess={handleScanSuccess}
        scannedBooking={scannedBooking}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
