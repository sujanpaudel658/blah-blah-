const express = require('express');
const router = express.Router();
const { testEmailConnection } = require('../services/email.service');

// GET /api/test-email
router.get('/test-email', async (req, res) => {
  try {
    const result = await testEmailConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
