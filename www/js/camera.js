/**
 * Camera and Photo Management for ELP Relatórios
 * Handles photo capture, compression, storage, and upload
 */

class PhotoManager {
    constructor() {
        this.maxPhotoSize = 1024 * 1024; // 1MB max after compression
        this.thumbnailSize = 200; // 200px thumbnail
    }

    /**
     * Capture photo using Capacitor Camera
     */
    async capturePhoto(reportId) {
        try {
            // Check if Capacitor Camera is available
            if (!window.Capacitor || !window.Capacitor.Plugins.Camera) {
                throw new Error('Camera not available. Using file input fallback.');
            }

            const { Camera } = window.Capacitor.Plugins;

            const photo = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: 'Base64',
                source: 'Camera',
                saveToGallery: false
            });

            return await this.processPhoto(photo.base64String, reportId);

        } catch (error) {
            console.error('Camera capture failed:', error);
            // Fallback to file input
            return await this.capturePhotoFallback(reportId);
        }
    }

    /**
     * Fallback: capture photo using file input (for web/testing)
     */
    async capturePhotoFallback(reportId) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'camera';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                const base64 = await this.fileToBase64(file);
                const photoData = await this.processPhoto(base64, reportId);
                resolve(photoData);
            };

            input.click();
        });
    }

    /**
     * Process and compress photo
     */
    async processPhoto(base64String, reportId) {
        // Compress image
        const compressed = await this.compressImage(base64String);

        // Create thumbnail
        const thumbnail = await this.createThumbnail(compressed);

        // Create photo object
        const photoData = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            reportId: reportId,
            base64: compressed,
            thumbnail: thumbnail,
            titulo: '',
            legenda: '',
            synced: false,
            serverUrl: null,
            timestamp: new Date().toISOString()
        };

        // Save to IndexedDB
        await db.photos.setItem(photoData.id, photoData);

        console.log('✓ Photo saved locally:', photoData.id);

        // Queue for upload if online
        if (navigator.onLine && reportId && !reportId.startsWith('local_')) {
            this.queuePhotoUpload(photoData);
        }

        return photoData;
    }

    /**
     * Compress image to reduce size
     */
    async compressImage(base64String, maxWidth = 1200) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 with compression
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                resolve(compressed.split(',')[1]); // Remove data:image/jpeg;base64,
            };

            img.src = 'data:image/jpeg;base64,' + base64String;
        });
    }

    /**
     * Create thumbnail
     */
    async createThumbnail(base64String) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = this.thumbnailSize;

                canvas.width = size;
                canvas.height = size;

                const ctx = canvas.getContext('2d');

                // Calculate crop to center
                const scale = Math.max(size / img.width, size / img.height);
                const x = (size / 2) - (img.width / 2) * scale;
                const y = (size / 2) - (img.height / 2) * scale;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
                resolve(thumbnail.split(',')[1]);
            };

            img.src = 'data:image/jpeg;base64,' + base64String;
        });
    }

    /**
     * Convert File to base64
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Queue photo for upload
     */
    async queuePhotoUpload(photoData) {
        try {
            // Convert base64 to blob
            const blob = this.base64ToBlob(photoData.base64, 'image/jpeg');

            // Create FormData
            const formData = new FormData();
            formData.append('photo', blob, `${photoData.id}.jpg`);
            formData.append('reportId', photoData.reportId);
            formData.append('titulo', photoData.titulo || '');
            formData.append('legenda', photoData.legenda || '');

            // Upload
            const response = await fetch(api.baseURL + '/fotos/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api.token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();

            // Update photo with server URL
            photoData.synced = true;
            photoData.serverUrl = result.url;
            await db.photos.setItem(photoData.id, photoData);

            console.log('✓ Photo uploaded:', photoData.id);

        } catch (error) {
            console.warn('⚠ Photo upload failed, will retry later:', error);
            // Photo stays in queue for later sync
        }
    }

    /**
     * Convert base64 to Blob
     */
    base64ToBlob(base64, mimeType = 'image/jpeg') {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Get photos for a report
     */
    async getPhotosForReport(reportId) {
        const allPhotos = [];

        await db.photos.iterate((photo, key) => {
            if (photo.reportId === reportId) {
                allPhotos.push(photo);
            }
        });

        // Sort by timestamp
        return allPhotos.sort((a, b) =>
            new Date(a.timestamp) - new Date(b.timestamp)
        );
    }

    /**
     * Delete photo
     */
    async deletePhoto(photoId) {
        await db.photos.removeItem(photoId);
        console.log('✓ Photo deleted:', photoId);
    }

    /**
     * Update photo metadata
     */
    async updatePhotoMetadata(photoId, titulo, legenda) {
        const photo = await db.photos.getItem(photoId);
        if (photo) {
            photo.titulo = titulo;
            photo.legenda = legenda;
            await db.photos.setItem(photoId, photo);

            // Re-upload if already synced
            if (photo.synced) {
                await this.queuePhotoUpload(photo);
            }
        }
    }
}

// Create global instance
window.photoManager = new PhotoManager();
