import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/admin/AdminLayout';
import StatCard from '../components/admin/StatCard';

/**
 * SuperAdminDashboard Component
 * 
 * Purpose: Centralized management console for the StayNepal platform.
 * Allows super-administrators to monitor system-wide statistics and onboard new properties.
 * 
 
 */
const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  // Core State Management
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ hotels: 0, admins: 0, guests: 0 });
  const [hotels, setHotels] = useState([]);
  const [pendingHotels, setPendingHotels] = useState([]);
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);

  // Form State for Property Onboarding
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    description: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  /**
   * Authentication & Authorization Guard
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    // Final role verification for Super Admin access
    if (parsedUser.role !== 'superadmin') {
      navigate('/guest/dashboard');
      return;
    }

    setUser(parsedUser);
    loadSystemData();
  }, [navigate]);

  /**
   * Data Retrieval Logic
   * Fetches consolidated stats for the entire property network
   */
  const loadSystemData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [hotelsRes, adminsRes, guestsRes, pendingRes] = await Promise.all([
        axios.get('http://localhost:5000/api/superadmin/hotels', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/superadmin/admins', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/superadmin/guests', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/superadmin/hotels/pending', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const hotelsList = hotelsRes.data.hotels || [];
      setHotels(hotelsList);

      const pendingList = pendingRes.data.hotels || [];
      setPendingHotels(pendingList);

      setStats({
        hotels: hotelsList.length,
        admins: adminsRes.data.admins?.length || 0,
        guests: guestsRes.data.guests?.length || 0
      });
    } catch (error) {
      console.error('Data acquisition failure:', error);
    }
  };

  /**
   * Property Onboarding Handler
   * Creates a new hotel node and assigns an administrative lead
   */
  const handleAddHotel = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/superadmin/hotels',
        hotelForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const successMsg = response.data.adminPromoted
        ? `TRANSACTION COMPLETE: Property created. User "${hotelForm.adminEmail}" elevated to management.`
        : 'TRANSACTION COMPLETE: Property and administrative account initialized.';

      setMessage({ text: successMsg, type: 'success' });
      setShowAddHotelModal(false);

      // Reset registry form
      setHotelForm({
        name: '', address: '', city: '', country: '',
        phone: '', email: '', description: '',
        adminName: '', adminEmail: '', adminPassword: ''
      });

      loadSystemData();
      setTimeout(() => setMessage({ text: '', type: '' }), 8000);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Transaction aborted: Failed to add property.',
        type: 'error'
      });
    }
  };

  const handleVerifyHotel = async (hotelId) => {
    if (!window.confirm('Are you sure you want to verify this hotel? The owner will be promoted to Admin.')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(
        `http://localhost:5000/api/superadmin/hotels/${hotelId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ text: 'VERIFICATION SUCCESSFUL: Asset and Manager Protocol Activated', type: 'success' });
      loadSystemData();
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Verification failed.',
        type: 'error'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const location = useLocation();
  const currentPath = location.pathname;

  const getPageContext = () => {
    if (currentPath.includes('registry')) return { title: "PROPERTY REGISTRY", subtitle: "ASSET INVENTORY" };
    if (currentPath.includes('audits')) return { title: "SYSTEM AUDITS", subtitle: "SECURITY & LOGS" };
    if (currentPath.includes('settings')) return { title: "GLOBAL CONFIGURATIONS", subtitle: "SYSTEM PARAMETERS" };
    return { title: "SYSTEM ADMINISTRATION", subtitle: "NETWORK STATUS: ACTIVE" };
  };

  const { title: pageTitle, subtitle: pageSubtitle } = getPageContext();

  if (!user) return null;

  return (
    <AdminLayout
      user={user}
      onLogout={handleLogout}
      title={pageTitle}
      subtitle={pageSubtitle}
    >
      <div className="space-y-10 pb-12">
        {/* Dashboard Metrics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="PROPERTY REGISTRY"
            value={stats.hotels}
            icon="domain"
            trend="+2 New"
          />
          <StatCard
            label="INTERNAL ASSETS"
            value={stats.admins}
            icon="badge"
          />
          <StatCard
            label="CLIENT BASE"
            value={stats.guests}
            icon="group"
          />
          <StatCard
            label="AGGREGATE VALUE"
            value="NRS 0"
            icon="payments"
            trend="Live"
            isMajor={true}
          />
        </div>

        {/* Status Notifications */}
        {message.text && (
          <div className={`mb-8 p-4 border rounded-sm text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-[#E7F3ED] border-[#108548] text-[#108548]' : 'bg-[#FEEDEC] border-[#B91C1C] text-[#B91C1C]'
            }`}>
            {message.text}
          </div>
        )}

        {/* Administrative Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 admin-card p-10">
            {pendingHotels.length > 0 && (
              <div className="mb-10 border-b border-[#F1F1F1] pb-10">
                <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight mb-6">Pending Validations</h2>
                <div className="grid grid-cols-1 gap-4">
                  {pendingHotels.map(hotel => (
                    <div key={hotel.id} className="bg-[#FFFDF5] border border-[#B88E2F] p-6 rounded-sm flex justify-between items-center shadow-sm">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-bold text-[#1B2B41] uppercase">{hotel.name}</h3>
                          <span className="text-[9px] bg-[#B88E2F] text-white px-2 py-0.5 rounded-sm uppercase tracking-widest">Action Required</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">{hotel.city}, {hotel.country}</p>
                        <div className="text-[10px] text-[#1B2B41]">
                          <span className="font-bold text-[#A0AEC0]">OWNER:</span> {hotel.owner_name || 'N/A'} <span className="text-[#E2E2E2] mx-2">|</span>
                          <span className="font-bold text-[#A0AEC0]">EMAIL:</span> {hotel.owner_email || 'N/A'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleVerifyHotel(hotel.id)}
                        className="admin-button admin-button-primary !bg-[#108548] !text-[9px] px-6 py-3 tracking-[0.2em]"
                      >
                        Authorize Asset
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-end mb-8 border-b border-[#F1F1F1] pb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight">Property Network</h2>
                <p className="text-[11px] text-[#64748B] font-medium mt-1 uppercase tracking-widest">Global Overview of Registered Hotels</p>
              </div>
              <button
                onClick={() => setShowAddHotelModal(true)}
                className="admin-button admin-button-primary text-[10px] px-6 py-3 tracking-[0.2em]"
              >
                Register New Asset
              </button>
            </div>

            {hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hotels.map(hotel => {
                  let hotelImages = [];
                  if (hotel.image) {
                    try { hotelImages = JSON.parse(hotel.image); }
                    catch (e) { hotelImages = [hotel.image]; }
                  }
                  return (
                    <div key={hotel.id} className="admin-card overflow-hidden hover:border-[#B88E2F] transition-colors group">
                      {hotelImages.length > 0 && (
                        <div className="relative h-40 overflow-hidden bg-slate-100">
                          <img
                            src={hotelImages[0].startsWith('data:') ? hotelImages[0] : (hotelImages[0].startsWith('http') ? hotelImages[0] : `http://localhost:5000${hotelImages[0]}`)}
                            alt={hotel.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-5 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-bold text-[#1B2B41] uppercase">{hotel.name}</h3>
                          <span className="text-[10px] font-bold text-[#64748B]">ID: {hotel.id}</span>
                        </div>
                        <p className="text-[11px] text-[#B88E2F] font-bold mb-3 uppercase tracking-wider">{hotel.city}, {hotel.country}</p>
                        <p className="text-[10px] text-[#64748B] line-clamp-2 h-8 leading-relaxed italic">{hotel.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-[#E2E2E2]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.2em]">Network Topology Empty: No Properties Found</p>
              </div>
            )}
          </div>

          <div className="space-y-8 min-w-[320px]">
            {/* System Analytics Card */}
            <div className="admin-card p-10">
              <h3 className="admin-label mb-8 border-b border-[#F1F1F1] pb-6">Analytics Engine</h3>
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/superadmin/audits')}
                  className="w-full text-left px-6 py-5 border border-[#E2E2E2] bg-[#F9FAFB] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
                >
                  System Audits
                  <span className="material-symbols-outlined text-[18px] text-[#A0AEC0] group-hover:text-[#1B2B41]">monitoring</span>
                </button>
                <button
                  onClick={() => navigate('/superadmin/audits')}
                  className="w-full text-left px-6 py-5 border border-[#E2E2E2] bg-[#F9FAFB] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
                >
                  Transaction Logs
                  <span className="material-symbols-outlined text-[18px] text-[#A0AEC0] group-hover:text-[#1B2B41]">history_edu</span>
                </button>
                <button className="w-full text-left px-6 py-5 bg-[#BC8E2E] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#A67C28] transition-colors rounded-sm mt-8 flex justify-between items-center shadow-md">
                  Generate Master Report
                  <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                </button>
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="admin-card p-8">
              <h3 className="admin-label mb-6 border-b border-[#F1F1F1] pb-4">Operational Status</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#108548] mt-1.5"></div>
                  <div>
                    <p className="text-[10px] font-bold text-[#1B2B41]">DATABASE_ONLINE</p>
                    <p className="text-[9px] text-[#A0AEC0] uppercase mt-0.5">Connectivity Verified</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#108548] mt-1.5"></div>
                  <div>
                    <p className="text-[10px] font-bold text-[#1B2B41]">AUTHENTICATION_SYNC</p>
                    <p className="text-[9px] text-[#A0AEC0] uppercase mt-0.5">RSA Protocol Active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Property Registry Definition */}
        {showAddHotelModal && (
          <div className="fixed inset-0 bg-[#111B2B]/90 flex items-center justify-center z-[100] p-6 fade-in">
            <div className="bg-white max-w-2xl w-full shadow-2xl border border-[#E2E2E2] overflow-hidden max-h-[95vh] flex flex-col rounded-sm">
              <div className="bg-[#1B2B41] px-8 py-6 flex items-center justify-between text-white shrink-0">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-widest leading-none">Initialize Asset</h2>
                  <p className="text-[10px] text-[#A0AEC0] mt-1 font-bold uppercase tracking-widest">New Property Registration Terminal</p>
                </div>
                <button onClick={() => setShowAddHotelModal(false)} className="hover:text-[#B88E2F] transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="overflow-y-auto p-10">
                <form onSubmit={handleAddHotel} className="space-y-8">
                  <div className="space-y-6">
                    <div className="form-group">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Corporate Identity (Hotel Name) *</label>
                      <input
                        type="text"
                        required
                        value={hotelForm.name}
                        onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                        className="admin-input bg-[#F9FAFB] focus:bg-white px-4 py-3 font-bold"
                      />
                    </div>

                    <div className="form-group">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Technical Description</label>
                      <textarea
                        rows="2"
                        value={hotelForm.description}
                        onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })}
                        className="w-full px-4 py-3 border border-[#E2E2E2] text-sm font-medium text-[#2D3748] focus:ring-1 focus:ring-[#1B2B41] outline-none rounded-sm bg-[#F9FAFB] focus:bg-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Geographic Node (City) *</label>
                        <input
                          type="text" required
                          value={hotelForm.city}
                          onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
                          className="w-full px-4 py-3 border border-[#E2E2E2] text-sm font-bold text-[#1B2B41] outline-none rounded-sm bg-[#F9FAFB]"
                        />
                      </div>
                      <div className="form-group">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Regional Domain (Country) *</label>
                        <input
                          type="text" required
                          value={hotelForm.country}
                          onChange={(e) => setHotelForm({ ...hotelForm, country: e.target.value })}
                          className="w-full px-4 py-3 border border-[#E2E2E2] text-sm font-bold text-[#1B2B41] outline-none rounded-sm bg-[#F9FAFB]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#F1F1F1]">
                    <h3 className="text-xs font-bold text-[#1B2B41] uppercase tracking-[0.2em] mb-6">Administrative lead Assignment</h3>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="form-group">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Legal Name *</label>
                          <input
                            type="text" required
                            value={hotelForm.adminName}
                            onChange={(e) => setHotelForm({ ...hotelForm, adminName: e.target.value })}
                            className="w-full px-4 py-3 border border-[#E2E2E2] text-sm font-bold text-[#1B2B41] outline-none rounded-sm"
                          />
                        </div>
                        <div className="form-group">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Access Email *</label>
                          <input
                            type="email" required
                            value={hotelForm.adminEmail}
                            onChange={(e) => setHotelForm({ ...hotelForm, adminEmail: e.target.value })}
                            className="w-full px-4 py-3 border border-[#E2E2E2] text-sm font-bold text-[#1B2B41] outline-none rounded-sm"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block mb-2">Temporary security Key *</label>
                        <input
                          type="password" required minLength="6"
                          value={hotelForm.adminPassword}
                          onChange={(e) => setHotelForm({ ...hotelForm, adminPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-[#E2E2E2] text-sm font-bold text-[#1B2B41] outline-none rounded-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-[#F1F1F1]">
                    <button
                      type="submit"
                      className="flex-1 admin-button admin-button-primary py-4 text-[11px] tracking-[0.3em]"
                    >
                      Finalize Registration
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddHotelModal(false)}
                      className="admin-button admin-button-secondary px-8 py-4 text-[11px] tracking-[0.3em]"
                    >
                      Abort
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SuperAdminDashboard;
