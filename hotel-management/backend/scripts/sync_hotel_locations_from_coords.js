
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');
const { resolveHotelLocationFields } = require('../utils/hotelLocation');

async function main() {
  const [rows] = await db.query(
    'SELECT id, name, city, address, country, latitude, longitude FROM hotels WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
  );
  console.log(`Syncing location text for ${rows.length} hotel(s)...`);
  for (const h of rows) {
    const loc = await resolveHotelLocationFields(h);
    await db.query(
      'UPDATE hotels SET city = ?, address = ?, country = ?, latitude = ?, longitude = ? WHERE id = ?',
      [loc.city, loc.address, loc.country, loc.latitude, loc.longitude, h.id]
    );
    console.log(`  #${h.id} ${h.name}: ${loc.city}, ${loc.country}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
