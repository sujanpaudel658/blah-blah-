import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import AdminLayout from '../components/admin/AdminLayout';

const RoomManagement = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    room_number: '',
    room_type_id: '',
    floor: '',
    status: 'available',
    notes: ''
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
    fetchData(parsedUser.hotel_id);
  }, [navigate]);

  useEffect(() => {
    if (roomId && (rooms || []).length > 0) {
      const roomToEdit = rooms.find(r => r.id === parseInt(roomId));
      if (roomToEdit) {
        setFormData({
          id: roomToEdit.id,
          room_number: roomToEdit.room_number,
          room_type_id: roomToEdit.room_type_id,
          floor: roomToEdit.floor,
          status: roomToEdit.status,
          notes: roomToEdit.notes || ''
        });
        setIsEditing(true);
        setShowFormModal(true);
      }
    }
  }, [roomId, rooms]);

  const fetchData = async (hotelId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [roomsRes, typesRes] = await Promise.all([
        axios.get(`${API_URL}/rooms?hotelId=${hotelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/rooms/types?hotelId=${hotelId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (roomsRes.data.success) setRooms(roomsRes.data.rooms || []);
      if (typesRes.data.success) setRoomTypes(typesRes.data.roomTypes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const method = isEditing ? 'put' : 'post';
      const url = isEditing
        ? `${API_URL}/rooms/${formData.id}`
        : `${API_URL}/rooms`;

      const res = await axios[method](url, {
        ...formData,
        hotel_id: user?.hotel_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSuccessMessage(isEditing ? 'Room updated successfully.' : 'Room Assigned.');
        setShowFormModal(false);
        fetchData(user?.hotel_id);
        if (isEditing) {
          navigate('/admin/rooms');
        }
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error: Room record not saved.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('IRREVERSIBLE ACTION: Confirm deletion of this room record?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_URL}/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSuccessMessage('Record purged.');
        fetchData(user?.hotel_id);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filteredRooms = (rooms || []).filter(room => {
    const name = (room?.room_number || '').toLowerCase();
    const type = (room?.type_name || '').toLowerCase();
    const search = (searchQuery || '').toLowerCase();
    const matchesSearch = name.includes(search) || type.includes(search);

    let matchesFilter = true;
    if (filter === 'vacant') matchesFilter = room?.is_occupied === 0 && room?.status === 'available';
    if (filter === 'occupied') matchesFilter = room?.is_occupied > 0;
    if (filter === 'booked') matchesFilter = room?.is_occupied === 0 && room?.status === 'booked';
    if (filter === 'maintenance') matchesFilter = room?.status === 'maintenance';

    return matchesSearch && matchesFilter;
  });

  const groupedByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room?.floor || '0';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  Object.keys(groupedByFloor).forEach(floor => {
    groupedByFloor[floor].sort((a, b) =>
      (a?.room_number || '').localeCompare(b?.room_number || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  });

  const floors = Object.keys(groupedByFloor).sort((a, b) => parseInt(a) - parseInt(b));

  const stats = {
    total: (rooms || []).length,
    vacant: (rooms || []).filter(r => r?.is_occupied === 0 && r?.status === 'available').length,
    occupied: (rooms || []).filter(r => r?.is_occupied > 0).length,
    booked: (rooms || []).filter(r => r?.is_occupied === 0 && r?.status === 'booked').length,
    maintenance: (rooms || []).filter(r => r?.status === 'maintenance').length
  };

  if (loading && (rooms || []).length === 0) return <div className="flex items-center justify-center min-h-screen bg-[#F5F3EF] text-[#1B2B41] font-bold">LOADING ROOM INVENTORY...</div>;

  return (
    <AdminLayout
      user={user}
      title="ROOM INVENTORY"
      subtitle="REAL-TIME HOTEL MAP"
      onLogout={handleLogout}
    >
      <div className="flex flex-col lg:flex-row gap-8 pb-12">
        {/* Left Stats Sidebar */}
        <aside className="w-full lg:w-64 space-y-6">
          <div className="admin-card p-5 bg-white">
            <span className="admin-label mb-3">Filter Catalog</span>
            <div className="space-y-1">
              <button onClick={() => setFilter('all')} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors rounded-sm flex justify-between ${filter === 'all' ? 'bg-[#1B2B41] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                <span>All Rooms</span> <span>{stats.total}</span>
              </button>
              <button onClick={() => setFilter('vacant')} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors rounded-sm flex justify-between ${filter === 'vacant' ? 'bg-[#108548] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                <span>Vacant</span> <span>{stats.vacant}</span>
              </button>
              <button onClick={() => setFilter('occupied')} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors rounded-sm flex justify-between ${filter === 'occupied' ? 'bg-[#B91C1C] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                <span>Occupied</span> <span>{stats.occupied}</span>
              </button>
              <button onClick={() => setFilter('booked')} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors rounded-sm flex justify-between ${filter === 'booked' ? 'bg-[#3B82F6] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                <span>Booked</span> <span>{stats.booked}</span>
              </button>
              <button onClick={() => setFilter('maintenance')} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors rounded-sm flex justify-between ${filter === 'maintenance' ? 'bg-[#A36B00] text-white' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                <span>In Repair</span> <span>{stats.maintenance}</span>
              </button>
            </div>
          </div>

          <div className="admin-card p-5 bg-[#1B2B41] text-white">
            <span className="text-[10px] font-bold text-[#A0AEC0] uppercase block mb-2">Live Availability</span>
            <div className="text-3xl font-bold mb-3">{stats.total > 0 ? Math.round((stats.vacant / stats.total) * 100) : 0}%</div>
            <div className="h-1 bg-[#2D4361] rounded-full overflow-hidden">
              <div className="h-full bg-[#108548]" style={{ width: `${(stats.vacant / (stats.total || 1)) * 100}%` }}></div>
            </div>
            <p className="text-[9px] text-[#A0AEC0] font-medium mt-3 italic text-center">Ready for allocation</p>
          </div>
        </aside>

        {/* Main Interface */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">search</span>
              <input
                type="text"
                placeholder="Locate unit or category..."
                className="admin-input pl-10 h-10 italic"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex bg-[#E2E2E2] p-1 rounded-sm">
                <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${viewMode === 'grid' ? 'bg-white text-[#1B2B41]' : 'text-[#94A3B8]'}`}>Grid</button>
                <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${viewMode === 'list' ? 'bg-white text-[#1B2B41]' : 'text-[#94A3B8]'}`}>List</button>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ id: '', room_number: '', room_type_id: '', floor: '', status: 'available', notes: '' });
                  setShowFormModal(true);
                }}
                className="admin-button admin-button-primary h-10 px-6 uppercase tracking-widest text-[11px]"
              >
                A
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="bg-[#E7F3ED] border border-[#108548] p-3 text-[#108548] font-bold text-[11px] uppercase tracking-widest fade-in">
              {successMessage}
            </div>
          )}

          {viewMode === 'grid' ? (
            <div className="space-y-10">
              {floors.map(floor => (
                <div key={floor} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider">FLOOR {floor}</h3>
                    <div className="h-px flex-1 bg-[#E2E2E2]"></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4">
                    {groupedByFloor[floor].map(room => {
                      const isOccupied = room?.is_occupied > 0;
                      const status = room?.status;
                      let color = '#108548';
                      if (isOccupied) color = '#B91C1C';
                      else if (status === 'booked') color = '#3B82F6';
                      else if (status === 'maintenance') color = '#A36B00';

                      return (
                        <div
                          key={room.id}
                          onClick={() => { setFormData(room); setIsEditing(true); setShowFormModal(true); }}
                          className="admin-card bg-white p-4 cursor-pointer hover:border-[#1B2B41] transition-colors relative"
                          style={{ borderLeft: `4px solid ${color}` }}
                        >
                          <div className="text-xl font-bold text-[#1B2B41] mb-1">{room.room_number}</div>
                          <div className="text-[9px] font-bold text-[#94A3B8] uppercase line-clamp-1">{room.status}</div>
                          <div className="text-[9px] font-bold text-[#64748B] uppercase mt-0.5 tracking-tighter truncate">{room.type_name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-card overflow-hidden bg-white">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Floor</th>
                    <th>Hotel Category</th>
                    <th>Sync Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map(room => (
                    <tr key={room.id}>
                      <td className="font-bold text-[#1B2B41]">{room.room_number}</td>
                      <td className="text-[#64748B]">{room.floor || '0'}</td>
                      <td className="text-[#64748B] font-medium">{room.type_name}</td>
                      <td>
                        <span className={`status-badge ${room.is_occupied > 0 ? 'bg-red-50 text-[#B91C1C]' : (room.status === 'booked' ? 'bg-blue-50 text-[#3B82F6]' : (room.status === 'maintenance' ? 'bg-amber-50 text-[#A36B00]' : 'bg-emerald-50 text-[#108548]'))}`}>
                          {room.is_occupied > 0 ? 'Occupied' : room.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setFormData(room); setIsEditing(true); setShowFormModal(true); }} className="admin-button admin-button-secondary h-8 w-8 !p-0"><span className="material-symbols-outlined text-sm">edit</span></button>
                          <button onClick={() => handleDelete(room.id)} className="admin-button admin-button-secondary h-8 w-8 !p-0 border-red-100 text-red-600 hover:bg-red-50"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] bg-[#111B2B]/80 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-lg shadow-xl border-l border-[#E2E2E2] fade-in flex flex-col">
            <header className="bg-[#1B2B41] px-8 py-6 flex items-center justify-between text-white shrink-0">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-widest">{isEditing ? 'Sync Unit Config' : 'Assign Unit '}</h3>
                <p className="text-[10px] text-[#A0AEC0] mt-0.5 font-bold uppercase tracking-widest">Inventory Management Terminal</p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <form onSubmit={handleSave} className="p-10 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="admin-label">Unit Number</label>
                  <input required name="room_number" value={formData.room_number} onChange={handleFormChange} className="admin-input font-bold" />
                </div>
                <div className="form-group">
                  <label className="admin-label">Floor Mapping</label>
                  <input required type="number" name="floor" value={formData.floor} onChange={handleFormChange} className="admin-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label">Logical Category (Hotel Type)</label>
                <select required name="room_type_id" value={formData.room_type_id} onChange={handleFormChange} className="admin-input font-semibold text-[#1B2B41]">
                  <option value="">-- SELECT CLASSIFICATION --</option>
                  {roomTypes.map(rt => (<option key={rt.id} value={rt.id}>{rt.name.toUpperCase()}</option>))}
                </select>
              </div>

              <div className="form-group">
                <label className="admin-label">Operational Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleFormChange({ target: { name: 'status', value: 'available' } })} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${formData.status === 'available' ? 'bg-[#108548] text-white border-[#108548]' : 'bg-white text-[#94A3B8] border-[#E2E2E2]'}`}>Vacant / Online</button>
                  <button type="button" onClick={() => handleFormChange({ target: { name: 'status', value: 'maintenance' } })} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${formData.status === 'maintenance' ? 'bg-[#A36B00] text-white border-[#A36B00]' : 'bg-white text-[#94A3B8] border-[#E2E2E2]'}`}>In Repair / Offline</button>
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label">Internal Activity Log</label>
                <textarea name="notes" value={formData.notes} onChange={handleFormChange} className="admin-input h-32 resize-none leading-relaxed text-[#64748B]" placeholder="Document maintenance history, unit specific features, or operational anomalies..." />
              </div>
            </form>

            <footer className="p-8 border-t border-[#F1F1F1] bg-[#F9FAFB] flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowFormModal(false)} className="flex-1 admin-button admin-button-secondary h-12 uppercase tracking-widest font-black">CANCEL</button>
              <button onClick={handleSave} className="flex-[2] admin-button admin-button-primary h-12 uppercase tracking-widest font-black">SAVE ROOM</button>
            </footer>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RoomManagement;
