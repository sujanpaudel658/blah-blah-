// Helper utility functions

// Parse hotel images from JSON string or single URL
export const parseHotelImages = (imageData) => {
  if (!imageData) return [];
  try {
    const parsed = JSON.parse(imageData);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [imageData];
  }
};

// Get full image URL
export const getImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith('data:') || src.startsWith('http')) return src;
  return `http://localhost:5000${src}`;
};

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

// Convert multiple files to base64
export const filesToBase64 = async (files) => {
  return Promise.all(Array.from(files).map(fileToBase64));
};

// Show message with auto-hide
export const showMessage = (setMessage, text, type = 'success', duration = 3000) => {
  setMessage({ text, type });
  if (duration) setTimeout(() => setMessage({ text: '', type: '' }), duration);
};
// Compress image to reduce file size
export const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};
