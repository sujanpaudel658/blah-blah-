import React, { useState, useRef } from 'react';

const Navbar = ({ user, onLogout, searchPlaceholder = "Search...", onSearch, hotelSuggestions = [] }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (onSearch) {
      const filtered = e.target.value
        ? hotelSuggestions.filter(h => h.title && typeof h.title === 'string' && h.title.toLowerCase().startsWith(e.target.value.toLowerCase()))
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

  // Only show suggestions that start with the input value (case-insensitive)
  const filteredSuggestions = inputValue
    ? hotelSuggestions.filter(h => h.title && typeof h.title === 'string' && h.title.toLowerCase().startsWith(inputValue.toLowerCase()))
    : [];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            
            <span className="text-xl font-bold tracking-tight text-slate-900">StayNepal</span>
          </div>

          {/* Desktop Menu + Search */}
          <div className="hidden md:flex items-center gap-8">
            <a className="text-sm font-medium text-slate-600 hover:text-[#607AFB] transition-colors" href="#">Destinations</a>
            <a className="text-sm font-medium text-slate-600 hover:text-[#607AFB] transition-colors" href="#">Experiences</a>
            <a className="text-sm font-medium text-slate-600 hover:text-[#607AFB] transition-colors" href="#">Offers</a>
            {/* Search Bar */}
            <div className="relative ml-4">
              <form className="flex items-center bg-slate-100 rounded-lg px-2" autoComplete="off" onSubmit={e => { e.preventDefault(); }}>
                <span className="material-symbols-outlined text-slate-400 mr-2">search</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className="bg-transparent outline-none py-2 px-1 text-sm text-slate-700 w-48"
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => setShowDropdown(!!inputValue)}
                  ref={inputRef}
                />
              </form>
              {showDropdown && filteredSuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto w-80">
                  {filteredSuggestions.map(hotel => {
                    // Get first image for preview
                    const firstImage = hotel.images && hotel.images.length > 0 
                      ? (hotel.images[0].startsWith('data:') ? hotel.images[0] : (hotel.images[0].startsWith('http') ? hotel.images[0] : `http://localhost:5000${hotel.images[0]}`))
                      : null;
                    return (
                      <li
                        key={hotel.id}
                        className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-slate-700 flex items-center gap-3"
                        onMouseDown={() => handleDropdownSelect(hotel)}
                      >
                        {firstImage ? (
                          <img src={firstImage} alt={hotel.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-slate-400">hotel</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{hotel.title}</p>
                          {hotel.description && <p className="text-xs text-slate-500 truncate">{hotel.description}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">{user.fullName}</span>
                <span className="text-xs text-slate-400">({user.role})</span>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center h-10 px-6 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
