class ChecklistManager {
    // Generar fechas de capítulos basado en fecha de estreno y días de emisión
    static generarFechasCapitulos(fechaEstreno, diasEmision, totalCapitulos) {
        const fechas = [];
        let fechaActual = new Date(fechaEstreno);
        let capitulosGenerados = 0;
        let intentos = 0;
        const maxIntentos = totalCapitulos * 7; // Máximo de semanas a buscar

        while (capitulosGenerados < totalCapitulos && intentos < maxIntentos) {
            const diaSemana = this.obtenerNombreDia(fechaActual.getDay());
            
            if (diasEmision.includes(diaSemana)) {
                capitulosGenerados++;
                fechas.push({
                    numero: capitulosGenerados,
                    fecha: new Date(fechaActual),
                    visto: false
                });
            }
            
            fechaActual.setDate(fechaActual.getDate() + 1);
            intentos++;
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
        return new Date(fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Actualizar estado de capítulo
    static async toggleCapitulo(serieId, numeroCapitulo, visto) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (doc.exists) {
                const capitulos = doc.data().capitulos_checklist;
                const index = capitulos.findIndex(c => c.numero === numeroCapitulo);
                
                if (index !== -1) {
                    capitulos[index].visto = visto;
                    await seriesRef.doc(serieId).update({
                        capitulos_checklist: capitulos
                    });
                }
            }
        } catch (error) {
            console.error('Error al actualizar capítulo:', error);
        }
    }

    // Verificar si todos los capítulos están vistos
    static todosVistos(capitulos) {
        return capitulos.every(c => c.visto);
    }
}
