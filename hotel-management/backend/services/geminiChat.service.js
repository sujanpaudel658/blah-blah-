const axios = require('axios');

// Plain call to Google AI Studio / Gemini. Key must live in backend/.env — never commit it.

function normalizeEnvKey(raw) {
    if (raw == null) return '';
    let s = String(raw).trim();
    // Strip UTF-8 BOM if .env was saved with one
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
    // New AI Studio keys often no longer expose gemini-1.5-flash (404). 2.5-flash is current default.
    return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
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

/**
 * Sends system + optional chat history + latest user text to Gemini.
 * history: [{ role: 'user'|'assistant', text }] — last few turns only, trimmed server-side.
 */
async function askGemini(systemPrompt, userPrompt, history) {
    const key = getKey();
    if (!key) {
        console.warn('Gemini: no GEMINI_API_KEY / GOOGLE_AI_API_KEY in env (check backend/.env and restart server).');
        return null;
    }

    const preferredModel = getModel();
    // Order tuned for keys where 1.5 returns 404 and quotas differ per model (429 → try next).
    const fallbackModels = [
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest'
    ];
    const modelsToTry = [preferredModel, ...fallbackModels.filter((m) => m !== preferredModel)];

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
                timeout: 45000,
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

            const part0 = cand.content && cand.content.parts && cand.content.parts[0];
            const txt = part0 && part0.text;
            if (!txt || !String(txt).trim()) {
                console.warn('Gemini returned no text (finishReason:', cand.finishReason || 'n/a', ')');
                return null;
            }

            return String(txt).trim();
        } catch (e) {
            const status = e.response && e.response.status;
            const detail =
                e.response && e.response.data
                    ? JSON.stringify(e.response.data)
                    : e.message;
            console.error(`Gemini request failed (${model}) status=${status}:`, detail);

            const isLast = mi === modelsToTry.length - 1;
            if (!isLast && (status === 404 || status === 429)) {
                console.warn(
                    `Gemini: ${status === 404 ? 'model not found' : 'quota/rate limit'} on ${model} — trying next model…`
                );
                continue;
            }
            return null;
        }
    }

    return null;
}

module.exports = { askGemini, getKey };
