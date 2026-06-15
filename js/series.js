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
                // Convertir fechas de Firestore a objetos Date
                if (data.fecha_estreno && data.fecha_estreno.toDate) {
                    data.fecha_estreno = data.fecha_estreno.toDate().toISOString();
                }
                if (data.capitulos_checklist) {
                    data.capitulos_checklist = data.capitulos_checklist.map(cap => ({
                        ...cap,
                        fecha: cap.fecha && cap.fecha.toDate ? cap.fecha.toDate().toISOString() : cap.fecha
                    }));
                }
                
                series.push({
                    id: doc.id,
                    ...data
                });
            });
            
            return series;
        } catch (error) {
            console.error('Error al obtener series:', error);
            return [];
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
                nuevaSerie.fecha_estreno = new Date(nuevaSerie.fecha_estreno + 'T00:00:00').toISOString();
            }

            // Si es "En Emisión", generar checklist automático
            if (datos.categoria === 'en_emision' && datos.fecha_estreno && datos.dias_emision && datos.total_capitulos) {
                nuevaSerie.capitulos_checklist = ChecklistManager.generarFechasCapitulos(
                    datos.fecha_estreno,
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
            
            // Convertir fecha_estreno a formato correcto
            if (datos.fecha_estreno) {
                datos.fecha_estreno = new Date(datos.fecha_estreno + 'T00:00:00').toISOString();
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
            
            // Si se mueve a "Vistas", agregar fecha de finalización
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
            
            if (fechaA && fechaB) {
                return fechaA - fechaB;
            } else if (fechaA) {
                return -1;
            } else if (fechaB) {
                return 1;
            } else {
                return a.titulo.localeCompare(b.titulo);
            }
        });
    }
}
