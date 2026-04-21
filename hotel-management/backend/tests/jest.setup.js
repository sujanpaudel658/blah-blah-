afterAll(async () => {
  try {
    const db = require('../config/db');
    if (db && typeof db.end === 'function') {
      await db.end();
    }
  } catch (error) {
    // Ignore teardown errors to avoid masking test outcomes.
  }
});
