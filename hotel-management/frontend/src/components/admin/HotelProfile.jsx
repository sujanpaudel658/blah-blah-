import React from 'react';

const HotelProfile = ({
    hotel,
    description,
    setDescription,
    isEditing,
    setIsEditing,
    imagePreviews,
    onImageChange,
    onRemoveImage,
    onSave
}) => {
    if (!hotel) return (
        <div className="admin-card p-12 text-center bg-white">
            <span className="material-symbols-outlined text-4xl text-[#D1D5DB] mb-4">home_work</span>
            <h3 className="text-lg font-bold text-[#1B2B41] mb-2">No Property Data</h3>
            <p className="text-[#64748B] text-sm">Please link your account to a property.</p>
        </div>
    );

    return (
        <div className="admin-card bg-white overflow-hidden">
            {/* Component Header */}
            <div className="p-6 border-b border-[#F1F1F1] flex items-center justify-between">
                <div>
                    <span className="admin-label">Property Management</span>
                    <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Main Profile</h3>
                </div>
                <button
                    onClick={() => isEditing ? onSave() : setIsEditing(true)}
                    className={`admin-button ${isEditing ? 'admin-button-primary' : 'admin-button-secondary'}`}
                >
                    <span className="material-symbols-outlined text-sm">{isEditing ? 'save' : 'edit'}</span>
                    {isEditing ? 'COMMIT CHANGES' : 'EDIT INFORMATION'}
                </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Image Section */}
                <div className="space-y-6">
                    <div>
                        <span className="admin-label">Visual Gallery</span>
                        <div
                            onClick={() => isEditing && document.getElementById('hotel-image-input').click()}
                            className={`border-2 border-dashed rounded-[4px] p-8 flex flex-col items-center justify-center transition-colors ${isEditing
                                ? 'border-[#E2E2E2] bg-[#F9FAFB] hover:border-[#1B2B41] cursor-pointer'
                                : 'border-[#F1F1F1] bg-[#F9FAFB] cursor-not-allowed'
                                }`}
                        >
                            <input
                                id="hotel-image-input"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={onImageChange}
                                disabled={!isEditing}
                                className="hidden"
                            />
                            <span className="material-symbols-outlined text-3xl text-[#94A3B8] mb-3">photo_library</span>
                            <span className="text-xs font-bold text-[#1B2B41] uppercase tracking-widest">Add New Images</span>
                            <span className="text-[10px] text-[#94A3B8] font-medium mt-1">Recommended: 1200x800 JPG</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="group relative aspect-square bg-[#F1F1F1] border border-[#E2E2E2] rounded-[2px] overflow-hidden">
                                <img src={preview} alt="" className="w-full h-full object-cover" />
                                {isEditing && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveImage(index); }}
                                        className="absolute top-1 right-1 w-5 h-5 bg-[#B91C1C] text-white flex items-center justify-center rounded-sm hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                )}
                                {index === 0 && (
                                    <div className="absolute inset-x-0 bottom-0 bg-[#1B2B41]/80 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-tighter">
                                        Primary
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Information Section */}
                <div className="space-y-6">
                    <div className="form-group">
                        <label className="admin-label">Hotel Name</label>
                        <input
                            type="text"
                            className="admin-input bg-[#F9FAFB] border-[#E2E2E2] font-semibold"
                            value={hotel.name}
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label className="admin-label">Public Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!isEditing}
                            className="admin-input min-h-[160px] leading-relaxed resize-none bg-white p-4"
                            placeholder="Provide a detailed description of the property for prospective guests..."
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest uppercase">Sync Status: Active</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${description.length > 500 ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>
                                Count: {description.length} / 1000 MAX
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HotelProfile;
