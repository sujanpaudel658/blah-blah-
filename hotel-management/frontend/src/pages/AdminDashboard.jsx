import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

import AdminLayout from '../components/admin/AdminLayout';
import StatCard from '../components/admin/StatCard';
import BookingTable from '../components/admin/BookingTable';
import HotelProfile from '../components/admin/HotelProfile';
import MapSection from '../components/admin/MapSection';
import QRScanner from '../components/admin/QRScanner';

import { parseHotelImages, getImageUrl, compressImage } from '../utils/helpers';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
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
    onlineRevenue: '0',
    totalCommission: '0',
    cashCollected: '0'
  });

  const [showFinanceModal, setShowFinanceModal] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [scannedBooking, setScannedBooking] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showDirections, setShowDirections] = useState(false);

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
        const res = await axios.get(`${API_URL}/auth/me`, {
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

  const onPlaceResolved = useCallback((place) => {
    if (!place) return;
    setCity(place.city || '');
    setHotel((prev) =>
      prev
        ? {
            ...prev,
            city: place.city !== undefined && place.city !== '' ? place.city : prev.city,
            country: place.country !== undefined && place.country !== '' ? place.country : prev.country,
            address: place.address !== undefined && place.address !== '' ? place.address : prev.address,
          }
        : null
    );
  }, []);

  const fetchHotelData = async (hotelId) => {
    try {
      const res = await axios.get(`${API_URL}/hotels/${hotelId}`);
      const h = res.data.hotel;
      setHotel(h);
      setDescription(h.description || '');
      setLatitude(parseFloat(h.latitude) || null);
      setLongitude(parseFloat(h.longitude) || null);
      setCity(h.city || '');

      const parsedImages = parseHotelImages(h.image);
      setImagePreviews(parsedImages.map(img => getImageUrl(img)));

      fetchAnalytics(hotelId);
    } catch (err) {
      console.error('Fetch hotel error:', err);
    }
  };

  const fetchAnalytics = async (hotelId) => {
    try {
      const token = localStorage.getItem('token');
      const [bookingsRes, roomsRes] = await Promise.all([
        axios.get(`${API_URL}/payments/hotel/${hotelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/rooms?hotelId=${hotelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (bookingsRes.data.success) {
        const bookings = bookingsRes.data.bookings || [];
        setHotelBookings(bookings);

        const onlinePaid = bookings.filter(b => b?.payment_status === 'paid');
        const cashBookings = bookings.filter(b => b?.payment_status !== 'paid' && b?.status !== 'cancelled' && b?.status !== 'pending');

        const onlineRevenueTotal = onlinePaid.reduce((sum, b) => sum + Number(b?.total_amount || 0), 0);
        const cashRevenueTotal = cashBookings.reduce((sum, b) => sum + Number(b?.total_amount || 0), 0);
        const commissionTotal = bookings.reduce((sum, b) => sum + Number(b?.commission_amount || 0), 0);

        const roomList = roomsRes.data.rooms || [];
        const totalRooms = roomList.length;

        const activeBookings = bookings.filter(b => b?.status === 'confirmed' || b?.status === 'checked_in').length;

        let occupancyPercent = '0%';
        if (totalRooms > 0) {
          occupancyPercent = ((activeBookings / totalRooms) * 100).toFixed(0) + '%';
        }

        setDashboardStats({
          totalRooms: `${totalRooms}`,
          liveBookings: `${activeBookings}`,
          occupancyRate: occupancyPercent,
          onlineRevenue: `${onlineRevenueTotal.toLocaleString()}`,
          totalCommission: `${commissionTotal.toLocaleString()}`,
          cashCollected: `${cashRevenueTotal.toLocaleString()}`
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
        country: hotel?.country,
        address: hotel?.address,
        image: JSON.stringify(imagePreviews)
      };

      const res = await axios.put(`${API_URL}/hotels/${hotel.id}`, payload, {
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
      const res = await axios.post(`${API_URL}/payments/${endpoint}`, { bookingId, ...data }, {
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
      const res = await axios.post(`${API_URL}/payments/scan-checkin`, 
        { qrToken: decodedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setScannedBooking({
          guest_name: res.data.guest.name,
          booking_reference: res.data.booking.reference,
          room_number: res.data.room.number,
          check_in_date: new Date().toISOString(), // display: “today” after scan
          payment_status: 'PAID'
        });
        showNotification(res.data.message);
        fetchAnalytics(hotel.id);
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

  const handleRequestPayout = async () => {
    const amount = window.prompt(`Enter payout amount (Available: Rs. ${Number(hotel?.balance || 0).toLocaleString()}):`, hotel?.balance);
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/payout/request`, 
        { amount: Number(amount) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        showNotification(res.data.message);
        fetchHotelData(hotel.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payout request failed.');
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
        {successMessage && (
          <div className="bg-[#E7F3ED] border border-[#108548] p-4 flex items-center gap-3 text-[#108548] font-bold text-xs uppercase tracking-widest mb-6 fade-in">
            <span className="material-symbols-outlined text-sm">verified</span>
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-2 relative group cursor-pointer" onClick={handleRequestPayout}>
            <StatCard
              label="PAYOUT BALANCE"
              value={`Rs. ${Number(hotel?.balance || 0).toLocaleString()}`}
              icon="account_balance"
              trend={Number(hotel?.balance) < 0 ? "Owed to Platform" : "Click to Request Payout"}
              isMajor={true}
            />
            {Number(hotel?.balance) > 0 && (
              <div className="absolute top-4 right-4 bg-[#C4993E] text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                Request Payout
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <StatCard
              label="ONLINE REVENUE"
              value={`Rs. ${dashboardStats.onlineRevenue}`}
              icon="language"
              trend="Held by Platform"
            />
          </div>
          <div className="lg:col-span-1 cursor-pointer" onClick={() => setShowFinanceModal(true)}>
            <StatCard 
              label="TOTAL FEE (10%)" 
              value={`Rs. ${dashboardStats.totalCommission}`} 
              icon="toll" 
              trend="View Audit Trail" 
            />
          </div>
          <div className="lg:col-span-1">
            <StatCard label="CASH AT HOTEL" value={`Rs. ${dashboardStats.cashCollected}`} icon="payments" trend="Collected Directly" />
          </div>
          <div className="lg:col-span-1">
            <StatCard label="OCCUPANCY" value={dashboardStats.occupancyRate} icon="percent" />
          </div>
        </div>

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
              onPlaceResolved={onPlaceResolved}
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

      {showFinanceModal && (
        <div className="fixed inset-0 bg-[#0A111F]/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 fade-in">
          <div className="bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-xl flex flex-col shadow-2xl">
            <div className="bg-[#1A2332] px-8 py-6 flex items-center justify-between text-white shrink-0">
              <div>
                <h2 className="text-lg font-bold uppercase tracking-[0.15em]">Commission & Settlements Audit</h2>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.2em] mt-1">Detailed breakdown of platform fees and balances</p>
              </div>
              <button onClick={() => setShowFinanceModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-1 p-6 bg-[#F9FAFB] border-b border-[#E2E8F0]">
                  <div className="bg-white p-4 text-center border">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase">System Balance</p>
                    <p className={`text-xl font-black ${Number(hotel?.balance) < 0 ? 'text-[#B91C1C]' : 'text-[#108548]'}`}>
                      Rs. {Number(hotel?.balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white p-4 text-center border">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase">Online (Held)</p>
                    <p className="text-xl font-black text-[#1A2332]">Rs. {dashboardStats.onlineRevenue}</p>
                  </div>
                  <div className="bg-white p-4 text-center border">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase">Cash Collected</p>
                    <p className="text-xl font-black text-[#B88E2F]">Rs. {dashboardStats.cashCollected}</p>
                  </div>
                  <div className="bg-white p-4 text-center border">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase">Total Commission</p>
                    <p className="text-xl font-black text-[#607AFB]">Rs. {dashboardStats.totalCommission}</p>
                  </div>
               </div>

               <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white shadow-sm">
                   <tr className="border-b divide-x">
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Reference</th>
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Guest</th>
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Method</th>
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Gross Amount</th>
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Commission</th>
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Net Earned</th>
                     <th className="p-4 text-[10px] font-black text-[#1B2B41] uppercase tracking-widest">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y text-[13px]">
                   {hotelBookings.map((b) => (
                     <tr key={b.id} className="hover:bg-[#F8FAFC] divide-x">
                       <td className="p-4 font-mono text-[11px] text-[#64748B]">{b.booking_reference}</td>
                       <td className="p-4">
                         <p className="font-bold text-[#1B2B41]">{b.guest_user_name || b.guest_name}</p>
                         <p className="text-[10px] text-[#A0AEC0]">{new Date(b.check_in_date).toLocaleDateString()}</p>
                       </td>
                       <td className="p-4 uppercase text-[10px] font-bold text-[#64748B]">{b.payment_method || 'N/A'}</td>
                       <td className="p-4 font-bold">Rs. {Number(b.total_amount).toLocaleString()}</td>
                       <td className="p-4 font-bold text-[#607AFB]">Rs. {Number(b.commission_amount || 0).toLocaleString()}</td>
                       <td className="p-4 font-bold text-[#108548]">
                         Rs. {(Number(b.total_amount) - Number(b.commission_amount || 0)).toLocaleString()}
                       </td>
                       <td className="p-4">
                         {b.balance_synced ? (
                           <span className="text-[9px] font-black uppercase text-[#108548] flex items-center gap-1">
                             <span className="material-symbols-outlined text-[12px]">check_circle</span>
                             Accounted
                           </span>
                         ) : (
                           <span className="text-[9px] font-black uppercase text-[#64748B]">Pending Check-in</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
