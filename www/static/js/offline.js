/**
 * ELP Offline Manager v3.0
 * Uses localForage (IndexedDB) for large storage (Photos)
 * Implements Background Sync pattern
 */

class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = []; // Metadata only

        // Configuração do localForage
        this.store = localforage.createInstance({
            name: "ObraFlowDB",
            storeName: "offline_data" // Should be alphanumeric, with underscores
        });

        this.init();
    }

    async init() {
        console.log('🔌 OfflineManager: Initializing...');

        // Listen for network changes
        window.addEventListener('online', () => {
            console.log('🌐 Online detected');
            this.isOnline = true;
            this.updateIndicator();
            this.trySync();
        });

        window.addEventListener('offline', () => {
            console.log('🔌 Offline detected');
            this.isOnline = false;
            this.updateIndicator();
        });

        // Load Queue
        try {
            const queue = await this.store.getItem('elp_sync_queue');
            this.syncQueue = queue || [];
            console.log(`🔌 Loaded queue: ${this.syncQueue.length} items`);
        } catch (e) {
            console.error('Error loading queue', e);
        }

        this.interceptForms();
        this.updateIndicator();

        // Tentar sync inicial se online
        if (this.isOnline) {
            setTimeout(() => this.trySync(), 3000);
        }
    }

    updateIndicator() {
        const badge = document.getElementById('offline-indicator');
        if (badge) {
            badge.style.display = this.isOnline ? 'none' : 'inline-block';
        }
    }

    interceptForms() {
        // Intercepta submits normais para guardar offline se necessário
        document.addEventListener('submit', async (e) => {
            if (!this.isOnline) {
                const form = e.target;
                // Lista de IDs de formulários suportados
                if (['reportForm', 'visitForm', 'fotoForm'].includes(form.id)) {
                    e.preventDefault();
                    await this.saveForSync(form);
                }
            }
        });
    }

    async saveForSync(form) {
        try {
            const formData = new FormData(form);
            const data = {};
            const photos = [];

            // Converter FormData
            // Tratamento especial para arquivos (Fotos)
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    // Converter File para Blob/Base64 para IndexedDB
                    if (value.size > 0) {
                        photos.push({
                            key: key,
                            file: value,
                            name: value.name
                        });
                    }
                } else {
                    data[key] = value;
                }
            }

            const offlineId = `pending_${Date.now()}`;

            const payload = {
                id: offlineId,
                url: form.action,
                method: form.method,
                data: data, // Dados de texto
                photos: photos, // Blobs
                timestamp: Date.now(),
                attempts: 0
            };

            // Salvar no IndexedDB
            await this.store.setItem(offlineId, payload);

            // Adicionar à fila (apenas ID)
            this.syncQueue.push(offlineId);
            await this.store.setItem('elp_sync_queue', this.syncQueue);

            alert('Você está offline. Dados salvos localmente e serão enviados assim que a conexão voltar!');

            // Simular sucesso na UI (Redirecionar ou limpar form)
            if (form.getAttribute('data-redirect')) {
                window.location.href = form.getAttribute('data-redirect');
            } else {
                window.location.reload();
            }

        } catch (err) {
            console.error('Erro ao salvar offline:', err);
            alert('Erro ao salvar dados offline. Verifique o console.');
        }
    }

    async trySync() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log('🔄 Syncing...');
        const queueClone = [...this.syncQueue];

        for (const offlineId of queueClone) {
            try {
                const item = await this.store.getItem(offlineId);
                if (!item) {
                    // Item perdido, remover da fila
                    this.removeFromQueue(offlineId);
                    continue;
                }

                console.log(`📡 Sending item ${offlineId} to ${item.url}`);

                // Reconstruir FormData
                const formData = new FormData();

                // Adicionar campos de texto
                Object.keys(item.data).forEach(key => {
                    formData.append(key, item.data[key]);
                });

                // Adicionar Fotos
                if (item.photos && Array.isArray(item.photos)) {
                    item.photos.forEach(photo => {
                        formData.append(photo.key, photo.file, photo.name);
                    });
                }

                // Adicionar flag para servidor saber que é sync
                formData.append('x-offline-sync', 'true');

                // Enviar
                const response = await fetch(item.url, {
                    method: item.method,
                    body: formData,
                    headers: {
                        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').content
                    }
                });

                if (response.ok) {
                    console.log('✅ Sync success!');
                    // Remover do banco e da fila
                    await this.store.removeItem(offlineId);
                    this.removeFromQueue(offlineId);

                    // Notificar usuário (Toast)
                    this.showToast('Dados sincronizados com sucesso!', 'success');
                } else {
                    console.error('❌ Sync failed', response.status);
                    // Manter na fila, incrementar tentativas?
                }

            } catch (err) {
                console.error('❌ Sync network error', err);
            }
        }
    }

    removeFromQueue(id) {
        this.syncQueue = this.syncQueue.filter(x => x !== id);
        this.store.setItem('elp_sync_queue', this.syncQueue);
    }

    showToast(msg, type) {
        // Implementação simples de toast ou usar o do Bootstrap existente
        console.log(`[TOAST] ${type}: ${msg}`);
        if (window.showToast) {
            window.showToast(msg, type);
        }
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    window.offlineManager = new OfflineManager();
});