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

const NON_CITY_IN_PHRASES =
    /^(one|two|the|a|an|general|mind|fact|short|brief|simple|this|that|case|order|particular|advance|summary|detail|total)\b/i;

function extractCity(message, fallback) {
    const m = String(message).match(/\bin\s+([a-zA-Z][a-zA-Z\s.'-]{1,48})/i);
    if (!m) return fallback || null;
    let city = m[1].trim();
    // "in one sentence", "in mind" — not cities.
    if (NON_CITY_IN_PHRASES.test(city) || /^(one|two|three)\s+(sentence|word|line|minute|day)/i.test(city)) {
        return fallback || null;
    }
    // Keep city names short (e.g. "Kathmandu", "Pokhara", "Bhaktapur").
    const words = city.split(/\s+/).filter(Boolean);
    if (words.length > 3) city = words.slice(0, 3).join(' ');
    return city;
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

function parseAmenityList(raw) {
    if (raw == null || raw === '') return [];
    try {
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
        if (typeof v === 'object' && v !== null) return Object.values(v).map(String);
        return [String(v)];
    } catch {
        return [];
    }
}

function amenityFlags(amenities) {
    const text = amenities.join(' ').toLowerCase();
    return {
        hasAc: /air.?condition|\bac\b|a\/c|cooling|ac unit|air conditioning/i.test(text),
        hasWifi: /wifi|wi-fi|internet/i.test(text),
        hasParking: /parking/i.test(text),
        hasPool: /pool|swimming/i.test(text)
    };
}

/** Verified hotels with merged room amenities for chat context. */
async function fetchHotelContextRows() {
    const [rows] = await db.query(
        `SELECT h.id, h.name, h.city, h.address, h.rating, h.latitude, h.longitude,
                rt.amenities, rt.base_price
         FROM hotels h
         INNER JOIN room_types rt ON rt.hotel_id = h.id
         WHERE h.status = 'verified'
         ORDER BY h.rating DESC, rt.base_price ASC`
    );
    const byId = new Map();
    for (const row of rows) {
        const am = parseAmenityList(row.amenities);
        const flags = amenityFlags(am);
        const existing = byId.get(row.id);
        if (!existing) {
            byId.set(row.id, {
                id: row.id,
                name: row.name,
                city: row.city,
                address: row.address,
                rating: row.rating,
                latitude: row.latitude,
                longitude: row.longitude,
                starting_price: row.base_price,
                amenities: [...am],
                ...flags
            });
            continue;
        }
        existing.amenities = [...new Set([...existing.amenities, ...am])];
        const merged = amenityFlags(existing.amenities);
        existing.hasAc = existing.hasAc || merged.hasAc;
        existing.hasWifi = existing.hasWifi || merged.hasWifi;
        existing.hasParking = existing.hasParking || merged.hasParking;
        existing.hasPool = existing.hasPool || merged.hasPool;
        const price = Number(row.base_price);
        if (Number.isFinite(price)) {
            const cur = Number(existing.starting_price);
            existing.starting_price =
                Number.isFinite(cur) ? Math.min(cur, price) : price;
        }
    }
    return [...byId.values()].slice(0, 12);
}

function formatHotelContextForPrompt(hotels) {
    if (!hotels.length) return '(none yet)';
    return hotels
        .map((h) => {
            const feats = [];
            if (h.hasAc) feats.push('AC');
            if (h.hasWifi) feats.push('Wi-Fi');
            if (h.hasParking) feats.push('parking');
            if (h.hasPool) feats.push('pool');
            const featStr = feats.length ? `; amenities: ${feats.join(', ')}` : '';
            return `- ${h.name} (${h.city || 'Nepal'}): rating ${h.rating ?? 'n/a'}, from NPR ${h.starting_price ?? 'n/a'}${featStr}`;
        })
        .join('\n');
}

function buildGeminiSystemPrompt(hotelContextText) {
    return `You are the Nepal Stays assistant — a warm, helpful hotel booking guide for Nepal.

Personality:
- Reply like a friendly local host, not a generic helpdesk bot.
- Acknowledge small talk (weather, heat, rain, travel mood) briefly, then tie it to finding a comfortable stay.
- Never reply with only "Is there anything I can help you with regarding hotel bookings?" or similar brush-offs.

Booking focus:
- Heat / humidity → suggest hotels with AC or cooler rooms; offer to search by city.
- Cold → suggest warmer rooms or hill cities (e.g. Pokhara) when relevant.
- Rain / monsoon → mention indoor amenities and covered parking when available.
- Only name hotels from the verified list below. Do not invent properties, prices, or amenities.
- If no city is given, ask which city they are visiting. Keep replies under 120 words unless listing hotels.

Verified hotels (from our database — may be partial):
${hotelContextText || '(none yet)'}`;
}

function hotelRowFromContext(h) {
    if (!h) return null;
    return rowToHotel({
        id: h.id,
        name: h.name,
        city: h.city,
        address: h.address,
        rating: h.rating,
        latitude: h.latitude,
        longitude: h.longitude,
        starting_price: h.starting_price
    });
}

/** Weather / comfort small talk → practical stay suggestions (uses real amenity data). */
async function tryComfortReply(message, lastCity) {
    const lower = message.toLowerCase().trim();
    const isHot = /(hot|heat|warm|humid|sunny|scorching|boiling|sweat|heatwave)/i.test(lower);
    const isCold = /(cold|chill|freezing|cool night|winter)/i.test(lower);
    const isRain = /(rain|monsoon|wet|storm|drizzle)/i.test(lower);
    const isWeatherChat =
        isHot ||
        isCold ||
        isRain ||
        /(weather|climate|temperature|forecast)/i.test(lower) ||
        /^why is it (so )?(hot|cold|warm|rainy)/i.test(lower);

    if (!isWeatherChat) return null;

    const hotels = await fetchHotelContextRows();
    const city = extractCity(message, lastCity);
    const inCity = city
        ? hotels.filter((h) => String(h.city || '').toLowerCase().includes(city.toLowerCase()))
        : hotels;
    const withAc = inCity.filter((h) => h.hasAc);
    const anyAc = hotels.filter((h) => h.hasAc);

    let reply = '';

    if (isHot) {
        reply =
            'Yeah, it can get really warm in Nepal — especially in the valleys and Terai during summer. ';
        if (withAc.length) {
            reply += `Want a cooler stay${city ? ` in **${city}**` : ''}? These verified hotels list **air conditioning**: `;
            reply += withAc
                .slice(0, 3)
                .map((h) => `**${h.name}** (${h.city})`)
                .join(', ');
            reply += '. Open **Explore** to compare rooms and book.';
        } else if (anyAc.length) {
            reply += `Several stays on Nepal Stays offer **AC** — for example ${anyAc
                .slice(0, 2)
                .map((h) => `**${h.name}** (${h.city})`)
                .join(' and ')}. Tell me a city (e.g. "hotels in Kathmandu") and I will narrow it down.`;
        } else {
            reply +=
                'Ask for **hotels in [city]** and check each listing for AC or fan cooling in room details.';
        }
    } else if (isCold) {
        reply =
            'Nepal can get chilly, especially at night in the hills or in winter. ';
        if (inCity.length) {
            reply += `For **${city || 'your trip'}**, you could look at ${inCity
                .slice(0, 2)
                .map((h) => `**${h.name}** (${h.city})`)
                .join(' or ')} — compare room types on Explore for heating or warmer bedding.`;
        } else {
            reply +=
                'Pokhara and Kathmandu have plenty of verified stays; say **hotels in Pokhara** or **hotels in Kathmandu** and I will list options.';
        }
    } else if (isRain) {
        reply =
            'Monsoon season can be wet — good time for a cozy stay indoors. ';
        const withParking = inCity.filter((h) => h.hasParking);
        if (withParking.length) {
            reply += `In ${city || 'our listings'}, **${withParking[0].name}** (${withParking[0].city}) mentions parking — useful when it rains. `;
        }
        reply += 'Try **hotels in [city]** to browse verified properties.';
    } else {
        reply =
            'Weather in Nepal varies a lot by season and altitude. Tell me which **city** you are visiting and I can suggest verified hotels there.';
    }

    const pick = withAc[0] || inCity[0] || hotels[0] || null;
    return {
        reply,
        data: hotelRowFromContext(pick),
        replyMode: 'rules',
        kind: 'comfort',
        city: city || pick?.city || null
    };
}

/** Search verified hotels by name (partial match). */
async function findHotelsByName(nameHint, limit = 5) {
    const hint = String(nameHint || '').trim();
    if (hint.length < 2) return [];
    const [rows] = await db.query(
        `${HOTEL_SELECT} AND h.name LIKE ? ORDER BY h.rating DESC, h.name ASC LIMIT ?`,
        [`%${hint}%`, Math.min(Math.max(limit, 1), 10)]
    );
    return rows;
}

function pickBestNameMatch(rows, hint) {
    if (!rows || !rows.length) return null;
    const needle = hint.toLowerCase().replace(/\s+/g, ' ');
    const exact = rows.find((r) => String(r.name).toLowerCase() === needle);
    if (exact) return exact;
    const contains = rows.filter((r) => String(r.name).toLowerCase().includes(needle));
    if (contains.length === 1) return contains[0];
    if (contains.length > 1) {
        contains.sort((a, b) => String(a.name).length - String(b.name).length);
        return contains[0];
    }
    return rows[0];
}

/** "location for Majestic Lake", "where is Tribeni guest house", etc. */
function extractHotelNameHint(message) {
    const text = String(message || '').trim();
    const patterns = [
        /(?:location|address|directions?|map|contact|phone|email|coordinates)\s+(?:for|of|to|at)\s+(.+)/i,
        /(?:where\s+is|where's|find)\s+(.+)/i,
        /^(.+?)\s+(?:location|address|phone|contact|map)\s*$/i
    ];
    for (const pattern of patterns) {
        const m = text.match(pattern);
        if (!m || !m[1]) continue;
        let name = m[1].trim().replace(/[?.!]+$/, '').trim();
        if (name.length >= 3) return name;
    }
    return null;
}

function hasValidCoords(h) {
    const lat = Number(h?.latitude);
    const lng = Number(h?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Map button only for a specific hotel location reply, not city-wide hotel lists. */
function shouldShowMapForRules(rules) {
    return Boolean(rules && rules.kind === 'location' && hasValidCoords(rules.data));
}

function formatLocationReply(h) {
    const lines = [`**${h.name}**`];
    if (h.address) lines.push(`Address: ${h.address}`);
    if (h.city) lines.push(`City / area: ${h.city}`);
    if (hasValidCoords(h)) {
        lines.push(`Coordinates: ${Number(h.latitude).toFixed(6)}, ${Number(h.longitude).toFixed(6)}`);
        lines.push('Tap **View on Full Map** below for directions.');
    } else if (!h.address && !h.city) {
        lines.push('This property has not pinned a map location yet. Open their listing on the site for updates.');
    }
    return lines.join('\n');
}

async function resolveHotelForQuery(message, lastHotel) {
    const hint = extractHotelNameHint(message);
    if (hint) {
        const rows = await findHotelsByName(hint, 5);
        const best = pickBestNameMatch(rows, hint);
        if (best) return rowToHotel(best);
        return null;
    }
    if (lastHotel && lastHotel.name) {
        return rowToHotel(lastHotel) || lastHotel;
    }
    return null;
}

/** Hotel listing / lookup questions — handled by rules, not Gemini. */
function isRuleIntent(message) {
    const lower = String(message || '').toLowerCase().trim();
    if (/^help\b|^what can you/i.test(lower)) return true;
    if (/(list cities|which cities|what cities|cities do you|show hotels)/i.test(lower)) return true;
    if (/(cheapest|cheap|lowest price|budget)/i.test(lower)) return true;
    if (/(best rated|top rated|highest rating|best hotels)/i.test(lower)) return true;
    if (/\b(hotels?|stays?|places?|accommodation|lodging)\s+in\s+/i.test(lower)) return true;
    if (/(contact|phone|email|call|reach)/i.test(lower)) return true;
    if (/(location|address|directions?|map|coordinates|where\s+is|where's|located|nearby|how to get)/i.test(lower)) {
        return true;
    }
    if (extractHotelNameHint(message)) return true;
    return false;
}

function buildRulesFallbackReply(rows) {
    if (rows.length) {
        const lines = rows.map((r, i) => formatHotelLine(r, i));
        return {
            reply: `I could not match that exactly. Here are verified hotels you can browse:\n\n${lines.join('\n')}${followUpLine('nepalwide', null)}`,
            data: rowToHotel(rows[0]),
            replyMode: 'rules'
        };
    }
    return {
        reply:
            'I could not find an answer in our hotel database. Try “hotels in Kathmandu”, “location for [hotel name]”, or “list cities”.',
        data: null,
        replyMode: 'rules'
    };
}

function formatHotelLine(h, i) {
    const price =
        h.starting_price != null && !Number.isNaN(Number(h.starting_price))
            ? `from NPR ${Number(h.starting_price).toLocaleString()}`
            : 'price on request';
    const rating = h.rating != null ? ` ${Number(h.rating).toFixed(1)}` : 'no rating yet';
    return `${i + 1}. **${h.name}** (${h.city || 'Nepal'}) — ${price}, ${rating}.`;
}

async function tryRulesReply(message, lastHotel, lastCity) {
    const lower = message.toLowerCase().trim();

    if (/^help\b|^what can you/i.test(lower)) {
        return {
            reply:
                'Try: “hotels in Kathmandu”, “cheapest in Pokhara”, “location for [hotel name]”, “contact for [hotel name]”, or “list cities”.',
            data: null,
            replyMode: 'rules',
            kind: null,
            city: null
        };
    }

    const comfort = await tryComfortReply(message, lastCity);
    if (comfort) return comfort;

    if (/^show hotels\b/i.test(lower)) {
        const rows = await fetchHotels(null, 'rating', 8);
        if (!rows.length) {
            return {
                reply: 'No verified hotels are in the database yet. Check back soon.',
                data: null,
                replyMode: 'rules',
                kind: 'recommend',
                city: null
            };
        }
        const lines = rows.map((r, i) => formatHotelLine(r, i));
        return {
            reply: `Verified hotels on Nepal Stays:\n\n${lines.join('\n')}${followUpLine('nepalwide', null)}`,
            data: rowToHotel(rows[0]),
            replyMode: 'rules',
            kind: 'recommend',
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

    const isCityHotelSearch = /\b(hotels?|stays?|places?|accommodation|lodging)\s+in\s+/i.test(lower);
    const wantsLocation =
        /(location|address|directions?|map|coordinates|where\s+is|where's|located|nearby|how to get)/i.test(
            lower
        );
    const wantsContact = /(contact|phone|email|call|reach)/i.test(lower);

    if (wantsLocation && !wantsContact && !isCityHotelSearch) {
        const h = await resolveHotelForQuery(message, lastHotel);
        if (h) {
            return {
                reply: `${formatLocationReply(h)}${followUpLine('location', h.city)}`,
                data: h,
                replyMode: 'rules',
                kind: 'location',
                city: h.city
            };
        }
        const hint = extractHotelNameHint(message);
        if (hint) {
            return {
                reply: `I could not find a verified hotel matching "**${hint}**". Try "list cities" or "hotels in Kathmandu".`,
                data: null,
                replyMode: 'rules',
                kind: 'location',
                city: null
            };
        }
    }

    if (wantsContact) {
        const h = await resolveHotelForQuery(message, lastHotel);
        if (h) {
            const bits = [h.phone && `Phone: ${h.phone}`, h.email && `Email: ${h.email}`].filter(Boolean);
            return {
                reply:
                    bits.length > 0
                        ? `**${h.name}** — ${bits.join(' · ')}.${followUpLine('contact', h.city)}`
                        : `I don't have contact details stored for **${h.name}**. Try their listing on the site.`,
                data: h,
                replyMode: 'rules',
                kind: 'contact',
                city: h.city
            };
        }
        const hint = extractHotelNameHint(message);
        if (hint) {
            return {
                reply: `I could not find a verified hotel matching "**${hint}**". Try "list cities" or ask after I name a hotel.`,
                data: null,
                replyMode: 'rules',
                kind: 'contact',
                city: null
            };
        }
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

    // Only explicit "hotels in …" queries — broad "in …" matching blocked Gemini.
    if (/\b(hotels?|stays?|places?|accommodation|lodging)\s+in\s+/i.test(lower)) {
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
                const hotels = await fetchHotelContextRows();
                snapshot = formatHotelContextForPrompt(hotels);
            } catch (e) {
                snapshot = '';
            }
            snapshotCache = { value: snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS };
            snapshotInFlight = null;
            return snapshot;
        })();
    }
    const snapshot = snapshotCache.expiresAt > now ? snapshotCache.value : await snapshotInFlight;

    const system = buildGeminiSystemPrompt(snapshot);
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
                replyMode: 'rules',
                showMap: shouldShowMapForRules(rules)
            });
        }

        // Rule-style hotel questions must not call Gemini (database answers only).
        if (isRuleIntent(trimmed)) {
            const rows = await fetchHotels(null, 'rating', 5);
            const fallback = buildRulesFallbackReply(rows);
            return res.json({ success: true, ...fallback });
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
            console.warn('Chatbot: Gemini returned no text (quota, model, or API error). Using fallback reply.');
        } else {
            console.warn('Chatbot: GEMINI_API_KEY not set — rules/fallback only.');
        }

        const comfortFallback = await tryComfortReply(trimmed, lastCity || null);
        if (comfortFallback) {
            return res.json({
                success: true,
                reply: comfortFallback.reply,
                data: comfortFallback.data,
                replyMode: 'rules',
                showMap: false
            });
        }

        const rows = await fetchHotels(null, 'rating', 5);
        const fallback = buildRulesFallbackReply(rows);
        return res.json({ success: true, ...fallback });
    } catch (err) {
        console.error('queryChatbot:', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Chatbot failed'
        });
    }
}

module.exports = { queryChatbot };
