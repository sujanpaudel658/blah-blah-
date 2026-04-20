import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import AdminLayout from '../components/admin/AdminLayout';

const SuperAdminAudits = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const loadAudits = async (start = '', end = '') => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (start && end) {
        params.startDate = start;
        params.endDate = end;
      }
      const res = await axios.get(`${API_URL}/superadmin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      if (res.data?.success) {
        setAnalytics(res.data.analytics);
      } else {
        setError('Failed to load audits.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load audits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== 'superadmin') {
      navigate('/guest/dashboard');
      return;
    }
    setUser(parsed);
    loadAudits();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const overview = analytics?.overview || {};
  const hotelRevenue = analytics?.hotelRevenue || [];
  const recentBookings = analytics?.recentBookings || [];

  if (!user) return null;

  return (
    <AdminLayout
      user={user}
      onLogout={handleLogout}
      title="SYSTEM AUDITS"
      subtitle="LIVE BOOKING & REVENUE OVERVIEW"
    >
      <div className="space-y-8 pb-8">
        <div className="admin-card p-6 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="admin-input"
              />
            </div>
            <div>
              <label className="admin-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="admin-input"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => loadAudits(startDate, endDate)}
              className="admin-button admin-button-primary text-[10px] px-6 py-3 tracking-[0.2em]"
            >
              APPLY FILTER
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                loadAudits('', '');
              }}
              className="admin-button admin-button-secondary text-[10px] px-6 py-3 tracking-[0.2em]"
            >
              RESET
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 border rounded-sm text-xs font-bold uppercase tracking-widest bg-[#FEEDEC] border-[#B91C1C] text-[#B91C1C]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-card p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#C4993E] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading audits...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="admin-card p-4 text-center"><p className="text-2xl font-bold text-[#1B2B41]">{overview.total_bookings || 0}</p><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Total bookings</p></div>
              <div className="admin-card p-4 text-center"><p className="text-2xl font-bold text-[#108548]">NRS {Number(overview.total_revenue || 0).toLocaleString()}</p><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Revenue</p></div>
              <div className="admin-card p-4 text-center"><p className="text-2xl font-bold text-[#607AFB]">NRS {Number(overview.total_commission || 0).toLocaleString()}</p><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Platform fee</p></div>
              <div className="admin-card p-4 text-center"><p className="text-2xl font-bold text-[#B91C1C]">{overview.cancelled || 0}</p><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Cancelled</p></div>
              <div className="admin-card p-4 text-center"><p className="text-2xl font-bold text-[#A36B00]">{overview.pending || 0}</p><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Pending</p></div>
              <div className="admin-card p-4 text-center"><p className="text-2xl font-bold text-[#1B2B41]">{overview.checked_in || 0}</p><p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest">Checked in</p></div>
            </div>

            <div className="admin-card p-6">
              <h3 className="admin-label mb-4">Revenue by hotel</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left border-b border-[#E2E8F0]">
                      <th className="py-2">Hotel</th>
                      <th className="py-2">City</th>
                      <th className="py-2">Bookings</th>
                      <th className="py-2">Active</th>
                      <th className="py-2">Revenue</th>
                      <th className="py-2">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotelRevenue.map((h) => (
                      <tr key={h.id} className="border-b border-[#F1F5F9]">
                        <td className="py-2 font-semibold">{h.name}</td>
                        <td className="py-2">{h.city}</td>
                        <td className="py-2">{h.total_bookings || 0}</td>
                        <td className="py-2">{h.active_bookings || 0}</td>
                        <td className="py-2 font-bold">NRS {Number(h.revenue || 0).toLocaleString()}</td>
                        <td className="py-2">NRS {Number(h.commission || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {hotelRevenue.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#94A3B8] font-semibold">
                          No hotel revenue data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card p-6">
              <h3 className="admin-label mb-4">Recent bookings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left border-b border-[#E2E8F0]">
                      <th className="py-2">Reference</th>
                      <th className="py-2">Guest</th>
                      <th className="py-2">Hotel</th>
                      <th className="py-2">Dates</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Fee</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.slice(0, 25).map((b) => (
                      <tr key={b.id} className="border-b border-[#F1F5F9]">
                        <td className="py-2 font-mono">{b.booking_reference}</td>
                        <td className="py-2">{b.guest_name || '-'}</td>
                        <td className="py-2">{b.hotel_name}</td>
                        <td className="py-2">{new Date(b.check_in_date).toLocaleDateString()} - {new Date(b.check_out_date).toLocaleDateString()}</td>
                        <td className="py-2 font-bold">NRS {Number(b.total_amount || 0).toLocaleString()}</td>
                        <td className="py-2">NRS {Number(b.commission_amount || 0).toLocaleString()}</td>
                        <td className="py-2 uppercase">{b.status}</td>
                      </tr>
                    ))}
                    {recentBookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-[#94A3B8] font-semibold">
                          No recent bookings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default SuperAdminAudits;
