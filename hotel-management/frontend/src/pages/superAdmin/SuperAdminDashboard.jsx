import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import { buildMasterReportHtml } from './masterReportHtml';
import { getFilteredTransactions } from './transactionHelpers';
import SuperAdminDashboardContent from './SuperAdminDashboardContent';
import HotelDetailModal from './modals/HotelDetailModal';
import AnalyticsModal from './modals/AnalyticsModal';
import TransactionsModal from './modals/TransactionsModal';
import AddHotelModal from './modals/AddHotelModal';
import RefundsModal from './modals/RefundsModal';
import RejectRefundModal from './modals/RejectRefundModal';
import PayoutsModal from './modals/PayoutsModal';
import PendingReviewModal from './modals/PendingReviewModal';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const hotelNetworkRef = useRef(null);

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ hotels: 0, admins: 0, guests: 0 });
  const [hotels, setHotels] = useState([]);
  const [pendingHotels, setPendingHotels] = useState([]);
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionsData, setTransactionsData] = useState(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txFilterStatus, setTxFilterStatus] = useState('all');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');

  const [showRefundsModal, setShowRefundsModal] = useState(false);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundRejectTarget, setRefundRejectTarget] = useState(null);
  const [rejectCategory, setRejectCategory] = useState('');
  const [rejectExtraNotes, setRejectExtraNotes] = useState('');

  const [showPayoutsModal, setShowPayoutsModal] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const [hotelForm, setHotelForm] = useState({
    name: '', address: '', city: '', district: '', country: '', phone: '', email: '',
    latitude: '', longitude: '',
    description: '', adminName: '', adminEmail: '', adminPassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  const [pendingReviewOpen, setPendingReviewOpen] = useState(false);
  const [pendingReviewLoading, setPendingReviewLoading] = useState(false);
  const [pendingReviewError, setPendingReviewError] = useState('');
  const [pendingReviewId, setPendingReviewId] = useState(null);
  const [pendingReviewData, setPendingReviewData] = useState(null);

  const [hotelDetailOpen, setHotelDetailOpen] = useState(false);
  const [hotelDetailLoading, setHotelDetailLoading] = useState(false);
  const [hotelDetailError, setHotelDetailError] = useState('');
  const [hotelDetailData, setHotelDetailData] = useState(null);
  const [adminEmailEdits, setAdminEmailEdits] = useState({});
  const [savingAdminId, setSavingAdminId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { navigate('/login'); return; }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'superadmin') { navigate('/guest/dashboard'); return; }
    setUser(parsedUser);
    loadSystemData();
  }, [navigate]);

  const loadSystemData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [hotelsRes, adminsRes, guestsRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/superadmin/hotels`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/superadmin/admins`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/superadmin/guests`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/superadmin/hotels/pending`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const hotelsList = hotelsRes.data.hotels || [];
      setHotels(hotelsList);
      setPendingHotels(pendingRes.data.hotels || []);
      setStats({
        hotels: hotelsList.length,
        admins: adminsRes.data.admins?.length || 0,
        guests: guestsRes.data.guests?.length || 0
      });

      try {
        const analyticsRes = await axios.get(`${API_URL}/superadmin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
        if (analyticsRes.data.success) {
          setTotalRevenue(Number(analyticsRes.data.analytics.overview.total_revenue) || 0);
          setTotalCommission(Number(analyticsRes.data.analytics.overview.total_commission) || 0);
        }
      } catch { /* noop */ }
    } catch (error) {
      console.error('Data load error:', error);
    }
  };

  const fetchAnalytics = async (start, end) => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (start && end) { params.startDate = start; params.endDate = end; }
      const res = await axios.get(`${API_URL}/superadmin/analytics`, { headers: { Authorization: `Bearer ${token}` }, params });
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

  const fetchTransactions = async (start, end) => {
    setTransactionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (start && end) { params.startDate = start; params.endDate = end; }
      const res = await axios.get(`${API_URL}/superadmin/transactions`, { headers: { Authorization: `Bearer ${token}` }, params });
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

  const fetchRefundRequests = async () => {
    setRefundsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/payments/refund/pending`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setRefundRequests(res.data.requests);
    } catch (err) {
      console.error('Refunds fetch error:', err);
    } finally {
      setRefundsLoading(false);
    }
  };

  const handleApproveRefund = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this refund? This will trigger a Khalti reversal if applicable.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/refund/approve`, { requestId }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setMessage({ text: 'Refund approved and processed successfully.', type: 'success' });
        fetchRefundRequests();
        loadSystemData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Approval failed.', type: 'error' });
    }
  };

  const openRejectRefundModal = (req) => {
    setRefundRejectTarget(req);
    setRejectCategory('');
    setRejectExtraNotes('');
  };

  const submitRejectRefund = async () => {
    if (!refundRejectTarget) return;
    if (!rejectCategory) {
      setMessage({ text: 'Please select a rejection reason.', type: 'error' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/payments/refund/reject`,
        {
          requestId: refundRejectTarget.id,
          rejectionCategory: rejectCategory,
          additionalNotes: rejectExtraNotes.trim() || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage({
          text: 'Refund request rejected. The guest was notified in-app and by email (if mail is configured).',
          type: 'success'
        });
        setRefundRejectTarget(null);
        fetchRefundRequests();
        loadSystemData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Rejection failed.', type: 'error' });
    }
  };

  const openRefundsModal = () => {
    setShowRefundsModal(true);
    fetchRefundRequests();
  };

  const fetchPayoutRequests = async () => {
    setPayoutsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/payments/payout/pending`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setPayoutRequests(res.data.requests);
    } catch (err) {
      console.error('Payouts fetch error:', err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const handleApprovePayout = async (requestId) => {
    const notes = window.prompt('Enter transaction reference or notes (optional):');
    if (notes === null) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/payout/approve`, { requestId, adminNotes: notes }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setMessage({ text: 'Payout approved. Balance deducted.', type: 'success' });
        fetchPayoutRequests();
        loadSystemData();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Approval failed.', type: 'error' });
    }
  };

  const handleRejectPayout = async (requestId) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (reason === null) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/payout/reject`, { requestId, adminNotes: reason }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setMessage({ text: 'Payout request rejected.', type: 'success' });
        fetchPayoutRequests();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Rejection failed.', type: 'error' });
    }
  };

  const openPayoutsModal = () => {
    setShowPayoutsModal(true);
    fetchPayoutRequests();
  };

  const generateMasterReport = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (reportStartDate && reportEndDate) { params.startDate = reportStartDate; params.endDate = reportEndDate; }
      const res = await axios.get(`${API_URL}/superadmin/report`, { headers: { Authorization: `Bearer ${token}` }, params });
      if (res.data.success) {
        const { report } = res.data;

        const reportHTML = buildMasterReportHtml(report);

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

  const handleAddHotel = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(`${API_URL}/superadmin/hotels`, hotelForm, { headers: { Authorization: `Bearer ${token}` } });
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
      await axios.put(`${API_URL}/superadmin/hotels/${hotelId}/verify`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ text: 'Hotel verified successfully! Manager access granted.', type: 'success' });
      setPendingReviewOpen(false);
      setPendingReviewData(null);
      setPendingReviewId(null);
      loadSystemData();
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Verification failed.', type: 'error' });
    }
  };

  const openPendingReview = async (hotelId) => {
    setPendingReviewId(hotelId);
    setPendingReviewOpen(true);
    setPendingReviewLoading(true);
    setPendingReviewError('');
    setPendingReviewData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/superadmin/hotels/pending-review/${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setPendingReviewData(res.data);
      else setPendingReviewError('Could not load hotel details.');
    } catch (err) {
      setPendingReviewError(err.response?.data?.message || 'Failed to load pending hotel.');
    } finally {
      setPendingReviewLoading(false);
    }
  };

  const closeHotelDetail = () => {
    setHotelDetailOpen(false);
    setHotelDetailData(null);
    setHotelDetailError('');
    setAdminEmailEdits({});
    setSavingAdminId(null);
  };

  const openHotelDetail = async (hotelId) => {
    setHotelDetailOpen(true);
    setHotelDetailLoading(true);
    setHotelDetailError('');
    setHotelDetailData(null);
    setAdminEmailEdits({});
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/superadmin/hotels/${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHotelDetailData(res.data);
        const edits = {};
        (res.data.admins || []).forEach((a) => { edits[a.id] = a.email; });
        setAdminEmailEdits(edits);
      } else setHotelDetailError('Could not load hotel.');
    } catch (err) {
      setHotelDetailError(err.response?.data?.message || 'Failed to load hotel.');
    } finally {
      setHotelDetailLoading(false);
    }
  };

  const saveAdminEmail = async (adminId) => {
    const email = (adminEmailEdits[adminId] || '').trim();
    if (!email) {
      setMessage({ text: 'Email is required.', type: 'error' });
      return;
    }
    setSavingAdminId(adminId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        `${API_URL}/superadmin/admins/${adminId}/email`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage({
          text: 'Login email updated. The manager must use this address to sign in.',
          type: 'success'
        });
        setHotelDetailData((prev) => {
          if (!prev) return prev;
          const admins = prev.admins.map((a) =>
            a.id === adminId ? { ...a, email: res.data.admin.email } : a
          );
          return { ...prev, admins };
        });
        setAdminEmailEdits((prev) => ({ ...prev, [adminId]: res.data.admin.email }));
        loadSystemData();
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Update failed.', type: 'error' });
    } finally {
      setSavingAdminId(null);
    }
  };

  const handleDeletePendingHotel = async (hotelId) => {
    if (!window.confirm('Delete this hotel request permanently? The owner stays a guest; they can submit again later if allowed.')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/superadmin/hotels/pending-review/${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Pending hotel request removed.', type: 'success' });
      setPendingReviewOpen(false);
      setPendingReviewData(null);
      setPendingReviewId(null);
      loadSystemData();
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Delete failed.', type: 'error' });
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

  useEffect(() => {
    if (currentPath.includes('/registry')) {
      hotelNetworkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (currentPath.includes('/audits')) {
      if (!showAnalyticsModal) {
        openAnalyticsModal();
      }
    }
  }, [currentPath, showAnalyticsModal]);

  const filteredTransactions = getFilteredTransactions(transactionsData, txSearchQuery, txFilterStatus);

  if (!user) return null;

  return (
    <AdminLayout user={user} onLogout={handleLogout} title={pageTitle} subtitle={pageSubtitle}>
      <div className="space-y-10 pb-12">
        <SuperAdminDashboardContent
          hotelNetworkRef={hotelNetworkRef}
          stats={stats}
          totalRevenue={totalRevenue}
          totalCommission={totalCommission}
          message={message}
          pendingHotels={pendingHotels}
          hotels={hotels}
          openPendingReview={openPendingReview}
          handleDeletePendingHotel={handleDeletePendingHotel}
          setShowAddHotelModal={setShowAddHotelModal}
          openHotelDetail={openHotelDetail}
          openAnalyticsModal={openAnalyticsModal}
          openTransactionsModal={openTransactionsModal}
          openRefundsModal={openRefundsModal}
          openPayoutsModal={openPayoutsModal}
          refundRequests={refundRequests}
          payoutRequests={payoutRequests}
          generateMasterReport={generateMasterReport}
          reportLoading={reportLoading}
        />

        <HotelDetailModal
        hotelDetailOpen={hotelDetailOpen}
        closeHotelDetail={closeHotelDetail}
        hotelDetailLoading={hotelDetailLoading}
        hotelDetailError={hotelDetailError}
        hotelDetailData={hotelDetailData}
        adminEmailEdits={adminEmailEdits}
        setAdminEmailEdits={setAdminEmailEdits}
        saveAdminEmail={saveAdminEmail}
        savingAdminId={savingAdminId}
      />

      <AnalyticsModal
        showAnalyticsModal={showAnalyticsModal}
        setShowAnalyticsModal={setShowAnalyticsModal}
        analyticsLoading={analyticsLoading}
        analyticsData={analyticsData}
      />

      <TransactionsModal
        showTransactionsModal={showTransactionsModal}
        setShowTransactionsModal={setShowTransactionsModal}
        transactionsLoading={transactionsLoading}
        transactionsData={transactionsData}
        txSearchQuery={txSearchQuery}
        setTxSearchQuery={setTxSearchQuery}
        txFilterStatus={txFilterStatus}
        setTxFilterStatus={setTxFilterStatus}
        filteredTransactions={filteredTransactions}
      />

      <AddHotelModal
        showAddHotelModal={showAddHotelModal}
        setShowAddHotelModal={setShowAddHotelModal}
        hotelForm={hotelForm}
        setHotelForm={setHotelForm}
        handleAddHotel={handleAddHotel}
        onCoordChange={onCoordChange}
      />

      <RefundsModal
        showRefundsModal={showRefundsModal}
        setShowRefundsModal={setShowRefundsModal}
        refundsLoading={refundsLoading}
        refundRequests={refundRequests}
        openRejectRefundModal={openRejectRefundModal}
        handleApproveRefund={handleApproveRefund}
      />

      <RejectRefundModal
        showRefundsModal={showRefundsModal}
        refundRejectTarget={refundRejectTarget}
        setRefundRejectTarget={setRefundRejectTarget}
        rejectCategory={rejectCategory}
        setRejectCategory={setRejectCategory}
        rejectExtraNotes={rejectExtraNotes}
        setRejectExtraNotes={setRejectExtraNotes}
        submitRejectRefund={submitRejectRefund}
      />

      <PayoutsModal
        showPayoutsModal={showPayoutsModal}
        setShowPayoutsModal={setShowPayoutsModal}
        payoutsLoading={payoutsLoading}
        payoutRequests={payoutRequests}
        handleApprovePayout={handleApprovePayout}
        handleRejectPayout={handleRejectPayout}
      />

      <PendingReviewModal
        pendingReviewOpen={pendingReviewOpen}
        setPendingReviewOpen={setPendingReviewOpen}
        setPendingReviewData={setPendingReviewData}
        setPendingReviewId={setPendingReviewId}
        pendingReviewLoading={pendingReviewLoading}
        pendingReviewError={pendingReviewError}
        pendingReviewData={pendingReviewData}
        pendingReviewId={pendingReviewId}
        handleDeletePendingHotel={handleDeletePendingHotel}
        handleVerifyHotel={handleVerifyHotel}
      />
      </div>
    </AdminLayout>
  );
};

export default SuperAdminDashboard;
