import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/admin/AdminLayout';
import StatCard from '../components/admin/StatCard';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  // Core State
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ hotels: 0, admins: 0, guests: 0 });
  const [hotels, setHotels] = useState([]);
  const [pendingHotels, setPendingHotels] = useState([]);
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  // Analytics Modal State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  // Transaction Logs Modal State
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionsData, setTransactionsData] = useState(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txFilterStatus, setTxFilterStatus] = useState('all');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');

  // Report Generation State
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Form State
  const [hotelForm, setHotelForm] = useState({
    name: '', address: '', city: '', district: '', country: '', phone: '', email: '',
    latitude: '', longitude: '',
    description: '', adminName: '', adminEmail: '', adminPassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // ─── Auth Guard ───
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'superadmin') { navigate('/guest/dashboard'); return; }
    setUser(parsedUser);
    loadSystemData();
  }, [navigate]);

  // ─── Data Loading ───
  const loadSystemData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [hotelsRes, adminsRes, guestsRes, pendingRes] = await Promise.all([
        axios.get('http://localhost:5000/api/superadmin/hotels', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/superadmin/admins', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/superadmin/guests', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/superadmin/hotels/pending', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const hotelsList = hotelsRes.data.hotels || [];
      setHotels(hotelsList);
      setPendingHotels(pendingRes.data.hotels || []);
      setStats({
        hotels: hotelsList.length,
        admins: adminsRes.data.admins?.length || 0,
        guests: guestsRes.data.guests?.length || 0
      });

      // Fetch total revenue for the stat card
      try {
        const analyticsRes = await axios.get('http://localhost:5000/api/superadmin/analytics', { headers: { Authorization: `Bearer ${token}` } });
        if (analyticsRes.data.success) {
          setTotalRevenue(Number(analyticsRes.data.analytics.overview.total_revenue) || 0);
          setTotalCommission(Number(analyticsRes.data.analytics.overview.total_commission) || 0);
        }
      } catch (e) { /* analytics fetch is optional for the stat card */ }
    } catch (error) {
      console.error('Data load error:', error);
    }
  };

  // ─── System Audits (Analytics) ───
  const fetchAnalytics = async (start, end) => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (start && end) { params.startDate = start; params.endDate = end; }
      const res = await axios.get('http://localhost:5000/api/superadmin/analytics', { headers: { Authorization: `Bearer ${token}` }, params });
      if (res.data.success) setAnalyticsData(res.data.analytics);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const updateLocationFromCoords = async (lat, lon) => {
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) return;
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const addr = res.data.address;
      if (addr) {
        setHotelForm(prev => ({
          ...prev,
          city: addr.city || addr.town || addr.village || addr.suburb || prev.city,
          district: addr.county || addr.state_district || addr.district || prev.district,
          country: addr.country || prev.country
        }));
      }
    } catch (err) { /* silent fail for geocoding */ }
  };

  const onCoordChange = (field, val) => {
    setHotelForm(prev => {
      const next = { ...prev, [field]: val };
      if (next.latitude && next.longitude) {
        updateLocationFromCoords(next.latitude, next.longitude);
      }
      return next;
    });
  };

  const openAnalyticsModal = async () => {
    setShowAnalyticsModal(true);
    setAnalyticsStartDate('');
    setAnalyticsEndDate('');
    fetchAnalytics('', '');
  };

  // ─── Transaction Logs ───
  const fetchTransactions = async (start, end) => {
    setTransactionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (start && end) { params.startDate = start; params.endDate = end; }
      const res = await axios.get('http://localhost:5000/api/superadmin/transactions', { headers: { Authorization: `Bearer ${token}` }, params });
      if (res.data.success) setTransactionsData(res.data);
    } catch (err) {
      console.error('Transactions fetch error:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const openTransactionsModal = async () => {
    setShowTransactionsModal(true);
    setTxStartDate('');
    setTxEndDate('');
    fetchTransactions('', '');
  };

  // ─── Generate Master Report (PDF) ───
  const generateMasterReport = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (reportStartDate && reportEndDate) { params.startDate = reportStartDate; params.endDate = reportEndDate; }
      const res = await axios.get('http://localhost:5000/api/superadmin/report', { headers: { Authorization: `Bearer ${token}` }, params });
      if (res.data.success) {
        const { report } = res.data;
        const reportDate = new Date(report.generatedAt).toLocaleString();
        const dateRangeText = report.dateRange ? `Period: ${report.dateRange.startDate} to ${report.dateRange.endDate}` : 'All Time Data';

        // Build printable HTML report
        const reportHTML = `
          <!DOCTYPE html>
          <html><head><title>StayNepal Master Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; color: #1A2332; padding: 40px; background: #fff; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #C4993E; }
            .header h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
            .header p { font-size: 12px; color: #64748B; margin-top: 8px; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #C4993E; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; text-align: center; border-radius: 8px; }
            .stat-box .value { font-size: 28px; font-weight: 800; color: #1A2332; }
            .stat-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background: #1A2332; color: white; text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; }
            tr:nth-child(even) { background: #F8FAFC; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8; }
            @media print { body { padding: 20px; } .stats-grid { grid-template-columns: repeat(4, 1fr); } }
          </style></head><body>
            <div class="header">
              <h1>StayNepal — Master Report</h1>
              <p>System Report • Generated: ${reportDate}</p>
            </div>

            <div class="stats-grid">
              <div class="stat-box"><div class="value">${report.hotels.length}</div><div class="label">Total Hotels</div></div>
              <div class="stat-box"><div class="value">${report.admins.length}</div><div class="label">Hotel Managers</div></div>
              <div class="stat-box"><div class="value">${report.guestCount}</div><div class="label">Registered Guests</div></div>
              <div class="stat-box"><div class="value">NRS ${Number(report.bookingStats.total_revenue || 0).toLocaleString()}</div><div class="label">Total Revenue</div></div>
            </div>

            <div class="stats-grid">
              <div class="stat-box"><div class="value">${report.bookingStats.total_bookings || 0}</div><div class="label">Total Bookings</div></div>
              <div class="stat-box"><div class="value">${report.bookingStats.confirmed || 0}</div><div class="label">Confirmed</div></div>
              <div class="stat-box"><div class="value">${report.bookingStats.completed || 0}</div><div class="label">Completed</div></div>
              <div class="stat-box"><div class="value">${report.bookingStats.cancelled || 0}</div><div class="label">Cancelled</div></div>
            </div>

            <div class="section">
              <h2>Hotel Performance</h2>
              <table>
                <thead><tr><th>Hotel Name</th><th>City</th><th>Bookings</th><th>Revenue (NRS)</th></tr></thead>
                <tbody>
                  ${report.hotelPerformance.map(h => `<tr><td>${h.name}</td><td>${h.city}</td><td>${h.bookings || 0}</td><td>${Number(h.revenue || 0).toLocaleString()}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Registered Hotels</h2>
              <table>
                <thead><tr><th>Hotel Name</th><th>City</th><th>Country</th><th>Registered On</th></tr></thead>
                <tbody>
                  ${report.hotels.map(h => `<tr><td>${h.name}</td><td>${h.city}</td><td>${h.country}</td><td>${new Date(h.created_at).toLocaleDateString()}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Hotel Managers</h2>
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Assigned Hotel</th></tr></thead>
                <tbody>
                  ${report.admins.map(a => `<tr><td>${a.full_name}</td><td>${a.email}</td><td>${a.hotel_name || '—'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} StayNepal Platform • Confidential System Report</p>
            </div>
          </body></html>
        `;

        // Open in new window and trigger print
        const win = window.open('', '_blank');
        win.document.write(reportHTML);
        win.document.close();
        setTimeout(() => win.print(), 600);

        setMessage({ text: 'Master report generated successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setMessage({ text: 'Failed to generate report. Please try again.', type: 'error' });
    } finally {
      setReportLoading(false);
    }
  };

  // ─── Hotel Management ───
  const handleAddHotel = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post('http://localhost:5000/api/superadmin/hotels', hotelForm, { headers: { Authorization: `Bearer ${token}` } });
      const successMsg = response.data.adminPromoted
        ? `SUCCESS: Hotel created. User "${hotelForm.adminEmail}" assigned as manager.`
        : 'SUCCESS: Hotel and administrative account created.';
      setMessage({ text: successMsg, type: 'success' });
      setShowAddHotelModal(false);
      setHotelForm({ name: '', address: '', city: '', district: '', country: '', phone: '', email: '', latitude: '', longitude: '', description: '', adminName: '', adminEmail: '', adminPassword: '' });
      loadSystemData();
      setTimeout(() => setMessage({ text: '', type: '' }), 8000);
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Failed to add hotel.', type: 'error' });
    }
  };

  const handleVerifyHotel = async (hotelId) => {
    if (!window.confirm('Are you sure you want to verify this hotel? The owner will be promoted to Admin.')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.put(`http://localhost:5000/api/superadmin/hotels/${hotelId}/verify`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ text: 'Hotel verified successfully! Manager access granted.', type: 'success' });
      loadSystemData();
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Verification failed.', type: 'error' });
    }
  };

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };

  const location = useLocation();
  const currentPath = location.pathname;
  const getPageContext = () => {
    if (currentPath.includes('registry')) return { title: "HOTEL REGISTRY", subtitle: "Hotel List" };
    return { title: "SYSTEM ADMINISTRATION", subtitle: "NETWORK STATUS: ACTIVE" };
  };
  const { title: pageTitle, subtitle: pageSubtitle } = getPageContext();

  // ─── Transaction filter helpers ───
  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case 'completed': return 'bg-[#E7F3ED] text-[#108548]';
      case 'pending': return 'bg-[#FFF8E6] text-[#A36B00]';
      case 'refunded': return 'bg-[#FEE2E2] text-[#B91C1C]';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredTransactions = transactionsData?.transactions?.filter(tx => {
    const matchesSearch = !txSearchQuery ||
      tx.guest_name?.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      tx.booking_reference?.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      tx.hotel_name?.toLowerCase().includes(txSearchQuery.toLowerCase());
    const matchesFilter = txFilterStatus === 'all' || tx.payment_status === txFilterStatus;
    return matchesSearch && matchesFilter;
  }) || [];

  if (!user) return null;

  return (
    <AdminLayout user={user} onLogout={handleLogout} title={pageTitle} subtitle={pageSubtitle}>
      <div className="space-y-10 pb-12">
        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard label="HOTEL NETWORK" value={stats.hotels} icon="domain" trend="+2 New" />
          <StatCard label="HOTEL MANAGERS" value={stats.admins} icon="badge" />
          <StatCard label="REGISTERED GUESTS" value={stats.guests} icon="group" />
          <StatCard label="TOTAL REVENUE" value={`NRS ${totalRevenue.toLocaleString()}`} icon="payments" trend="Gross" />
          <StatCard label="PLATFORM FEE" value={`NRS ${totalCommission.toLocaleString()}`} icon="account_balance_wallet" trend="10% Net" isMajor={true} />
        </div>

        {/* Notifications */}
        {message.text && (
          <div className={`mb-8 p-4 border rounded-sm text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-[#E7F3ED] border-[#108548] text-[#108548]' : 'bg-[#FEEDEC] border-[#B91C1C] text-[#B91C1C]'}`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hotels List (2/3) */}
          <div className="lg:col-span-2 admin-card p-10">
            {pendingHotels.length > 0 && (
              <div className="mb-10 border-b border-[#F1F1F1] pb-10">
                <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight mb-6">Pending Approvals</h2>
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
                      <button onClick={() => handleVerifyHotel(hotel.id)} className="admin-button admin-button-primary !bg-[#108548] !text-[9px] px-6 py-3 tracking-[0.2em]">
                        Approve Hotel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-end mb-8 border-b border-[#F1F1F1] pb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight">Hotel Network</h2>
                <p className="text-[11px] text-[#64748B] font-medium mt-1 uppercase tracking-widest">All Registered Hotels</p>
              </div>
              <button onClick={() => setShowAddHotelModal(true)} className="admin-button admin-button-primary text-[10px] px-6 py-3 tracking-[0.2em]">
                Register New Hotel
              </button>
            </div>

            {hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hotels.map(hotel => {
                  let hotelImages = [];
                  if (hotel.image) { try { hotelImages = JSON.parse(hotel.image); } catch (e) { hotelImages = [hotel.image]; } }
                  return (
                    <div key={hotel.id} className="admin-card overflow-hidden hover:border-[#B88E2F] transition-colors group">
                      {hotelImages.length > 0 && (
                        <div className="relative h-40 overflow-hidden bg-slate-100">
                          <img src={hotelImages[0].startsWith('data:') ? hotelImages[0] : (hotelImages[0].startsWith('http') ? hotelImages[0] : `http://localhost:5000${hotelImages[0]}`)} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.2em]">No hotels registered yet</p>
              </div>
            )}
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-8 min-w-[320px]">
            {/* Analytics Actions */}
            <div className="admin-card p-10">
              <h3 className="admin-label mb-8 border-b border-[#F1F1F1] pb-6">Reports & Analytics</h3>
              <div className="space-y-4">
                <button
                  onClick={openAnalyticsModal}
                  className="w-full text-left px-6 py-5 border border-[#E2E2E2] bg-[#F9FAFB] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
                >
                  System Audits
                  <span className="material-symbols-outlined text-[18px] text-[#A0AEC0] group-hover:text-[#1B2B41]">monitoring</span>
                </button>
                <button
                  onClick={openTransactionsModal}
                  className="w-full text-left px-6 py-5 border border-[#E2E2E2] bg-[#F9FAFB] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
                >
                  Transaction Logs
                  <span className="material-symbols-outlined text-[18px] text-[#A0AEC0] group-hover:text-[#1B2B41]">history_edu</span>
                </button>
                <button
                  onClick={generateMasterReport}
                  disabled={reportLoading}
                  className="w-full text-left px-6 py-5 bg-[#BC8E2E] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#A67C28] transition-colors rounded-sm mt-8 flex justify-between items-center shadow-md disabled:opacity-50"
                >
                  {reportLoading ? 'Generating...' : 'Generate Master Report'}
                  <span className="material-symbols-outlined text-[18px]">{reportLoading ? 'hourglass_empty' : 'picture_as_pdf'}</span>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="admin-card p-8">
              <h3 className="admin-label mb-6 border-b border-[#F1F1F1] pb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#108548] mt-1.5"></div>
                  <div>
                    <p className="text-[10px] font-bold text-[#1B2B41]">Database Online</p>
                    <p className="text-[9px] text-[#A0AEC0] uppercase mt-0.5">Connection Verified</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#108548] mt-1.5"></div>
                  <div>
                    <p className="text-[10px] font-bold text-[#1B2B41]">Authentication Active</p>
                    <p className="text-[9px] text-[#A0AEC0] uppercase mt-0.5">All Services Running</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            MODAL: System Audits (Analytics Overview)
            ═══════════════════════════════════════════════════ */}
        {showAnalyticsModal && (
          <div className="fixed inset-0 bg-[#0A111F]/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 fade-in">
            <div className="bg-white max-w-5xl w-full max-h-[95vh] overflow-hidden rounded-xl flex flex-col shadow-2xl">
              {/* Header */}
              <div className="bg-[#1A2332] px-8 py-6 flex items-center justify-between text-white shrink-0">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-[0.15em]">System Audits</h2>
                  <p className="text-[10px] text-[#A0AEC0] font-bold uppercase tracking-[0.2em] mt-1">Live Booking & Revenue Overview</p>
                </div>
                <button onClick={() => setShowAnalyticsModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-8 custom-scrollbar flex-1">
                {analyticsLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#C4993E] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading analytics...</p>
                  </div>
                ) : analyticsData ? (
                  <div className="space-y-8">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Bookings', value: analyticsData.overview.total_bookings || 0, color: '#1B2B41' },
                        { label: 'Total Revenue', value: `NRS ${Number(analyticsData.overview.total_revenue || 0).toLocaleString()}`, color: '#108548' },
                        { label: 'Platform Fee (10%)', value: `NRS ${Number(analyticsData.overview.total_commission || 0).toLocaleString()}`, color: '#607AFB' },
                        { label: 'Cancelled', value: analyticsData.overview.cancelled || 0, color: '#B91C1C' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-lg text-center">
                          <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                          <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Booking Status Breakdown */}
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: 'Confirmed', value: analyticsData.overview.confirmed || 0, bg: 'bg-[#E7F3ED]', text: 'text-[#108548]' },
                        { label: 'Pending', value: analyticsData.overview.pending || 0, bg: 'bg-[#FFF8E6]', text: 'text-[#A36B00]' },
                        { label: 'Checked In', value: analyticsData.overview.checked_in || 0, bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]' },
                        { label: 'Checked Out', value: analyticsData.overview.checked_out || 0, bg: 'bg-[#F1F5F9]', text: 'text-[#475569]' },
                        { label: 'Refunded', value: `NRS ${Number(analyticsData.overview.total_refunded || 0).toLocaleString()}`, bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
                      ].map((item, i) => (
                        <div key={i} className={`${item.bg} p-4 rounded-lg text-center`}>
                          <p className={`text-lg font-bold ${item.text}`}>{item.value}</p>
                          <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider mt-1">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Per-Hotel Revenue Table */}
                    <div>
                      <h3 className="text-xs font-bold text-[#1B2B41] uppercase tracking-[0.2em] mb-4 border-b border-[#F1F1F1] pb-3">Revenue by Hotel</h3>
                      <div className="overflow-x-auto">
                        <table className="admin-table w-full">
                          <thead>
                            <tr>
                              <th>Hotel</th>
                              <th>City</th>
                              <th>Bookings</th>
                              <th>Active</th>
                              <th className="text-right">Revenue</th>
                              <th className="text-right">Fee</th>
                              <th className="text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsData.hotelRevenue.map((hotel, i) => (
                              <tr key={i}>
                                <td className="font-bold text-[#1B2B41]">{hotel.name}</td>
                                <td className="text-[#64748B]">{hotel.city}</td>
                                <td>{hotel.total_bookings || 0}</td>
                                <td>
                                  <span className="bg-[#E7F3ED] text-[#108548] px-2 py-0.5 rounded text-[10px] font-bold">
                                    {hotel.active_bookings || 0}
                                  </span>
                                </td>
                                <td className="text-right font-bold text-[#1B2B41]">NRS {Number(hotel.revenue || 0).toLocaleString()}</td>
                                <td className="text-right font-bold text-[#607AFB]">NRS {Number(hotel.commission || 0).toLocaleString()}</td>
                                <td className={`text-right font-bold ${Number(hotel.balance) < 0 ? 'text-[#B91C1C]' : 'text-[#108548]'}`}>
                                  NRS {Number(hotel.balance || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Recent Bookings */}
                    <div>
                      <h3 className="text-xs font-bold text-[#1B2B41] uppercase tracking-[0.2em] mb-4 border-b border-[#F1F1F1] pb-3">Recent Bookings</h3>
                      <div className="overflow-x-auto">
                        <table className="admin-table w-full">
                          <thead>
                            <tr>
                              <th>Reference</th>
                              <th>Guest</th>
                              <th>Hotel</th>
                              <th>Dates</th>
                              <th className="text-right">Amount</th>
                              <th className="text-right">Fee</th>
                              <th className="text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsData.recentBookings.map((b, i) => (
                              <tr key={i}>
                                <td className="font-mono text-[10px] text-[#64748B]">{b.booking_reference}</td>
                                <td className="font-bold text-[#1B2B41]">{b.guest_name}</td>
                                <td>{b.hotel_name}</td>
                                <td className="text-[11px] whitespace-nowrap">{new Date(b.check_in_date).toLocaleDateString()} - {new Date(b.check_out_date).toLocaleDateString()}</td>
                                <td className="font-bold text-right">NRS {Number(b.total_amount).toLocaleString()}</td>
                                <td className="font-bold text-right text-[#607AFB]">NRS {Number(b.commission_amount || 0).toLocaleString()}</td>
                                <td className="text-right">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    b.status === 'confirmed' ? 'bg-[#E7F3ED] text-[#108548]' :
                                    b.status === 'pending' ? 'bg-[#FFF8E6] text-[#A36B00]' :
                                    b.status === 'cancelled' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                                    'bg-[#F1F5F9] text-[#475569]'
                                  }`}>
                                    {(b.status || '').replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center"><p className="text-xs text-[#94A3B8]">No analytics data available.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            MODAL: Transaction Logs
            ═══════════════════════════════════════════════════ */}
        {showTransactionsModal && (
          <div className="fixed inset-0 bg-[#0A111F]/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 fade-in">
            <div className="bg-white max-w-6xl w-full max-h-[95vh] overflow-hidden rounded-xl flex flex-col shadow-2xl">
              {/* Header */}
              <div className="bg-[#1A2332] px-8 py-6 flex items-center justify-between text-white shrink-0">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-[0.15em]">Transaction Logs</h2>
                  <p className="text-[10px] text-[#A0AEC0] font-bold uppercase tracking-[0.2em] mt-1">All Payment Records</p>
                </div>
                <button onClick={() => setShowTransactionsModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {transactionsLoading ? (
                  <div className="py-20 text-center">
                    <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#C4993E] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading transactions...</p>
                  </div>
                ) : transactionsData ? (
                  <div>
                    {/* Summary Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-6 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#1B2B41]">{transactionsData.summary.total || 0}</p>
                        <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#108548] font-mono">{transactionsData.summary.completed || 0}</p>
                        <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Completed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#A36B00] font-mono">{transactionsData.summary.pending || 0}</p>
                        <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#1A2332]">NRS {Number(transactionsData.summary.total_collected || 0).toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Gross Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#607AFB]">NRS {Number(transactionsData.summary.total_commission || 0).toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-[#607AFB] uppercase tracking-widest">System Fee (10%)</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#B91C1C]">NRS {Number(transactionsData.summary.total_refunded || 0).toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Refunded</p>
                      </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap gap-3 items-center">
                      <div className="relative flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">search</span>
                        <input
                          type="text"
                          placeholder="Search by guest, ref, or hotel..."
                          className="bg-[#F9FAFB] border border-[#E2E2E2] rounded px-9 py-2 text-xs w-full outline-none focus:border-[#1B2B41]"
                          value={txSearchQuery}
                          onChange={(e) => setTxSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-1">
                        {['all', 'completed', 'pending', 'refunded'].map(s => (
                          <button
                            key={s}
                            onClick={() => setTxFilterStatus(s)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${
                              txFilterStatus === s
                                ? 'bg-[#1B2B41] text-white border-[#1B2B41]'
                                : 'bg-white text-[#64748B] border-[#E2E2E2] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="admin-table w-full">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Guest</th>
                            <th>Hotel</th>
                            <th>Reference</th>
                            <th>Gross</th>
                            <th>Net Fee</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.length > 0 ? filteredTransactions.map((tx, i) => (
                            <tr key={i}>
                              <td className="font-mono text-[10px] text-[#94A3B8]">#{tx.payment_id}</td>
                              <td>
                                <div className="font-bold text-[#1B2B41] text-[11px]">{tx.guest_name}</div>
                                <div className="text-[9px] text-[#94A3B8]">{tx.guest_email}</div>
                              </td>
                              <td className="text-[11px]">{tx.hotel_name}</td>
                              <td className="font-mono text-[10px] text-[#64748B]">{tx.booking_reference}</td>
                              <td className="font-bold text-[#1B2B41]">NRS {Number(tx.amount).toLocaleString()}</td>
                              <td className="font-bold text-[#607AFB]">NRS {Number(tx.commission_amount || 0).toLocaleString()}</td>
                              <td className="text-[10px] uppercase font-bold text-[#64748B]">{tx.payment_method || 'khalti'}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getPaymentStatusStyle(tx.payment_status)}`}>
                                  {tx.payment_status}
                                </span>
                              </td>
                              <td className="text-[10px] text-[#64748B]">{new Date(tx.payment_date).toLocaleDateString()}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="9" className="text-center py-10 text-[#94A3B8] italic text-xs">
                                No transactions matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center"><p className="text-xs text-[#94A3B8]">No transaction data available.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            MODAL: Add New Hotel
            ═══════════════════════════════════════════════════ */}
        {showAddHotelModal && (
          <div className="fixed inset-0 bg-[#0A111F]/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 fade-in">
            <div className="bg-white max-w-2xl w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[#E2E8F0] overflow-hidden max-h-[95vh] flex flex-col rounded-xl">
              <div className="bg-[#1A2332] px-8 py-7 flex items-center justify-between text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C4993E] via-[#D4B06A] to-[#C4993E]"></div>
                <div className="relative z-10">
                  <h2 className="text-xl font-bold uppercase tracking-[0.15em] leading-none mb-2">Add New Hotel</h2>
                  <p className="text-[10px] text-[#A0AEC0] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4993E]"></span>
                    Set up your new hotel
                  </p>
                </div>
                <button onClick={() => setShowAddHotelModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 group">
                  <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
                </button>
              </div>
              <div className="overflow-y-auto p-8 md:p-10 custom-scrollbar bg-[#FBFAFA]">
                <form onSubmit={handleAddHotel} className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-[#C4993E] text-xl">domain</span>
                      <h3 className="text-xs font-black text-[#1A2332] uppercase tracking-[0.2em]">Hotel Information</h3>
                      <div className="flex-1 h-[1px] bg-[#E2E8F0]"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="form-group">
                        <label className="admin-label !mb-2.5">Hotel Name *</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">hotel</span>
                          <input type="text" required value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} placeholder="Enter hotel name" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all placeholder:text-[#CBD5E1] placeholder:font-normal" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="admin-label !mb-2.5">Hotel Description</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-4 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">description</span>
                          <textarea rows="3" value={hotelForm.description} onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })} placeholder="Brief overview of the hotel..." className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-medium text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all resize-none placeholder:text-[#CBD5E1] placeholder:font-normal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                          <label className="admin-label !mb-2.5">Latitude</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">explore</span>
                            <input type="number" step="any" value={hotelForm.latitude} onChange={(e) => onCoordChange('latitude', e.target.value)} placeholder="e.g. 27.7172" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm transition-all" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="admin-label !mb-2.5">Longitude</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">explore</span>
                            <input type="number" step="any" value={hotelForm.longitude} onChange={(e) => onCoordChange('longitude', e.target.value)} placeholder="e.g. 85.3240" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm transition-all" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="form-group">
                          <label className="admin-label !mb-2.5">City *</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">location_city</span>
                            <input type="text" required value={hotelForm.city} onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })} placeholder="City" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="admin-label !mb-2.5">District</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">map</span>
                            <input type="text" value={hotelForm.district} onChange={(e) => setHotelForm({ ...hotelForm, district: e.target.value })} placeholder="District" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm transition-all" />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="admin-label !mb-2.5">Country *</label>
                          <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">public</span>
                            <input type="text" required value={hotelForm.country} onChange={(e) => setHotelForm({ ...hotelForm, country: e.target.value })} placeholder="Country" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg shadow-sm focus:shadow-[0_0_0_4px_rgba(196,153,62,0.1)] transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-[#C4993E] text-xl">admin_panel_settings</span>
                      <h3 className="text-xs font-black text-[#1A2332] uppercase tracking-[0.2em]">Hotel Manager Details</h3>
                      <div className="flex-1 h-[1px] bg-[#E2E8F0]"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="admin-label !mb-2.5">Manager Full Name *</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">person</span>
                          <input type="text" required value={hotelForm.adminName} onChange={(e) => setHotelForm({ ...hotelForm, adminName: e.target.value })} placeholder="Manager Name" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg transition-all" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="admin-label !mb-2.5">Manager Email *</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">mail</span>
                          <input type="email" required value={hotelForm.adminEmail} onChange={(e) => setHotelForm({ ...hotelForm, adminEmail: e.target.value })} placeholder="Email address" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg transition-all" />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="admin-label !mb-2.5">Temporary Manager Password *</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg group-focus-within:text-[#C4993E] transition-colors">lock</span>
                        <input type="password" required minLength="6" value={hotelForm.adminPassword} onChange={(e) => setHotelForm({ ...hotelForm, adminPassword: e.target.value })} placeholder="Min. 6 characters" className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E2E8F0] focus:border-[#C4993E] text-sm font-semibold text-[#1A2332] outline-none rounded-lg transition-all" />
                      </div>
                      <p className="text-[9px] text-[#94A3B8] mt-2 italic flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">info</span>
                        The manager will be prompted to change this upon initial login.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-[#E2E8F0]">
                    <button type="submit" className="flex-1 bg-[#1A2332] text-[#C4993E] font-black uppercase text-[11px] tracking-[0.3em] py-4 rounded-lg hover:bg-[#263345] hover:text-[#D4B06A] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3 group">
                      <span>Add New Hotel</span>
                      <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                    <button type="button" onClick={() => setShowAddHotelModal(false)} className="md:px-10 py-4 bg-white border border-[#E2E8F0] text-[#64748B] font-bold uppercase text-[11px] tracking-[0.2em] rounded-lg hover:bg-[#F8FAFC] hover:text-[#1A2332] transition-all">
                      Cancel
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

