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
                series.push({
                    id: doc.id,
                    ...doc.data()
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

            // Si es "En Emisión", generar checklist automático
            if (datos.categoria === 'en_emision' && datos.fecha_estreno && datos.dias_emision && datos.total_capitulos) {
                nuevaSerie.capitulos_checklist = ChecklistManager.generarFechasCapitulos(
                    datos.fecha_estreno,
                    datos.dias_emision,
                    datos.total_capitulos
                );
            }

            await seriesRef.add(nuevaSerie);
            return true;
        } catch (error) {
            console.error('Error al agregar serie:', error);
            return false;
        }
    }

    // Actualizar serie existente
    static async actualizarSerie(id, datos) {
        try {
            datos.ultima_actualizacion = new Date().toISOString();
            
            // Si cambió a "En Emisión", regenerar checklist
            if (datos.categoria === 'en_emision' && datos.fecha_estreno && datos.dias_emision && datos.total_capitulos) {
                datos.capitulos_checklist = ChecklistManager.generarFechasCapitulos(
                    datos.fecha_estreno,
                    datos.dias_emision,
                    datos.total_capitulos
                );
            }
            
            await seriesRef.doc(id).update(datos);
            return true;
        } catch (error) {
            console.error('Error al actualizar serie:', error);
            return false;
        }
    }

    // Eliminar serie
    static async eliminarSerie(id) {
        try {
            await seriesRef.doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error al eliminar serie:', error);
            return false;
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
            return false;
        }
    }

    // Ordenar series (para Pendientes de Estreno)
    static ordenarPendientesEstreno(series) {
        return series.sort((a, b) => {
            if (a.fecha_estreno && b.fecha_estreno) {
                return new Date(a.fecha_estreno) - new Date(b.fecha_estreno);
            } else if (a.fecha_estreno) {
                return -1;
            } else if (b.fecha_estreno) {
                return 1;
            } else {
                return a.titulo.localeCompare(b.titulo);
            }
        });
    }
}
