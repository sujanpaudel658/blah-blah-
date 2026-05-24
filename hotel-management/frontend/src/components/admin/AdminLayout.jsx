import React from 'react';
import Sidebar from './Sidebar';
import { getImageUrl } from '../../utils/helpers';
import NotificationBell from '../NotificationBell';

const AdminLayout = ({ children, user, hotel, onLogout, title, subtitle }) => {
    return (
        <div className="flex min-h-screen bg-[#FAF8F5]">
            <Sidebar onLogout={onLogout} user={user} />

            <main className="flex-1 overflow-y-auto">
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
                        <div className="flex items-center pr-3 sm:pr-5 border-r border-[#E8E4DE]">
                            <NotificationBell
                                emptyHint="No notifications yet. Booking activity and platform alerts will appear here."
                            />
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
                            <div className="w-9 h-9 bg-[#1A2332] flex items-center justify-center text-white rounded-full hover:ring-2 hover:ring-[#C4993E]/20 transition-all cursor-pointer overflow-hidden shrink-0">
                                {user?.profileImage ? (
                                    <img src={getImageUrl(user.profileImage)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">person</span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-[1440px] mx-auto fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
