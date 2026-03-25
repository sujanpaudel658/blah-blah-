import React, { useState } from 'react';

const BookingTable = ({
    bookings,
    onConfirm,
    onReject,
    onCheckIn,
    onCheckOut,
    onRefund,
    onScan
}) => {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs = ['All', 'Confirmed', 'Pending', 'Checked-In', 'Checked-Out'];

    // Filtering logic for bookings list
    const filteredBookings = (bookings || []).filter(b => {
        // 1. Category Filter Phase
        const isAll = activeTab === 'All';
        const matchesTab = isAll ||
            (activeTab === 'Confirmed' && b?.status === 'confirmed') ||
            (activeTab === 'Pending' && b?.status === 'pending') ||
            (activeTab === 'Checked-In' && b?.status === 'checked_in') ||
            (activeTab === 'Checked-Out' && b?.status === 'checked_out');

        // 2. Global Search Phase
        // Standardize to lowercase to ensure case-insensitive matching across browser platforms
        const searchRaw = searchQuery?.toLowerCase() || '';
        const guestName = b?.guest_name?.toLowerCase() || '';
        const bookingRef = b?.booking_reference?.toLowerCase() || '';

        const matchesSearch = guestName.includes(searchRaw) || bookingRef.includes(searchRaw);

        return matchesTab && matchesSearch;
    });

    /**
     * Map booking status to status colors.
     */
    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-[#E7F3ED] text-[#108548]';
            case 'pending': return 'bg-[#FFF8E6] text-[#A36B00]';
            case 'cancelled':
            case 'refunded': return 'bg-[#FEE2E2] text-[#B91C1C]';
            case 'checked_out': return 'bg-[#F1F5F9] text-[#475569]';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="admin-card overflow-hidden bg-white">
            {/* Table Toolbar */}
            <div className="p-5 border-b border-[#F1F1F1] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-1 border-b md:border-none overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab
                                ? 'border-[#1B2B41] text-[#1B2B41]'
                                : 'border-transparent text-[#94A3B8] hover:text-[#1B2B41]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">search</span>
                        <input
                            type="text"
                            placeholder="Search by name or ref..."
                            className="bg-[#F9FAFB] border border-[#E2E2E2] rounded px-9 py-1.5 text-xs w-64 outline-none focus:border-[#1B2B41]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="admin-button admin-button-secondary h-8 whitespace-nowrap">
                        <span className="material-symbols-outlined text-sm">download</span>
                        Export CSV
                    </button>
                    <button
                        onClick={onScan}
                        className="admin-button admin-button-primary h-8 whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                        Quick Scan
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="admin-table-container border-none rounded-none overflow-x-auto">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="w-1/4">Guest Details</th>
                            <th>Stay Period</th>
                            <th>Room Details</th>
                            <th>Payment</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map((booking) => (
                                <tr key={booking.id}>
                                    <td>
                                        <div className="font-bold text-[#1B2B41]">{booking.guest_name}</div>
                                        <div className="text-[11px] text-[#64748B] mb-1">{booking.guest_email}</div>
                                        <span className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[#475569]">
                                            REF: {booking.booking_reference}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="font-semibold text-[#1B2B41]">
                                            {new Date(booking.check_in_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(booking.check_out_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-[11px] text-[#64748B] uppercase font-bold mt-0.5">
                                            {booking.total_nights} Nights / {booking.num_guests} Pers
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-semibold text-[#1B2B41]">Unit {booking.room_number || 'N/A'}</div>
                                        <div className="text-[11px] text-[#64748B]">{booking.room_type}</div>
                                    </td>
                                    <td>
                                        <div className="font-bold text-[#1B2B41] mb-1">Rs. {Number(booking.total_amount).toLocaleString()}</div>
                                        <div className="flex gap-1">
                                            <span className={`status-badge ${getStatusStyle(booking.status)}`}>
                                                {(booking.status || '').replace('_', ' ')}
                                            </span>
                                            <span className={`status-badge ${booking.payment_status === 'paid' ? 'bg-[#E7F3ED] text-[#108548]' : 'bg-[#FFF8E6] text-[#A36B00]'}`}>
                                                {booking.payment_status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => onConfirm && onConfirm(booking.id)}
                                                        className="w-8 h-8 flex items-center justify-center border border-[#E2E2E2] rounded hover:bg-[#E7F3ED] hover:text-[#108548] transition-colors"
                                                        title="Approve"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                                    </button>
                                                    <button
                                                        onClick={() => onReject && onReject(booking.id)}
                                                        className="w-8 h-8 flex items-center justify-center border border-[#E2E2E2] rounded hover:bg-[#FEE2E2] hover:text-[#B91C1C] transition-colors"
                                                        title="Deny"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                    </button>
                                                </>
                                            )}

                                            {booking.status === 'confirmed' && booking.payment_status === 'paid' && (
                                                <button
                                                    onClick={() => onCheckIn && onCheckIn(booking.id)}
                                                    className="admin-button admin-button-secondary py-1 px-3 text-[11px] h-8"
                                                >
                                                    Check In
                                                </button>
                                            )}

                                            {booking.status === 'checked_in' && (
                                                <button
                                                    onClick={() => onCheckOut && onCheckOut(booking.id)}
                                                    className="admin-button admin-button-secondary py-1 px-3 text-[11px] h-8"
                                                >
                                                    Check Out
                                                </button>
                                            )}

                                            {booking.payment_status === 'paid' && !['checked_in', 'checked_out', 'cancelled'].includes(booking.status) && (
                                                <button
                                                    onClick={() => onRefund && onRefund(booking.id)}
                                                    className="admin-button admin-button-secondary border-red-100 text-[#B91C1C] hover:bg-[#FEE2E2] py-1 px-3 text-[11px] h-8"
                                                >
                                                    Refund
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-[#94A3B8] italic font-medium">
                                    No records matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BookingTable;
