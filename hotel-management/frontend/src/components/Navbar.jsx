import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';
import { getImageUrl } from '../utils/helpers';
import GuestNotificationBell from './GuestNotificationBell';

const Navbar = ({ user, onLogout, searchPlaceholder = "Search hotels...", onSearch, hotelSuggestions = [] }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (!user) { navigate('/'); return; }
    switch (user.role) {
      case 'admin': navigate('/admin/dashboard'); break;
      case 'super_admin': navigate('/super/dashboard'); break;
      default: navigate('/guest/dashboard');
    }
  };

  const filterHotels = (q) => {
    const needle = (q || '').trim().toLowerCase();
    if (!needle) return hotelSuggestions;
    return hotelSuggestions.filter(
      (h) =>
        h.title?.toLowerCase().includes(needle) ||
        h.city?.toLowerCase().includes(needle) ||
        h.address?.toLowerCase().includes(needle)
    );
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (onSearch) onSearch(filterHotels(e.target.value));
    setShowDropdown(!!e.target.value);
  };

  const handleDropdownSelect = (hotel) => {
    setInputValue(hotel.title);
    setShowDropdown(false);
    if (onSearch) onSearch([hotel]);
    if (inputRef.current) inputRef.current.blur();
  };

  const filteredSuggestions = filterHotels(inputValue);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-[#E8E4DE] h-[92px]">
      <div className="max-w-7xl mx-auto px-6 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleLogoClick}>
            <div className="h-16 w-44 overflow-hidden flex items-center">
              <img
                src="/images/website_logo.png"
                alt="StayNepal"
                className="h-full w-auto object-contain origin-left scale-[2.2]"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <div className="relative">
              <div className="flex items-center bg-[#F4F3F0] border border-[#E8E4DE] px-4 rounded-lg focus-within:border-[#C4993E] focus-within:ring-2 focus-within:ring-[#C4993E]/15 transition-all">
                <span className="material-symbols-outlined text-[18px] text-[#A0A89C]">search</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="bg-transparent outline-none py-2.5 px-3 text-[13px] text-[#2C3E50] w-64 placeholder-[#A0A89C]"
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => setShowDropdown(!!inputValue)}
                  ref={inputRef}
                />
              </div>

              {showDropdown && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-[#E8E4DE] shadow-lg z-50 overflow-hidden rounded-xl w-80">
                  <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-[#E8E4DE]">
                    <span className="text-[11px] font-medium text-[#6B7B8D]">Search results</span>
                  </div>
                  <ul className="max-h-72 overflow-y-auto custom-scrollbar">
                    {filteredSuggestions.map(hotel => {
                      const firstImage = hotel.images?.[0];
                      const thumbUrl = firstImage
                        ? (firstImage.startsWith('data:') ? firstImage : (firstImage.startsWith('http') ? firstImage : `${API_URL.replace("/api", "")}${firstImage}`))
                        : null;

                      return (
                        <li
                          key={hotel.id}
                          className="px-4 py-3 cursor-pointer hover:bg-[#FAF8F5] flex items-center gap-3 border-b border-[#F4F3F0] last:border-0 transition-colors"
                          onMouseDown={() => handleDropdownSelect(hotel)}
                        >
                          <div className="w-10 h-10 bg-[#E8E4DE] shrink-0 rounded-lg overflow-hidden">
                            {thumbUrl && <img src={thumbUrl} alt={hotel.title} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[13px] text-[#1A2332] truncate">{hotel.title}</p>
                            <p className="text-[11px] text-[#6B7B8D] truncate">{hotel.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {user && !['admin', 'superadmin'].includes(user.role) && <GuestNotificationBell />}
            {user && (
              <div className="hidden sm:flex items-center gap-3">
                {user.profileImage ? (
                  <img
                    src={getImageUrl(user.profileImage)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-[#E8E4DE] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#F4F3F0] border border-[#E8E4DE] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#A0A89C] text-[22px]">person</span>
                  </div>
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[13px] font-semibold text-[#1A2332] leading-none mb-1">{user.fullName || user.full_name}</span>
                  <span className="text-[11px] font-medium text-[#C4993E] capitalize leading-none">
                    {user.role === 'admin' ? 'Hotel Manager' : user.role === 'superadmin' ? 'Super Admin' : 'Guest'}
                  </span>
                </div>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="h-10 px-5 bg-[#1A2332] text-white text-[13px] font-semibold hover:bg-[#C0392B] transition-all rounded-lg"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
