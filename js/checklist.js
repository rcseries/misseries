class ChecklistManager {
    // Generar fechas de capítulos basado en fecha de estreno y días de emisión
    static generarFechasCapitulos(fechaEstreno, diasEmision, totalCapitulos) {
        const fechas = [];
        // Crear fecha sin problemas de zona horaria
        const partes = fechaEstreno.split('-');
        const fechaBase = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0);
        
        let capitulosGenerados = 0;
        let diasBusqueda = 0;
        const maxDiasBusqueda = totalCapitulos * 14;

        while (capitulosGenerados < totalCapitulos && diasBusqueda < maxDiasBusqueda) {
            const fechaActual = new Date(fechaBase);
            fechaActual.setDate(fechaBase.getDate() + diasBusqueda);
            
            const diaSemana = this.obtenerNombreDia(fechaActual.getDay());
            
            if (diasEmision.includes(diaSemana)) {
                capitulosGenerados++;
                fechas.push({
                    numero: capitulosGenerados,
                    fecha: new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), 12, 0, 0).toISOString(),
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
            const fechaObj = new Date(fecha);
            if (isNaN(fechaObj.getTime())) return 'Fecha no disponible';
            
            // Ajustar a fecha local sin problema de zona horaria
            const año = fechaObj.getFullYear();
            const mes = fechaObj.getMonth();
            const dia = fechaObj.getDate();
            const fechaLocal = new Date(año, mes, dia, 12, 0, 0);
            
            return fechaLocal.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
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
                
                // Si los capitulos vienen como string (Firestore a veces los guarda así)
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
                    
                    // Guardar como array normal
                    await seriesRef.doc(serieId).update({
                        capitulos_checklist: capitulos,
                        ultima_actualizacion: new Date().toISOString()
                    });
                    
                    // Disparar evento para actualizar UI
                    if (typeof categoriaActual !== 'undefined') {
                        setTimeout(() => {
                            UIManager.renderizarSeries(categoriaActual);
                        }, 500);
                    }
                }
            }
        } catch (error) {
            console.error('Error al actualizar capítulo:', error);
        }
    }

    // Obtener próximo capítulo no visto
    static obtenerProximoCapitulo(capitulos) {
        if (!capitulos || capitulos.length === 0) return null;
        
        // Filtrar solo capítulos no vistos
        const noVistos = capitulos.filter(c => !c.visto);
        if (noVistos.length === 0) return null;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        // Buscar capítulo con fecha más cercana (hoy o futuro)
        let proximo = noVistos[0];
        let menorDiferencia = Infinity;
        
        for (const cap of noVistos) {
            try {
                const fechaCap = new Date(cap.fecha);
                fechaCap.setHours(0, 0, 0, 0);
                
                const diferencia = fechaCap - hoy;
                
                if (diferencia >= 0 && diferencia < menorDiferencia) {
                    menorDiferencia = diferencia;
                    proximo = cap;
                }
            } catch (e) {
                continue;
            }
        }
        
        return proximo;
    }

    // Verificar si todos los capítulos están vistos
    static todosVistos(capitulos) {
        return capitulos && capitulos.length > 0 && capitulos.every(c => c.visto);
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
        
        return capitulos.map(cap => ({
            numero: cap.numero,
            fecha: cap.fecha || cap.fecha_estreno || new Date().toISOString(),
            visto: cap.visto || false
        }));
    }
}
