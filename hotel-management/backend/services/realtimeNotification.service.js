const jwt = require('jsonwebtoken');
const db = require('../config/db');

const channels = new Map();

const buildKey = (role, userId) => `${role}:${userId ?? 'system'}`;

const subscribe = ({ role, userId, res }) => {
  const key = buildKey(role, userId);
  if (!channels.has(key)) channels.set(key, new Set());
  channels.get(key).add(res);
};

const unsubscribe = ({ role, userId, res }) => {
  const key = buildKey(role, userId);
  const set = channels.get(key);
  if (!set) return;
  set.delete(res);
  if (!set.size) channels.delete(key);
};

const publish = ({ role, userId, event, payload }) => {
  const targets = [
    buildKey(role, userId),
    buildKey(role, null)
  ];

  targets.forEach((key) => {
    const subs = channels.get(key);
    if (!subs) return;
    for (const res of subs) {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (_) {
        // noop; broken connection will be cleaned by close handler
      }
    }
  });
};

const resolveSseUser = async (req) => {
  const header = req.headers.authorization || '';
  const tokenFromHeader = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const tokenFromQuery = req.query.token ? String(req.query.token) : null;
  const token = tokenFromHeader || tokenFromQuery;
  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const [rows] = await db.query(
    `SELECT id, role FROM users WHERE id = ? LIMIT 1`,
    [decoded.id]
  );
  if (!rows.length) return null;
  return rows[0];
};

module.exports = {
  subscribe,
  unsubscribe,
  publish,
  resolveSseUser
};
