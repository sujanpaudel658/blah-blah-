import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const RoomManagement = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roomId) {
      setIsEditing(true);
      // TODO: Fetch room data from API using roomId
      console.log('Editing room with ID:', roomId);
    } else {
      setIsEditing(false);
    }
  }, [roomId]);
  
  // Form state
  const [roomData, setRoomData] = useState({
    name: 'Deluxe Ocean Suite 302',
    type: 'Deluxe Suite',
    floor: 3,
    maxOccupancy: 4,
    basePrice: '12,500',
    extraBedPrice: '1,500',
    taxInclusive: true,
    status: 'available',
    description: 'The Deluxe Ocean Suite offers breathtaking panoramic views of the coastline. Furnished with premium hardwood floors and local artwork, this suite features a private balcony, a king-sized bed with 400-thread count linens, and a dedicated workspace for business travelers.'
  });

  const [amenities, setAmenities] = useState({
    wifi: true,
    ac: true,
    tv: false,
    miniBar: true,
    coffeeMaker: true,
    safe: false
  });

  const [images, setImages] = useState([
    { id: 1, url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', primary: true },
    { id: 2, url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', primary: false },
    { id: 3, url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400', primary: false }
  ]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRoomData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAmenityChange = (amenity) => {
    setAmenities(prev => ({
      ...prev,
      [amenity]: !prev[amenity]
    }));
  };

  const handleStatusChange = (status) => {
    setRoomData(prev => ({ ...prev, status }));
  };

  const handleRemoveImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSave = () => {
    // TODO: Implement save functionality with API call
    console.log('Saving room:', { ...roomData, amenities, images });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="text-blue-600">
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V44Z" fillRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">HotelAdmin</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer">Dashboard</a>
              <a className="text-sm font-semibold text-blue-600 cursor-pointer">Rooms</a>
              <a className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer">Bookings</a>
              <a className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity cursor-pointer">Guests</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
              <input 
                className="bg-gray-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 w-64" 
                placeholder="Search rooms..." 
                type="text"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-blue-600">
              A
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 pb-32">
        {/* Breadcrumbs & Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a className="hover:text-blue-600 transition-colors cursor-pointer">Management</a>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <a className="hover:text-blue-600 transition-colors cursor-pointer">Rooms</a>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-gray-900 font-medium">{isEditing ? `Edit ${roomData.name}` : 'Add New Room'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight">{isEditing ? 'Edit Room' : 'Add New Room'}</h1>
            <button className="bg-blue-600/10 text-blue-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-600/20 transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Add New Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Primary Details (7/12) */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            {/* Room Details Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600">info</span>
                <h2 className="text-lg font-bold">Room Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Room Name</label>
                  <input 
                    name="name"
                    value={roomData.name}
                    onChange={handleInputChange}
                    className="w-full border-gray-200 rounded-lg p-3 text-base focus:border-blue-600 focus:ring-blue-600" 
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Room Type</label>
                  <select 
                    name="type"
                    value={roomData.type}
                    onChange={handleInputChange}
                    className="w-full border-gray-200 rounded-lg p-3 text-base focus:border-blue-600 focus:ring-blue-600"
                  >
                    <option>Deluxe Suite</option>
                    <option>Executive Suite</option>
                    <option>Standard Double</option>
                    <option>Standard Single</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Floor Number</label>
                  <input 
                    name="floor"
                    value={roomData.floor}
                    onChange={handleInputChange}
                    className="w-full border-gray-200 rounded-lg p-3 text-base focus:border-blue-600 focus:ring-blue-600" 
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Max Occupancy</label>
                  <input 
                    name="maxOccupancy"
                    value={roomData.maxOccupancy}
                    onChange={handleInputChange}
                    className="w-full border-gray-200 rounded-lg p-3 text-base focus:border-blue-600 focus:ring-blue-600" 
                    type="number"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-blue-600">payments</span>
                <h2 className="text-lg font-bold">Pricing Configuration</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Base Price per Night (Rs.)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rs.</span>
                    <input 
                      name="basePrice"
                      value={roomData.basePrice}
                      onChange={handleInputChange}
                      className="w-full pl-12 border-gray-200 rounded-lg p-3 text-base font-bold focus:border-blue-600 focus:ring-blue-600" 
                      type="text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-70">Extra Bed Price (Rs.)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rs.</span>
                    <input 
                      name="extraBedPrice"
                      value={roomData.extraBedPrice}
                      onChange={handleInputChange}
                      className="w-full pl-12 border-gray-200 rounded-lg p-3 text-base focus:border-blue-600 focus:ring-blue-600" 
                      type="text"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                <div>
                  <p className="font-bold">Tax Inclusive Pricing</p>
                  <p className="text-xs text-gray-500">Toggle if the displayed price already includes GST/Service Tax</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="taxInclusive"
                    checked={roomData.taxInclusive}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Status & Media (5/12) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Room Status Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">Room Status</h2>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => handleStatusChange('available')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    roomData.status === 'available' 
                      ? 'border-blue-600 bg-green-50 text-green-700' 
                      : 'border-transparent bg-green-50 text-green-700 opacity-60 hover:border-green-300'
                  }`}
                >
                  <span className="material-symbols-outlined mb-1">check_circle</span>
                  <span className="text-xs font-bold">Available</span>
                </button>
                <button 
                  onClick={() => handleStatusChange('maintenance')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    roomData.status === 'maintenance' 
                      ? 'border-blue-600 bg-orange-50 text-orange-700' 
                      : 'border-transparent bg-orange-50 text-orange-700 opacity-60 hover:border-orange-300'
                  }`}
                >
                  <span className="material-symbols-outlined mb-1">build</span>
                  <span className="text-xs font-bold">Maintenance</span>
                </button>
                <button 
                  onClick={() => handleStatusChange('blocked')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    roomData.status === 'blocked' 
                      ? 'border-blue-600 bg-red-50 text-red-700' 
                      : 'border-transparent bg-red-50 text-red-700 opacity-60 hover:border-red-300'
                  }`}
                >
                  <span className="material-symbols-outlined mb-1">block</span>
                  <span className="text-xs font-bold">Blocked</span>
                </button>
              </div>
            </div>

            {/* Room Images Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Room Images</h2>
                <span className="text-xs text-blue-600 font-bold">{images.length}/10 uploaded</span>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center mb-6 hover:bg-gray-50 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">cloud_upload</span>
                <p className="text-sm font-semibold">Drop images here</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {images.map((image) => (
                  <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden group">
                    <div 
                      className="absolute inset-0 bg-cover bg-center" 
                      style={{ backgroundImage: `url("${image.url}")` }}
                    ></div>
                    {image.primary && (
                      <span className="absolute top-1 left-1 bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Primary
                      </span>
                    )}
                    <button 
                      onClick={() => handleRemoveImage(image.id)}
                      className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-600 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={amenities.wifi}
                    onChange={() => handleAmenityChange('wifi')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-lg">wifi</span>
                    <span className="text-sm font-medium">Free WiFi</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={amenities.ac}
                    onChange={() => handleAmenityChange('ac')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-lg">ac_unit</span>
                    <span className="text-sm font-medium">Air Conditioning</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={amenities.tv}
                    onChange={() => handleAmenityChange('tv')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-lg">tv</span>
                    <span className="text-sm font-medium">Smart TV</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={amenities.miniBar}
                    onChange={() => handleAmenityChange('miniBar')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-lg">kitchen</span>
                    <span className="text-sm font-medium">Mini Bar</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={amenities.coffeeMaker}
                    onChange={() => handleAmenityChange('coffeeMaker')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-lg">coffee_maker</span>
                    <span className="text-sm font-medium">Coffee Maker</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={amenities.safe}
                    onChange={() => handleAmenityChange('safe')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-lg">safety_check</span>
                    <span className="text-sm font-medium">Digital Safe</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Bottom: Description (Full Width) */}
          <div className="lg:col-span-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">Description</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2">
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <span className="material-symbols-outlined text-lg">format_bold</span>
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <span className="material-symbols-outlined text-lg">format_italic</span>
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <span className="material-symbols-outlined text-lg">link</span>
                  </button>
                </div>
                <textarea 
                  name="description"
                  value={roomData.description}
                  onChange={handleInputChange}
                  className="w-full p-4 border-none focus:ring-0 text-base resize-none" 
                  placeholder="Describe the room features, view, and unique selling points..." 
                  rows="6"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 py-4 px-6 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-4">
          <button 
            onClick={handleCancel}
            className="px-6 py-2.5 rounded-lg font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="bg-blue-600 text-white px-10 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {isEditing ? 'Update Room' : 'Save Room'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default RoomManagement;
