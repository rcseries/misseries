// ============================================================
// NOTIFICATIONS.JS - Calendario interno con notificaciones
// ============================================================

const NotificationManager = {
    recordatorios: [],
    intervaloRevisión: null,
    permisoConcedido: false,
    swRegistration: null,

    async init() {
        if (!('Notification' in window)) {
            console.warn('❌ Notificaciones no soportadas');
            return false;
        }

        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            this.swRegistration = reg;
        }

        if (Notification.permission === 'granted') {
            this.permisoConcedido = true;
        } else if (Notification.permission !== 'denied') {
            const permiso = await Notification.requestPermission();
            this.permisoConcedido = permiso === 'granted';
        }

        if (this.permisoConcedido) {
            console.log('🔔 Notificaciones activadas');
            await this.cargarRecordatorios();
            this.iniciarRevisión();
        } else {
            console.warn('⚠️ Permiso de notificaciones denegado');
        }

        return this.permisoConcedido;
    },

    async cargarRecordatorios() {
        try {
            const snapshot = await seriesRef.get();
            this.recordatorios = [];

            snapshot.forEach(doc => {
                const serie = { id: doc.id, ...doc.data() };
                
                if ((serie.categoria === 'pendiente_estreno' || serie.categoria === 'en_emision') && serie.fecha_estreno) {
                    this.recordatorios.push({
                        id: `estreno-${serie.id}`,
                        titulo: `🎬 ¡Estrena hoy! ${serie.titulo}`,
                        cuerpo: `${serie.titulo} se estrena hoy. ¡A disfrutar!`,
                        fecha: this.parsearFecha(serie.fecha_estreno),
                        url: 'pendiente_estreno.html',
                        notificado: false
                    });

                    const unDiaAntes = this.parsearFecha(serie.fecha_estreno);
                    if (unDiaAntes) {
                        unDiaAntes.setDate(unDiaAntes.getDate() - 1);
                        this.recordatorios.push({
                            id: `pre-estreno-${serie.id}`,
                            titulo: `📅 Mañana estrena: ${serie.titulo}`,
                            cuerpo: `¡Prepárate! ${serie.titulo} se estrena mañana.`,
                            fecha: new Date(unDiaAntes),
                            url: 'pendiente_estreno.html',
                            notificado: false
                        });
                    }
                }

                if (serie.categoria === 'en_emision' && serie.capitulos_checklist) {
                    let capitulos = serie.capitulos_checklist;
                    if (typeof capitulos === 'string') {
                        try { capitulos = JSON.parse(capitulos); } catch (e) { return; }
                    }

                    capitulos.filter(c => !c.visto).forEach(cap => {
                        const fechaCap = this.parsearFecha(cap.fecha);
                        if (fechaCap) {
                            this.recordatorios.push({
                                id: `cap-${serie.id}-${cap.numero}`,
                                titulo: `📺 Nuevo capítulo: ${serie.titulo}`,
                                cuerpo: `Capítulo ${cap.numero} de ${serie.titulo} disponible hoy.`,
                                fecha: fechaCap,
                                url: 'en_emision.html',
                                notificado: false
                            });
                        }
                    });
                }
            });

            console.log(`📅 ${this.recordatorios.length} recordatorios cargados`);
        } catch (err) {
            console.error('Error al cargar recordatorios:', err);
        }
    },

    iniciarRevisión() {
        if (this.intervaloRevisión) clearInterval(this.intervaloRevisión);
        
        this.intervaloRevisión = setInterval(() => {
            this.verificarRecordatorios();
        }, 30000);

        this.verificarRecordatorios();
    },

    verificarRecordatorios() {
        if (!this.permisoConcedido) return;

        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const horaActual = ahora.getHours();
        const minutosActual = ahora.getMinutes();

        this.recordatorios.forEach(recordatorio => {
            if (recordatorio.notificado) return;

            const fechaRec = recordatorio.fecha;
            if (!fechaRec) return;

            const fechaRecDate = new Date(fechaRec.getFullYear(), fechaRec.getMonth(), fechaRec.getDate());

            if (fechaRecDate.getTime() === hoy.getTime()) {
                if (horaActual >= 7 && minutosActual >= 0) {
                    this.mostrarNotificación(recordatorio);
                    recordatorio.notificado = true;
                }
            }
        });
    },

    mostrarNotificación(recordatorio) {
        if (!this.permisoConcedido) return;

        if (this.swRegistration) {
            this.swRegistration.showNotification(recordatorio.titulo, {
                body: recordatorio.cuerpo,
                icon: '/misseries/favicon.png',
                badge: '/misseries/favicon.png',
                tag: recordatorio.id,
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200],
                data: { url: recordatorio.url }
            });
        } else {
            const opciones = {
                body: recordatorio.cuerpo,
                icon: '/misseries/favicon.png',
                requireInteraction: true
            };
            const notif = new Notification(recordatorio.titulo, opciones);
            notif.onclick = () => {
                window.focus();
                if (recordatorio.url) window.location.href = recordatorio.url;
                notif.close();
            };
        }
    },

    async reprogramarTodo() {
        await this.cargarRecordatorios();
    },

    parsearFecha(fechaStr) {
        if (!fechaStr) return null;
        try {
            if (fechaStr.toDate) fechaStr = fechaStr.toDate().toISOString();
            const str = typeof fechaStr === 'string' ? fechaStr.split('T')[0] : null;
            if (!str) return null;
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d, 7, 0, 0);
        } catch (e) {
            return null;
        }
    },

    mostrarLocal(titulo, cuerpo) {
        if (!this.permisoConcedido) {
            alert('Debes permitir las notificaciones');
            return;
        }
        const opciones = {
            body: cuerpo,
            icon: '/misseries/favicon.png',
            vibrate: [200, 100, 200]
        };
        new Notification(titulo, opciones);
    }
};

console.log('🔔 NotificationManager cargado');
