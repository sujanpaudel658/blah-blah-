import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import AdminLayout from '../components/admin/AdminLayout';

const RoomTypeManagement = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showRoomsModal, setShowRoomsModal] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [roomsList, setRoomsList] = useState('');
    const [roomFloor, setRoomFloor] = useState('');
    const [roomCount, setRoomCount] = useState(1);
    const [startNumber, setStartNumber] = useState('101');
    const [addMethod, setAddMethod] = useState('list');
    const [floorBatches, setFloorBatches] = useState([{ floor: '1', start: '101', count: '5' }]);
    const [successMessage, setSuccessMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        base_price: '',
        max_occupancy: '',
        amenities: {
            wifi: false,
            ac: false,
            tv: false,
            miniBar: false,
            coffeeMaker: false,
            safe: false
        }
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token || !userData) {
            navigate('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchRoomTypes(parsedUser.hotel_id);
    }, [navigate]);

    const getBulkPreview = () => {
        if (!startNumber || !roomCount || isNaN(roomCount) || roomCount <= 0) return 'No rooms to generate';
        const match = startNumber.toString().match(/^([A-Za-z]*)(\d+)$/);
        const prefix = match ? match[1] : '';
        const numPart = match ? match[2] : startNumber.toString().replace(/^\D+/, '');
        const sNum = parseInt(numPart) || 1;
        const padding = numPart.length;
        const count = parseInt(roomCount);

        const rooms = [];
        const displayLimit = 12;
        for (let i = 0; i < Math.min(count, displayLimit); i++) {
            rooms.push(prefix + (sNum + i).toString().padStart(padding, '0'));
        }
        if (count > displayLimit) rooms.push('...');
        if (count > 1) {
            const lastNum = prefix + (sNum + count - 1).toString().padStart(padding, '0');
            if (count > displayLimit) rooms.push(lastNum);
        }
        return rooms.join(', ');
    };

    const fetchRoomTypes = async (hotelId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/rooms/types?hotelId=${hotelId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setRoomTypes(res.data.roomTypes || []);
            }
        } catch (error) {
            console.error('Error fetching room types:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAmenityChange = (amenity) => {
        setFormData(prev => ({
            ...prev,
            amenities: {
                ...prev.amenities,
                [amenity]: !prev.amenities[amenity]
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                hotel_id: user?.hotel_id,
                base_price: parseFloat(formData.base_price),
                max_occupancy: parseInt(formData.max_occupancy)
            };

            let res;
            if (isEditing) {
                res = await axios.put(`${API_URL}/rooms/types/${editingId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await axios.post(`${API_URL}/rooms/types`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (res.data.success) {
                setSuccessMessage(isEditing ? 'Category updated successfully.' : 'Category created successfully.');
                setShowModal(false);
                resetForm();
                fetchRoomTypes(user?.hotel_id);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error saving room type:', error);
            alert('Failed to save category');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            base_price: '',
            max_occupancy: '',
            amenities: {
                wifi: false, ac: false, tv: false, miniBar: false, coffeeMaker: false, safe: false
            }
        });
        setIsEditing(false);
        setEditingId(null);
        setShowModal(false);
    };

    const handleEdit = (type) => {
        setFormData({
            name: type.name,
            description: type.description || '',
            base_price: type.base_price,
            max_occupancy: type.max_occupancy,
            amenities: {
                wifi: type.amenities?.wifi || false,
                ac: type.amenities?.ac || false,
                tv: type.amenities?.tv || false,
                miniBar: type.amenities?.miniBar || false,
                coffeeMaker: type.amenities?.coffeeMaker || false,
                safe: type.amenities?.safe || false
            }
        });
        setEditingId(type.id);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('CRITICAL: Are you sure you want to delete this category? This action cannot be undone and will fail if rooms are still assigned.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_URL}/rooms/types/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setSuccessMessage('Category deleted successfully.');
                fetchRoomTypes(user?.hotel_id);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(error.response?.data?.message || 'Failed to delete category');
        }
    };

    const handleAddRooms = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            let res;

            if (addMethod === 'list') {
                res = await axios.post(`${API_URL}/rooms/add-by-numbers`, {
                    hotel_id: user?.hotel_id,
                    room_type_id: selectedType?.id,
                    room_numbers: roomsList,
                    floor: roomFloor
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (addMethod === 'quick') {
                res = await axios.post(`${API_URL}/rooms/bulk`, {
                    hotel_id: user?.hotel_id,
                    room_type_id: selectedType?.id,
                    start_number: startNumber,
                    count: parseInt(roomCount),
                    floor: roomFloor
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await axios.post(`${API_URL}/rooms/multi-bulk`, {
                    hotel_id: user?.hotel_id,
                    room_type_id: selectedType?.id,
                    batches: floorBatches.map(b => ({
                        floor: b.floor,
                        start_number: b.start,
                        count: parseInt(b.count)
                    }))
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (res.data.success) {
                setSuccessMessage(res.data.message);
                setShowRoomsModal(false);
                setRoomsList('');
                setRoomFloor('');
                setRoomCount(1);
                fetchRoomTypes(user?.hotel_id);
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error adding rooms:', error);
            alert('Failed to add rooms: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#F5F3EF] text-[#1B2B41] font-bold">LOADING ROOM CATEGORIES...</div>;

    return (
        <AdminLayout
            user={user}
            title="ROOM CATEGORIES"
            subtitle="HOTEL CONFIGURATION"
            onLogout={handleLogout}
        >
            <div className="space-y-8 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-sm font-bold text-[#1B2B41] uppercase tracking-[0.2em]">Room Categories</h2>
                        <p className="text-[11px] text-[#64748B] font-medium mt-1">Manage your room types and details.</p>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="admin-button admin-button-primary"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        ADD NEW CATEGORY
                    </button>
                </div>

                {successMessage && (
                    <div className="bg-[#E7F3ED] border border-[#108548] p-4 flex items-center gap-3 text-[#108548] font-bold text-xs uppercase tracking-widest fade-in">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        {successMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(roomTypes || []).map(type => (
                        <div key={type.id} className="admin-card p-6 flex flex-col bg-white">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="admin-label">Type ID: {type.id}</span>
                                    <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">{type.name}</h3>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(type)}
                                        className="w-8 h-8 flex items-center justify-center text-[#64748B] hover:text-[#607AFB] hover:bg-[#607AFB]/10 rounded-full transition-all"
                                        title="Edit Category"
                                    >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type.id)}
                                        className="w-8 h-8 flex items-center justify-center text-[#8a7d72] hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        title="Delete Category"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-[#64748B] font-medium mb-6 line-clamp-2 h-8">
                                {type.description || 'No description provided.'}
                            </p>

                            <div className="grid grid-cols-2 gap-px bg-[#E2E2E2] border border-[#E2E2E2] mb-6">
                                <div className="bg-[#F8FAFC] p-3 text-center">
                                    <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Base Price</span>
                                    <span className="font-bold text-[#607AFB]">Rs. {type.base_price}</span>
                                </div>
                                <div className="bg-[#F8FAFC] p-3 text-center">
                                    <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Capacity</span>
                                    <span className="font-bold text-[#1B2B41]">{type.max_occupancy} Pers</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <span className="admin-label mb-0">Units:</span>
                                <span className="rounded-[2px] bg-[#EEF2FF] px-2 py-0.5 text-xs font-bold text-[#1B2B41]">
                                    {type.room_count || 0} Registered
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedType(type);
                                    setShowRoomsModal(true);
                                }}
                                className="mt-auto admin-button admin-button-secondary py-2 text-[11px]"
                            >
                                <span className="material-symbols-outlined text-sm">inventory</span>
                                ALLOCATE ROOM NUMBERS
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1614]/75 p-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-xl overflow-hidden rounded-xl border border-[#DBE4FF] bg-white shadow-2xl fade-in">
                        <div className="flex items-center justify-between border-b-2 border-[#607AFB]/25 bg-gradient-to-r from-[#F8FAFF] via-[#FFFFFF] to-[#EEF2FF] px-6 py-5">
                            <div>
                                <h3 className="text-base font-bold uppercase tracking-[0.12em] text-[#1B2B41]">
                                    {isEditing ? 'Edit Category' : 'New Room Category'}
                                </h3>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                                    {isEditing ? `ID: ${editingId}` : 'Set up your room type details'}
                                </p>
                            </div>
                            <button
                                onClick={resetForm}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#607AFB]/15 hover:text-[#607AFB]"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6 p-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="admin-label">Category Name</label>
                                    <input
                                        required
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="admin-input"
                                        placeholder="e.g. Executive"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="admin-label">Max Occupancy</label>
                                    <input
                                        required
                                        type="number"
                                        name="max_occupancy"
                                        value={formData.max_occupancy}
                                        onChange={handleInputChange}
                                        className="admin-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="admin-label">Base Rate per Night (Rs.)</label>
                                <input
                                    required
                                    type="number"
                                    name="base_price"
                                    value={formData.base_price}
                                    onChange={handleInputChange}
                                    className="admin-input font-bold text-[#607AFB]"
                                />
                            </div>

                            <div className="form-group">
                                <label className="admin-label">Hotel Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="admin-input h-24 resize-none"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="admin-label">Standard Amenities</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.keys(formData.amenities).map(amenity => (
                                        <button
                                            key={amenity}
                                            type="button"
                                            onClick={() => handleAmenityChange(amenity)}
                                            className={`flex items-center gap-2 rounded-md border p-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${formData.amenities[amenity]
                                                ? 'border-[#607AFB] bg-[#607AFB] text-white shadow-sm'
                                                : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#607AFB]/60'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[14px]">
                                                {amenity === 'coffeeMaker' ? 'coffee' : amenity === 'miniBar' ? 'kitchen' : amenity === 'safe' ? 'lock' : amenity}
                                            </span>
                                            {amenity}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 admin-button admin-button-primary h-12 uppercase tracking-widest text-[11px] font-black">
                                    {isEditing ? 'UPDATE CATEGORY' : 'CREATE CATEGORY'}
                                </button>
                                <button type="button" onClick={resetForm} className="admin-button admin-button-secondary h-12 px-10 uppercase text-[11px] font-black">
                                    CANCEL
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRoomsModal && selectedType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1614]/75 p-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#DBE4FF] bg-white shadow-2xl fade-in">
                        <div className="flex items-center justify-between border-b-2 border-[#607AFB]/25 bg-gradient-to-r from-[#F8FAFF] via-[#FFFFFF] to-[#EEF2FF] px-6 py-5">
                            <div>
                                <h3 className="text-base font-bold uppercase tracking-[0.12em] text-[#1B2B41]">Assign Rooms</h3>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                                    Setup for: {selectedType.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowRoomsModal(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#607AFB]/15 hover:text-[#607AFB]"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddRooms} className="space-y-6 p-8">
                            <div className="flex rounded-md border border-[#DBE4FF] bg-[#EEF2FF] p-1">
                                <button
                                    type="button"
                                    onClick={() => setAddMethod('list')}
                                    className={`flex-1 rounded py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${addMethod === 'list' ? 'bg-white text-[#1B2B41] shadow-sm' : 'text-[#64748B]'}`}
                                >
                                    List
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddMethod('quick')}
                                    className={`flex-1 rounded py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${addMethod === 'quick' ? 'bg-white text-[#1B2B41] shadow-sm' : 'text-[#64748B]'}`}
                                >
                                    Single Batch
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddMethod('multi')}
                                    className={`flex-1 rounded py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${addMethod === 'multi' ? 'bg-white text-[#1B2B41] shadow-sm' : 'text-[#64748B]'}`}
                                >
                                    Floor-wise
                                </button>
                            </div>

                            {addMethod === 'list' && (
                                <div className="form-group">
                                    <label className="admin-label">Room Numbers</label>
                                    <textarea
                                        required
                                        value={roomsList}
                                        onChange={(e) => setRoomsList(e.target.value)}
                                        className="admin-input h-32 font-bold text-[#1B2B41]"
                                        placeholder="e.g. 101-110, 201, 205"
                                    />
                                    <p className="mt-2 text-[9px] font-medium italic text-[#64748B]">
                                        Use dash (-) for sequential ranges. Separate distinct units with commas.
                                    </p>
                                </div>
                            )}

                            {addMethod === 'quick' && (
                                <div className="col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="admin-label">Start Number / ID</label>
                                            <input
                                                required
                                                type="text"
                                                value={startNumber}
                                                onChange={(e) => setStartNumber(e.target.value)}
                                                className="admin-input"
                                                placeholder="e.g. 101 or A101"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="admin-label">Total Rooms</label>
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={roomCount}
                                                onChange={(e) => setRoomCount(e.target.value)}
                                                className="admin-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="admin-label">Floor Number</label>
                                        <input
                                            type="number"
                                            value={roomFloor}
                                            onChange={(e) => setRoomFloor(e.target.value)}
                                            className="admin-input"
                                            placeholder="Numerical only"
                                        />
                                    </div>
                                    <div className="rounded-md border border-[#DBE4FF] bg-[#F8FAFF] p-3">
                                        <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-[#64748B]">
                                            Sequence Preview
                                        </span>
                                        <p className="text-[10px] font-bold text-[#1B2B41] break-all">{getBulkPreview()}</p>
                                    </div>
                                </div>
                            )}

                            {addMethod === 'multi' && (
                                <div className="space-y-4">
                                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                                        {floorBatches.map((batch, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                                <div className="col-span-3">
                                                    <label className="mb-1 block text-[8px] font-bold uppercase text-[#64748B]">Floor</label>
                                                    <input type="number" value={batch.floor} onChange={(e) => {
                                                        const newBatches = [...floorBatches];
                                                        newBatches[idx].floor = e.target.value;
                                                        setFloorBatches(newBatches);
                                                    }} className="admin-input !h-9 !py-0 !text-xs" />
                                                </div>
                                                <div className="col-span-4">
                                                    <label className="mb-1 block text-[8px] font-bold uppercase text-[#64748B]">Start #</label>
                                                    <input type="text" value={batch.start} onChange={(e) => {
                                                        const newBatches = [...floorBatches];
                                                        newBatches[idx].start = e.target.value;
                                                        setFloorBatches(newBatches);
                                                    }} className="admin-input !h-9 !py-0 !text-xs font-bold" />
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="mb-1 block text-[8px] font-bold uppercase text-[#64748B]">Count</label>
                                                    <input type="number" value={batch.count} onChange={(e) => {
                                                        const newBatches = [...floorBatches];
                                                        newBatches[idx].count = e.target.value;
                                                        setFloorBatches(newBatches);
                                                    }} className="admin-input !h-9 !py-0 !text-xs" />
                                                </div>
                                                <div className="col-span-2">
                                                    <button type="button" onClick={() => setFloorBatches(floorBatches.filter((_, i) => i !== idx))} disabled={floorBatches.length === 1} className="w-9 h-9 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-sm disabled:opacity-30">
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFloorBatches([...floorBatches, { floor: (parseInt(floorBatches[floorBatches.length - 1]?.floor) + 1).toString() || '1', start: '101', count: '5' }])}
                                        className="w-full border-2 border-dashed border-[#DBE4FF] py-2 text-[9px] font-bold uppercase tracking-widest text-[#64748B] transition-all hover:border-[#607AFB]/70 hover:text-[#607AFB]"
                                    >
                                        + Add Floor Row
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 admin-button admin-button-primary h-11 uppercase text-[11px] font-black tracking-widest">
                                    {addMethod === 'list' ? 'ADD LISTED ROOMS' : (addMethod === 'quick' ? 'ADD BATCH' : 'FINALIZE ALL FLOORS')}
                                </button>
                                <button type="button" onClick={() => setShowRoomsModal(false)} className="admin-button admin-button-secondary h-11 px-8 uppercase text-[11px] font-black tracking-widest">
                                    CANCEL
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default RoomTypeManagement;
