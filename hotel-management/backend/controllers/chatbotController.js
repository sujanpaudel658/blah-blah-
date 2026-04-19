const db = require('../config/db');
const { askGemini, getKey } = require('../services/geminiChat.service');
const SNAPSHOT_TTL_MS = Number(process.env.CHATBOT_SNAPSHOT_TTL_MS || 5 * 60 * 1000);
let snapshotCache = { value: '', expiresAt: 0 };
let snapshotInFlight = null;

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
        return `\n\n${cheapest.name} is cheap and has good ratings.`;
    }

    return `\n\n${cheapest.name} is the cheapest here, and ${bestRated.name} has the best rating.`;
}

function followUpLine(kind, city) {
    const place = city ? ` in ${city}` : '';
    switch (kind) {
        case 'cheapest':
            return `\n\nWant to see top-rated ones${place}?`;
        case 'rated':
            return `\n\nWant to check cheaper ones${place}?`;
        case 'guests':
            return `\n\nI can show cheaper or better-rated ones${place} too.`;
        case 'citylist':
            return `\n\nYou can also ask for cheapest or best-rated${place}.`;
        case 'nepalwide':
            return `\n\nTell me a city and I'll filter it.`;
        case 'recommend':
            return `\n\nTell me a city if you want more specific options.`;
        case 'contact':
            return `\n\nNeed location or price as well?`;
        case 'location':
            return `\n\nWant contact details too?`;
        case 'pricing':
            return `\n\nWant location or contact info too?`;
        default:
            return '';
    }
}

const HOTEL_SELECT = `
  SELECT h.id, h.name, h.city, h.address, h.phone, h.email, h.description,
         h.rating, h.latitude, h.longitude,
         (SELECT MIN(rt.base_price) FROM room_types rt WHERE rt.hotel_id = h.id) AS starting_price
  FROM hotels h
  WHERE h.status = 'verified'
`;

function rowToHotel(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        city: row.city,
        address: row.address,
        phone: row.phone,
        email: row.email,
        description: row.description,
        rating: row.rating != null ? Number(row.rating) : null,
        latitude: row.latitude != null ? Number(row.latitude) : null,
        longitude: row.longitude != null ? Number(row.longitude) : null,
        starting_price: row.starting_price != null ? Number(row.starting_price) : null
    };
}

