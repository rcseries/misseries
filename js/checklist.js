class ChecklistManager {
    // Generar fechas de capítulos
    static generarFechasCapitulos(fechaEstreno, diasEmision, totalCapitulos) {
        const fechas = [];
        
        // Usar la fecha exacta sin conversión de zona horaria
        const partes = fechaEstreno.split('-');
        const año = parseInt(partes[0]);
        const mes = parseInt(partes[1]) - 1; // Los meses en JS van de 0-11
        const dia = parseInt(partes[2]);
        
        // Crear fecha base (mediodía para evitar problemas)
        const fechaBase = new Date(año, mes, dia, 12, 0, 0);
        
        let capitulosGenerados = 0;
        let diasBusqueda = 0;
        const maxDiasBusqueda = totalCapitulos * 14;

        while (capitulosGenerados < totalCapitulos && diasBusqueda < maxDiasBusqueda) {
            const fechaActual = new Date(fechaBase);
            fechaActual.setDate(fechaBase.getDate() + diasBusqueda);
            
            const diaSemana = this.obtenerNombreDia(fechaActual.getDay());
            
            if (diasEmision.includes(diaSemana)) {
                capitulosGenerados++;
                // Guardar en formato YYYY-MM-DD
                const añoCap = fechaActual.getFullYear();
                const mesCap = String(fechaActual.getMonth() + 1).padStart(2, '0');
                const diaCap = String(fechaActual.getDate()).padStart(2, '0');
                
                fechas.push({
                    numero: capitulosGenerados,
                    fecha: `${añoCap}-${mesCap}-${diaCap}`,
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
        if (!fecha) return 'Fecha no disponible';
        
        try {
            let fechaStr = fecha;
            
            // Si es Timestamp de Firestore
            if (fecha.toDate && typeof fecha.toDate === 'function') {
                const d = fecha.toDate();
                fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            
            // Si ya es string YYYY-MM-DD
            const partes = fechaStr.split('T')[0].split('-');
            if (partes.length === 3) {
                const año = parseInt(partes[0]);
                const mes = parseInt(partes[1]);
                const dia = parseInt(partes[2]);
                
                // Crear fecha local (mes-1 porque JS usa 0-11)
                const fechaObj = new Date(año, mes - 1, dia, 12, 0, 0);
                
                return fechaObj.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
            
            return 'Fecha no disponible';
        } catch (error) {
            console.error('Error formateando fecha:', fecha, error);
            return 'Fecha no disponible';
        }
    }

    // Actualizar estado de capítulo
    static async toggleCapitulo(serieId, numeroCapitulo, visto) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (doc.exists) {
                const data = doc.data();
                let capitulos = data.capitulos_checklist || [];
                
                if (typeof capitulos === 'string') {
                    try {
                        capitulos = JSON.parse(capitulos);
                    } catch (e) {
                        capitulos = [];
                    }
                }
                
                const index = capitulos.findIndex(c => c.numero === numeroCapitulo);
                
                if (index !== -1) {
                    capitulos[index].visto = visto;
                    
                    await seriesRef.doc(serieId).update({
                        capitulos_checklist: capitulos,
                        ultima_actualizacion: new Date().toISOString()
                    });
                    
                    if (AUTOMATIZACION.emisionAVistas && this.todosVistos(capitulos)) {
                        await SeriesManager.moverCategoria(serieId, 'vistas');
                    }
                    
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error al actualizar capítulo:', error);
            return false;
        }
    }

    // Obtener próximo capítulo no visto
    static obtenerProximoCapitulo(capitulos) {
        if (!capitulos || capitulos.length === 0) return null;
        
        const capsNormalizados = this.normalizarCapitulos(capitulos);
        const noVistos = capsNormalizados.filter(c => !c.visto);
        
        if (noVistos.length === 0) return null;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        let proximo = null;
        let menorDiferencia = Infinity;
        
        for (const cap of noVistos) {
            try {
                const partes = cap.fecha.split('-');
                const fechaCap = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                fechaCap.setHours(12, 0, 0, 0);
                
                const diferencia = fechaCap - hoy;
                
                if (diferencia >= 0 && diferencia < menorDiferencia) {
                    menorDiferencia = diferencia;
                    proximo = cap;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!proximo) {
            proximo = noVistos[0];
        }
        
        return proximo;
    }

    // Verificar si todos los capítulos están vistos
    static todosVistos(capitulos) {
        if (!capitulos || capitulos.length === 0) return false;
        const caps = this.normalizarCapitulos(capitulos);
        return caps.length > 0 && caps.every(c => c.visto);
    }

    // Normalizar fechas en capitulos
    static normalizarCapitulos(capitulos) {
        if (!capitulos) return [];
        if (typeof capitulos === 'string') {
            try {
                capitulos = JSON.parse(capitulos);
            } catch (e) {
                return [];
            }
        }
        
        return capitulos.map(cap => {
            let fechaCap = cap.fecha || '';
            
            // Si es Timestamp de Firestore
            if (fechaCap && fechaCap.toDate && typeof fechaCap.toDate === 'function') {
                const d = fechaCap.toDate();
                fechaCap = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            
            return {
                numero: cap.numero,
                fecha: fechaCap,
                visto: cap.visto || false
            };
        });
    }
}

console.log('✅ ChecklistManager cargado');
