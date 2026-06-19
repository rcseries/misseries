class UIManager {
    // Control de renderizado
    static renderizando = false;
    static ultimaCategoria = '';
    static seriesCache = {};

    // Calcular número de columnas según ancho
    static obtenerNumColumnas() {
        const ancho = window.innerWidth;
        if (ancho <= 576) return 1;
        if (ancho <= 768) return 2;
        if (ancho <= 1200) return 3;
        return 4;
    }

    // Renderizar series con layout masonry de columnas JS
    static async renderizarSeries(categoria, forzar = false) {
        if (this.renderizando && !forzar) return;

        if (!forzar && categoria === this.ultimaCategoria && this.seriesCache[categoria]) {
            this.mostrarDesdeCache(categoria);
            return;
        }

        this.renderizando = true;
        const container = document.getElementById('series-container');
        container.innerHTML = '';
        container.style.cssText = '';

        // Spinner centrado mientras carga
        container.innerHTML = '<div style="text-align:center;padding:3rem;width:100%;"><div class="spinner-border text-primary" role="status"></div></div>';

        try {
            let series = await SeriesManager.obtenerSeries(categoria);
            series = series.filter(s => s.categoria === categoria);

            // Eliminar duplicados por id
            const idsVistos = new Set();
            series = series.filter(s => {
                if (idsVistos.has(s.id)) return false;
                idsVistos.add(s.id);
                return true;
            });

                       // Ordenar según categoría
            if (categoria === 'pendiente_estreno') {
                series = SeriesManager.ordenarPendientesEstreno(series);
            } else if (categoria === 'en_emision') {
                series = SeriesManager.ordenarEnEmision(series);
            } else if (categoria === 'a_medias' || categoria === 'pendientes' || categoria === 'vistas') {
                // Orden alfabético para estas categorías
                series.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));
            }

            // Guardar en caché
            if (forzar) delete this.seriesCache[categoria];
            this.seriesCache[categoria] = series;
            this.ultimaCategoria = categoria;

            container.innerHTML = '';

            if (series.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:3rem 0;width:100%;">
                        <i class="fas fa-tv fa-4x mb-3" style="color:var(--text-secondary)"></i>
                        <h4 style="color:var(--text-secondary)">No hay series en esta categoría</h4>
                        <button class="btn btn-primary mt-3" onclick="abrirModalAgregar()">
                            <i class="fas fa-plus me-1"></i> Agregar Serie
                        </button>
                    </div>`;
                return;
            }

            await this.renderizarMasonry(container, series);

        } catch (error) {
            console.error('Error al renderizar:', error);
            container.innerHTML = `
                <div style="text-align:center;padding:3rem 0;width:100%;">
                    <i class="fas fa-exclamation-triangle fa-4x mb-3" style="color:var(--accent)"></i>
                    <h4 style="color:var(--text-secondary)">Error al cargar series</h4>
                    <button class="btn btn-primary mt-3" onclick="UIManager.renderizarSeries(CATEGORIA_ACTUAL,true)">Reintentar</button>
                </div>`;
        } finally {
            this.renderizando = false;
        }
    }

    // Masonry real: distribuye tarjetas en la columna más corta
    static async renderizarMasonry(container, series) {
        const numCols = this.obtenerNumColumnas();
        const gap = 10; // px

        // Contenedor flex
        container.style.cssText = `display:flex;gap:${gap}px;align-items:flex-start;`;

        // Crear columnas vacías
        const columnas = [];
        for (let i = 0; i < numCols; i++) {
            const col = document.createElement('div');
            col.style.cssText = `flex:1;display:flex;flex-direction:column;gap:${gap}px;`;
            container.appendChild(col);
            columnas.push({ el: col, altura: 0 });
        }

        // Distribuir cada tarjeta en la columna más corta
        for (const serie of series) {
            const tarjeta = await this.crearTarjetaSerie(serie);

            // Columna con menor altura acumulada
            const colMin = columnas.reduce((a, b) => a.altura <= b.altura ? a : b);
            colMin.el.appendChild(tarjeta);

            // Actualizar altura estimada (usamos offsetHeight si ya está en DOM)
            await new Promise(r => requestAnimationFrame(r));
            colMin.altura = colMin.el.scrollHeight;
        }
    }

    // Mostrar desde cache
    static async mostrarDesdeCache(categoria) {
        const container = document.getElementById('series-container');
        const series = this.seriesCache[categoria] || [];
        container.innerHTML = '';
        container.style.cssText = '';

        if (series.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:3rem 0;width:100%;">
                    <i class="fas fa-tv fa-4x mb-3" style="color:var(--text-secondary)"></i>
                    <h4 style="color:var(--text-secondary)">No hay series en esta categoría</h4>
                </div>`;
            return;
        }

        await this.renderizarMasonry(container, series);
    }

    // Crear tarjeta de serie
    static crearTarjetaSerie(serie) {
        return new Promise((resolve) => {
            const div = document.createElement('div');
            div.className = 'serie-card';
            
            const portadaData = ImageManager.obtenerPortada(serie.portada, serie.titulo);
            const portada = portadaData.url;
            
            const fechaEstreno = serie.fecha_estreno ? 
                ChecklistManager.formatearFecha(serie.fecha_estreno) : '';
            
            let infoExtra = '';
            
            switch(serie.categoria) {
                case 'pendiente_estreno':
                    const tipoEstreno = serie.tipo_estreno;
                    let tipoBadge = '';
                    if (tipoEstreno === 'especial') tipoBadge = '<span class="badge bg-warning text-dark ms-1">Especial</span>';
                    else if (tipoEstreno === 'temporada') tipoBadge = '<span class="badge bg-info text-dark ms-1">Nueva Temp.</span>';
                    infoExtra = tipoBadge;
                    break;
                    
                case 'en_emision':
                    const capitulos = serie.capitulos_checklist || [];
                    const capitulosVistos = capitulos.filter(c => c.visto).length;
                    const totalCaps = serie.total_capitulos || capitulos.length || 0;
                    const proximoCapitulo = ChecklistManager.obtenerProximoCapitulo(capitulos);
                    
                    let proximoHTML = '';
                    if (proximoCapitulo) {
                        proximoHTML = `
                            <div class="proximo-capitulo" onclick="verChecklist('${serie.id}')">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-play-circle me-2"></i>
                                    <div>
                                        <small style="opacity: 0.8;">Próximo:</small>
                                        <strong>Cap. ${proximoCapitulo.numero}</strong>
                                        ${proximoCapitulo.visto ? '<i class="fas fa-check-circle text-success ms-1"></i>' : ''}
                                        <br>
                                        <small>📅 ${ChecklistManager.formatearFecha(proximoCapitulo.fecha)}</small>
                                    </div>
                                </div>
                            </div>`;
                    } else if (capitulos.length > 0 && capitulosVistos === capitulos.length) {
                        proximoHTML = `
                            <div class="proximo-capitulo" style="background: rgba(39, 174, 96, 0.2);">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-check-circle text-success me-2"></i>
                                    <div>
                                        <small>¡Completado!</small>
                                        <br><small>${capitulosVistos}/${totalCaps} vistos</small>
                                    </div>
                                </div>
                            </div>`;
                    }
                    
                    infoExtra = `
                        <p class="mb-1"><small style="opacity: 0.9;">📺 ${capitulosVistos}/${totalCaps} capítulos</small></p>
                        <div class="progress mb-2" style="height: 3px; background: rgba(255,255,255,0.2);">
                            <div class="progress-bar bg-success" style="width: ${totalCaps > 0 ? (capitulosVistos / totalCaps) * 100 : 0}%"></div>
                        </div>
                        ${proximoHTML}`;
                    break;
                    
                                case 'vistas':
                    let checklistHTML = '';
                    if (serie.checklist_personalizado) {
                        let items;
                        try { items = JSON.parse(serie.checklist_personalizado); } catch(e) { items = []; }
                        const itemsVistos = items.filter(i => i.visto).length;
                        checklistHTML = `
                            <div class="mt-1">
                                <small style="opacity: 0.8;">📋 Checklist: ${itemsVistos}/${items.length}</small>
                                <div class="progress" style="height: 3px; background: rgba(255,255,255,0.2);">
                                    <div class="progress-bar bg-info" style="width: ${items.length > 0 ? (itemsVistos/items.length)*100 : 0}%"></div>
                                </div>
                            </div>`;
                    }
                    infoExtra = `
                        <div class="text-warning mb-1">${this.generarEstrellas(serie.calificacion || 0)}</div>
                        ${!serie.calificacion ? '<small style="opacity: 0.7;">⭐ Sin calificar</small>' : ''}
                        ${checklistHTML}`;
                    break;
                    
                case 'a_medias':
                    let checklistAM = '';
                    if (serie.checklist_personalizado) {
                        let items;
                        try { items = JSON.parse(serie.checklist_personalizado); } catch(e) { items = []; }
                        const itemsVistosAM = items.filter(i => i.visto).length;
                        checklistAM = `
                            <div class="mt-1">
                                <small style="opacity: 0.8;">📋 Checklist: ${itemsVistosAM}/${items.length}</small>
                                <div class="progress" style="height: 3px; background: rgba(255,255,255,0.2);">
                                    <div class="progress-bar bg-info" style="width: ${items.length > 0 ? (itemsVistosAM/items.length)*100 : 0}%"></div>
                                </div>
                            </div>`;
                    }
                    const progreso = this.calcularProgreso(serie);
                    infoExtra = `
                        <div class="mt-1">
                            <div class="d-flex justify-content-between">
                                <small style="opacity: 0.8;">Progreso</small>
                                <small style="opacity: 0.8;">${progreso}%</small>
                            </div>
                            <div class="progress" style="height: 4px; background: rgba(255,255,255,0.2);">
                                <div class="progress-bar bg-info" style="width: ${progreso}%"></div>
                            </div>
                        </div>
                        ${checklistAM}`;
                    break;
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = portada;
            
            const generarHTML = (r = 102, g = 126, b = 234, textoContraste = '#ffffff') => {
                div.style.backgroundColor = `rgb(${r},${g},${b})`;
                div.setAttribute('onclick', `verDetalleSerie('${serie.id}')`);
                div.innerHTML = this.generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, r, g, b, textoContraste);
                resolve(div);
            };
            
            img.onload = async () => {
                try {
                    const color = await ImageManager.obtenerColorPredominante(img);
                    generarHTML(color.r, color.g, color.b, ImageManager.obtenerContraste(color.r, color.g, color.b));
                } catch (e) { generarHTML(); }
            };
            
            img.onerror = () => generarHTML();
            
            setTimeout(() => { if (!div.innerHTML) generarHTML(); }, 3000);
        });
    }

    // Generar HTML de la tarjeta
       static generarHTMLTarjeta(serie, portada, fechaEstreno, infoExtra, r, g, b, textoContraste) {
        return `
            <div class="imagen-container">
                <img src="${portada}" alt="${serie.titulo}" style="width: 100%; height: auto; display: block;">
            </div>
            <div class="info-overlay" style="color: ${textoContraste};">
                <h5 class="card-title" style="color: ${textoContraste}; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${serie.titulo}</h5>
                ${fechaEstreno ? `<p class="mb-1"><small style="color: ${textoContraste}; opacity: 0.9;">📅 ${fechaEstreno}</small></p>` : ''}
                <div style="color: ${textoContraste}; opacity: 0.95;">${infoExtra}</div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <span class="badge" style="background-color: ${textoContraste === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; color: ${textoContraste}; font-size: 0.75rem;">
                        ${this.formatearCategoria(serie.categoria)}
                    </span>
                    <div class="dropdown" onclick="event.stopPropagation()">
                        <button class="btn btn-sm" style="color: ${textoContraste};" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-dark">
                            <li><a class="dropdown-item" href="#" onclick="editarSerie('${serie.id}')"><i class="fas fa-edit me-2"></i>Editar</a></li>
                            ${serie.categoria === 'en_emision' ? `<li><a class="dropdown-item" href="#" onclick="verChecklist('${serie.id}')"><i class="fas fa-list-check me-2"></i>Ver Checklist</a></li>` : ''}
                            ${(serie.categoria === 'vistas' || serie.categoria === 'a_medias') && serie.checklist_personalizado ? `<li><a class="dropdown-item" href="#" onclick="verChecklist('${serie.id}')"><i class="fas fa-list-check me-2"></i>Ver Checklist</a></li>` : ''}
                            ${serie.categoria === 'vistas' && !serie.calificacion ? `<li><a class="dropdown-item" href="#" onclick="calificarSerie('${serie.id}')"><i class="fas fa-star me-2"></i>Calificar</a></li>` : ''}
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="eliminarSerie('${serie.id}')"><i class="fas fa-trash me-2"></i>Eliminar</a></li>
                        </ul>
                    </div>
                </div>
            </div>`;
    }

    static generarEstrellas(calificacion) {
        if (!calificacion || calificacion === 0) return '<small style="opacity: 0.5;">⭐ Sin calificar</small>';
        let estrellas = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= calificacion) estrellas += '<i class="fas fa-star"></i>';
            else if (i - 0.5 === calificacion) estrellas += '<i class="fas fa-star-half-alt"></i>';
            else estrellas += '<i class="far fa-star"></i>';
        }
        return estrellas;
    }

    static formatearCategoria(categoria) {
        const cats = {
            'pendiente_estreno': 'Próximo estreno',
            'en_emision': 'En emisión',
            'a_medias': 'A medias',
            'pendientes': 'Pendiente',
            'vistas': 'Vista'
        };
        return cats[categoria] || categoria;
    }

        static async mostrarChecklist(serieId) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (!doc.exists) return;
            const serie = { id: doc.id, ...doc.data() };
            const body = document.getElementById('checklistBody');
            
            // Intentar checklist de En Emisión primero
            const capitulos = ChecklistManager.normalizarCapitulos(serie.capitulos_checklist);
            
            // Si no tiene, intentar checklist personalizado
            let itemsPersonalizados = null;
            if (serie.checklist_personalizado) {
                try {
                    itemsPersonalizados = JSON.parse(serie.checklist_personalizado);
                } catch(e) {
                    itemsPersonalizados = null;
                }
            }
            
            // Si no hay nada que mostrar
            if ((!capitulos || capitulos.length === 0) && (!itemsPersonalizados || itemsPersonalizados.length === 0)) {
                body.innerHTML = '<p class="text-center py-3">No hay checklist disponible para esta serie.</p>';
            } 
            // Checklist de En Emisión
            else if (capitulos && capitulos.length > 0) {
                const vistos = capitulos.filter(c => c.visto).length;
                const total = capitulos.length;
                body.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">${serie.titulo}</h6>
                        <small>${vistos}/${total} vistos</small>
                    </div>
                    <div class="progress mb-3" style="height: 6px; background: rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-success" style="width: ${(vistos/total)*100}%"></div>
                    </div>
                    ${capitulos.map(cap => `
                        <div class="capitulo-item ${cap.visto ? 'completado' : ''}">
                            <input type="checkbox" ${cap.visto ? 'checked' : ''} 
                                   onchange="UIManager.toggleChecklist('${serieId}', ${cap.numero}, this.checked)">
                            <span class="capitulo-texto">Capítulo ${cap.numero} - ${ChecklistManager.formatearFecha(cap.fecha)}</span>
                            ${cap.visto ? '<i class="fas fa-check-circle text-success ms-auto"></i>' : ''}
                        </div>
                    `).join('')}`;
            }
            // Checklist personalizado
            else if (itemsPersonalizados && itemsPersonalizados.length > 0) {
                const vistos = itemsPersonalizados.filter(i => i.visto).length;
                const total = itemsPersonalizados.length;
                body.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">${serie.titulo} - Checklist</h6>
                        <small>${vistos}/${total} completado</small>
                    </div>
                    <div class="progress mb-3" style="height: 6px; background: rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-info" style="width: ${(vistos/total)*100}%"></div>
                    </div>
                    ${itemsPersonalizados.map((item, index) => `
                        <div class="capitulo-item ${item.visto ? 'completado' : ''}">
                            <input type="checkbox" ${item.visto ? 'checked' : ''} 
                                   onchange="UIManager.toggleChecklistPersonalizado('${serieId}', ${index}, this.checked)">
                            <span class="capitulo-texto">${item.texto}</span>
                            ${item.visto ? '<i class="fas fa-check-circle text-success ms-auto"></i>' : ''}
                        </div>
                    `).join('')}`;
            }
            
            new bootstrap.Modal(document.getElementById('modalChecklist')).show();
        } catch (error) { console.error('Error:', error); }
    }

    // Toggle checklist personalizado
    static async toggleChecklistPersonalizado(serieId, index, visto) {
        try {
            const doc = await seriesRef.doc(serieId).get();
            if (!doc.exists) return;
            const serie = doc.data();
            let items = [];
            if (serie.checklist_personalizado) {
                try { items = JSON.parse(serie.checklist_personalizado); } catch(e) { items = []; }
            }
            if (items[index]) {
                items[index].visto = visto;
                await seriesRef.doc(serieId).update({
                    checklist_personalizado: JSON.stringify(items),
                    ultima_actualizacion: new Date().toISOString()
                });
                setTimeout(() => this.mostrarChecklist(serieId), 300);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    static async toggleChecklist(serieId, numeroCapitulo, visto) {
        const resultado = await ChecklistManager.toggleCapitulo(serieId, numeroCapitulo, visto);
        if (resultado === 'completado') {
            bootstrap.Modal.getInstance(document.getElementById('modalChecklist'))?.hide();
        } else if (resultado) {
            setTimeout(() => this.mostrarChecklist(serieId), 300);
        }
    }

    static calcularProgreso(serie) {
        const capitulos = serie.capitulos_checklist || [];
        if (capitulos.length === 0) return 0;
        return Math.round((capitulos.filter(c => c.visto).length / capitulos.length) * 100);
    }
}

console.log('✅ UIManager cargado');
