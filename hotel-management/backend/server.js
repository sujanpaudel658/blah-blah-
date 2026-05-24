
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const {
    processNoShows,
    processNoonCheckInRelease,
    processPayAtHotelNoShowAfterDeadline
} = require('./services/noShow.service');
const { startNotificationWorker } = require('./services/notificationQueue.service');

const app = express();

// CORS: localhost / LAN origins only (dev).
const allowedLocalOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedLocalOriginPatterns.some((re) => re.test(origin));
    return callback(null, allowed);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/superadmin', require('./routes/superAdminRoutes'));
app.use('/api/hotels', require('./routes/hotelRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/loyalty', require('./routes/loyaltyRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));


app.get('/', (req, res) => res.json({ message: 'Hotel Management API is running' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      
      processNoShows();
      setInterval(processNoShows, 12 * 60 * 60 * 1000);

      processNoonCheckInRelease();
      setInterval(processNoonCheckInRelease, 10 * 60 * 1000);

      processPayAtHotelNoShowAfterDeadline();
      setInterval(processPayAtHotelNoShowAfterDeadline, 5 * 60 * 1000);

      startNotificationWorker();
  });
}

module.exports = app;
