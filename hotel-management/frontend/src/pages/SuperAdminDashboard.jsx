import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ hotels: 0, admins: 0, guests: 0 });
  const [hotels, setHotels] = useState([]);
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    description: ''
  });
  const [adminForm, setAdminForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    hotelId: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Verify superadmin role
    if (parsedUser.role !== 'superadmin') {
      navigate('/guest/dashboard');
      return;
    }

    setUser(parsedUser);
    loadData();
  }, [navigate]);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [hotelsRes, adminsRes, guestsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/superadmin/hotels', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/superadmin/admins', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/superadmin/guests', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setHotels(hotelsRes.data.hotels || []);
      console.log('Hotels loaded:', hotelsRes.data.hotels);
      setStats({
        hotels: hotelsRes.data.hotels?.length || 0,
        admins: adminsRes.data.admins?.length || 0,
        guests: guestsRes.data.guests?.length || 0
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddHotel = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(
        'http://localhost:5000/api/superadmin/hotels',
        hotelForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ text: 'Hotel added successfully!', type: 'success' });
      setShowAddHotelModal(false);
      setHotelForm({ name: '', address: '', city: '', country: '', phone: '', email: '', description: '' });
      loadData();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.message || 'Failed to add hotel', 
        type: 'error' 
      });
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(
        'http://localhost:5000/api/superadmin/admins',
        adminForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ text: 'Admin created successfully!', type: 'success' });
      setShowAddAdminModal(false);
      setAdminForm({ fullName: '', email: '', phone: '', password: '', hotelId: '' });
      loadData();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.message || 'Failed to create admin', 
        type: 'error' 
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      <Navbar user={user} onLogout={handleLogout} searchPlaceholder="Search hotels, admins..." />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Hotels</p>
                <p className="text-3xl font-bold text-gray-900">{stats.hotels}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Admins</p>
                <p className="text-3xl font-bold text-gray-900">{stats.admins}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Guests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.guests}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">System Revenue</p>
                <p className="text-3xl font-bold text-gray-900">$0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Management</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowAddHotelModal(true)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Add New Hotel
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Manage Hotels
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                View Hotel Reports
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Management</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowAddAdminModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add New Admin
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Manage Admins
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Assign Hotel to Admin
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Analytics</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                View Analytics
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                Generate Reports
              </button>
              <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                System Settings
              </button>
            </div>
          </div>
        </div>

        {/* Hotels List */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Hotels Overview</h2>
          {hotels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map(hotel => {
                let hotelImages = [];
                if (hotel.image) {
                  try {
                    hotelImages = JSON.parse(hotel.image);
                  } catch (e) {
                    hotelImages = [hotel.image];
                  }
                }
                console.log('Hotel:', hotel.name, 'Images:', hotelImages);
                return (
                  <div key={hotel.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                    {hotelImages.length > 0 && (
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={hotelImages[0].startsWith('data:') ? hotelImages[0] : (hotelImages[0].startsWith('http') ? hotelImages[0] : `http://localhost:5000${hotelImages[0]}`)} 
                          alt={hotel.name} 
                          className="w-full h-full object-cover" 
                        />
                        {hotelImages.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                            +{hotelImages.length - 1} more
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{hotel.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{hotel.city}, {hotel.country}</p>
                      <p className="text-gray-500 text-sm">{hotel.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-500">No hotels found. Create your first hotel to get started.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Hotel Modal */}
      {showAddHotelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Hotel</h2>
              <form onSubmit={handleAddHotel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name *</label>
                  <input
                    type="text"
                    required
                    value={hotelForm.name}
                    onChange={(e) => setHotelForm({...hotelForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={hotelForm.address}
                    onChange={(e) => setHotelForm({...hotelForm, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={hotelForm.city}
                      onChange={(e) => setHotelForm({...hotelForm, city: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <input
                      type="text"
                      required
                      value={hotelForm.country}
                      onChange={(e) => setHotelForm({...hotelForm, country: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={hotelForm.phone}
                      onChange={(e) => setHotelForm({...hotelForm, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={hotelForm.email}
                      onChange={(e) => setHotelForm({...hotelForm, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows="3"
                    value={hotelForm.description}
                    onChange={(e) => setHotelForm({...hotelForm, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Add Hotel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddHotelModal(false);
                      setHotelForm({ name: '', address: '', city: '', country: '', phone: '', email: '', description: '' });
                    }}
                    className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Admin Account</h2>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({...adminForm, fullName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({...adminForm, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    required
                    minLength="6"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Hotel *</label>
                  <select
                    required
                    value={adminForm.hotelId}
                    onChange={(e) => setAdminForm({...adminForm, hotelId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a hotel</option>
                    {hotels.map(hotel => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name} - {hotel.city}, {hotel.country}
                      </option>
                    ))}
                  </select>
                  {hotels.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please create a hotel first before adding admins</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={hotels.length === 0}
                    className={`flex-1 px-6 py-2 text-white rounded-lg transition ${
                      hotels.length === 0 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Create Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAdminModal(false);
                      setAdminForm({ fullName: '', email: '', phone: '', password: '', hotelId: '' });
                    }}
                    className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
