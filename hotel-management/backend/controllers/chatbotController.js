const db = require('../config/db');
const { askGemini, getKey } = require('../services/geminiChat.service');
const crypto = require('crypto');

/** Cache verified city names for fuzzy location extraction (refreshed periodically). */
let _verifiedCitiesCache = { list: null, at: 0 };
const CITY_CACHE_MS = 5 * 60 * 1000;

async function getVerifiedCities() {
    const now = Date.now();
    if (_verifiedCitiesCache.list && now - _verifiedCitiesCache.at < CITY_CACHE_MS) {
        return _verifiedCitiesCache.list;
    }
    const [rows] = await db.query(
        "SELECT DISTINCT TRIM(city) AS city FROM hotels WHERE status = 'verified' AND city IS NOT NULL AND TRIM(city) != ''"
    );
    const list = rows.map(r => String(r.city).trim()).filter(Boolean);
    _verifiedCitiesCache = { list, at: now };
    return list;
}

// Short list of hotels we pass to Gemini so it does not invent places.
async function buildHotelFactsForAi() {
    try {
        const [rows] = await db.query(
            `SELECT h.name, h.city, h.rating, MIN(rt.base_price) AS min_price
             FROM hotels h
             INNER JOIN room_types rt ON rt.hotel_id = h.id
             WHERE h.status = 'verified'
             GROUP BY h.id, h.name, h.city, h.rating
             ORDER BY h.city, h.name
             LIMIT 40`
        );
        if (!rows.length) {
            return 'No verified hotels loaded yet.';
        }
        const lines = [];
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            lines.push(
                '- ' + r.name + ' | ' + r.city + ' | from Rs.' + r.min_price + '/night | ' + r.rating + '/5'
            );
        }
        return lines.join('\n');
    } catch (err) {
        console.error('buildHotelFactsForAi:', err.message);
        return '';
    }
}

// Extra grounding for Gemini: city coverage + hotel lines (keeps answers tied to real data).
async function buildAiGroundingContext() {
    const hotelLines = await buildHotelFactsForAi();
    let citySummary = '';
    try {
        const [cityRows] = await db.query(
            `SELECT TRIM(city) AS city, COUNT(*) AS cnt 
             FROM hotels WHERE status = 'verified' AND city IS NOT NULL AND TRIM(city) != '' 
             GROUP BY TRIM(city) ORDER BY cnt DESC LIMIT 15`
        );
        citySummary = cityRows.map((r) => `${r.city} (${r.cnt} verified hotels)`).join('; ');
    } catch (e) {
        citySummary = 'unavailable';
    }
    return (
        'COVERAGE — cities with verified hotel counts: ' +
        citySummary +
        '\n\nSAMPLE HOTELS (live; do not invent others):\n' +
        hotelLines
    );
}

function normalizeChatHistory(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
        const h = raw[i];
        if (!h || typeof h.text !== 'string') continue;
        const t = h.text.trim();
        if (!t) continue;
        const role = h.role === 'assistant' || h.role === 'model' ? 'assistant' : 'user';
        out.push({ role, text: t.slice(0, 2000) });
    }
    return out.slice(-8);
}

function normalizeForParse(raw) {
    return String(raw)
        .toLowerCase()
        .replace(/[\u2018\u2019\u201B\u2032\u2035]/g, "'")
        .replace(/\s+/g, ' ')
        .replace(/[,!?]+/g, ' ')
        .trim();
}

function applyCityAbbreviations(s) {
    const abbrevs = {
        ktm: 'kathmandu',
        pkr: 'pokhara',
        bkt: 'bhaktapur',
        lal: 'lalitpur'
    };
    let out = s;
    for (const [abbr, full] of Object.entries(abbrevs)) {
        out = out.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
    }
    return out;
}

