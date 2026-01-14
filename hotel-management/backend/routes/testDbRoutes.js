const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/test-db
router.get('/test-db', (req, res) => {
  pool.query('SELECT 1 AS test', (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, results });
  });
});

module.exports = router;
