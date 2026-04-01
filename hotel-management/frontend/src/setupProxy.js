const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Docker: PROXY_TARGET=http://backend:5000. Host dev: use 127.0.0.1 (not "localhost") — Node 17+ often resolves
  // localhost to ::1 while Express listens on IPv4 only, which breaks the proxy with ECONNREFUSED.
  const target =
    process.env.PROXY_TARGET || process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

  // http-proxy-middleware v3 + app.use('/api', proxy) strips the mount from req.url, so the backend saw
  // POST /auth/signup instead of /api/auth/signup → "Cannot POST /auth/signup". Mount at / and use pathFilter.
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: ['/api', '/uploads']
    })
  );
};
