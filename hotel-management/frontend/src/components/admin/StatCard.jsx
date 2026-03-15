import React from 'react';

const StatCard = ({ label, value, icon, trend, color, isMajor, variant = 'light' }) => {
    const isDark = variant === 'dark';

    return (
        <div className={`p-6 rounded-xl border transition-all hover:shadow-md ${isDark ? 'bg-[#1A2332] border-[#263345]' : 'bg-white border-[#E8E4DE]'}`}>
            <div className="flex justify-between items-start mb-4">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-[#8896A6]' : 'text-[#6B7B8D]'}`}>
                    {label}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#263345]' : 'bg-[#F4F3F0]'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${isDark ? 'text-[#C4993E]' : 'text-[#6B7B8D]'}`}>
                        {icon}
                    </span>
                </div>
            </div>

            <div className="flex items-baseline justify-between gap-3 mt-2">
                <span className={`font-bold tracking-tight ${isMajor ? 'text-4xl' : 'text-2xl'} ${isDark ? 'text-white' : 'text-[#1A2332]'}`}>
                    {value}
                </span>
                {trend && (
                    <span className={`text-[12px] font-semibold flex items-center gap-0.5 ${isDark ? 'text-[#C4993E]' : (trend.startsWith('↑') ? 'text-[#2D8659]' : 'text-[#C0392B]')}`}>
                        {trend}
                    </span>
                )}
            </div>

            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#263345]' : 'border-[#F4F3F0]'}`}>
                <span className={`text-[11px] font-medium ${isDark ? 'text-[#596A7D]' : 'text-[#A0A89C]'}`}>
                    {isMajor ? 'Total earnings' : 'Live data'}
                </span>
            </div>
        </div>
    );
};

export default StatCard;
