import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ onLogout, user }) => {
    const location = useLocation();

    const menuSections = user?.role === 'superadmin' ? [
        {
            title: 'Management',
            items: [
                { path: '/superadmin/dashboard', icon: 'hub', label: 'Overview' },
                { path: '/superadmin/registry', icon: 'corporate_fare', label: 'Hotels' },
                { path: '/superadmin/audits', icon: 'fact_check', label: 'Audits' },
            ]
        },
        {
            title: 'Settings',
            items: [
                { path: '/superadmin/settings', icon: 'settings', label: 'Configuration' },
            ]
        }
    ] : [
        {
            title: 'Dashboard',
            items: [
                { path: '/admin/dashboard', icon: 'dashboard', label: 'Overview' },
                { path: '/admin/rooms', icon: 'bed', label: 'Rooms' },
                { path: '/admin/bookings', icon: 'calendar_month', label: 'Bookings' },
            ]
        },
        {
            title: 'Hotel',
            items: [
                { path: '/admin/room-types', icon: 'category', label: 'Room Types' },
                { path: '/admin/dashboard', icon: 'hotel', label: 'Hotel Profile' },
                { path: '/admin/settings', icon: 'settings', label: 'Settings' },
            ]
        }
    ];

    return (
        <aside className="w-[240px] bg-[#1A2332] text-[#8896A6] flex flex-col h-screen sticky top-0 shrink-0 select-none">
            {/* Logo */}
            <div className="h-[92px] flex items-center px-6 border-b border-[#263345]">
                <Link to={user?.role === 'superadmin' ? "/superadmin/dashboard" : "/admin/dashboard"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="h-14 w-40 overflow-hidden flex items-center">
                        <img
                            src="/images/website_logo.png"
                            alt="StayNepal"
                            className="h-full w-auto object-contain origin-left scale-[2.2]"
                        />
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                {menuSections.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        <div className="px-6 mb-3">
                            <span className="text-[11px] font-semibold text-[#4A5B6D] uppercase tracking-wider">
                                {section.title}
                            </span>
                        </div>
                        <nav className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.label}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-6 py-2.5 transition-colors relative ${isActive
                                            ? 'bg-[#263345] text-white border-l-3 border-[#C4993E]'
                                            : 'border-l-3 border-transparent hover:bg-[#1E2B3C] hover:text-white'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[#C4993E]' : ''}`}>
                                            {item.icon}
                                        </span>
                                        <span className="text-[13px] font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* Bottom: Logout */}
            <div className="p-4 border-t border-[#263345]">
                <button
                    onClick={onLogout}
                    className="w-full h-10 flex items-center gap-3 px-4 text-[#8896A6] hover:text-white hover:bg-[#263345] transition-colors rounded-lg"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span className="text-[13px] font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
