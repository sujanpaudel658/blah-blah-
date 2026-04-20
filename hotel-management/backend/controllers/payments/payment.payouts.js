const { db } = require('./payment.shared');

const requestPayout = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const hotelId = req.user.hotel_id;

    if (!hotelId) return res.status(403).json({ success: false, message: 'Only hotel admins can request payouts.' });
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid payout amount.' });

    const [hotels] = await db.query("SELECT balance FROM hotels WHERE id = ?", [hotelId]);
    if (hotels.length === 0) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    
    const availableBalance = Number(hotels[0].balance);
    if (amount > availableBalance) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: Rs. ${availableBalance.toLocaleString()}` });
    }

    const [pending] = await db.query("SELECT id FROM hotel_payout_requests WHERE hotel_id = ? AND status = 'pending'", [hotelId]);
    if (pending.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending payout request.' });
    }

    await db.query(
      "INSERT INTO hotel_payout_requests (hotel_id, amount, notes) VALUES (?, ?, ?)",
      [hotelId, amount, notes || 'Standard payout request']
    );

    res.json({ success: true, message: 'Payout request submitted successfully. SuperAdmin will review it shortly.' });
  } catch (error) {
    console.error('Payout Request Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit payout request.' });
  }
};

const getPendingPayouts = async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, h.name as hotel_name, h.balance as current_balance
      FROM hotel_payout_requests pr
      JOIN hotels h ON pr.hotel_id = h.id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `);
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

const approvePayout = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { requestId, adminNotes } = req.body;

    const [requests] = await connection.query("SELECT * FROM hotel_payout_requests WHERE id = ?", [requestId]);
    if (requests.length === 0) return res.status(404).json({ success: false, message: 'Request missing' });
    const request = requests[0];

    if (request.status !== 'pending') {
       return res.status(400).json({ success: false, message: 'Request already processed.' });
    }

    const [hotels] = await connection.query("SELECT balance FROM hotels WHERE id = ?", [request.hotel_id]);
    if (hotels.length === 0) throw new Error('Hotel not found');
    
    if (Number(hotels[0].balance) < Number(request.amount)) {
       throw new Error('Insufficient hotel balance at time of approval.');
    }

    await connection.query("UPDATE hotels SET balance = balance - ? WHERE id = ?", [request.amount, request.hotel_id]);
    await connection.query("UPDATE hotel_payout_requests SET status = 'completed', admin_notes = ? WHERE id = ?", [adminNotes || 'Approved and processed', requestId]);
    await connection.query(
      `INSERT INTO hotel_payout_transactions
       (payout_request_id, hotel_id, amount, transaction_reference, status, processed_by, processed_at, notes)
       VALUES (?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP, ?)`,
      [
        requestId,
        request.hotel_id,
        request.amount,
        `PAYOUT-${requestId}-${Date.now()}`,
        req.user.id,
        adminNotes || 'Approved and processed'
      ]
    );

    await connection.commit();
    res.json({ success: true, message: 'Payout approved and balance updated.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message || 'Approval failed' });
  } finally {
    connection.release();
  }
};

const rejectPayout = async (req, res) => {
  try {
    const { requestId, adminNotes } = req.body;
    await db.query("UPDATE hotel_payout_requests SET status = 'rejected', admin_notes = ? WHERE id = ?", [adminNotes, requestId]);
    res.json({ success: true, message: 'Payout request rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Rejection failed' });
  }
};


module.exports = {
  requestPayout,
  getPendingPayouts,
  approvePayout,
  rejectPayout
};
