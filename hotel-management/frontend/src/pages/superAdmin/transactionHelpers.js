export const getPaymentStatusStyle = (status) => {
  switch (status) {
    case 'completed': return 'bg-[#E7F3ED] text-[#108548]';
    case 'pending': return 'bg-[#FFF8E6] text-[#A36B00]';
    case 'refunded': return 'bg-[#FEE2E2] text-[#B91C1C]';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export const getFilteredTransactions = (transactionsData, txSearchQuery, txFilterStatus) =>
  transactionsData?.transactions?.filter(tx => {
    const matchesSearch = !txSearchQuery ||
      tx.guest_name?.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      tx.booking_reference?.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
      tx.hotel_name?.toLowerCase().includes(txSearchQuery.toLowerCase());
    const matchesFilter = txFilterStatus === 'all' || tx.payment_status === txFilterStatus;
    return matchesSearch && matchesFilter;
  }) || [];
