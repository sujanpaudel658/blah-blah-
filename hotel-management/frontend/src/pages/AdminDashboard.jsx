import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    
    // verify admin role
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'superadmin') {
      navigate('/guest/dashboard');
      return;
    }

    setUser(parsedUser);

    // fetch hotel details if admin has hotel_id
    if (parsedUser.hotel_id) {
      fetchHotel(parsedUser.hotel_id);
    } else if (parsedUser.hotelId) {
      fetchHotel(parsedUser.hotelId);
    } else {
      // Try to fetch user's hotel from backend
      fetchUserHotel(parsedUser.id);
    }
  }, [navigate]);

  const fetchUserHotel = async (userId) => {
    // Fetch the user's associated hotel from the backend
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.user?.hotel_id) {
        fetchHotel(response.data.user.hotel_id);
      }
    } catch (error) {
      console.error('Error fetching user hotel:', error);
    }
  };

  const fetchHotel = async (hotelId) => {
    // Retrieve hotel details including images and description
    try {
      const response = await axios.get(`http://localhost:5000/api/hotels/${hotelId}`);
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
      setImagePreviews(hotelImages.map(img => img.startsWith('http') ? img : `http://localhost:5000${img}`));
    } catch (error) {
      console.error('Error fetching hotel:', error);
    }
  };

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

  const handleUploadImage = async () => {
    // Upload selected images to the server and update hotel record
    if (!images || images.length === 0) return;

    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', image);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/hotels/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      // Get existing images and append new ones
      let existingImages = [];
      if (hotel.image) {
        try {
          existingImages = JSON.parse(hotel.image);
        } catch (e) {
          existingImages = [hotel.image];
        }
      }
      
      const allImages = [...existingImages, ...response.data.imageUrls];
      
      // Update hotel with new image array
      await updateHotel({ image: JSON.stringify(allImages) });
      setImages([]);
      setSuccessMessage('Images uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading images:', error);
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

  const handleUpdateDescription = async () => {
    // Update the hotel's description
    await updateHotel({ description });
    setSuccessMessage('Description updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
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
          setImagePreviews(hotelImages.map(img => img.startsWith('http') ? img : `http://localhost:5000${img}`));
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

  const handleLogout = () => {
    // Clear user session and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

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
          <a className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-semibold" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" href="#">
            <span className="material-symbols-outlined">bed</span>
            <span>Rooms</span>
          </a>
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
            <div className="size-10 rounded-full border-2 border-white bg-cover bg-center" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAGsGtWWn6ZBN4kRFNuusTcvkyoHZHcsCyq1B6IP34uUfV89PTApB9OoqjXGd5Y26-f0JkFq54qslSxgvRZpFkzwl0x2rWSU3SNzn1OJqVY4mR23laxy4-UCd1ahZL-trjdASNppqbFWV35Rcp7TLEwcGqlA3choxi9dfVDCH1XWuAmLV4DtBRplAvQAS5wNNLxe6fAX8jQxjV1Mit3hxNn7McAUapwxcU2e2JnGRnUadE_jbHbNL1VtL7Dm_BlTKdtC60h3F7xVzU')"}}></div>
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
              <input className="w-full bg-slate-50 border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Search bookings, guests, or rooms..." type="text"/>
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
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">hotel</span>
                <h3 className="font-bold text-lg">Hotel Management</h3>
              </div>
              <div className="p-6 space-y-4">
                {successMessage && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                )}
                {!hotel && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="text-sm text-yellow-700">No hotel assigned to your account. Please contact the superadmin.</p>
                  </div>
                )}
                {hotel ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Hotel Images</label>
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img src={preview} alt={`Hotel ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              <button 
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="w-full text-sm" />
                      <button onClick={handleUploadImage} className="mt-2 w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        Upload Images
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg resize-none"
                        rows="4"
                        placeholder="Enter hotel description..."
                      />
                      <button onClick={handleUpdateDescription} className="mt-2 w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        Update Description
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
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
