// Printable HTML for superadmin “master report” (print dialog).
export function buildMasterReportHtml(report) {
  const reportDate = new Date(report.generatedAt).toLocaleString();
  // eslint-disable-next-line no-unused-vars
  const dateRangeText = report.dateRange ? `Period: ${report.dateRange.startDate} to ${report.dateRange.endDate}` : 'All Time Data';

  return `
          <!DOCTYPE html>
          <html><head><title>StayNepal Master Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; color: #1A2332; padding: 40px; background: #fff; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #C4993E; }
            .header h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
            .header p { font-size: 12px; color: #64748B; margin-top: 8px; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #C4993E; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; text-align: center; border-radius: 8px; }
            .stat-box .value { font-size: 28px; font-weight: 800; color: #1A2332; }
            .stat-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background: #1A2332; color: white; text-align: left; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
            td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; }
            tr:nth-child(even) { background: #F8FAFC; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8; }
            @media print { body { padding: 20px; } .stats-grid { grid-template-columns: repeat(4, 1fr); } }
          </style></head><body>
            <div class="header">
              <h1>StayNepal — Master Report</h1>
              <p>System Report • Generated: ${reportDate}</p>
            </div>

            <div class="stats-grid">
              <div class="stat-box"><div class="value">${report.hotels.length}</div><div class="label">Total Hotels</div></div>
              <div class="stat-box"><div class="value">${report.admins.length}</div><div class="label">Hotel Managers</div></div>
              <div class="stat-box"><div class="value">${report.guestCount}</div><div class="label">Registered Guests</div></div>
              <div class="stat-box"><div class="value">NRS ${Number(report.bookingStats.total_revenue || 0).toLocaleString()}</div><div class="label">Total Revenue</div></div>
            </div>

            <div class="stats-grid">
              <div class="stat-box"><div class="value">${report.bookingStats.total_bookings || 0}</div><div class="label">Total Bookings</div></div>
              <div class="stat-box"><div class="value">${report.bookingStats.confirmed || 0}</div><div class="label">Confirmed</div></div>
              <div class="stat-box"><div class="value">${report.bookingStats.completed || 0}</div><div class="label">Completed</div></div>
              <div class="stat-box"><div class="value">${report.bookingStats.cancelled || 0}</div><div class="label">Cancelled</div></div>
            </div>

            <div class="section">
              <h2>Hotel Performance</h2>
              <table>
                <thead><tr><th>Hotel Name</th><th>City</th><th>Bookings</th><th>Revenue (NRS)</th></tr></thead>
                <tbody>
                  ${report.hotelPerformance.map(h => `<tr><td>${h.name}</td><td>${h.city}</td><td>${h.bookings || 0}</td><td>${Number(h.revenue || 0).toLocaleString()}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Registered Hotels</h2>
              <table>
                <thead><tr><th>Hotel Name</th><th>City</th><th>Country</th><th>Registered On</th></tr></thead>
                <tbody>
                  ${report.hotels.map(h => `<tr><td>${h.name}</td><td>${h.city}</td><td>${h.country}</td><td>${new Date(h.created_at).toLocaleDateString()}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Hotel Managers</h2>
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Assigned Hotel</th></tr></thead>
                <tbody>
                  ${report.admins.map(a => `<tr><td>${a.full_name}</td><td>${a.email}</td><td>${a.hotel_name || '—'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} StayNepal Platform • Confidential System Report</p>
            </div>
          </body></html>
        `;
}
