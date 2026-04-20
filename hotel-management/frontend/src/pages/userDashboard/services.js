import axios from 'axios';
import { API_URL } from '../../config/api';

export const getHotels = async () => axios.get(`${API_URL}/hotels`);

export const getHotelReviews = async (hotelId) =>
  axios.get(`${API_URL}/reviews/hotel/${hotelId}`);

export const getMyBookings = async (token) =>
  axios.get(`${API_URL}/users/my-bookings`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getQrToken = async (bookingId, token) =>
  axios.get(`${API_URL}/payments/qr-token/${bookingId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const searchRooms = async (params) =>
  axios.get(`${API_URL}/rooms/search?${params.toString()}`);

export const getRooms = async (hotelId, checkIn, checkOut, token) =>
  axios.get(`${API_URL}/rooms?hotelId=${hotelId}&checkIn=${checkIn}&checkOut=${checkOut}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const getLoyaltyStatus = async (hotelId, token) =>
  axios.get(`${API_URL}/loyalty/status/${hotelId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const initiatePayment = async (payload, token) =>
  axios.post(`${API_URL}/payments/initiate`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const cancelBooking = async (bookingId, token) =>
  axios.post(
    `${API_URL}/payments/cancel`,
    { bookingId },
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const verifyPayment = async (purchase_order_id) =>
  axios.post(`${API_URL}/payments/verify`, { purchase_order_id });

export const payOnlineForBooking = async (payload, token) =>
  axios.post(`${API_URL}/payments/pay-online`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const extendStay = async (payload, token) =>
  axios.post(`${API_URL}/payments/extend-stay`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateBookingGuestDetails = async (payload, token) =>
  axios.patch(`${API_URL}/payments/booking/guest-details`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const updateBookingNumGuests = async (payload, token) =>
  axios.patch(`${API_URL}/payments/booking/num-guests`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const rescheduleBooking = async (payload, token) =>
  axios.patch(`${API_URL}/payments/booking/reschedule`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const submitReview = async (payload, token) =>
  axios.post(`${API_URL}/reviews`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
