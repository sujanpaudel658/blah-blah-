/**
 * Base URL for links in emails (verify, reset). Uses the browser's origin when safe,
 * so LAN / changing Wi‑Fi works without editing .env each time.
 */
function resolveFrontendBase(clientOrigin) {
    const fallback = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const raw = (clientOrigin || '').trim();
    if (!raw) return fallback;

    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        return fallback;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback;

    const h = parsed.hostname.toLowerCase();
    const privateOk =
        h === 'localhost' ||
        h === '127.0.0.1' ||
        h === '[::1]' ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h);

    let envHost = null;
    try {
        envHost = new URL(fallback).hostname.toLowerCase();
    } catch {
        /* ignore */
    }
    const matchesDeployed = envHost && h === envHost;

    if (privateOk || matchesDeployed) {
        return `${parsed.protocol}//${parsed.host}`;
    }

    return fallback;
}

module.exports = { resolveFrontendBase };
