class ChecklistManager {
    // Generar fechas de capítulos
    static generarFechasCapitulos(fechaEstreno, diasEmision, totalCapitulos) {
        const fechas = [];
        
        const partes = fechaEstreno.split('-');
        const año = parseInt(partes[0]);
        const mes = parseInt(partes[1]) - 1;
        const dia = parseInt(partes[2]);
        
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
            
            if (fecha.toDate && typeof fecha.toDate === 'function') {
                const d = fecha.toDate();
                fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            
            const partes = fechaStr.split('T')[0].split('-');
            if (partes.length === 3) {
                const año = parseInt(partes[0]);
                const mes = parseInt(partes[1]);
                const dia = parseInt(partes[2]);
                
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
                    
                    // Verificar si todos los capítulos están vistos
                    if (this.todosVistos(capitulos)) {
                        // Mostrar modal de calificación antes de mover
                        this.mostrarModalCalificacion(serieId, data.titulo);
                        return 'completado';
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

    // Mostrar modal para calificar antes de mover a Vistas
    static mostrarModalCalificacion(serieId, titulo) {
        // Crear modal de calificación
        const modalHTML = `
            <div class="modal fade" id="modalCalificacion" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content bg-dark text-white">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">🎉 ¡Serie Completada!</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <p class="mb-3">Has visto todos los capítulos de:</p>
                            <h4 class="mb-4">${titulo}</h4>
                            <p class="mb-3">¿Quieres calificarla?</p>
                            
                            <div class="rating justify-content-center mb-4" id="ratingCompletado">
                                ${[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(valor => `
                                    <input type="radio" name="calificacionCompletado" value="${valor}" id="starComp${valor}">
                                    <label for="starComp${valor}" style="font-size: 2.5rem;">★</label>
                                `).join('')}
                            </div>
                            
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-outline-light" onclick="ChecklistManager.moverAVistasSinCalificar('${serieId}')">
                                    Omitir
                                </button>
                                <button class="btn btn-warning" onclick="ChecklistManager.moverAVistasConCalificacion('${serieId}')">
                                    <i class="fas fa-star me-1"></i> Calificar y Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Eliminar modal anterior si existe
        const modalAnterior = document.getElementById('modalCalificacion');
        if (modalAnterior) {
            modalAnterior.remove();
        }
        
        // Agregar modal al body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalCalificacion'));
        modal.show();
        
        // Cuando se cierre el modal sin decidir
        document.getElementById('modalCalificacion').addEventListener('hidden.bs.modal', () => {
            // Recargar la vista actual
            if (typeof categoriaActual !== 'undefined') {
                UIManager.renderizarSeries(categoriaActual);
            }
        });
    }

    // Mover a Vistas sin calificar
    static async moverAVistasSinCalificar(serieId) {
        try {
            await SeriesManager.moverCategoria(serieId, 'vistas');
            
            // Cerrar modales
            const modalChecklist = document.getElementById('modalChecklist');
            if (modalChecklist) {
                bootstrap.Modal.getInstance(modalChecklist)?.hide();
            }
            const modalCalificacion = document.getElementById('modalCalificacion');
            if (modalCalificacion) {
                bootstrap.Modal.getInstance(modalCalificacion)?.hide();
            }
            
            // Limpiar backdrops
            setTimeout(() => {
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                
                // Recargar vista
                if (typeof categoriaActual !== 'undefined') {
                    UIManager.renderizarSeries(categoriaActual);
                }
            }, 300);
        } catch (error) {
            console.error('Error al mover serie:', error);
        }
    }

    // Mover a Vistas con calificación
    static async moverAVistasConCalificacion(serieId) {
        try {
            const calificacionInput = document.querySelector('input[name="calificacionCompletado"]:checked');
            const calificacion = calificacionInput ? parseFloat(calificacionInput.value) : 0;
            
            // Actualizar categoría y calificación
            await seriesRef.doc(serieId).update({
                categoria: 'vistas',
                calificacion: calificacion,
                fecha_terminada: new Date().toISOString(),
                ultima_actualizacion: new Date().toISOString()
            });
            
            // Cerrar modales
            const modalChecklist = document.getElementById('modalChecklist');
            if (modalChecklist) {
                bootstrap.Modal.getInstance(modalChecklist)?.hide();
            }
            const modalCalificacion = document.getElementById('modalCalificacion');
            if (modalCalificacion) {
                bootstrap.Modal.getInstance(modalCalificacion)?.hide();
            }
            
            // Limpiar backdrops
            setTimeout(() => {
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                
                // Recargar vista
                if (typeof categoriaActual !== 'undefined') {
                    UIManager.renderizarSeries(categoriaActual);
                }
            }, 300);
        } catch (error) {
            console.error('Error al mover serie:', error);
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
