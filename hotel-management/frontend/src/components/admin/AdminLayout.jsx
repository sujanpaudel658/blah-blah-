import React from 'react';
import Sidebar from './Sidebar';

const AdminLayout = ({ children, user, hotel, onLogout, title, subtitle }) => {
    return (
        <div className="flex min-h-screen bg-[#FAF8F5]">
            <Sidebar onLogout={onLogout} user={user} />

            <main className="flex-1 overflow-y-auto">
                {/* Top Header */}
                <header className="h-[72px] bg-white border-b border-[#E8E4DE] px-8 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-[#6B7B8D] leading-none mb-1">
                            {subtitle || hotel?.name || 'Hotel Management'}
                        </span>
                        <h1 className="text-lg font-bold text-[#1A2332] tracking-tight leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Notifications */}
                        <div className="hidden lg:flex items-center gap-1 pr-5 border-r border-[#E8E4DE]">
                            <button className="w-9 h-9 flex items-center justify-center text-[#6B7B8D] hover:text-[#1A2332] hover:bg-[#F4F3F0] rounded-lg transition-all relative">
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C4993E] rounded-full border-2 border-white"></span>
                            </button>
                            <button className="w-9 h-9 flex items-center justify-center text-[#6B7B8D] hover:text-[#1A2332] hover:bg-[#F4F3F0] rounded-lg transition-all">
                                <span className="material-symbols-outlined text-[20px]">mail</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-[13px] font-semibold text-[#1A2332] leading-none mb-1">
                                    {user?.fullName || user?.full_name || 'Admin'}
                                </p>
                                <p className="text-[11px] font-medium text-[#C4993E] capitalize leading-none">
                                    {user?.role === 'superadmin' ? 'Administrator' : 'Hotel Manager'}
                                </p>
                            </div>
                            <div className="w-9 h-9 bg-[#1A2332] flex items-center justify-center text-white rounded-full hover:ring-2 hover:ring-[#C4993E]/20 transition-all cursor-pointer">
                                <span className="material-symbols-outlined text-[18px]">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8 max-w-[1440px] mx-auto fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
