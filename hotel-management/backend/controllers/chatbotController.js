const db = require('../config/db');

exports.queryChatbot = async (req, res) => {
    try {
        const { message, lastHotel } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const lowerMsg = message.toLowerCase();
        let response = "";
        let data = lastHotel || null;


        // Intent recognition
        const intents = {
            greeting: /(hi|hello|hey|greetings|help|who are you)/i.test(lowerMsg),
            search: /(find|search|show|look for|list|available|hotel|hotels)/i.test(lowerMsg),
            contact: /(contact|phone|email|call|reach|number)/i.test(lowerMsg),
            location: /(where|located|location|address|city|place|find it)/i.test(lowerMsg),
            pricing: /(price|cost|how much|rate|cheap|expensive)/i.test(lowerMsg),
            recommend: /(recommend|best|top|suggest|good|stay)/i.test(lowerMsg)
        };

        if (intents.greeting) {
            response = "Hello! I'm your Nepal Stays assistant. I can help you find hotels, get contact details, or check locations. How can I help you today?";
        } else if (intents.recommend) {
            const [topHotels] = await db.query('SELECT name, city, rating FROM hotels ORDER BY rating DESC LIMIT 3');
            if (topHotels.length > 0) {
                response = `Based on guest ratings, I recommend: ${topHotels.map(h => `${h.name} in ${h.city} (${h.rating}/5)`).join('; ')}. Would you like more details on any of these?`;
            } else {
                response = "I don't have enough data to make a recommendation yet, but you can explore all our hotels in the listing page!";
            }
        } else if (intents.contact || intents.location || intents.search || intents.pricing) {
            // Try to find a hotel name in the message
            // Simple logic: get all hotels and see if any name matches or if a city matches
            const [hotels] = await db.query('SELECT name, address, city, phone, email, description, rating, latitude, longitude FROM hotels');

            let foundHotels = [];

            // Match by name or city
            hotels.forEach(hotel => {
                if (lowerMsg.includes(hotel.name.toLowerCase()) || lowerMsg.includes(hotel.city.toLowerCase())) {
                    foundHotels.push(hotel);
                }
            });

            if (foundHotels.length > 0) {
                const h = foundHotels[0];
                if (intents.contact) {
                    response = `The contact details for ${h.name} are: Phone: ${h.phone || 'N/A'}, Email: ${h.email || 'N/A'}.`;
                } else if (intents.location) {
                    response = `${h.name} is located at ${h.address}, ${h.city}.`;
                } else if (intents.pricing) {
                    response = `I don't have real-time rates for ${h.name} here, but you can check their profile for the latest pricing! It has a rating of ${h.rating}/5.`;
                } else {
                    response = `I found ${h.name} in ${h.city}. It's rated ${h.rating}/5. Would you like its contact details or location?`;
                }
                data = h;
            } else if (data && (intents.contact || intents.location || intents.pricing)) {
                // Use context (last hotel)
                const h = data;
                if (intents.contact) {
                    response = `The contact details for ${h.name} are: Phone: ${h.phone || 'N/A'}, Email: ${h.email || 'N/A'}.`;
                } else if (intents.location) {
                    response = `${h.name} is located at ${h.address}, ${h.city}.`;
                } else if (intents.pricing) {
                    response = `I don't have real-time rates for ${h.name} here, but you can check their profile for the latest pricing! It has a rating of ${h.rating}/5.`;
                }
            } else if (intents.search) {
                // Try to extract city from "in [city]" pattern
                const inMatch = lowerMsg.match(/in\s+([a-zA-Z\s]+)/i);
                let searchedCity = inMatch ? inMatch[1].trim() : null;

                if (searchedCity) {
                    const [cityHotels] = await db.query('SELECT name, city, rating FROM hotels WHERE city LIKE ?', [`%${searchedCity}%`]);
                    if (cityHotels.length > 0) {
                        response = `I found ${cityHotels.length} hotels in ${searchedCity}: ${cityHotels.map(h => h.name).join(', ')}. Which one would you like to know more about?`;
                    } else {
                        response = `Sorry, we are not available right now in ${searchedCity}. Please try another location.`;
                    }
                } else {
                    // Fallback: Check if message mentions any city we already have
                    let foundCity = null;
                    hotels.forEach(h => {
                        if (lowerMsg.includes(h.city.toLowerCase())) foundCity = h.city;
                    });

                    if (foundCity) {
                        const [cityHotels] = await db.query('SELECT name, city, rating FROM hotels WHERE city LIKE ?', [`%${foundCity}%`]);
                        response = `I found ${cityHotels.length} hotels in ${foundCity}: ${cityHotels.map(h => h.name).join(', ')}. Which one would you like to know more about?`;
                    } else {
                        response = `I couldn't find a specific hotel or city in your message. Try searching like 'hotels in Kathmandu' or 'hotels in Pokhara'.`;
                    }
                }
            } else {
                response = "I'm not sure which hotel you are referring to. Could you please provide the name of the hotel or the city you're interested in?";
            }
        } else {
            response = "I'm sorry, I didn't quite catch that. You can ask me things like 'Where is New Tribeni Guest House?' or 'Show me hotels in Kathmandu'.";
        }

        res.json({
            success: true,
            reply: response,
            data: data
        });

    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ success: false, message: 'Internal server error in chatbot' });
    }
};
