// ============================================================
// NOTIFICATIONS.JS - Sistema de notificaciones
// ============================================================

const NotificationManager = {
    swRegistration: null,
    permisoConcedido: false,

    // ── Inicializar: registrar SW y pedir permiso ─────────────
    async init() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones');
            return false;
        }
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker no disponible');
            return false;
        }

        // Registrar el Service Worker
        try {
            this.swRegistration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ Service Worker registrado');
        } catch (err) {
            console.error('Error al registrar SW:', err);
            return false;
        }

        // Pedir permiso de notificación
        if (Notification.permission === 'granted') {
            this.permisoConcedido = true;
        } else if (Notification.permission !== 'denied') {
            const permiso = await Notification.requestPermission();
            this.permisoConcedido = permiso === 'granted';
        }

        if (this.permisoConcedido) {
            console.log('✅ Permiso de notificaciones concedido');
            await this.programarTodasLasNotificaciones();
        } else {
            console.warn('⚠️ Permiso de notificaciones denegado');
        }

        return this.permisoConcedido;
    },

    // ── Programar notificaciones para TODAS las series ────────
    async programarTodasLasNotificaciones() {
        if (!this.permisoConcedido) return;

        try {
            const snapshot = await seriesRef.get();
            const series = [];
            snapshot.forEach(doc => series.push({ id: doc.id, ...doc.data() }));

            for (const serie of series) {
                await this.programarNotificacionesSerie(serie);
            }

            console.log(`✅ Notificaciones programadas para ${series.length} series`);
        } catch (err) {
            console.error('Error al programar notificaciones:', err);
        }
    },

    // ── Programar notificaciones de una serie específica ──────
    async programarNotificacionesSerie(serie) {
        if (!this.permisoConcedido) return;

        const ahora = new Date();

        // ── Pendiente de estreno ──────────────────────────────
        if (serie.categoria === 'pendiente_estreno' && serie.fecha_estreno) {
            const fechaEstreno = this.parsearFecha(serie.fecha_estreno);
            if (!fechaEstreno) return;

            // Notificación el día del estreno a las 09:00
            const notifEstreno = new Date(fechaEstreno);
            notifEstreno.setHours(9, 0, 0, 0);

            if (notifEstreno > ahora) {
                const delay = notifEstreno - ahora;
                this.enviarAlSW({
                    type: 'SCHEDULE_NOTIFICATION',
                    title: `🎬 ¡Hoy estrena! ${serie.titulo}`,
                    body: `El día esperado llegó. ¡${serie.titulo} se estrena hoy!`,
                    tag: `estreno-${serie.id}`,
                    delay,
                    url: '/misseries/pendiente_estreno.html'
                });
            }

            // Notificación 1 día antes a las 20:00
            const notifAntes = new Date(fechaEstreno);
            notifAntes.setDate(notifAntes.getDate() - 1);
            notifAntes.setHours(20, 0, 0, 0);

            if (notifAntes > ahora) {
                const delay = notifAntes - ahora;
                this.enviarAlSW({
                    type: 'SCHEDULE_NOTIFICATION',
                    title: `📅 Mañana estrena: ${serie.titulo}`,
                    body: `¡Prepárate! ${serie.titulo} se estrena mañana.`,
                    tag: `antes-estreno-${serie.id}`,
                    delay,
                    url: '/misseries/pendiente_estreno.html'
                });
            }
        }

        // ── En Emisión: notificar capítulos próximos ──────────
        if (serie.categoria === 'en_emision' && serie.capitulos_checklist) {
            let capitulos = serie.capitulos_checklist;
            if (typeof capitulos === 'string') {
                try { capitulos = JSON.parse(capitulos); } catch (e) { return; }
            }

            const noVistos = capitulos.filter(c => !c.visto);

            for (const cap of noVistos) {
                const fechaCap = this.parsearFecha(cap.fecha);
                if (!fechaCap) continue;

                // Notificación a las 09:00 del día del capítulo
                const notifCap = new Date(fechaCap);
                notifCap.setHours(9, 0, 0, 0);

                if (notifCap > ahora) {
                    const delay = notifCap - ahora;
                    // Limitar a los próximos 30 días para no saturar
                    if (delay < 30 * 24 * 60 * 60 * 1000) {
                        this.enviarAlSW({
                            type: 'SCHEDULE_NOTIFICATION',
                            title: `📺 Nuevo capítulo: ${serie.titulo}`,
                            body: `El Capítulo ${cap.numero} de ${serie.titulo} está disponible hoy.`,
                            tag: `cap-${serie.id}-${cap.numero}`,
                            delay,
                            url: '/misseries/en_emision.html'
                        });
                    }
                }
            }
        }
    },

    // ── Enviar mensaje al Service Worker ─────────────────────
    enviarAlSW(data) {
        if (!this.swRegistration) return;
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) {
                reg.active.postMessage(data);
            }
        });
    },

    // ── Parsear fecha string YYYY-MM-DD de forma segura ──────
    parsearFecha(fechaStr) {
        if (!fechaStr) return null;
        try {
            if (fechaStr.toDate) fechaStr = fechaStr.toDate().toISOString();
            const str = typeof fechaStr === 'string' ? fechaStr.split('T')[0] : null;
            if (!str) return null;
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        } catch (e) {
            return null;
        }
    },

    // ── Mostrar notificación local inmediata (para pruebas) ──
    async mostrarLocal(titulo, cuerpo) {
        if (!this.permisoConcedido || !this.swRegistration) return;
        await this.swRegistration.showNotification(titulo, {
            body: cuerpo,
            icon: '/misseries/icon-192.png',
            vibrate: [200, 100, 200]
        });
    },

    // ── Reprogramar al agregar/editar una serie ───────────────
    async reprogramarSerie(serieId) {
        if (!this.permisoConcedido) return;
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (doc.exists) {
                await this.programarNotificacionesSerie({ id: doc.id, ...doc.data() });
            }
        } catch (e) {
            console.error('Error al reprogramar:', e);
        }
    }
};

console.log('✅ NotificationManager cargado');
