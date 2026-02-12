import React from 'react';
import Sidebar from './Sidebar';

const AdminLayout = ({ children, user, hotel, onLogout, title, subtitle }) => {
    return (
        <div className="flex min-h-screen bg-[#F5F3EF]">
            <Sidebar onLogout={onLogout} />

            <main className="flex-1 overflow-y-auto">
                {/* Top Header */}
                <header className="h-20 bg-white border-b border-[#E2E2E2] px-8 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest leading-none mb-1">
                            {subtitle || hotel?.name || 'Property Administration'}
                        </span>
                        <h1 className="text-xl font-bold text-[#1B2B41] tracking-tight leading-none group flex items-center gap-2">
                            {title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Notifications Module */}
                        <div className="hidden lg:flex items-center gap-2 pr-6 border-r border-[#E2E2E2]">
                            <button className="w-10 h-10 flex items-center justify-center text-[#64748B] hover:text-[#1B2B41] transition-colors relative">
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-[#B88E2F] rounded-full border-2 border-white"></span>
                            </button>
                            <button className="w-10 h-10 flex items-center justify-center text-[#64748B] hover:text-[#1B2B41] transition-colors">
                                <span className="material-symbols-outlined text-[20px]">mail</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-[#1B2B41] leading-none mb-1">
                                    {user?.fullName || user?.full_name || 'System Operator'}
                                </p>
                                <p className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-wider leading-none">
                                    {user?.role || 'Admin'}
                                </p>
                            </div>
                            <div className="w-10 h-10 border border-[#E2E2E2] bg-[#1B2B41] flex items-center justify-center text-white rounded-xl shadow-sm hover:ring-2 hover:ring-[#B88E2F]/20 transition-all cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">person_filled</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Area */}
                <div className="p-8 max-w-[1440px] mx-auto fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
