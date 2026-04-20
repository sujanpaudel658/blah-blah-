const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Default 127.0.0.1: Docker sets PROXY_TARGET; localhost can hit ::1 vs IPv4 listen issues on Node 17+.
  const target =
    process.env.PROXY_TARGET || process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

  // pathFilter: mounting only /api strips the prefix and breaks /api/* on the backend.
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: ['/api', '/uploads']
    })
  );
};
