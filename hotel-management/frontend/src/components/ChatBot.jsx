import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { API_URL } from '../config/api';

const RoutingEngine = ({ from, to }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !from || !to) return;

        const start = L.latLng(Number(from[0]), Number(from[1]));
        const end = L.latLng(Number(to[0]), Number(to[1]));

        const routingControl = L.Routing.control({
            waypoints: [start, end],
            lineOptions: {
                styles: [
                    { color: '#1B2B41', weight: 8, opacity: 0.2 },
                    { color: '#B88E2F', weight: 4, opacity: 1 }
                ]
            },
            show: true,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            collapsible: true,
            itineraryClassName: 'premium-nav-panel',
            createMarker: () => null
        }).addTo(map);

        return () => {
            try {
                if (map && routingControl) {
                    routingControl.setWaypoints([]);
                    map.removeControl(routingControl);
                }
            } catch (e) {
                console.debug("Routing cleanup handled");
            }
        };
    }, [map, from, to]);


    return null;
};

const ChatBot = () => {
    const location = useLocation();
    const path = location.pathname;
    const hideOnStaffRoutes =
        path.startsWith('/admin') || path.startsWith('/superadmin');

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            text: "Hi! I'm the Nepal Stays assistant. Ask about hotels by city, budget, or ratings — or type \"help\" to see what I can do.",
            isBot: true,
            replyMode: 'rules'
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [lastHotel, setLastHotel] = useState(null);
    const [isMapFullScreen, setIsMapFullScreen] = useState(false);
    const [mapTarget, setMapTarget] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [isLocationFallback, setIsLocationFallback] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isMapFullScreen && !userLocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                    setIsLocationFallback(false);
                },
                (err) => {
                    console.error("Location Access Denied:", err);
                    setUserLocation([28.3949, 84.1240]);
                    setIsLocationFallback(true);
                }
            );
        }
    }, [isMapFullScreen, userLocation]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        // map CTA only when message looks location-related (avoid nagging every reply)
        const lowerMessage = userMessage.toLowerCase();
        const userWantsLocation =
            /(map|location|directions|route|coordinates|nearby|where|located|address|city|place|find it)/i.test(lowerMessage) ||
            /\bin\s+[a-zA-Z]/.test(lowerMessage);

        const historyPayload = messages.slice(-8).map((m) => ({
            role: m.isBot ? 'assistant' : 'user',
            text: m.text
        }));

        setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await axios.post(
                `${API_URL}/chatbot/query`,
                {
                    message: userMessage,
                    lastHotel: lastHotel,
                    lastCity: lastHotel?.city || null,
                    history: historyPayload
                },
                {
                    timeout: 15000
                }
            );
            if (response.data.success) {
                setMessages(prev => [...prev, {
                    text: response.data.reply,
                    isBot: true,
                    data: response.data.data,
                    showLocationActions: userWantsLocation,
                    replyMode: response.data.replyMode === 'gemini' ? 'gemini' : 'rules'
                }]);
                if (response.data.data) {
                    setLastHotel(response.data.data);
                }
            } else {
                setMessages(prev => [...prev, { text: "Sorry, I'm having some trouble connecting. Please try again later.", isBot: true }]);
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            let replyText;
            if (error.response) {
                const d = error.response.data;
                const serverMsg =
                    d && typeof d === "object" && typeof d.message === "string" ? d.message : null;
                replyText =
                    serverMsg ||
                    (error.response.status === 400
                        ? "Invalid request. Please try a different message."
                        : "The assistant hit a server error. Please try again in a moment.");
            } else if (error.code === "ECONNABORTED") {
                replyText = "The request timed out. Please try again.";
            } else if (error.request) {
                replyText =
                    "Could not reach the API. If you run the app locally, start the backend (port 5000) so /api requests can be proxied. In production, set REACT_APP_BACKEND_URL to your API origin.";
            } else {
                replyText = "Something went wrong. Please try again.";
            }
            setMessages(prev => [...prev, { text: replyText, isBot: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (hideOnStaffRoutes) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[200] font-sans">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-[#1B2B41] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-200 focus:outline-none"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className="absolute bottom-20 right-0 w-80 md:w-96 max-w-[calc(100vw-2rem)] max-h-[min(32rem,calc(100vh-6rem))] origin-bottom-right bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden fade-in transition-all duration-300 transform">
                    <div className="shrink-0 bg-[#1B2B41] p-4 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#B88E2F] rounded-full flex items-center justify-center text-xs font-bold">NS</div>
                            <div>
                                <h3 className="text-sm font-semibold">Nepal Stays Assistant</h3>
                                <p className="text-[10px] text-gray-300 leading-tight">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shrink-0"></span>
                                        Verified hotels · instant help
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* min-h-0: scroll inside flex column */}
                    <div className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden bg-gray-50 flex flex-col gap-3 custom-scrollbar [scrollbar-gutter:stable]">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                                        msg.isBot
                                            ? (msg.replyMode === 'gemini'
                                                  ? 'bg-blue-600 text-white border border-blue-700 rounded-tl-none'
                                                  : 'bg-white border border-gray-200 text-[#2D3748] rounded-tl-none')
                                            : 'bg-[#B88E2F] text-white rounded-tr-none'
                                    }`}
                                >
                                    <div className={msg.isBot ? 'whitespace-pre-wrap' : ''}>{msg.text}</div>

                                    {msg.isBot && msg.data?.latitude && msg.showLocationActions && (
                                        <button
                                            onClick={() => {
                                                setMapTarget(msg.data);
                                                setIsMapFullScreen(true);
                                            }}
                                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#1B2B41] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#B88E2F] transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">map</span>
                                            View on Full Map
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="shrink-0 p-4 border-t border-gray-100 bg-white flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask about hotels, locations..."
                            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#1B2B41] transition-all"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="bg-[#1B2B41] text-white p-2 rounded-full disabled:opacity-50 hover:scale-105 transition-transform"
                        >
                            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </button>
                    </form>

                    <div className="shrink-0 px-4 pb-4 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar text-center">
                        {["Show hotels", "Contact info"].map((suggest, i) => (
                            <button
                                key={i}
                                onClick={() => setInputValue(suggest)}
                                className="whitespace-nowrap bg-white border border-gray-200 text-[10px] px-2 py-1 rounded-full text-gray-500 hover:border-[#B88E2F] hover:text-[#B88E2F] transition-colors"
                            >
                                {suggest}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isMapFullScreen && mapTarget && mapTarget.latitude && (
                <div className="fixed inset-0 z-[1000] bg-white flex flex-col fade-in">
                    <div className="h-20 px-10 flex items-center justify-between border-b border-[#E2E2E2] bg-[#1B2B41]">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setIsMapFullScreen(false)} className="w-10 h-10 border border-[#2D4361] flex items-center justify-center text-white hover:bg-white/5 transition-all rounded-xl">
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                            </button>
                            <div>
                                <h4 className="text-base font-bold text-white uppercase tracking-tight italic">{mapTarget.name}</h4>
                                <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">{mapTarget.city}, NEPAL</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-10">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest">Global Coordinates</span>
                                <span className="text-[10px] font-bold text-[#B88E2F] uppercase">{Number(mapTarget.latitude).toFixed(6)}, {Number(mapTarget.longitude).toFixed(6)}</span>
                            </div>
                            <button onClick={() => setIsMapFullScreen(false)} className="px-8 py-3 bg-white text-[#1B2B41] font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-colors">Close Map</button>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <MapContainer
                            center={[mapTarget.latitude, mapTarget.longitude]}
                            zoom={16}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />

                            <Marker position={[mapTarget.latitude, mapTarget.longitude]} />

                            {userLocation && (
                                <Marker
                                    position={userLocation}
                                    icon={L.divIcon({
                                        className: 'custom-div-icon',
                                        html: `<div style="background-color: #3B82F6; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                                        iconSize: [15, 15],
                                        iconAnchor: [7, 7]
                                    })}
                                />
                            )}

                            {userLocation && !isLocationFallback && (
                                <RoutingEngine from={userLocation} to={[mapTarget.latitude, mapTarget.longitude]} />
                            )}
                        </MapContainer>

                        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                            <div className="bg-[#1B2B41] text-white px-4 py-2 rounded-lg border border-white/10 shadow-xl">
                                <p className="text-[10px] font-bold tracking-[0.2em]">{isLocationFallback ? 'GPS_PROTOCOL_OFFLINE' : 'LIVE_NAVIGATION_PROTOCOL'}</p>
                            </div>
                            {isLocationFallback ? (
                                <div className="bg-red-500/90 backdrop-blur-md px-4 py-2 rounded-lg border border-red-400/50 shadow-xl flex items-center gap-2">
                                    <span className="material-symbols-outlined text-white text-xs">location_disabled</span>
                                    <p className="text-[9px] font-bold text-white uppercase">Location access denied. Please enable GPS for real-time routing.</p>
                                </div>
                            ) : userLocation && (
                                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-100 shadow-xl flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <p className="text-[9px] font-bold text-[#1B2B41] uppercase">Origin Detected: Current Position</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBot;
