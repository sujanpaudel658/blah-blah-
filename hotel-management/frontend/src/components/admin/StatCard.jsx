import React from 'react';

const StatCard = ({ label, value, icon, trend, color, isMajor }) => {
    return (
        <div className={`admin-card p-6 flex flex-col justify-between ${isMajor ? 'bg-white' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="admin-label">{label}</span>
                <span className={`material-symbols-outlined text-[18px] text-[#A0AEC0]`}>
                    {icon}
                </span>
            </div>

            <div className="flex items-baseline gap-3">
                <span className={`font-bold text-[#1B2B41] tracking-tight ${isMajor ? 'text-4xl' : 'text-3xl'}`}>
                    {value}
                </span>
                {trend && (
                    <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.startsWith('↑') ? 'text-[#108548]' : 'text-[#B91C1C]'}`}>
                        {trend}
                    </span>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#F1F1F1]">
                <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                    {isMajor ? 'Consolidated performance' : 'Real-time sync'}
                </span>
            </div>
        </div>
    );
};

export default StatCard;
