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

    const filteredBookings = (bookings || []).filter(b => {
        const isAll = activeTab === 'All';
        const matchesTab = isAll ||
            (activeTab === 'Confirmed' && b?.status === 'confirmed') ||
            (activeTab === 'Pending' && b?.status === 'pending') ||
            (activeTab === 'Checked-In' && b?.status === 'checked_in') ||
            (activeTab === 'Checked-Out' && b?.status === 'checked_out');

        const searchRaw = searchQuery?.toLowerCase() || '';
        const guestName = b?.guest_name?.toLowerCase() || '';
        const bookingRef = b?.booking_reference?.toLowerCase() || '';

        const matchesSearch = guestName.includes(searchRaw) || bookingRef.includes(searchRaw);

        return matchesTab && matchesSearch;
    });

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

    const getPaymentBadge = (booking) => {
        const paymentStatus = String(booking?.payment_status || '').toLowerCase();
        const bookingStatus = String(booking?.status || '').toLowerCase();

        // Cancelled unpaid bookings should not look like "payment pending action".
        if (bookingStatus === 'cancelled' && paymentStatus === 'pending') {
            return {
                label: 'unpaid',
                className: 'bg-[#F1F5F9] text-[#475569]'
            };
        }

        if (paymentStatus === 'paid') {
            return {
                label: 'paid',
                className: 'bg-[#E7F3ED] text-[#108548]'
            };
        }

        if (paymentStatus === 'refunded') {
            return {
                label: 'refunded',
                className: 'bg-[#FEE2E2] text-[#B91C1C]'
            };
        }

        return {
            label: paymentStatus || 'pending',
            className: 'bg-[#FFF8E6] text-[#A36B00]'
        };
    };

    return (
        <div className="admin-card overflow-hidden bg-white">
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
                            filteredBookings.map((booking) => {
                                const paymentBadge = getPaymentBadge(booking);
                                return (
                                <tr key={booking.id}>
                                    <td>
                                        <div className="font-bold text-[#1B2B41]">{booking.guest_name}</div>
                                        <div className="text-[11px] text-[#64748B] mb-1">{booking.guest_email}</div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-[#475569]">
                                                REF: {booking.booking_reference}
                                            </span>
                                            {Number(booking.extension_nights) > 0 && (
                                                <span
                                                    className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-[#1B2B41] border border-gray-200"
                                                    title={`Stay extended by ${booking.extension_nights} night(s)`}
                                                >
                                                    Extended +{booking.extension_nights}n
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="font-semibold text-[#1B2B41]">
                                            {new Date(booking.check_in_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(booking.check_out_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div className="text-[11px] text-[#64748B] uppercase font-bold mt-0.5">
                                            {booking.total_nights} Nights / {booking.num_guests} Pers
                                            {Number(booking.extension_nights) > 0 && (
                                                <span className="text-[#1B2B41]"> · incl. extension</span>
                                            )}
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
                                            <span className={`status-badge ${paymentBadge.className}`}>
                                                {paymentBadge.label}
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

                                            {booking.status === 'confirmed' && (
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

                                            {!['checked_in', 'checked_out', 'cancelled'].includes(booking.status) && (
                                                <button
                                                    onClick={() => onReject && onReject(booking.id)}
                                                    className="admin-button admin-button-secondary border-red-100 text-[#B91C1C] hover:bg-[#FEE2E2] py-1 px-3 text-[11px] h-8"
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                            {booking.payment_status === 'paid' && !['checked_in', 'checked_out', 'cancelled'].includes(booking.status) && (
                                                <button
                                                    onClick={() => onRefund && onRefund(booking.id)}
                                                    className="admin-button admin-button-secondary bg-[#1B2B41] text-[#C4993E] hover:bg-[#263345] py-1 px-3 text-[11px] h-8"
                                                >
                                                    Refund
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})
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