function extractCity(message, fallback) {
    const m = String(message).match(/\bin\s+([a-zA-Z][a-zA-Z\s.'-]{1,48})/i);
    if (m) return m[1].trim();
    return fallback || null;
}

async function fetchHotels(cityLike, orderBy, limit = 8) {
    let sql = HOTEL_SELECT;
    const params = [];
    if (cityLike) {
        sql += ' AND (h.city LIKE ? OR h.name LIKE ?)';
        const p = `%${cityLike}%`;
        params.push(p, p);
    }
    if (orderBy === 'price') {
        sql += ' ORDER BY starting_price IS NULL, starting_price ASC, h.rating DESC';
    } else if (orderBy === 'rating') {
        sql += ' ORDER BY h.rating DESC, starting_price IS NULL, starting_price ASC';
    } else {
        sql += ' ORDER BY h.name ASC';
    }
    sql += ` LIMIT ${Math.min(Math.max(limit, 1), 25)}`;
    const [rows] = await db.query(sql, params);
    return rows;
}

async function fetchDistinctCities() {
    const [rows] = await db.query(
        `SELECT DISTINCT city FROM hotels WHERE status = 'verified' AND city IS NOT NULL AND TRIM(city) <> '' ORDER BY city`
    );
    return rows.map((r) => r.city).filter(Boolean);
}

function formatHotelLine(h, i) {
    const price =
        h.starting_price != null && !Number.isNaN(Number(h.starting_price))
            ? `from NPR ${Number(h.starting_price).toLocaleString()}`
            : 'price on request';
    const rating = h.rating != null ? `★ ${Number(h.rating).toFixed(1)}` : 'no rating yet';
    return `${i + 1}. **${h.name}** (${h.city || 'Nepal'}) — ${price}, ${rating}.`;
}

async function tryRulesReply(message, lastHotel, lastCity) {
    const lower = message.toLowerCase().trim();

    if (/^help\b|^what can you/i.test(lower)) {
        return {
            reply:
                'Try: “hotels in Kathmandu”, “cheapest in Pokhara”, “best rated in Lalitpur”, “list cities”, or “contact” after I name a hotel.',
            data: null,
            replyMode: 'rules',
            kind: null,
            city: null
        };
    }

    if (/(list cities|which cities|what cities|cities do you)/i.test(lower)) {
        const cities = await fetchDistinctCities();
        if (!cities.length) {
            return {
                reply: 'No verified hotels are in the database yet. Check back soon.',
                data: null,
                replyMode: 'rules',
                kind: 'citylist',
                city: null
            };
        }
        const list = cities.slice(0, 40).join(', ');
        return {
            reply: `We have verified hotels in: ${list}.${followUpLine('citylist', null)}`,
            data: null,
            replyMode: 'rules',
            kind: 'citylist',
            city: null
        };
    }

    const city =
        extractCity(message, lastCity) ||
        (lastHotel && lastHotel.city ? String(lastHotel.city) : null);

    if (/(contact|phone|email|call|reach)/i.test(lower) && lastHotel) {
        const h = lastHotel;
        const bits = [h.phone && `Phone: ${h.phone}`, h.email && `Email: ${h.email}`].filter(Boolean);
        return {
            reply:
                bits.length > 0
                    ? `**${h.name}** — ${bits.join(' · ')}.${followUpLine('contact', h.city)}`
                    : `I don't have contact details stored for **${h.name}**. Try their listing on the site.`,
            data: rowToHotel(h),
            replyMode: 'rules',
            kind: 'contact',
            city: h.city
        };
    }

    if (/(cheapest|cheap|lowest price|budget)/i.test(lower)) {
        const rows = await fetchHotels(city, 'price', 6);
        if (!rows.length) {
            return {
                reply: city
                    ? `No verified hotels found for “${city}”. Try another city or ask for the city list.`
                    : 'No verified hotels found yet. Try naming a city (e.g. “cheapest in Kathmandu”).',
                data: null,
                replyMode: 'rules',
                kind: 'cheapest',
                city
            };
        }
        const lines = rows.map((r, i) => formatHotelLine(r, i));
        const summary = summarizePriceRating(rows);
        return {
            reply: `Here are the cheapest verified picks${city ? ` near **${city}**` : ' in Nepal'}:\n\n${lines.join('\n')}${summary}${followUpLine('cheapest', city)}`,
            data: rowToHotel(rows[0]),
            replyMode: 'rules',
            kind: 'cheapest',
            city
        };
    }

    if (/(best rated|top rated|highest rating|best hotels)/i.test(lower)) {
        const rows = await fetchHotels(city, 'rating', 6);
        if (!rows.length) {
            return {
                reply: city
                    ? `No verified hotels found for “${city}”.`
                    : 'No verified hotels found yet. Try “best rated in Kathmandu”.',
                data: null,
                replyMode: 'rules',
                kind: 'rated',
                city
            };
        }
        const lines = rows.map((r, i) => formatHotelLine(r, i));
        return {
            reply: `Top-rated verified hotels${city ? ` in **${city}**` : ' in Nepal'}:\n\n${lines.join('\n')}${followUpLine('rated', city)}`,
            data: rowToHotel(rows[0]),
            replyMode: 'rules',
            kind: 'rated',
            city
        };
    }

    if (/\b(hotels?|stays?|places?)\s+in\s+/i.test(lower) || /\bin\s+[a-z]/i.test(message)) {
        const c = extractCity(message, null);
        if (c) {
            const rows = await fetchHotels(c, 'rating', 8);
            if (!rows.length) {
                return {
                    reply: `No verified hotels found for **${c}**. Say “list cities” to see where we have coverage.`,
                    data: null,
                    replyMode: 'rules',
                    kind: 'recommend',
                    city: c
                };
            }
            const lines = rows.map((r, i) => formatHotelLine(r, i));
            return {
                reply: `Here are verified hotels in **${c}**:\n\n${lines.join('\n')}${summarizePriceRating(rows)}${followUpLine('recommend', c)}`,
                data: rowToHotel(rows[0]),
                replyMode: 'rules',
                kind: 'recommend',
                city: c
            };
        }
    }

    return null;
}

async function geminiReply(message, history) {
    const now = Date.now();
    if (snapshotCache.expiresAt <= now && !snapshotInFlight) {
        snapshotInFlight = (async () => {
            let snapshot = '';
            try {
                const [sample] = await db.query(
                    `SELECT h.name, h.city, h.rating,
                            MIN(rt.base_price) AS starting_price
                     FROM hotels h
                     LEFT JOIN room_types rt ON rt.hotel_id = h.id
                     WHERE h.status = 'verified'
                     GROUP BY h.id, h.name, h.city, h.rating
                     ORDER BY h.rating DESC
                     LIMIT 5`
                );
                if (sample && sample.length) {
                    snapshot = sample
                        .map(
                            (r) =>
                                `- ${r.name} (${r.city || 'Nepal'}): rating ${r.rating}, from NPR ${r.starting_price ?? 'n/a'}`
                        )
                        .join('\n');
                }
            } catch (e) {
                snapshot = '';
            }
            snapshotCache = { value: snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS };
            snapshotInFlight = null;
            return snapshot;
        })();
    }
    const snapshot = snapshotCache.expiresAt > now ? snapshotCache.value : await snapshotInFlight;

    const system = `You are the Nepal Stays chat assistant for a hotel booking site in Nepal.
Be concise and friendly. Prefer factual tone. If asked for specific listings, suggest the user name a city.
Verified hotel sample from our database (may be empty):\n${snapshot || '(none yet)'}`;

    const text = await askGemini(system, message, history);
    return text;
}

async function queryChatbot(req, res) {
    try {
        const { message, lastHotel, lastCity, history } = req.body || {};
        if (!message || typeof message !== 'string' || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'message is required' });
        }

        const trimmed = String(message).trim();
        const hist = Array.isArray(history) ? history : [];

        const rules = await tryRulesReply(trimmed, lastHotel || null, lastCity || null);
        if (rules) {
            return res.json({
                success: true,
                reply: rules.reply,
                data: rules.data,
                replyMode: rules.replyMode
            });
        }

        if (getKey()) {
            const g = await geminiReply(trimmed, hist);
            if (g) {
                return res.json({
                    success: true,
                    reply: g,
                    data: lastHotel || null,
                    replyMode: 'gemini'
                });
            }
        }

        const rows = await fetchHotels(null, 'rating', 5);
        if (rows.length) {
            const lines = rows.map((r, i) => formatHotelLine(r, i));
            return res.json({
                success: true,
                reply: `I'm not sure how to answer that yet. Here are some verified hotels you can browse:\n\n${lines.join('\n')}${followUpLine('nepalwide', null)}`,
                data: rowToHotel(rows[0]),
                replyMode: 'rules'
            });
        }

        return res.json({
            success: true,
            reply:
                'I could not reach the AI assistant and there are no hotels in the database yet. Add GEMINI_API_KEY to backend/.env or ask “list cities” once data exists.',
            data: null,
            replyMode: 'rules'
        });
    } catch (err) {
        console.error('queryChatbot:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Chatbot failed'
        });
    }
}

module.exports = { queryChatbot };
