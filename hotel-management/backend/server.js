
const express = require('express');
const cors = require('cors');
const path = require('path');
// Always load backend/.env (cwd alone can miss the key if node is started elsewhere).
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { processNoShows, processNoonCheckInRelease } = require('./services/noShow.service');
const { startNotificationWorker } = require('./services/notificationQueue.service');

const app = express();

// Middleware
// Allow local dev from common localhost hosts/ports.
// Without this, the browser can block the request (axios ends up in the fallback catch).
const allowedLocalOriginPatterns = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/
];

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser requests may not have an Origin header.
    if (!origin) return callback(null, true);
    const allowed = allowedLocalOriginPatterns.some((re) => re.test(origin));
    return callback(null, allowed);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
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
app.use('/api/offers', require('./routes/offersRoutes'));


// Health check
app.get('/', (req, res) => res.json({ message: 'Hotel Management API is running' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // No-show after missed check-in day (existing), every 12 hours
    processNoShows();
    setInterval(processNoShows, 12 * 60 * 60 * 1000);

    // Same day from 12:00 (MySQL session time): cancel only still-pending (never confirmed) bookings and free room
    processNoonCheckInRelease();
    setInterval(processNoonCheckInRelease, 10 * 60 * 1000);

    // Queue worker for async notifications
    startNotificationWorker();
});
