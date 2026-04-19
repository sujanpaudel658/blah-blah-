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

function getKey() {
    return normalizeEnvKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '');
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

async function askGemini(systemPrompt, userPrompt, history) {
    const key = getKey();
    if (!key) {
        console.warn('Gemini: no GEMINI_API_KEY / GOOGLE_AI_API_KEY in env (check backend/.env and restart server).');
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

    for (let mi = 0; mi < modelsToTry.length; mi++) {
        const model = modelsToTry[mi];
        const url =
            'https://generativelanguage.googleapis.com/v1beta/models/' +
            model +
            ':generateContent?key=' +
            encodeURIComponent(key);

        try {
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
                return null;
            }

            if (cand.finishReason && cand.finishReason !== 'STOP' && cand.finishReason !== 'MAX_TOKENS') {
                console.warn('Gemini finishReason:', cand.finishReason, cand.safetyRatings ? JSON.stringify(cand.safetyRatings) : '');
            }

            const txt = extractTextFromCandidate(cand);
            if (!txt) {
                console.warn('Gemini returned no text (finishReason:', cand.finishReason || 'n/a', ')');
                return null;
            }

            return txt;
        } catch (e) {
            const status = e.response && e.response.status;
            const detail =
                e.response && e.response.data
                    ? JSON.stringify(e.response.data)
                    : e.message;
            console.error(`Gemini request failed (${model}) status=${status}:`, detail);

            if (status === 401 || status === 403) {
                console.error('Gemini API key invalid or forbidden — fix GEMINI_API_KEY in backend/.env');
                return null;
            }

            const isLast = mi === modelsToTry.length - 1;
            const retryable = status === 404 || status === 429 || status === 500 || status === 503;
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
            return null;
        }
    }

    return null;
}

module.exports = { askGemini, getKey };
