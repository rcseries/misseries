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
                
                // Asegurar que fecha_estreno sea string ISO correcto
                if (data.fecha_estreno) {
                    if (data.fecha_estreno.toDate && typeof data.fecha_estreno.toDate === 'function') {
                        const fechaDate = data.fecha_estreno.toDate();
                        data.fecha_estreno = new Date(
                            fechaDate.getFullYear(), 
                            fechaDate.getMonth(), 
                            fechaDate.getDate(), 
                            12, 0, 0
                        ).toISOString();
                    }
                }
                
                series.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Verificar automatizaciones
            await this.verificarAutomatizaciones(series);
            
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
            // 1. Mover de pendiente_estreno a en_emision si llegó la fecha
            if (AUTOMATIZACION.estrenoAEmision && 
                serie.categoria === 'pendiente_estreno' && 
                serie.fecha_estreno) {
                
                try {
                    const fechaEstreno = new Date(serie.fecha_estreno);
                    fechaEstreno.setHours(0, 0, 0, 0);
                    
                    if (fechaEstreno <= hoy) {
                        await this.moverCategoria(serie.id, 'en_emision');
                        console.log(`🤖 ${serie.titulo} movida a En Emisión (automático)`);
                    }
                } catch (e) {
                    console.error('Error en automatización:', e);
                }
            }
            
            // 2. Mover de en_emision a vistas si todos los capítulos están vistos
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

            // Convertir fecha_estreno a formato correcto
            if (nuevaSerie.fecha_estreno) {
                const partes = nuevaSerie.fecha_estreno.split('T')[0].split('-');
                nuevaSerie.fecha_estreno = new Date(
                    parseInt(partes[0]), 
                    parseInt(partes[1]) - 1, 
                    parseInt(partes[2]), 
                    12, 0, 0
                ).toISOString();
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
            
            if (datos.fecha_estreno) {
                const partes = datos.fecha_estreno.split('T')[0].split('-');
                datos.fecha_estreno = new Date(
                    parseInt(partes[0]), 
                    parseInt(partes[1]) - 1, 
                    parseInt(partes[2]), 
                    12, 0, 0
                ).toISOString();
            }
            
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
            const fechaA = a.fecha_estreno ? new Date(a.fecha_estreno) : null;
            const fechaB = b.fecha_estreno ? new Date(b.fecha_estreno) : null;
            
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
}

console.log('✅ SeriesManager cargado');
