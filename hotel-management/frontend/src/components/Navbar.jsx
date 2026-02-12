import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Navbar Component
 * 
 * Purpose: Primary navigation and global inventory search for the StayNepal Portal.
 * Aesthetic: Formal Professional (2016-2019)
 */
const Navbar = ({ user, onLogout, searchPlaceholder = "Search...", onSearch, hotelSuggestions = [] }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  /**
   * Logical Routing Handler
   * Ensures clicking the identity block returns the user to their relevant operational context.
   */
  const handleLogoClick = () => {
    if (!user) {
      navigate('/');
      return;
    }

    // Role-Based Context Redirection
    switch (user.role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'super_admin':
        navigate('/super/dashboard');
        break;
      default:
        navigate('/guest/dashboard');
    }
  };

  /**
   * Search Query Handler
   * Filters suggestions based on alphabetical prefix match
   */
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (onSearch) {
      const filtered = e.target.value
        ? hotelSuggestions.filter(h => h.title?.toLowerCase().startsWith(e.target.value.toLowerCase()))
        : hotelSuggestions;
      onSearch(filtered);
    }
    setShowDropdown(!!e.target.value);
  };

  const handleDropdownSelect = (hotel) => {
    setInputValue(hotel.title);
    setShowDropdown(false);
    if (onSearch) onSearch([hotel]);
    if (inputRef.current) inputRef.current.blur();
  };

  const filteredSuggestions = inputValue
    ? hotelSuggestions.filter(h => h.title?.toLowerCase().startsWith(inputValue.toLowerCase()))
    : [];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-[#E2E2E2] h-20">
      <div className="max-w-7xl mx-auto px-6 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Brand Identity Section */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#B88E2F] text-2xl">domain</span>
              <span className="text-lg font-bold tracking-tight text-[#1B2B41] uppercase">StayNepal</span>
            </div>
          </div>

          {/* Navigation & Operational Search */}
          <div className="hidden md:flex items-center gap-10">
            <div className="flex gap-8 border-r border-[#E2E2E2] pr-10">
              {['Destinations', 'Experiences', 'Hotels'].map(link => (
                <a key={link} className="text-[10px] font-bold text-[#64748B] hover:text-[#1B2B41] transition-colors uppercase tracking-[0.2em]" href="#">{link}</a>
              ))}
            </div>

            {/* Global Search Interface */}
            <div className="relative">
              <div className="flex items-center bg-[#F5F3EF] border border-[#E2E2E2] px-4 rounded-xl group focus-within:border-[#B88E2F] transition-all">
                <span className="material-symbols-outlined text-[18px] text-[#A0AEC0]">search</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="bg-transparent outline-none py-3 px-3 text-[11px] font-bold text-[#1B2B41] w-64 placeholder-[#A0AEC0] uppercase tracking-wider"
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => setShowDropdown(!!inputValue)}
                  ref={inputRef}
                />
              </div>

              {/* Contextual Suggestions Overlay */}
              {showDropdown && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-3 bg-white border border-[#E2E2E2] shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden rounded-2xl w-80">
                  <div className="px-5 py-3 bg-[#F9FAFB] border-b border-[#E2E2E2]">
                    <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Matching Registry Records</span>
                  </div>
                  <ul className="max-h-80 overflow-y-auto custom-scrollbar">
                    {filteredSuggestions.map(hotel => {
                      const firstImage = hotel.images?.[0];
                      const thumbUrl = firstImage
                        ? (firstImage.startsWith('data:') ? firstImage : (firstImage.startsWith('http') ? firstImage : `http://localhost:5000${firstImage}`))
                        : null;

                      return (
                        <li
                          key={hotel.id}
                          className="px-5 py-4 cursor-pointer hover:bg-[#F5F3EF] flex items-center gap-4 border-b border-[#F1F1F1] last:border-0 transition-colors"
                          onMouseDown={() => handleDropdownSelect(hotel)}
                        >
                          <div className="w-12 h-12 bg-[#E2E2E2] shrink-0 grayscale-[0.3] rounded-lg overflow-hidden">
                            {thumbUrl && <img src={thumbUrl} alt={hotel.title} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[11px] text-[#1B2B41] uppercase truncate tracking-tight">{hotel.title}</p>
                            <p className="text-[9px] text-[#A0AEC0] uppercase truncate tracking-tighter">{hotel.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* User Session Metadata & Termination */}
          <div className="flex items-center gap-6">
            {user && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#1B2B41] uppercase leading-none mb-1">{user.fullName || user.full_name}</span>
                <span className="text-[9px] font-bold text-[#B88E2F] uppercase tracking-widest leading-none">{user.role} Authorization</span>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="h-11 px-6 bg-[#1B2B41] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-rose-700 transition-all rounded-xl shadow-md"
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
