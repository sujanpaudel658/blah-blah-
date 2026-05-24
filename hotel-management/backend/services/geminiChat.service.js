const axios = require('axios');
const path = require('path');

// Dotenv before first env read .
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function normalizeEnvKey(raw) {
    if (raw == null) return '';
    let s = String(raw).trim();
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1).trim();
    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        s = s.slice(1, -1).trim();
    }
    return s;
}

/** Primary key (backward compatible). */
function getKey() {
    const keys = getApiKeys();
    return keys[0] || '';
}

/** Primary first, then GEMINI_API_KEY_2 — used only when primary quota/rate limit fails. */
function getApiKeys() {
    const primary = normalizeEnvKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '');
    const secondary = normalizeEnvKey(process.env.GEMINI_API_KEY_2 || '');
    const keys = [];
    if (primary) keys.push(primary);
    if (secondary && secondary !== primary) keys.push(secondary);
    return keys;
}

function getModel() {
    return (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
}

function getRequestTimeoutMs() {
    const raw = Number(process.env.GEMINI_TIMEOUT_MS || 12000);
    return Number.isFinite(raw) && raw >= 3000 ? raw : 12000;
}

function getMaxModelAttempts() {
    const raw = Number(process.env.GEMINI_MAX_MODEL_ATTEMPTS || 2);
    return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 4) : 2;
}

function extractTextFromCandidate(cand) {
    const parts = cand && cand.content && cand.content.parts;
    if (!Array.isArray(parts) || !parts.length) return '';
    const chunks = [];
    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p && typeof p.text === 'string') {
            const t = p.text.trim();
            if (t) chunks.push(t);
        }
    }
    return chunks.join('\n\n').trim();
}

function appendContent(contents, role, text) {
    const t = String(text || '').trim();
    if (!t) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
        last.parts[0].text += '\n\n' + t;
    } else {
        contents.push({ role, parts: [{ text: t }] });
    }
}

function isQuotaOrKeyLimitError(status, detail) {
    if (status === 429) return true;
    const msg = String(detail || '').toLowerCase();
    return (
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('resource_exhausted') ||
        msg.includes('exceeded')
    );
}

async function requestGeminiModel(key, model, body) {
    const url =
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        model +
        ':generateContent?key=' +
        encodeURIComponent(key);

    const res = await axios.post(url, body, {
        timeout: getRequestTimeoutMs(),
        headers: { 'Content-Type': 'application/json' }
    });

    const data = res.data || {};
    const cand = data.candidates && data.candidates[0];
    if (!cand) {
        if (data.promptFeedback) {
            console.error('Gemini empty candidates:', JSON.stringify(data.promptFeedback));
        } else {
            console.error('Gemini empty candidates (no promptFeedback in response)');
        }
        return { ok: false, reason: 'empty' };
    }

    if (cand.finishReason && cand.finishReason !== 'STOP' && cand.finishReason !== 'MAX_TOKENS') {
        console.warn('Gemini finishReason:', cand.finishReason, cand.safetyRatings ? JSON.stringify(cand.safetyRatings) : '');
    }

    const txt = extractTextFromCandidate(cand);
    if (!txt) {
        console.warn('Gemini returned no text (finishReason:', cand.finishReason || 'n/a', ')');
        return { ok: false, reason: 'empty' };
    }

    return { ok: true, text: txt };
}

async function askGeminiWithKey(key, keyIndex, modelsToTry, body) {
    let quotaExhausted = false;
    let keyInvalid = false;

    for (let mi = 0; mi < modelsToTry.length; mi++) {
        const model = modelsToTry[mi];
        try {
            const result = await requestGeminiModel(key, model, body);
            if (result.ok) {
                return { text: result.text };
            }
        } catch (e) {
            const status = e.response && e.response.status;
            const detail =
                e.response && e.response.data
                    ? JSON.stringify(e.response.data)
                    : e.message;
            console.error(`Gemini request failed (key#${keyIndex + 1}, ${model}) status=${status}:`, detail);

            if (status === 401 || status === 403) {
                keyInvalid = true;
                break;
            }

            if (isQuotaOrKeyLimitError(status, detail)) {
                quotaExhausted = true;
                break;
            }

            const isLast = mi === modelsToTry.length - 1;
            const retryable = status === 404 || status === 500 || status === 503;
            if (!isLast && retryable) {
                console.warn(`Gemini: trying next model (had status ${status} on ${model})…`);
                continue;
            }

            const transientNet =
                !e.response &&
                (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET');
            if (!isLast && transientNet) {
                console.warn(`Gemini: network issue on ${model} — trying next model…`);
                continue;
            }
        }
    }

    if (quotaExhausted) return { quotaExhausted: true };
    if (keyInvalid) return { keyInvalid: true };
    return null;
}

async function askGemini(systemPrompt, userPrompt, history) {
    const keys = getApiKeys();
    if (!keys.length) {
        console.warn('Gemini: no GEMINI_API_KEY / GEMINI_API_KEY_2 in env (check backend/.env and restart server).');
        return null;
    }

    const preferredModel = getModel();
    const fallbackModels = [
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest'
    ];
    const modelsToTry = [preferredModel, ...fallbackModels.filter((m) => m !== preferredModel)].slice(
        0,
        getMaxModelAttempts()
    );

    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
        const slice = history.slice(-8);
        let start = 0;
        while (
            start < slice.length &&
            (slice[start].role === 'assistant' || slice[start].role === 'model')
        ) {
            start++;
        }
        for (let i = start; i < slice.length; i++) {
            const h = slice[i];
            const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
            const t = String(h.text || '').trim().slice(0, 2500);
            if (!t) continue;
            appendContent(contents, role, t);
        }
    }
    appendContent(contents, 'user', String(userPrompt || '').slice(0, 8000));

    if (!contents.length) {
        return null;
    }

    const body = {
        systemInstruction: {
            parts: [{ text: String(systemPrompt || '').slice(0, 12000) }]
        },
        contents,
        generationConfig: {
            maxOutputTokens: 900,
            temperature: 0.62
        }
    };

    for (let ki = 0; ki < keys.length; ki++) {
        const result = await askGeminiWithKey(keys[ki], ki, modelsToTry, body);
        if (result && result.text) {
            if (ki > 0) {
                console.warn(`Gemini: response served by fallback key #${ki + 1}`);
            }
            return result.text;
        }

        const hasFallback = ki < keys.length - 1;
        if (hasFallback && result && (result.quotaExhausted || result.keyInvalid)) {
            const reason = result.quotaExhausted ? 'quota/rate limit reached' : 'key rejected';
            console.warn(`Gemini: primary key ${reason} — switching to GEMINI_API_KEY_2…`);
            continue;
        }
    }

    return null;
}

module.exports = { askGemini, getKey, getApiKeys };
