import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // check authentication and role
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    console.log('Stored user:', parsedUser);

    // verify admin role
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'superadmin') {
      navigate('/guest/dashboard');
      return;
    }

    // Always fetch fresh user data from backend to get current hotel_id
    const fetchFreshUserData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const freshUser = response.data.user;
        console.log('Fresh user from backend:', freshUser);

        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(freshUser));
        setUser(freshUser);

        // Fetch hotel if user has hotel_id
        if (freshUser.hotel_id) {
          console.log('Fetching hotel for hotel_id:', freshUser.hotel_id);
          fetchHotel(freshUser.hotel_id);
        } else {
          console.log('No hotel_id assigned to this user');
        }
      } catch (error) {
        console.error('Error fetching fresh user data:', error);
        // Fall back to stored user data
        setUser(parsedUser);
        if (parsedUser.hotel_id) {
          fetchHotel(parsedUser.hotel_id);
        } else if (parsedUser.hotelId) {
          fetchHotel(parsedUser.hotelId);
        }
      }
    };

    fetchFreshUserData();
  }, [navigate]);

  const fetchHotel = async (hotelId) => {
    console.log('Fetching hotel with ID:', hotelId);
    // Retrieve hotel details including images and description
    try {
      const response = await axios.get(`http://localhost:5000/api/hotels/${hotelId}`);
      console.log('Hotel response:', response.data);
      setHotel(response.data.hotel);
      setDescription(response.data.hotel.description || '');

      // Parse images from JSON string
      let hotelImages = [];
      if (response.data.hotel.image) {
        try {
          hotelImages = JSON.parse(response.data.hotel.image);
        } catch (e) {
          // If it's not JSON, treat as single image URL
          hotelImages = [response.data.hotel.image];
        }
      }
      console.log('Parsed images:', hotelImages);
      console.log('Parsed images:', hotelImages);
      setImagePreviews(hotelImages.map(img => img.startsWith('data:') ? img : (img.startsWith('http') ? img : `http://localhost:5000${img}`)));
    } catch (error) {
      console.error('Error fetching hotel:', error);
      setHotel(null); // Make sure hotel is null on error
    }
  };

  // Debug hotel state changes
  useEffect(() => {
    console.log('Hotel state changed:', hotel ? `Hotel: ${hotel.name} (ID: ${hotel.id})` : 'No hotel');
  }, [hotel]);

  const handleImageChange = (e) => {
    // Handle file selection for image uploads
    const files = Array.from(e.target.files);
    setImages(files);

    // Create previews for selected files
    const previews = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previews).then(setImagePreviews);
  };

  const handleUploadImage = async (suppressMessage = false) => {
    // Upload selected images as base64 and save directly to database
    if (!images || images.length === 0) return;

    try {
      // Convert files to base64
      const base64Images = [];
      for (const file of images) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        base64Images.push(base64);
      }

      // Get existing images and append new ones
      let existingImages = [];
      if (hotel.image) {
        try {
          existingImages = JSON.parse(hotel.image);
        } catch (e) {
          if (hotel.image) existingImages = [hotel.image];
        }
      }

      const allImages = [...existingImages, ...base64Images];

      // Update hotel with new image array directly
      await updateHotel({ image: JSON.stringify(allImages) });
      setImages([]);

      if (!suppressMessage) {
        setSuccessMessage('Images uploaded and saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error uploading images:', error.response ? error.response.data : error.message);
      setSuccessMessage('Failed to upload images.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleRemoveImage = async (indexToRemove) => {
    // Remove a specific image from the hotel's image list
    let existingImages = [];
    if (hotel.image) {
      try {
        existingImages = JSON.parse(hotel.image);
      } catch (e) {
        existingImages = [hotel.image];
      }
    }

    const updatedImages = existingImages.filter((_, index) => index !== indexToRemove);
    await updateHotel({ image: JSON.stringify(updatedImages) });
    setSuccessMessage('Image removed successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUpdateDescription = async (suppressMessage = false) => {
    // Update the hotel's description
    await updateHotel({ description });
    if (!suppressMessage) {
      setSuccessMessage('Description updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const updateHotel = async (updates) => {
    // Generic function to update hotel data on the server
    if (!hotel) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:5000/api/hotels/${hotel.id}`, {
        ...hotel,
        ...updates
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setHotel(response.data.hotel);
      setDescription(response.data.hotel.description || '');

      // Update image previews
      if (response.data.hotel.image) {
        try {
          const hotelImages = JSON.parse(response.data.hotel.image);
          setImagePreviews(hotelImages.map(img => img.startsWith('data:') ? img : (img.startsWith('http') ? img : `http://localhost:5000${img}`)));
        } catch (e) {
          setImagePreviews([]);
        }
      } else {
        setImagePreviews([]);
      }
    } catch (error) {
      console.error('Error updating hotel:', error);
    }
  };

  // Compress image to reduce file size
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale down if larger than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed JPEG
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveAll = async () => {
    try {
      let updatedHotel = { ...hotel };

      // First, handle new images if any are selected
      if (images.length > 0) {
        console.log('Compressing and converting', images.length, 'new images...');

        // Compress and convert files to base64
        const base64Images = [];
        for (const file of images) {
          const compressedBase64 = await compressImage(file, 800, 0.7);
          base64Images.push(compressedBase64);
          console.log(`Compressed ${file.name}: ${Math.round(compressedBase64.length / 1024)}KB`);
        }
        console.log('Converted', base64Images.length, 'images');

        // Get existing images and append new ones
        let existingImages = [];
        if (hotel.image) {
          try {
            existingImages = JSON.parse(hotel.image);
          } catch (e) {
            if (hotel.image) existingImages = [hotel.image];
          }
        }
        console.log('Existing images:', existingImages.length);

        const allImages = [...existingImages, ...base64Images];
        console.log('Total images to save:', allImages.length);

        // Check total size
        const totalSize = JSON.stringify(allImages).length;
        console.log('Total data size:', Math.round(totalSize / 1024 / 1024 * 100) / 100, 'MB');

        if (totalSize > 15000000) { // 15MB limit
          setSuccessMessage('Error: Total image size too large. Please remove some images or use smaller images.');
          setTimeout(() => setSuccessMessage(''), 5000);
          return;
        }

        updatedHotel.image = JSON.stringify(allImages);
      }

      // Update description
      updatedHotel.description = description;

      // Save everything in one API call
      console.log('Saving hotel with', updatedHotel.image ? JSON.parse(updatedHotel.image).length : 0, 'images and description:', updatedHotel.description);

      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:5000/api/hotels/${hotel.id}`, updatedHotel, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Save response:', response.data);

      // Update local state with response
      setHotel(response.data.hotel);
      setDescription(response.data.hotel.description || '');
      setImages([]); // Clear selected files

      // Update image previews from saved data
      if (response.data.hotel.image) {
        try {
          const hotelImages = JSON.parse(response.data.hotel.image);
          console.log('Images saved successfully:', hotelImages.length);
          setImagePreviews(hotelImages.map(img => img.startsWith('data:') ? img : (img.startsWith('http') ? img : `http://localhost:5000${img}`)));
        } catch (e) {
          setImagePreviews([]);
        }
      }

      setSuccessMessage('All changes saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving changes:', error.response ? error.response.data : error);
      setSuccessMessage('Failed to save changes: ' + (error.response?.data?.message || error.message));
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handleLogout = () => {
    // Clear user session and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  console.log('Rendering AdminDashboard, user:', user, 'hotel:', hotel);

  return (
    <div className="flex min-h-screen bg-background-light text-slate-900 antialiased">
      <script dangerouslySetInnerHTML={{
        __html: `
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#137fec",
                        "background-light": "#f8fafc",
                        "sidebar-bg": "#ffffff",
                    },
                    fontFamily: {
                        "sans": ["Inter", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.375rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "2xl": "1rem"
                    },
                },
            },
        }
        `
      }} />
      <style>{`
        @layer base {
            body {
                @apply bg-background-light text-slate-900 antialiased;
            }
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        body {
          min-height: max(884px, 100dvh);
        }
      `}</style>
      <aside className="w-64 bg-sidebar-bg border-r-2 border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg flex items-center justify-center p-2 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-2xl">landscape</span>
            </div>
            <div>
              <h2 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">StayNepal</h2>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Admin Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <Link to="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-semibold">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/rooms" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            <span className="material-symbols-outlined">bed</span>
            <span>Rooms</span>
          </Link>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" href="#">
            <span className="material-symbols-outlined">book_online</span>
            <span>Bookings</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span>Reports</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" href="#">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </a>
        </nav>
        <div className="p-4 border-t-2 border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-full border-2 border-white bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAGsGtWWn6ZBN4kRFNuusTcvkyoHZHcsCyq1B6IP34uUfV89PTApB9OoqjXGd5Y26-f0JkFq54qslSxgvRZpFkzwl0x2rWSU3SNzn1OJqVY4mR23laxy4-UCd1ahZL-trjdASNppqbFWV35Rcp7TLEwcGqlA3choxi9dfVDCH1XWuAmLV4DtBRplAvQAS5wNNLxe6fAX8jQxjV1Mit3hxNn7McAUapwxcU2e2JnGRnUadE_jbHbNL1VtL7Dm_BlTKdtC60h3F7xVzU')" }}></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{hotel?.name || user?.name || 'Hotel Admin'}</p>
              <p className="text-xs text-slate-500">Owner</p>
            </div>
            <button className="text-slate-400 hover:text-red-500" onClick={handleLogout}>
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b-2 border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-8 flex-1">
            <div className="max-w-md w-full relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input className="w-full bg-slate-50 border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Search bookings, guests, or rooms..." type="text" />
            </div>
            <nav className="hidden lg:flex items-center gap-6">
              <a className="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="#">Destinations</a>
              <a className="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="#">Experiences</a>
              <a className="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="#">Offers</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" onClick={handleLogout}>
              <span className="material-symbols-outlined text-red-500 text-xl">logout</span>
              <span className="text-sm font-medium text-slate-700">Logout</span>
            </button>
          </div>
        </header>
        <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {hotel?.name || user?.name || 'Admin'}</h1>
            <p className="text-slate-500">Here's what's happening at your property today.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Rooms</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-primary">
                <span className="material-symbols-outlined">bed</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Bookings</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">0</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-green-600">
                <span className="material-symbols-outlined">event_available</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Revenue (This Month)</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">Rs.0</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Hotel Management Card - FULL WIDTH REFACTOR */}
            <div className="lg:col-span-3 bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">hotel</span>
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-900 tracking-tight">Property Profile</h3>
                    <p className="text-xs text-slate-500 font-medium">Manage your hotel's public appearance</p>
                  </div>
                </div>
                {hotel && (
                  <button onClick={handleSaveAll} className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold text-sm shadow-lg shadow-primary/25 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save Profile
                  </button>
                )}
              </div>

              <div className="p-8 space-y-8">
                {successMessage && (
                  <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <span className="material-symbols-outlined text-green-600">check_circle</span>
                    <p className="text-sm font-bold text-green-700">{successMessage}</p>
                  </div>
                )}

                {!hotel ? (
                  <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl text-center">
                    <span className="material-symbols-outlined text-amber-600 text-4xl mb-2">warning</span>
                    <p className="text-amber-900 font-bold">No property assigned</p>
                    <p className="text-sm text-amber-700/70">Please contact the superadmin to link your account to a hotel property.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Left side: Images */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                          Gallery ({imagePreviews.length})
                        </label>
                        <span className="text-[10px] font-bold text-slate-400">MAX 10MB PER FILE</span>
                      </div>

                      {/* Dropzone mockup */}
                      <div
                        onClick={() => document.getElementById('hotel-image-input').click()}
                        className="group relative border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white hover:border-primary hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer"
                      >
                        <input
                          id="hotel-image-input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                        </div>
                        <p className="text-sm font-black text-slate-900">Upload New Photos</p>
                        <p className="text-xs text-slate-500 mt-1">Click to browse or drag and drop</p>

                        {images.length > 0 && (
                          <div className="absolute -bottom-3 px-4 py-1.5 bg-primary text-white text-[10px] font-black rounded-full shadow-lg">
                            {images.length} FILES SELECTED
                          </div>
                        )}
                      </div>

                      {/* Improved Grid */}
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                              <img src={preview} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleRemoveImage(index)}
                                  className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all shadow-lg"
                                  title="Remove Image"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                                {index === 0 && (
                                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-[8px] font-black rounded uppercase tracking-tighter">
                                    Primary
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side: Description & Details */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                          Property Description
                        </label>
                        <div className="relative group">
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all text-slate-700 leading-relaxed text-sm min-h-[220px] resize-none"
                            placeholder="Tell guests about your hotel, the location, and what makes it special..."
                          />
                          <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400 group-focus-within:text-primary">
                            {description.length} CHARACTERS
                          </div>
                        </div>
                      </div>

                      {/* Property Stats Mockup */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">Rating</span>
                          <div className="flex items-center gap-1 text-amber-500 mt-1">
                            <span className="material-symbols-outlined text-sm FILL">star</span>
                            <span className="font-black text-slate-900">{hotel?.rating || '0.0'}</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                          <div className="flex items-center gap-1 text-green-600 mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="font-black text-slate-900">Live</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {hotel && (
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
                  <div className="flex gap-3">
                    <button className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Discard</button>
                    <button onClick={handleSaveAll} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-xl">
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">meeting_room</span>
                <h3 className="font-bold text-lg">Room Management</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">add_circle</span>
                    <span className="font-medium">Add New Room</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">edit_square</span>
                    <span className="font-medium">Manage Rooms</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">calendar_today</span>
                    <span className="font-medium">Room Availability</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600">book_online</span>
                <h3 className="font-bold text-lg">Booking Management</h3>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-green-600 hover:bg-green-50 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-green-600">bookmark_add</span>
                    <span className="font-medium">New Booking</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-green-600">chevron_right</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-green-600 hover:bg-green-50 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-green-600">view_list</span>
                    <span className="font-medium">Manage Bookings</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-green-600">chevron_right</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-green-600 hover:bg-green-50 transition-all text-left group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-green-600">login</span>
                    <span className="font-medium">Check-In / Check-Out</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-green-600">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
