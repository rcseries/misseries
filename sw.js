// ============================================================
// SW.JS - Service Worker para notificaciones push
// ============================================================

const CACHE_NAME = 'series-tracker-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Recibir mensajes del cliente para programar notificaciones
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, tag, delay } = event.data;
        setTimeout(() => {
            self.registration.showNotification(title, {
                body: body,
                icon: '/misseries/icon-192.png',
                badge: '/misseries/icon-192.png',
                tag: tag,
                requireInteraction: false,
                vibrate: [200, 100, 200],
                data: { url: event.data.url || '/misseries/en_emision.html' }
            });
        }, delay);
    }
});

// Al hacer clic en la notificación, abrir la página
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/misseries/en_emision.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('misseries') && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Push event (para notificaciones del servidor si se configura)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/misseries/icon-192.png',
                tag: data.tag || 'series-tracker',
                data: { url: data.url || '/misseries/en_emision.html' }
            })
        );
    }
});
