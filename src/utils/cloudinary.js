// Simple Cloudinary unsigned upload helper for image/video
// Usage: uploadToCloudinary(file, 'image' | 'video') → Promise<{ secure_url: string }>

export async function uploadToCloudinary(file, resourceType = 'image') {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const folder = import.meta.env.VITE_CLOUDINARY_FOLDER || 'chat-media';

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary env variables are missing');
    }

    if (!file) {
        throw new Error('File is required for upload');
    }

    // Ensure file is a File instance
    if (!(file instanceof File)) {
        throw new Error('Invalid file object');
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const resp = await fetch(url, {
        method: 'POST',
        body: formData,
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Cloudinary upload failed');
    }

    return await resp.json();
}

export function isCloudinaryImageUrl(message) {
    if (!message) return false;
    const u = String(message);
    if (u.includes('/image/upload/')) return true;
    return /\.(png|jpe?g|gif|webp|avif)$/i.test(u);
}

export function isCloudinaryVideoUrl(message) {
    if (!message) return false;
    const u = String(message);
    if (u.includes('/video/upload/')) return true;
    return /\.(mp4|webm|ogg)$/i.test(u);
}

export function isCloudinaryFileUrl(message) {
    if (!message) return false;
    const u = String(message);
    if (u.includes('/raw/upload/')) return true;
    return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(u);
}

// Add fl_attachment to force download-friendly delivery; works for raw/image/video
// Cloudinary format: /upload/{transformations}/{file_path}
// For download: /upload/fl_attachment:filename/{file_path}
export function toAttachmentUrl(url, filename) {
    try {
        const idx = url.indexOf('/upload/');
        if (idx === -1) return url;
        const prefix = url.substring(0, idx + '/upload/'.length);
        const suffix = url.substring(idx + '/upload/'.length);

        // Remove query parameters if any
        const suffixClean = suffix.split('?')[0];

        // Extract filename from suffix if not provided
        if (!filename) {
            const parts = suffixClean.split('/');
            filename = parts[parts.length - 1];
        }

        // Build URL: /upload/fl_attachment:filename/{rest_of_path}
        const attach = filename ? `fl_attachment:${encodeURIComponent(filename)}` : 'fl_attachment';
        return `${prefix}${attach}/${suffixClean}`;
    } catch {
        return url;
    }
}

// Build a thumbnail URL for PDFs uploaded as image resource
// Adds transformation to render first page (pg_1) and size it
export function toPdfThumbnail(url, width = 260) {
    try {
        const u = String(url);
        if (!/\.pdf$/i.test(u)) return null;
        const idx = u.indexOf('/upload/');
        if (idx === -1) return null;
        // only works for image resource_type
        if (!u.includes('/image/upload/')) return null;
        const before = u.substring(0, idx + '/upload/'.length);
        const after = u.substring(idx + '/upload/'.length);
        // pg_1: first page of PDF, f_auto for optimal format, q_auto
        return `${before}pg_1,w_${width},c_fit,f_auto,q_auto/${after}`;
    } catch {
        return null;
    }
}

