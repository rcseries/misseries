class SeriesManager {
    // Obtener todas las series
    static async obtenerSeries(categoria = null) {
        try {
            let query = seriesRef;
            
            if (categoria) {
                query = query.where('categoria', '==', categoria);
            }
            
            const snapshot = await query.get();
            const series = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Normalizar capitulos_checklist
                if (data.capitulos_checklist) {
                    data.capitulos_checklist = ChecklistManager.normalizarCapitulos(data.capitulos_checklist);
                }
                
                // NO convertir fecha_estreno - mantenerla como viene de Firestore
                // Firestore guarda la fecha correctamente, solo extraerla como string
                if (data.fecha_estreno) {
                    if (data.fecha_estreno.toDate && typeof data.fecha_estreno.toDate === 'function') {
                        // Es un Timestamp de Firestore
                        const fechaDate = data.fecha_estreno.toDate();
                        // Usar la fecha LOCAL, no UTC
                        data.fecha_estreno = fechaDate.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
                    }
                }
                
                series.push({
                    id: doc.id,
                    ...data
                });
            });
            
        if (fechaEstreno <= hoy && serie.tipo_estreno === 'serie') {
        await this.moverCategoria(serie.id, 'en_emision');
            
            return series;
        } catch (error) {
            console.error('Error al obtener series:', error);
            return [];
        }
    }

    // Verificar y ejecutar automatizaciones
    static async verificarAutomatizaciones(series) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        for (const serie of series) {
            if (AUTOMATIZACION.estrenoAEmision && 
                serie.categoria === 'pendiente_estreno' && 
                serie.fecha_estreno) {
                
                try {
                    const fechaEstreno = new Date(serie.fecha_estreno + 'T00:00:00');
                    
                    if (fechaEstreno <= hoy) {
                        await this.moverCategoria(serie.id, 'en_emision');
                        console.log(`🤖 ${serie.titulo} movida a En Emisión (automático)`);
                    }
                } catch (e) {
                    console.error('Error en automatización:', e);
                }
            }
            
            if (AUTOMATIZACION.emisionAVistas && 
                serie.categoria === 'en_emision' && 
                serie.capitulos_checklist && 
                serie.capitulos_checklist.length > 0) {
                
                if (ChecklistManager.todosVistos(serie.capitulos_checklist)) {
                    await this.moverCategoria(serie.id, 'vistas');
                    console.log(`🤖 ${serie.titulo} movida a Vistas (automático)`);
                }
            }
        }
    }

    // Agregar nueva serie
    static async agregarSerie(datos) {
        try {
            const nuevaSerie = {
                ...datos,
                fecha_registro: new Date().toISOString(),
                ultima_actualizacion: new Date().toISOString()
            };

            // Guardar la fecha EXACTAMENTE como el usuario la ingresó
            // No hacer ninguna conversión - Firestore la guardará como string
            if (nuevaSerie.fecha_estreno) {
                // Asegurar que sea formato YYYY-MM-DD (ya viene así del input date)
                nuevaSerie.fecha_estreno = nuevaSerie.fecha_estreno.split('T')[0];
            }

            // Si es "En Emisión", generar checklist automático
            if (datos.categoria === 'en_emision' && datos.fecha_estreno && datos.dias_emision && datos.total_capitulos) {
                nuevaSerie.capitulos_checklist = ChecklistManager.generarFechasCapitulos(
                    nuevaSerie.fecha_estreno,
                    datos.dias_emision,
                    parseInt(datos.total_capitulos)
                );
            }

            const docRef = await seriesRef.add(nuevaSerie);
            return { id: docRef.id, ...nuevaSerie };
        } catch (error) {
            console.error('Error al agregar serie:', error);
            throw error;
        }
    }

    // Actualizar serie existente
    static async actualizarSerie(id, datos) {
        try {
            datos.ultima_actualizacion = new Date().toISOString();
            
            // Guardar la fecha exactamente como viene del input
            if (datos.fecha_estreno) {
                datos.fecha_estreno = datos.fecha_estreno.split('T')[0];
            }
            
            // Si cambió a "En Emisión", regenerar checklist
            if (datos.categoria === 'en_emision' && datos.fecha_estreno && datos.dias_emision && datos.total_capitulos) {
                datos.capitulos_checklist = ChecklistManager.generarFechasCapitulos(
                    datos.fecha_estreno,
                    datos.dias_emision,
                    parseInt(datos.total_capitulos)
                );
            }
            
            await seriesRef.doc(id).update(datos);
            return true;
        } catch (error) {
            console.error('Error al actualizar serie:', error);
            throw error;
        }
    }

    // Eliminar serie
    static async eliminarSerie(id) {
        try {
            await seriesRef.doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error al eliminar serie:', error);
            throw error;
        }
    }

    // Mover serie a otra categoría
    static async moverCategoria(id, nuevaCategoria) {
        try {
            const datos = {
                categoria: nuevaCategoria,
                ultima_actualizacion: new Date().toISOString()
            };
            
            if (nuevaCategoria === 'vistas') {
                datos.fecha_terminada = new Date().toISOString();
            }
            
            await seriesRef.doc(id).update(datos);
            return true;
        } catch (error) {
            console.error('Error al mover serie:', error);
            throw error;
        }
    }

    // Ordenar series (para Pendientes de Estreno)
    static ordenarPendientesEstreno(series) {
        return series.sort((a, b) => {
            const fechaA = a.fecha_estreno ? new Date(a.fecha_estreno + 'T00:00:00') : null;
            const fechaB = b.fecha_estreno ? new Date(b.fecha_estreno + 'T00:00:00') : null;
            
            if (fechaA && fechaB && !isNaN(fechaA) && !isNaN(fechaB)) {
                return fechaA - fechaB;
            } else if (fechaA && !isNaN(fechaA)) {
                return -1;
            } else if (fechaB && !isNaN(fechaB)) {
                return 1;
            } else {
                return a.titulo.localeCompare(b.titulo);
            }
        });
    }

    // Ordenar series En Emisión por fecha del próximo capítulo, luego alfabético
    static ordenarEnEmision(series) {
        return series.sort((a, b) => {
            const proxA = ChecklistManager.obtenerProximoCapitulo(a.capitulos_checklist || []);
            const proxB = ChecklistManager.obtenerProximoCapitulo(b.capitulos_checklist || []);

            const parsear = (cap) => {
                if (!cap || !cap.fecha) return null;
                const partes = cap.fecha.split('-');
                if (partes.length !== 3) return null;
                return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
            };

            const fechaA = parsear(proxA);
            const fechaB = parsear(proxB);

            // Sin próximo capítulo va al final
            if (!fechaA && !fechaB) return a.titulo.localeCompare(b.titulo);
            if (!fechaA) return 1;
            if (!fechaB) return -1;

            const diff = fechaA - fechaB;
            // Si misma fecha → alfabético
            if (diff === 0) return a.titulo.localeCompare(b.titulo);
            return diff;
        });
    }
}

console.log('✅ SeriesManager cargado');
