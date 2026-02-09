/**
 * IndexedDB wrapper using localForage
 * Provides simple key-value storage for offline data
 */

// Initialize localForage instances for different data types
const db = {
    // User data
    users: localforage.createInstance({
        name: 'elp_relatorios',
        storeName: 'users'
    }),

    // Projects
    projects: localforage.createInstance({
        name: 'elp_relatorios',
        storeName: 'projects'
    }),

    // Reports
    reports: localforage.createInstance({
        name: 'elp_relatorios',
        storeName: 'reports'
    }),

    // Visits
    visits: localforage.createInstance({
        name: 'elp_relatorios',
        storeName: 'visits'
    }),

    // Photos (base64)
    photos: localforage.createInstance({
        name: 'elp_relatorios',
        storeName: 'photos'
    }),

    // Metadata (last sync, version, etc)
    metadata: localforage.createInstance({
        name: 'elp_relatorios',
        storeName: 'metadata'
    }),

    /**
     * Clear all data (logout)
     */
    async clearAll() {
        await this.users.clear();
        await this.projects.clear();
        await this.reports.clear();
        await this.visits.clear();
        await this.photos.clear();
        await this.metadata.clear();
        console.log('All local data cleared');
    },

    /**
     * Get last sync timestamp
     */
    async getLastSync() {
        return await this.metadata.getItem('last_sync');
    },

    /**
     * Update last sync timestamp
     */
    async updateLastSync() {
        await this.metadata.setItem('last_sync', new Date().toISOString());
    }
};

// Make available globally
window.db = db;
