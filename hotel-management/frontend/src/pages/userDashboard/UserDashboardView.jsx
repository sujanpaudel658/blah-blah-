import React from 'react';
import './leafletSetup';
import Footer from '../../components/Footer';
import Navbar from '../../components/Navbar';
import ExploreTab from './components/ExploreTab';
import BookingsTab from './components/BookingsTab';
import DashboardTabs from './components/DashboardTabs';
import PassModal from './components/PassModal';
import ReviewModal from './components/ReviewModal';
import BillModal from './components/BillModal';
import ExtendStayModal from './components/ExtendStayModal';
import EditBookingModal from './components/EditBookingModal';
import FullMapModal from './components/FullMapModal';
import HotelBookingModal from './components/HotelBookingModal';
import useUserDashboard from './hooks/useUserDashboard';

const UserDashboardView = () => {
  const {
    navigate,
    user,
    hotels,
    searchResults,
    activeTab,
    setActiveTab,
    displayBookings,
    quickExploreSearch,
    runExploreHotelSearch,
    searchLocation,
    setSearchLocation,
    bookingDates,
    setBookingDates,
    numGuests,
    setNumGuests,
    hotelSearchLoading,
    exploreSearchActive,
    clearExploreHotelSearch,
    hotelsToRender,
    handleHotelClick,
    handleSearch,
    handleLogout,
    payOnlineBookingId,
    handlePayOnlineForBooking,
    handleCancelBooking,
    handleVerifyPayment,
    openEditBookingModal,
    canExtendStay,
    openExtendModal,
    setPassRoomIndex,
    setSelectedPass,
    setShowPassModal,
    setSelectedBill,
    setShowBillModal,
    setSelectedBookingForReview,
    setShowReviewModal,
    showPassModal,
    selectedPass,
    passRoomIndex,
    qrToken,
    showReviewModal,
    selectedBookingForReview,
    setReviewStarHover,
    setReviewCategoryStarHover,
    reviewStarHover,
    reviewForm,
    setReviewForm,
    reviewCategoryStarHover,
    submitReviewHandler,
    showBillModal,
    selectedBill,
    contentRef,
    handlePrint,
    showExtendModal,
    extendTarget,
    extendNights,
    setExtendNights,
    extendMethod,
    setExtendMethod,
    extendSubmitting,
    setShowExtendModal,
    setExtendTarget,
    handleExtendStay,
    showEditBookingModal,
    editBookingTarget,
    editBookingForm,
    setEditBookingForm,
    setShowEditBookingModal,
    setEditBookingTarget,
    editBookingSubmitting,
    handleUpdateBooking,
    showModal,
    selectedHotel,
    closeModal,
    activeImageIndex,
    setActiveImageIndex,
    setIsMapFullScreen,
    numRooms,
    setNumRooms,
    rooms,
    setSelectedRoom,
    selectedRoom,
    loyaltyStatus,
    processBooking,
    isReserving,
    hotelReviews,
    isMapFullScreen
  } = useUserDashboard();

  return (

    <div className="min-h-screen bg-[#F5F3EF] text-[#2D3748] font-sans antialiased">
      <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; }
            .fade-in { animation: fadeIn 0.2s ease-out; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

      <Navbar
        user={user}
        onLogout={handleLogout}
        searchPlaceholder="Find your hotel..."
        hotelSuggestions={hotels}
        onSearch={handleSearch}
      />

      <DashboardTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        displayBookings={displayBookings}
        navigate={navigate}
      />

      {activeTab === 'explore' ? (
        <ExploreTab
          quickExploreSearch={quickExploreSearch}
          runExploreHotelSearch={runExploreHotelSearch}
          searchLocation={searchLocation}
          setSearchLocation={setSearchLocation}
          bookingDates={bookingDates}
          setBookingDates={setBookingDates}
          numGuests={numGuests}
          setNumGuests={setNumGuests}
          hotelSearchLoading={hotelSearchLoading}
          exploreSearchActive={exploreSearchActive}
          clearExploreHotelSearch={clearExploreHotelSearch}
          searchResults={searchResults}
          hotelsToRender={hotelsToRender}
          handleHotelClick={handleHotelClick}
        />
      ) : (
        <BookingsTab
          displayBookings={displayBookings}
          setPassRoomIndex={setPassRoomIndex}
          setSelectedPass={setSelectedPass}
          setShowPassModal={setShowPassModal}
          payOnlineBookingId={payOnlineBookingId}
          handlePayOnlineForBooking={handlePayOnlineForBooking}
          setSelectedBill={setSelectedBill}
          setShowBillModal={setShowBillModal}
          setSelectedBookingForReview={setSelectedBookingForReview}
          setShowReviewModal={setShowReviewModal}
          handleCancelBooking={handleCancelBooking}
          handleVerifyPayment={handleVerifyPayment}
          openEditBookingModal={openEditBookingModal}
          canExtendStay={canExtendStay}
          openExtendModal={openExtendModal}
        />
      )}

      <PassModal
        showPassModal={showPassModal}
        selectedPass={selectedPass}
        passRoomIndex={passRoomIndex}
        setPassRoomIndex={setPassRoomIndex}
        qrToken={qrToken}
        setShowPassModal={setShowPassModal}
      />

      <ReviewModal
        showReviewModal={showReviewModal}
        selectedBookingForReview={selectedBookingForReview}
        setShowReviewModal={setShowReviewModal}
        setReviewStarHover={setReviewStarHover}
        setReviewCategoryStarHover={setReviewCategoryStarHover}
        reviewStarHover={reviewStarHover}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        reviewCategoryStarHover={reviewCategoryStarHover}
        submitReviewHandler={submitReviewHandler}
      />

      <BillModal
        showBillModal={showBillModal}
        selectedBill={selectedBill}
        contentRef={contentRef}
        handlePrint={handlePrint}
        setShowBillModal={setShowBillModal}
      />

      <ExtendStayModal
        showExtendModal={showExtendModal}
        extendTarget={extendTarget}
        extendNights={extendNights}
        setExtendNights={setExtendNights}
        extendMethod={extendMethod}
        setExtendMethod={setExtendMethod}
        extendSubmitting={extendSubmitting}
        setShowExtendModal={setShowExtendModal}
        setExtendTarget={setExtendTarget}
        handleExtendStay={handleExtendStay}
      />

      <EditBookingModal
        showEditBookingModal={showEditBookingModal}
        editBookingTarget={editBookingTarget}
        editBookingForm={editBookingForm}
        setEditBookingForm={setEditBookingForm}
        setShowEditBookingModal={setShowEditBookingModal}
        setEditBookingTarget={setEditBookingTarget}
        editBookingSubmitting={editBookingSubmitting}
        handleUpdateBooking={handleUpdateBooking}
      />

      <HotelBookingModal
        showModal={showModal}
        selectedHotel={selectedHotel}
        closeModal={closeModal}
        activeImageIndex={activeImageIndex}
        setActiveImageIndex={setActiveImageIndex}
        setIsMapFullScreen={setIsMapFullScreen}
        bookingDates={bookingDates}
        setBookingDates={setBookingDates}
        numRooms={numRooms}
        setNumRooms={setNumRooms}
        numGuests={numGuests}
        setNumGuests={setNumGuests}
        rooms={rooms}
        setSelectedRoom={setSelectedRoom}
        selectedRoom={selectedRoom}
        loyaltyStatus={loyaltyStatus}
        processBooking={processBooking}
        isReserving={isReserving}
        hotelReviews={hotelReviews}
      />

      <FullMapModal
        isMapFullScreen={isMapFullScreen}
        selectedHotel={selectedHotel}
        setIsMapFullScreen={setIsMapFullScreen}
      />
      <Footer />
    </div>
  );
};

export default UserDashboardView;
