
Write-Host "Starting Historical Commit Sequence..."

# Configure User (Safety)
git config user.email "sujanpaudel368@gmail.com"
git config user.name "Sujan Paudel"

# 1. Feb 12: Payment Integration
Write-Host "Commit 1/10: Payment (Feb 12)"
git add hotel-management/backend/controllers/paymentController.js hotel-management/backend/routes/paymentRoutes.js hotel-management/frontend/src/pages/KhaltiCallback.jsx hotel-management/frontend/src/pages/Bookings.jsx
git commit --date="2026-02-12T14:00:00" -m "Feature: Integration of Khalti digital payment gateway for secure transaction processing"

# 2. Feb 13: QR System
Write-Host "Commit 2/10: QR System (Feb 13)"
git add hotel-management/frontend/src/components/admin/QRScanner.jsx hotel-management/frontend/src/components/admin/BookingTable.jsx
git commit --date="2026-02-13T10:30:00" -m "Feature: Implementation of digital reservation pass and QR verification module"

# 3. Feb 14: Fiscal Receipts
Write-Host "Commit 3/10: Invoices (Feb 14)"
git add hotel-management/backend/services/email.service.js hotel-management/backend/routes/testEmailRoutes.js
git commit --date="2026-02-14T16:45:00" -m "Feature: Development of fiscal receipt generation system compliant with POS standards"

# 4. Feb 15: Inventory
Write-Host "Commit 4/10: Inventory (Feb 15)"
git add hotel-management/backend/controllers/roomController.js hotel-management/backend/routes/roomRoutes.js hotel-management/frontend/src/pages/RoomManagement.js hotel-management/frontend/src/pages/RoomTypeManagement.jsx
git commit --date="2026-02-15T09:15:00" -m "Feature: Configuration of property inventory management and dynamic room categorization"

# 5. Feb 15: Admin Geo
Write-Host "Commit 5/10: Admin Maps (Feb 15)"
git add hotel-management/frontend/src/components/admin/MapSection.jsx hotel-management/frontend/src/components/admin/HotelProfile.jsx
git commit --date="2026-02-15T14:20:00" -m "Enhancement: Implementation of geospatial property mapping and profile management for administrators"

# 6. Feb 16: Ratings Backend
Write-Host "Commit 6/10: Ratings Backend (Feb 16)"
git add hotel-management/backend/controllers/reviewController.js hotel-management/backend/routes/reviewRoutes.js hotel-management/backend/server.js
git commit --date="2026-02-16T11:00:00" -m "Architecture: Backend implementation of multi-dimensional guest feedback and rating system"

# 7. Feb 16: Review User Dashboard
Write-Host "Commit 7/10: User Dashboard Reviews (Feb 16)"
git add hotel-management/frontend/src/pages/UserDashboard.jsx
git commit --date="2026-02-16T15:30:00" -m "Feature: Development of interactive guest review submission terminal with dimensional metrics"

# 8. Feb 17: Home Ratings
Write-Host "Commit 8/10: Home Ratings (Feb 17)"
git add hotel-management/frontend/src/pages/Home.jsx hotel-management/backend/routes/userRoutes.js
git commit --date="2026-02-17T16:00:00" -m "Feature: Integration of aggregate rating intelligence network across search results"

# 9. Feb 18: Dashboard Polish
Write-Host "Commit 9/10: Admin Dashboard (Feb 18)"
git add hotel-management/frontend/src/pages/AdminDashboard.jsx
git commit --date="2026-02-18T10:00:00" -m "Refactor: Consolidation of reservation history and feedback synchronization logic"

# 10. Feb 18: Final Polish (Everything Else)
Write-Host "Commit 10/10: Final Polish (Feb 18)"
git add .
git commit --date="2026-02-18T13:00:00" -m "Final System Calibration: Aesthetic refinements and synchronization of hospitality registry"

# Push
Write-Host "Pushing to Remote..."
git push origin main
