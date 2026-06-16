// ============================================================
// NOTIFICATIONS.JS - Google Calendar Recordatorios
// ============================================================

const CalendarManager = {
    calendarId: GOOGLE_CALENDAR.email,

    // Crear evento en Google Calendar
    async crearEvento({ titulo, fecha, descripcion, serieId }) {
        const fechaEvento = this.parsearFecha(fecha);
        if (!fechaEvento) return;

        // Fecha inicio: 7:00 AM
        const inicio = new Date(fechaEvento);
        inicio.setHours(7, 0, 0, 0);

        // Fecha fin: 7:30 AM
        const fin = new Date(inicio);
        fin.setMinutes(30);

        const evento = {
            summary: titulo,
            description: descripcion || '',
            start: {
                dateTime: inicio.toISOString(),
                timeZone: 'America/El_Salvador'
            },
            end: {
                dateTime: fin.toISOString(),
                timeZone: 'America/El_Salvador'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 0 }
                ]
            }
        };

        try {
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?key=${GOOGLE_CALENDAR.apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evento)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📅 Evento creado:', data.htmlLink);
                return data;
            } else {
                const error = await response.json();
                console.warn('⚠️ Error al crear evento:', error);
                return null;
            }
        } catch (error) {
            console.error('Error al crear evento en Calendar:', error);
            return null;
        }
    },

    // Programar todos los recordatorios
    async programarTodasLasNotificaciones() {
        try {
            const snapshot = await seriesRef.get();
            const series = [];
            snapshot.forEach(doc => series.push({ id: doc.id, ...doc.data() }));

            for (const serie of series) {
                await this.programarRecordatoriosSerie(serie);
            }

            console.log(`📅 Recordatorios programados para ${series.length} series`);
        } catch (err) {
            console.error('Error al programar recordatorios:', err);
        }
    },

    // Programar recordatorios de una serie
    async programarRecordatoriosSerie(serie) {
        const ahora = new Date();

        // Pendiente de estreno
        if (serie.categoria === 'pendiente_estreno' && serie.fecha_estreno) {
            const fechaEstreno = this.parsearFecha(serie.fecha_estreno);
            if (fechaEstreno && fechaEstreno > ahora) {
                // Recordatorio el día del estreno
                await this.crearEvento({
                    titulo: `🎬 ¡Estrena hoy! ${serie.titulo}`,
                    fecha: serie.fecha_estreno,
                    descripcion: `${serie.titulo} se estrena hoy. ¡A disfrutar!`,
                    serieId: serie.id
                });

                // Recordatorio 1 día antes
                const unDiaAntes = new Date(fechaEstreno);
                unDiaAntes.setDate(unDiaAntes.getDate() - 1);
                if (unDiaAntes > ahora) {
                    await this.crearEvento({
                        titulo: `📅 Mañana estrena: ${serie.titulo}`,
                        fecha: unDiaAntes.toISOString().split('T')[0],
                        descripcion: `Prepárate, ${serie.titulo} se estrena mañana.`,
                        serieId: serie.id
                    });
                }
            }
        }

        // En Emisión - recordatorios por capítulo
        if (serie.categoria === 'en_emision' && serie.capitulos_checklist) {
            let capitulos = serie.capitulos_checklist;
            if (typeof capitulos === 'string') {
                try { capitulos = JSON.parse(capitulos); } catch (e) { return; }
            }

            const noVistos = capitulos.filter(c => !c.visto);
            const limiteDias = 60; // Solo programar próximos 60 días

            for (const cap of noVistos) {
                const fechaCap = this.parsearFecha(cap.fecha);
                if (!fechaCap || fechaCap <= ahora) continue;

                const diffDias = (fechaCap - ahora) / (1000 * 60 * 60 * 24);
                if (diffDias > limiteDias) continue;

                await this.crearEvento({
                    titulo: `📺 ${serie.titulo} - Capítulo ${cap.numero}`,
                    fecha: cap.fecha,
                    descripcion: `Nuevo capítulo de ${serie.titulo}: Capítulo ${cap.numero}`,
                    serieId: serie.id
                });
            }
        }
    },

    // Reprogramar al agregar/editar
    async reprogramarSerie(serieId) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (doc.exists) {
                await this.programarRecordatoriosSerie({ id: doc.id, ...doc.data() });
            }
        } catch (e) {
            console.error('Error al reprogramar:', e);
        }
    },

    // Parsear fecha
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
    }
};

console.log('📅 CalendarManager cargado');
