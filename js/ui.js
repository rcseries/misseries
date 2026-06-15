class UIManager {
    // Renderizar series en el contenedor
    static async renderizarSeries(categoria) {
        const container = document.getElementById('series-container');
        container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
        
        let series = await SeriesManager.obtenerSeries(categoria);
        
        // Ordenamiento especial para Pendientes de Estreno
        if (categoria === 'pendiente_estreno') {
            series = SeriesManager.ordenarPendientesEstreno(series);
        }
        
        container.innerHTML = '';
        
        if (series.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-tv fa-4x mb-3" style="color: var(--text-secondary)"></i>
                    <h4 style="color: var(--text-secondary)">No hay series en esta categoría</h4>
                    <button class="btn btn-primary mt-3" onclick="abrirModalAgregar()">
                        <i class="fas fa-plus me-1"></i> Agregar Serie
                    </button>
                </div>
            `;
            return;
        }
        
        for (const serie of series) {
            const tarjeta = await this.crearTarjetaSerie(serie);
            container.appendChild(tarjeta);
        }
    }

    // Crear tarjeta de serie
    static crearTarjetaSerie(serie) {
        return new Promise((resolve) => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-lg-3 mb-4';
            
            const portadaData = ImageManager.obtenerPortada(serie.portada, serie.titulo);
            const portada = portadaData.url;
            
            // Formatear fecha correctamente
            const fechaEstreno = serie.fecha_estreno ? 
                ChecklistManager.formatearFecha(serie.fecha_estreno) : '';
            
            let infoExtra = '';
            let proximoCapituloHTML = '';
            
            switch(serie.categoria) {
                case 'en_emision':
                    const capitulosVistos = serie.capitulos_checklist ? 
                        serie.capitulos_checklist.filter(c => c.visto).length : 0;
                    const totalCaps = serie.total_capitulos || 0;
                    
                    // Obtener próximo capítulo
                    const proximoCapitulo = ChecklistManager.obtenerProximoCapitulo(serie.capitulos_checklist);
                    
                    if (proximoCapitulo) {
                        proximoCapituloHTML = `
                            <div class="proximo-capitulo mt-2" onclick="verChecklist('${serie.id}')" style="cursor: pointer;">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-play-circle me-2"></i>
                                    <div>
                                        <small class="text-muted">Próximo capítulo:</small><br>
                                        <strong>Capítulo ${proximoCapitulo.numero}</strong>
                                        ${proximoCapitulo.visto ? '<i class="fas fa-check-circle text-success ms-1"></i>' : ''}
                                        <br>
                                        <small>📅 ${ChecklistManager.formatearFecha(proximoCapitulo.fecha)}</small>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    infoExtra = `
                        <p class="card-text mb-1">
                            <small class="text-muted">
                                <i class="fas fa-tv me-1"></i> ${capitulosVistos}/${totalCaps} capítulos
                            </small>
                        </p>
                        <div class="progress mb-2" style="height: 3px;">
                            <div class="progress-bar bg-success" style="width: ${totalCaps > 0 ? (capitulosVistos / totalCaps) * 100 : 0}%"></div>
                        </div>
                        ${proximoCapituloHTML}
                    `;
                    break;
                    
                case 'vistas':
                    infoExtra = `
                        <p class="card-text">
                            <div class="text-warning">
                                ${this.generarEstrellas(serie.calificacion || 0)}
                            </div>
                            ${serie.fecha_terminada ? `<small class="text-muted">Finalizada: ${ChecklistManager.formatearFecha(serie.fecha_terminada)}</small>` : ''}
                        </p>
                    `;
                    break;
                    
                case 'a_medias':
                    const progreso = this.calcularProgreso(serie);
                    infoExtra = `
                        <div class="mt-2">
                            <div class="d-flex justify-content-between">
                                <small class="text-muted">Progreso</small>
                                <small class="text-muted">${progreso}%</small>
                            </div>
                            <div class="progress" style="height: 4px;">
                                <div class="progress-bar bg-info" style="width: ${progreso}%"></div>
                            </div>
                        </div>
                    `;
                    break;
            }
            
            // Crear imagen para detectar color
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = portada;
            
            img.onload = async () => {
                const colorPredominante = await ImageManager.obtenerColorPredominante(img);
                const { r, g, b } = colorPredominante;
                const textoContraste = ImageManager.obtenerContraste(r, g, b);
                
                col.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, r, g, b, textoContraste);
                resolve(col);
            };
            
            img.onerror = () => {
                col.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, 102, 126, 234, '#ffffff');
                resolve(col);
            };
            
            // Timeout por si la imagen tarda mucho
            setTimeout(() => {
                if (!col.innerHTML) {
                    col.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, 102, 126, 234, '#ffffff');
                    resolve(col);
                }
            }, 3000);
        });
    }

    // Generar HTML de la tarjeta
    static generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, r, g, b, textoContraste) {
        const bgColor = `rgb(${r}, ${g}, ${b})`;
        const overlayGradient = `linear-gradient(to top, rgba(${r},${g},${b},0.9) 0%, rgba(${r},${g},${b},0.3) 50%, rgba(${r},${g},${b},0.1) 100%)`;
        
        return `
            <div class="serie-card" style="background-color: ${bgColor};">
                <div class="position-relative" style="padding-top: 140%; overflow: hidden;">
                    <img src="${portada}" 
                         class="position-absolute top-0 start-0 w-100 h-100" 
                         alt="${serie.titulo}"
                         style="object-fit: cover;">
                    <div class="position-absolute bottom-0 start-0 w-100 p-3" 
                         style="background: ${overlayGradient}; color: ${textoContraste};">
                        <h5 class="card-title mb-1" style="color: ${textoContraste}; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                            ${serie.titulo}
                        </h5>
                        ${fechaEstreno ? `<p class="card-text mb-1"><small style="color: ${textoContraste}; opacity: 0.9;">📅 ${fechaEstreno}</small></p>` : ''}
                        <div style="color: ${textoContraste}; opacity: 0.95;">
                            ${infoExtra}
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span class="badge" style="background-color: ${textoContraste === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; color: ${textoContraste};">
                                ${this.formatearCategoria(serie.categoria)}
                            </span>
                            <div class="dropdown" onclick="event.stopPropagation()">
                                <button class="btn btn-sm" style="color: ${textoContraste};" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-dark">
                                    <li><a class="dropdown-item" href="#" onclick="editarSerie('${serie.id}')">
                                        <i class="fas fa-edit me-2"></i>Editar</a></li>
                                    ${serie.categoria === 'en_emision' ? 
                                        `<li><a class="dropdown-item" href="#" onclick="verChecklist('${serie.id}')">
                                            <i class="fas fa-list-check me-2"></i>Ver Checklist</a></li>` : ''}
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="eliminarSerie('${serie.id}')">
                                        <i class="fas fa-trash me-2"></i>Eliminar</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generar estrellas HTML (MÁXIMO 5 ESTRELLAS)
    static generarEstrellas(calificacion) {
        let estrellas = '';
        const maxEstrellas = 5;
        
        for (let i = 1; i <= maxEstrellas; i++) {
            if (i <= calificacion) {
                estrellas += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 === calificacion) {
                estrellas += '<i class="fas fa-star-half-alt"></i>';
            } else {
                estrellas += '<i class="far fa-star"></i>';
            }
        }
        
        return estrellas;
    }

    // Formatear nombre de categoría
    static formatearCategoria(categoria) {
        const categorias = {
            'pendiente_estreno': 'Pendiente Estreno',
            'en_emision': 'En Emisión',
            'a_medias': 'A Medias',
            'pendientes': 'Pendiente',
            'vistas': 'Vista'
        };
        return categorias[categoria] || categoria;
    }

    // Mostrar checklist en modal
    static async mostrarChecklist(serieId) {
        const doc = await seriesRef.doc(serieId).get();
        const serie = { id: doc.id, ...doc.data() };
        const checklistBody = document.getElementById('checklistBody');
        
        if (!serie.capitulos_checklist || serie.capitulos_checklist.length === 0) {
            checklistBody.innerHTML = '<p class="text-center">No hay checklist disponible</p>';
        } else {
            checklistBody.innerHTML = `
                <h6>${serie.titulo} - Checklist de Capítulos</h6>
                <div class="progress mb-3" style="height: 6px;">
                    <div class="progress-bar bg-success" style="width: ${(serie.capitulos_checklist.filter(c => c.visto).length / serie.capitulos_checklist.length) * 100}%"></div>
                </div>
                <div id="listaCapitulos">
                    ${serie.capitulos_checklist.map(cap => `
                        <div class="capitulo-item ${cap.visto ? 'completado' : ''}">
                            <input type="checkbox" 
                                   ${cap.visto ? 'checked' : ''} 
                                   onchange="UIManager.toggleChecklist('${serieId}', ${cap.numero}, this.checked)">
                            <span class="capitulo-texto">
                                Capítulo ${cap.numero} - ${ChecklistManager.formatearFecha(cap.fecha)}
                            </span>
                            ${cap.visto ? '<i class="fas fa-check-circle text-success ms-auto"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        new bootstrap.Modal(document.getElementById('modalChecklist')).show();
    }

    // Toggle capítulo en checklist
    static async toggleChecklist(serieId, numeroCapitulo, visto) {
        await ChecklistManager.toggleCapitulo(serieId, numeroCapitulo, visto);
        // Actualizar la vista del checklist
        setTimeout(() => {
            this.mostrarChecklist(serieId);
            // También actualizar la categoría actual
            UIManager.renderizarSeries(categoriaActual);
        }, 300);
    }

    // Calcular progreso
    static calcularProgreso(serie) {
        if (serie.capitulos_checklist && serie.total_capitulos) {
            const vistos = serie.capitulos_checklist.filter(c => c.visto).length;
            return Math.round((vistos / serie.total_capitulos) * 100);
        }
        return 0;
    }
}
