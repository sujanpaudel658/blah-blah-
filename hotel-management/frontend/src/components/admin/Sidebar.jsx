import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ onLogout }) => {
    const location = useLocation();

    const menuSections = [
        {
            title: 'OPERATIONS',
            items: [
                { path: '/admin/dashboard', icon: 'dashboard', label: 'Overview' },
                { path: '/admin/rooms', icon: 'bed', label: 'Rooms' },
                { path: '/admin/bookings', icon: 'calendar_month', label: 'Bookings' },
            ]
        },
        {
            title: 'PROPERTY',
            items: [
                { path: '/admin/room-types', icon: 'category', label: 'Categories' },
                { path: '/admin/dashboard', icon: 'hotel', label: 'Hotel Profile' },
                { path: '/admin/settings', icon: 'settings', label: 'Settings' },
            ]
        }
    ];

    return (
        <aside className="w-60 bg-[#1B2B41] text-[#A0AEC0] flex flex-col h-screen sticky top-0 shrink-0 select-none">
            {/* Logo Section */}
            <div className="h-20 flex items-center px-6 border-b border-[#2D3748]">
                <Link to="/admin/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <span className="material-symbols-outlined text-[#B88E2F]">domain</span>
                    <span className="text-white font-bold text-lg tracking-tight uppercase">STAYNEPAL</span>
                </Link>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                {menuSections.map((section, idx) => (
                    <div key={idx} className="mb-8">
                        <div className="px-6 mb-3">
                            <span className="text-[10px] font-bold text-[#4A5568] tracking-widest uppercase">
                                {section.title}
                            </span>
                        </div>
                        <nav className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-6 py-3 transition-colors relative border-l-4 ${isActive
                                            ? 'bg-[#2D3748] text-white border-[#B88E2F]'
                                            : 'border-transparent hover:bg-[#232F3E] hover:text-white'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[#B88E2F]' : ''}`}>
                                            {item.icon}
                                        </span>
                                        <span className="text-[13px] font-semibold tracking-wide">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Bottom Section */}
            <div className="p-4 border-t border-[#2D3748] bg-[#111B2B]">
                <button
                    onClick={onLogout}
                    className="w-full h-10 flex items-center gap-3 px-3 text-[#A0AEC0] hover:text-white hover:bg-[#2D3748] transition-colors rounded-xl"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
