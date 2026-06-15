class ChecklistManager {
    // Generar fechas de capítulos basado en fecha de estreno y días de emisión
    static generarFechasCapitulos(fechaEstreno, diasEmision, totalCapitulos) {
        const fechas = [];
        // Crear fecha sin problemas de zona horaria
        const fechaBase = new Date(fechaEstreno + 'T00:00:00');
        let capitulosGenerados = 0;
        let diasBusqueda = 0;
        const maxDiasBusqueda = totalCapitulos * 14; // Máximo de días a buscar

        while (capitulosGenerados < totalCapitulos && diasBusqueda < maxDiasBusqueda) {
            const fechaActual = new Date(fechaBase);
            fechaActual.setDate(fechaActual.getDate() + diasBusqueda);
            
            const diaSemana = this.obtenerNombreDia(fechaActual.getDay());
            
            if (diasEmision.includes(diaSemana)) {
                capitulosGenerados++;
                fechas.push({
                    numero: capitulosGenerados,
                    fecha: new Date(fechaActual),
                    visto: false
                });
            }
            
            diasBusqueda++;
        }

        return fechas;
    }

    // Obtener nombre del día en español
    static obtenerNombreDia(diaNumero) {
        const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return dias[diaNumero];
    }

    // Formatear fecha para mostrar
    static formatearFecha(fecha) {
        if (!fecha || fecha === 'Invalid Date') return 'Fecha no disponible';
        
        const fechaObj = new Date(fecha);
        // Verificar si la fecha es válida
        if (isNaN(fechaObj.getTime())) return 'Fecha no disponible';
        
        return fechaObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC' // Evitar problemas de zona horaria
        });
    }

    // Actualizar estado de capítulo
    static async toggleCapitulo(serieId, numeroCapitulo, visto) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (doc.exists) {
                const capitulos = doc.data().capitulos_checklist || [];
                const index = capitulos.findIndex(c => c.numero === numeroCapitulo);
                
                if (index !== -1) {
                    capitulos[index].visto = visto;
                    await seriesRef.doc(serieId).update({
                        capitulos_checklist: capitulos,
                        ultima_actualizacion: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error('Error al actualizar capítulo:', error);
        }
    }

    // Obtener próximo capítulo
    static obtenerProximoCapitulo(capitulos) {
        if (!capitulos || capitulos.length === 0) return null;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Buscar el primer capítulo no visto cuya fecha sea hoy o futura
        let proximo = null;
        
        for (const cap of capitulos) {
            const fechaCap = new Date(cap.fecha);
            fechaCap.setHours(0, 0, 0, 0);
            
            if (!cap.visto && fechaCap >= hoy) {
                if (!proximo || fechaCap < new Date(proximo.fecha)) {
                    proximo = cap;
                }
            }
        }
        
        // Si no hay capítulos futuros, buscar el último no visto
        if (!proximo) {
            for (const cap of capitulos) {
                if (!cap.visto) {
                    if (!proximo || new Date(cap.fecha) > new Date(proximo.fecha)) {
                        proximo = cap;
                    }
                }
            }
        }
        
        return proximo;
    }

    // Verificar si todos los capítulos están vistos
    static todosVistos(capitulos) {
        return capitulos && capitulos.every(c => c.visto);
    }

    // Obtener capítulo de esta semana
    static obtenerCapituloSemana(capitulos) {
        if (!capitulos || capitulos.length === 0) return null;
        
        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
        inicioSemana.setHours(0, 0, 0, 0);
        
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6); // Sábado
        finSemana.setHours(23, 59, 59, 999);
        
        // Buscar capítulo en esta semana
        for (const cap of capitulos) {
            const fechaCap = new Date(cap.fecha);
            if (fechaCap >= inicioSemana && fechaCap <= finSemana) {
                return cap;
            }
        }
        
        return null;
    }
}