function extractCityFromPatterns(lowerMsg) {
    const m = lowerMsg.match(
        /\b(?:in|near|around|at)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})\b/i
    );
    if (!m) return null;
    return m[1].trim().replace(/[.,!?"']/g, '');
}

function extractCityFromKnownList(lowerMsg, knownCities) {
    if (!knownCities || !knownCities.length) return null;
    const sorted = [...knownCities].sort((a, b) => b.length - a.length);
    const hay = lowerMsg;
    for (const city of sorted) {
        const c = city.toLowerCase();
        if (c.length < 3) continue;
        const re = new RegExp(`(^|[^a-z])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
        if (re.test(hay)) return city;
    }
    return null;
}

async function resolveCity(lowerMsg, knownCities) {
    const fromPattern = extractCityFromPatterns(lowerMsg);
    if (fromPattern) return fromPattern;
    return extractCityFromKnownList(lowerMsg, knownCities);
}

function extractGuestCount(lowerMsg) {
    const digitMatch = lowerMsg.match(/\b(\d+)\s*(people|guests|persons|person|adults|adult)\b/i);
    if (digitMatch) {
        const n = parseInt(digitMatch[1], 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    const familyMatch = lowerMsg.match(/\bfamily\s+of\s+(\d+)\b/i);
    if (familyMatch) {
        const n = parseInt(familyMatch[1], 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    const words = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };
    const wordPeople = lowerMsg.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(people|guests|persons|person)\b/i);
    if (wordPeople && words[wordPeople[1]]) return words[wordPeople[1]];
    if (/\b(me\s+and\s+my\s+(wife|husband|partner)|two\s+of\s+us|both\s+of\s+us)\b/i.test(lowerMsg)) return 2;
    if (/\b(solo|alone|just\s+me|only\s+me)\b/i.test(lowerMsg)) return 1;
    return null;
}

function wantsLocationAction(lowerMsg) {
    return /(where|located|location|address|city|place|find it|map|maps|directions|route|coordinates|near me|nearby|how to get|google maps)/i.test(
        lowerMsg
    );
}

function wantsCheapest(lowerMsg) {
    return /(cheapest|lowest price|lowest|budget|affordable|cheap\b|wallet|economical|inexpensive|bang for|value\b)/i.test(
        lowerMsg
    );
}

function wantsBestRated(lowerMsg) {
    return (
        /(best rated|highest rated|top rated|most good|well rated|best rating|top rating|great reviews|well reviewed|five star|5 star)/i.test(
            lowerMsg
        ) ||
        (/\b(best|top|highest)\b/i.test(lowerMsg) && /\b(rated|rating|reviews?)\b/i.test(lowerMsg))
    );
}

function pickVariant(variants, seed) {
    const s = String(seed || '').length;
    return variants[s % variants.length];
}

function formatNumberedHotels(rows, labelFn) {
    return rows.map((r, i) => `${i + 1}) ${labelFn(r)}`).join('\n');
}

function summarizePriceRating(rows) {
    if (!rows || rows.length === 0) return '';
    let cheapest = rows[0];
    let bestRated = rows[0];
    for (const r of rows) {
        const p = Number(r.starting_price);
        const pc = Number(cheapest.starting_price);
        if (!Number.isNaN(p) && (Number.isNaN(pc) || p < pc)) cheapest = r;
        const ra = Number(r.rating) || 0;
        const rb = Number(bestRated.rating) || 0;
        if (ra > rb || (ra === rb && (Number(r.starting_price) || 0) < (Number(bestRated.starting_price) || 0))) {
            bestRated = r;
        }
    }
    if (cheapest.id === bestRated.id) {
        return `\n\nAmong these, ${cheapest.name} has the strongest balance of starting price and rating in this list.`;
    }
    return `\n\nQuick read: ${cheapest.name} has the lowest starting price here, and ${bestRated.name} leads on guest rating.`;
}

function followUpLine(kind, city) {
    const place = city ? ` in ${city}` : '';
    switch (kind) {
        case 'cheapest':
            return `\n\nWould you like the highest-rated picks${place} next, or see one on the map?`;
        case 'rated':
            return `\n\nWant budget-friendly options${place} next, or contact details for one of these?`;
        case 'guests':
            return `\n\nI can also show the cheapest or top-rated hotels${place} if you say which you prefer.`;
        case 'citylist':
            return `\n\nTry “cheapest in ${city || '…'}” or “top rated in ${city || '…'}” to narrow it down.`;
        case 'nepalwide':
            return `\n\nTell me a city (for example Kathmandu or Pokhara) and I’ll tailor the list.`;
        case 'recommend':
            return `\n\nSay a city name and I’ll focus the search there.`;
        case 'contact':
            return `\n\nAsk “where is it” for the map, or “price” for starting rates.`;
        case 'location':
            return `\n\nNeed the phone or email too? Say “contact”.`;
        case 'pricing':
            return `\n\nWant the exact address or map next? Say “location”.`;
        default:
            return '';
    }
}

function isSmallTalkGreeting(lowerMsg) {
    return (
        /^(hi|hello|hey|hai|sup|yo)\b/i.test(lowerMsg.trim()) ||
        /\b(hi|hello|hey)\b.*\b(there|friend)\b/i.test(lowerMsg) ||
        /^(good\s+(morning|afternoon|evening))\b/i.test(lowerMsg.trim())
    );
}

function isHelpOrCapability(lowerMsg) {
    return /(what can you do|how does (this|booking)|what do you do|capabilities|help me|need help\b|^help$|who are you)/i.test(lowerMsg);
}

function isThanks(lowerMsg) {
    return /(thank you|thanks|thx|ty\b|much appreciated|cheers\b)/i.test(lowerMsg);
}

function isBye(lowerMsg) {
    return /\b(bye|goodbye|see you|cya|later)\b/i.test(lowerMsg);
}

// When Gemini answered, still attach a hotel row for the map button if the user asked for location/map.
async function tryAttachHotelDataForMap(lowerMsg, effectiveCity, lastHotel) {
    const wantLoc =
        wantsLocationAction(lowerMsg) ||
        /\b(where\s+is|address\s+of|located|location|map|directions)\b/i.test(lowerMsg);
    if (!wantLoc) return null;

    if (lastHotel && lastHotel.latitude != null && lastHotel.longitude != null) {
        const nm = (lastHotel.name || '').toLowerCase();
        if (nm && lowerMsg.includes(nm.slice(0, Math.min(10, nm.length)))) return lastHotel;
    }

    const c = effectiveCity;
    const candidateWhere = c
        ? "WHERE status = 'verified' AND (city LIKE ? OR name LIKE ?)"
        : "WHERE status = 'verified'";
    const candidateParams = c ? [`%${c}%`, `%${c}%`] : [];

    try {
        const [rows] = await db.query(
            `
            SELECT id, name, address, city, phone, email, description, rating, latitude, longitude
            FROM hotels
            ${candidateWhere}
            ORDER BY rating DESC
            LIMIT 40
            `,
            candidateParams
        );
        if (!rows.length) return null;
        const matched = rows.find((h) => lowerMsg.includes((h.name || '').toLowerCase())) || null;
        return matched || rows[0];
    } catch (e) {
        return null;
    }
}

function buildSessionKey() {
    return `chat_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

async function ensureChatSession({ sessionKey, userId, source, context }) {
    const normalizedSessionKey = String(sessionKey || '').trim() || buildSessionKey();
    const [rows] = await db.query('SELECT id FROM chat_sessions WHERE session_key = ? LIMIT 1', [normalizedSessionKey]);

    if (rows.length > 0) {
        await db.query(
            'UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [rows[0].id]
        );
        return { id: rows[0].id, sessionKey: normalizedSessionKey };
    }

    const [ins] = await db.query(
        `INSERT INTO chat_sessions (user_id, session_key, source, context, last_message_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId || null, normalizedSessionKey, source || 'guest', JSON.stringify(context || {})]
    );

    return { id: ins.insertId, sessionKey: normalizedSessionKey };
}

async function saveChatMessage({ sessionId, userId, role, text, intent, metadata }) {
    if (!sessionId || !text) return;
    await db.query(
        `INSERT INTO chat_messages (session_id, user_id, role, message_text, intent, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, userId || null, role, text, intent || null, JSON.stringify(metadata || {})]
    );
    await db.query('UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
}

exports.queryChatbot = async (req, res) => {
    try {
        const { message, lastHotel, lastCity, history, sessionKey } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const session = await ensureChatSession({
            sessionKey,
            userId: req.user?.id || null,
            source: req.user?.role === 'admin' || req.user?.role === 'superadmin' ? 'admin' : (req.user ? 'user' : 'guest'),
            context: { lastCity: lastCity || null }
        });

        await saveChatMessage({
            sessionId: session.id,
            userId: req.user?.id || null,
            role: 'user',
            text: String(message).slice(0, 5000),
            metadata: { lastCity: lastCity || null }
        });

        const chatHistory = normalizeChatHistory(history);
        let replyMode = 'rules';

        const rawMsg = String(message);
        const normalized = normalizeForParse(applyCityAbbreviations(normalizeForParse(rawMsg)));
        const lowerMsg = normalized;

        let response = '';
        let data = lastHotel || null;

        const knownCities = await getVerifiedCities();
        let city = await resolveCity(lowerMsg, knownCities);
        const ctxCity = city || (lastCity && String(lastCity).trim()) || (lastHotel && lastHotel.city) || null;
        let guestCount = extractGuestCount(lowerMsg);

        if (!city && ctxCity && !extractCityFromPatterns(lowerMsg)) {
            const usesContext =
                /\b(same|that|there|it|this|again|those|them|also|cheaper|more|another|map|contact|price|where)\b/i.test(
                    lowerMsg
                ) ||
                (guestCount && /\b(for|with)\b/i.test(lowerMsg) && lowerMsg.length < 80);
            if (usesContext) city = ctxCity;
        }

        if (!guestCount && ctxCity && /\b(for|with)\s+(us|two|three|four|family|guests)\b/i.test(lowerMsg)) {
            guestCount = extractGuestCount(lowerMsg) || extractGuestCount(lowerMsg + ' two guests');
        }

        const searchIntent = /(find|search|show|look for|list|available|hotel|hotels|stays|book|booking|any\s+(good|nice)|where\s+to\s+stay)/i.test(
            lowerMsg
        );
        const intents = {
            greeting:
                (isSmallTalkGreeting(lowerMsg) || isHelpOrCapability(lowerMsg)) &&
                !(searchIntent && (city || wantsCheapest(lowerMsg) || wantsBestRated(lowerMsg) || guestCount)),
            search: searchIntent,
            contact: /(contact|phone|email|call|reach|number|whatsapp)/i.test(lowerMsg),
            location: wantsLocationAction(lowerMsg),
            pricing: /(price|cost|how much|rate|pricing|expensive|cheap\s+(night|room))/i.test(lowerMsg),
            recommend: /(recommend|suggest|best|top|good|stay)/i.test(lowerMsg)
        };

        let followKind = null;
        let geminiHandled = false;

        // Prefer Gemini whenever the API key is set; rules/SQL only if Gemini returns nothing.
        if (getKey()) {
            const grounding = await buildAiGroundingContext();
            const primarySystem =
                'You are the primary Nepal Stays assistant for verified hotels in Nepal. ' +
                'Use conversation HISTORY for follow-ups. Plain text only. ' +
                'All hotel names, cities, prices, and contacts MUST come from GROUNDING — never invent listings. ' +
                'Cheapest / budget / lowest price: list from GROUNDING for the right city, sorted by lowest starting price first. ' +
                'Best rated / top / luxury: sort by rating high to low from GROUNDING. ' +
                'Group size: pick sensible options from GROUNDING; if unsure, suggest checking room types on the site. ' +
                'Contact details: quote phone/email from GROUNDING when a hotel is clear. ' +
                'Map / where / address: give the address from GROUNDING for a specific hotel you name. ' +
                'Booking and payment: users finish on the website (Khalti or pay at hotel). Never ask for passwords, OTPs, or card numbers. ' +
                'Thanks and goodbye: short, warm replies. ' +
                'If GROUNDING is empty or the topic is unrelated to Nepal hotels, say what Nepal Stays is and point to the site.';
            const userBlock = 'GROUNDING:\n' + grounding + '\n\nUSER MESSAGE:\n' + rawMsg;
            const aiText = await askGemini(primarySystem, userBlock, chatHistory);
            if (aiText && String(aiText).trim()) {
                response = String(aiText).trim();
                replyMode = 'gemini';
                followKind = null;
                geminiHandled = true;
                const attach = await tryAttachHotelDataForMap(lowerMsg, ctxCity || city, lastHotel);
                if (attach && attach.latitude != null && attach.longitude != null) {
                    data = attach;
                }
            }
        }

        if (!geminiHandled) {
            replyMode = 'rules';

        // 0) Thanks / bye (short, natural)
        if (isThanks(lowerMsg) && lowerMsg.length < 80) {
            response = pickVariant(
                [
                    'You’re welcome — happy to help with Nepal Stays.',
                    'Glad I could help! Ask anytime about hotels or locations.',
                    'Any time. Say a city or “cheapest in …” whenever you’re ready.'
                ],
                lowerMsg
            );
        } else if (isBye(lowerMsg) && lowerMsg.length < 60) {
            response = pickVariant(
                [
                    'Goodbye — enjoy planning your stay.',
                    'See you later. Have a great trip!',
                    'Take care — come back if you need more hotel ideas.'
                ],
                lowerMsg
            );
        }
        // 1) Greeting/help (rules fallback when Gemini unavailable)
        else if (intents.greeting) {
            response = pickVariant(
                [
                    "Hi! I'm your Nepal Stays assistant. I can find cheapest or top-rated verified hotels, rooms that fit your group size, plus contact, location/map, and starting prices — all from live listings.\n\nTip: try \"cheapest hotels in Pokhara\" or \"hotels for 4 guests in Kathmandu\".",
                    'Hello! Ask me in plain words: e.g. "budget stays in Kathmandu", "best rated in Pokhara", "where is [hotel]", or "price for [hotel]". I use verified data only.',
                    'Hey! I help you explore verified hotels: sort by price or rating, filter by guests, or get phone, address, or map. Which city are you thinking of?'
                ],
                lowerMsg
            );
            followKind = 'nepalwide';
        }
        // 2) Cheapest hotels
        else if (wantsCheapest(lowerMsg) && intents.search) {
            const params = [];
            let where = "WHERE h.status = 'verified'";
            if (city) {
                where += ' AND (h.city LIKE ? OR h.name LIKE ?)';
                params.push(`%${city}%`, `%${city}%`);
            }

            const [rows] = await db.query(
                `
                SELECT
                    h.id,
                    h.name,
                    h.city,
                    h.rating,
                    h.address,
                    h.latitude,
                    h.longitude,
                    MIN(rt.base_price) AS starting_price
                FROM hotels h
                JOIN room_types rt ON rt.hotel_id = h.id
                ${where}
                GROUP BY h.id, h.name, h.city, h.rating, h.address, h.latitude, h.longitude
                ORDER BY starting_price ASC, h.rating DESC
                LIMIT 5
                `,
                params
            );

            if (rows.length === 0) {
                response = city
                    ? pickVariant(
                          [
                              `I couldn’t find verified hotels in ${city} with those filters.`,
                              `No verified listings showed up for ${city} right now — try another area or spelling.`
                          ],
                          lowerMsg
                      )
                    : pickVariant(
                          [
                              'I couldn’t find any verified hotels right now.',
                              'No verified hotels are available to show at the moment.'
                          ],
                          lowerMsg
                      );
            } else {
                const intro = pickVariant(
                    [
                        `Here are some wallet-friendly verified picks${city ? ` in ${city}` : ''} (starting per night):`,
                        `Budget-friendly verified options${city ? ` in ${city}` : ''} — sorted by lowest starting price:`,
                        `Lowest starting prices among verified hotels${city ? ` in ${city}` : ''}:`
                    ],
                    lowerMsg
                );
                response =
                    intro +
                    '\n' +
                    formatNumberedHotels(rows, r => `${r.name} — from ${r.starting_price} (rating ${r.rating}/5)`) +
                    summarizePriceRating(rows);
                if (intents.location) data = rows[0];
                followKind = 'cheapest';
            }
        }
        // 3) Best rated hotels
        else if (wantsBestRated(lowerMsg) && intents.search) {
            const params = [];
            let where = "WHERE h.status = 'verified'";
            if (city) {
                where += ' AND (h.city LIKE ? OR h.name LIKE ?)';
                params.push(`%${city}%`, `%${city}%`);
            }

            const [rows] = await db.query(
                `
                SELECT
                    h.id,
                    h.name,
                    h.city,
                    h.rating,
                    h.address,
                    h.latitude,
                    h.longitude,
                    MIN(rt.base_price) AS starting_price
                FROM hotels h
                JOIN room_types rt ON rt.hotel_id = h.id
                ${where}
                GROUP BY h.id, h.name, h.city, h.rating, h.address, h.latitude, h.longitude
                ORDER BY h.rating DESC, starting_price ASC
                LIMIT 5
                `,
                params
            );

            if (rows.length === 0) {
                response = city
                    ? `I couldn’t find verified hotels in ${city} to rank by rating.`
                    : "I couldn’t find verified hotels right now.";
            } else {
                const intro = pickVariant(
                    [
                        `Guest favourites (by rating)${city ? ` in ${city}` : ''}:`,
                        `Top-rated verified stays${city ? ` in ${city}` : ''}:`,
                        `Highest guest ratings among verified hotels${city ? ` in ${city}` : ''}:`
                    ],
                    lowerMsg
                );
                response =
                    intro +
                    '\n' +
                    formatNumberedHotels(rows, r => `${r.name} — ${r.rating}/5 (from ${r.starting_price})`) +
                    summarizePriceRating(rows);
                if (intents.location) data = rows[0];
                followKind = 'rated';
            }
        }
        // 4) Hotels for N guests (capacity-based)
        else if (guestCount && intents.search) {
            const params = [guestCount];
            let where = "WHERE h.status = 'verified' AND rt.max_occupancy >= ?";
            if (city) {
                where += ' AND (h.city LIKE ? OR h.name LIKE ?)';
                params.push(`%${city}%`, `%${city}%`);
            }

            const [rows] = await db.query(
                `
                SELECT
                    h.id,
                    h.name,
                    h.city,
                    h.rating,
                    h.address,
                    h.latitude,
                    h.longitude,
                    MIN(rt.base_price) AS starting_price,
                    MAX(rt.max_occupancy) AS best_capacity
                FROM hotels h
                JOIN room_types rt ON rt.hotel_id = h.id
                ${where}
                GROUP BY h.id, h.name, h.city, h.rating, h.address, h.latitude, h.longitude
                ORDER BY h.rating DESC, starting_price ASC
                LIMIT 5
                `,
                params
            );

            if (rows.length === 0) {
                response = city
                    ? `I couldn’t find verified options in ${city} that comfortably fit ${guestCount} guests (by room capacity).`
                    : `I couldn’t find verified options for ${guestCount} guests (by room capacity).`;
            } else {
                response =
                    pickVariant(
                        [
                            `These verified hotels can work for **${guestCount}** guests${city ? ` in ${city}` : ''} (by max occupancy):`,
                            `Here are verified places with enough capacity for **${guestCount}** guests${city ? ` near ${city}` : ''}:`,
                            `Good fits for **${guestCount}** guests${city ? ` in ${city}` : ''}:`
                        ],
                        lowerMsg
                    ) +
                    '\n' +
                    formatNumberedHotels(
                        rows,
                        r => `${r.name} — up to ${r.best_capacity} guests, from ${r.starting_price}`
                    ) +
                    summarizePriceRating(rows);
                if (intents.location) data = rows[0];
                followKind = 'guests';
            }
        }
        // 5) Recommendation (top-rated)
        else if (intents.recommend) {
            const [topHotels] = await db.query(
                "SELECT id, name, city, rating, address, latitude, longitude FROM hotels WHERE status = 'verified' ORDER BY rating DESC LIMIT 3"
            );

            if (topHotels.length > 0) {
                response =
                    pickVariant(
                        [
                            'Here are three verified stays guests rate most highly right now:',
                            'A quick “most loved” shortlist from live ratings:',
                            'Top picks by guest rating today:'
                        ],
                        lowerMsg
                    ) +
                    '\n' +
                    formatNumberedHotels(topHotels, h => `${h.name} in ${h.city} (${h.rating}/5)`);
                if (intents.location) data = topHotels[0];
                followKind = 'recommend';
            } else {
                response =
                    'I don’t have enough verified data to recommend yet — tell me a city and I’ll pull options.';
            }
        }
        // 6) Contact / location / pricing / general search
        else if (intents.contact || intents.location || intents.search || intents.pricing) {
            const candidateWhere = city ? "WHERE status = 'verified' AND city LIKE ?" : "WHERE status = 'verified'";
            const candidateParams = city ? [`%${city}%`] : [];

            const [candidateHotels] = await db.query(
                `
                SELECT
                    id,
                    name,
                    address,
                    city,
                    phone,
                    email,
                    description,
                    rating,
                    latitude,
                    longitude
                FROM hotels
                ${candidateWhere}
                ORDER BY rating DESC
                LIMIT 50
                `,
                candidateParams
            );

            const matchedHotel =
                candidateHotels.find(
                    h =>
                        lowerMsg.includes((h.name || '').toLowerCase()) ||
                        lowerMsg.includes((h.city || '').toLowerCase())
                ) || null;

            if (intents.search && city && !intents.contact && !intents.location && !intents.pricing) {
                const [cityHotels] = await db.query(
                    "SELECT name, city, rating FROM hotels WHERE status = 'verified' AND city LIKE ? ORDER BY rating DESC LIMIT 8",
                    [`%${city}%`]
                );

                if (cityHotels.length > 0) {
                    response =
                        pickVariant(
                            [
                                `I see ${cityHotels.length} verified hotels in ${city}:`,
                                `Here's what's verified in ${city} right now:`,
                                `Verified listings in ${city}:`
                            ],
                            lowerMsg
                        ) +
                        '\n' +
                        formatNumberedHotels(cityHotels, h => `${h.name} (${h.rating}/5)`);
                    followKind = 'citylist';
                } else {
                    response = `I couldn’t find verified hotels in ${city}. Try a nearby spelling or another city.`;
                }
            } else if (intents.search && !city && !intents.contact && !intents.location && !intents.pricing) {
                const [topHotels] = await db.query(
                    "SELECT name, city, rating FROM hotels WHERE status = 'verified' ORDER BY rating DESC LIMIT 8"
                );

                if (topHotels.length > 0) {
                    response =
                        pickVariant(
                            [
                                'Here are some standout verified hotels across Nepal:',
                                'A quick Nepal-wide snapshot of well-rated verified stays:',
                                'Popular verified picks nationwide:'
                            ],
                            lowerMsg
                        ) +
                        '\n' +
                        formatNumberedHotels(topHotels, h => `${h.name} — ${h.city}, ${h.rating}/5`);
                    followKind = 'nepalwide';
                } else {
                    response = 'Sorry, I couldn’t find any verified hotels right now.';
                }
            } else {
                const chosenHotel = matchedHotel || candidateHotels[0] || null;

                if (!chosenHotel) {
                    response = city
                        ? `I couldn't match a hotel in ${city}. Try "cheapest in ${city}", "top rated in ${city}", or paste the hotel name.`
                        : pickVariant(
                              [
                                  "Tell me a hotel name or a city, and I'll pull verified options.",
                                  'Which city or hotel should I look up? Try “hotels in Pokhara” or a property name.'
                              ],
                              lowerMsg
                          );
                } else {
                    data = chosenHotel;

                    if (intents.contact) {
                        response =
                            `${chosenHotel.name} — contact:\n` +
                            `• Phone: ${chosenHotel.phone || 'N/A'}\n` +
                            `• Email: ${chosenHotel.email || 'N/A'}`;
                        followKind = 'contact';
                    } else if (intents.location) {
                        response = `${chosenHotel.name} is at ${chosenHotel.address}, ${chosenHotel.city}. I can show it on the map if you use the map action below.`;
                        followKind = 'location';
                    } else if (intents.pricing) {
                        const [priceRows] = await db.query(
                            'SELECT MIN(base_price) AS starting_price FROM room_types WHERE hotel_id = ?',
                            [chosenHotel.id]
                        );
                        const startingPrice = priceRows?.[0]?.starting_price;
                        response =
                            `Starting rates at ${chosenHotel.name} are from ${startingPrice} per night (room-type minimum).\n` +
                            'Exact totals depend on dates and room — pick dates on the site for precision.';
                        followKind = 'pricing';
                    } else {
                        response =
                            `I matched ${chosenHotel.name} in ${chosenHotel.city} (rating ${chosenHotel.rating}/5).\n` +
                            'Say contact, location, or price for the next detail.';
                    }
                }
            }
        }
        // 7) Fallback — template hints when Gemini did not run
        else {
            response = pickVariant(
                [
                    "I'm best with things like: \"cheapest hotels in [city]\", \"top rated in [city]\", \"hotels for 4 guests in [city]\", \"contact for [hotel]\", or \"where is [hotel]\".\n\nWhich city should we use — Kathmandu, Pokhara, or another?",
                    'Try a city plus what you need: budget stays, top ratings, group size, phone/email, address/map, or starting price.\n\nExample: "budget hotels in Pokhara".'
                ],
                lowerMsg
            );
            followKind = 'nepalwide';
        }

        } // end !geminiHandled (rules / SQL fallback)

        if (followKind && response) {
            response += followUpLine(followKind, city);
        }

        await saveChatMessage({
            sessionId: session.id,
            userId: req.user?.id || null,
            role: 'assistant',
            text: String(response || '').slice(0, 6000),
            intent: followKind || null,
            metadata: { replyMode }
        });

        res.json({
            success: true,
            reply: response,
            data: data,
            replyMode,
            sessionKey: session.sessionKey
        });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ success: false, message: 'Internal server error in chatbot' });
    }
};
