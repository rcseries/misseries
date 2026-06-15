// Variables globales
let categoriaActual = 'pendiente_estreno';
let modalSerie;
let modalChecklist;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    modalSerie = new bootstrap.Modal(document.getElementById('modalSerie'));
    modalChecklist = new bootstrap.Modal(document.getElementById('modalChecklist'));
    
    // Limpiar backdrop al cerrar modal
    document.getElementById('modalChecklist').addEventListener('hidden.bs.modal', () => {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });
    
    inicializarEventos();
    UIManager.renderizarSeries(categoriaActual);
});

// Inicializar eventos
function inicializarEventos() {
    // Navegación de categorías
    document.querySelectorAll('.categorias-nav .nav-link').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.categorias-nav .nav-link').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            categoriaActual = e.target.dataset.categoria;
            UIManager.renderizarSeries(categoriaActual);
        });
    });

    // Formulario de serie
    document.getElementById('formSerie').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarSerie();
    });

    // Cambio de categoría en el formulario
    document.getElementById('categoria').addEventListener('change', (e) => {
        actualizarCamposExtras(e.target.value);
    });
}

// Abrir modal para agregar nueva serie
function abrirModalAgregar() {
    document.getElementById('modalTitulo').textContent = 'Nueva Serie';
    document.getElementById('formSerie').reset();
    document.getElementById('serieId').value = '';
    document.getElementById('categoria').value = categoriaActual;
    actualizarCamposExtras(categoriaActual);
    modalSerie.show();
}

// Editar serie existente
async function editarSerie(id) {
    try {
        const doc = await seriesRef.doc(id).get();
        if (doc.exists) {
            const serie = doc.data();
            document.getElementById('modalTitulo').textContent = 'Editar Serie';
            document.getElementById('serieId').value = id;
            document.getElementById('titulo').value = serie.titulo || '';
            document.getElementById('categoria').value = serie.categoria || '';
            document.getElementById('portada').value = serie.portada || '';
            
            actualizarCamposExtras(serie.categoria, serie);
            modalSerie.show();
        }
    } catch (error) {
        console.error('Error al cargar serie:', error);
        alert('Error al cargar la serie');
    }
}

// Actualizar campos extras según categoría
function actualizarCamposExtras(categoria, datos = {}) {
    const camposExtras = document.getElementById('camposExtras');
    
    switch(categoria) {
        case 'pendiente_estreno':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Fecha de Estreno (Opcional)</label>
                    <input type="date" class="form-control bg-dark text-white" id="fechaEstreno" 
                           value="${datos.fecha_estreno ? datos.fecha_estreno.split('T')[0] : ''}">
                </div>
            `;
            break;
            
        case 'en_emision':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Fecha de Estreno *</label>
                    <input type="date" class="form-control bg-dark text-white" id="fechaEstreno" required
                           value="${datos.fecha_estreno ? datos.fecha_estreno.split('T')[0] : ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Total de Capítulos *</label>
                    <input type="number" class="form-control bg-dark text-white" id="totalCapitulos" 
                           min="1" required value="${datos.total_capitulos || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Días de Emisión *</label>
                    <div class="dias-emision" id="diasEmision">
                        ${['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => `
                            <span class="dia-badge ${datos.dias_emision && datos.dias_emision.includes(dia) ? 'seleccionado' : ''}" 
                                  data-dia="${dia}">${dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
            
            document.querySelectorAll('.dia-badge').forEach(badge => {
                badge.addEventListener('click', () => {
                    badge.classList.toggle('seleccionado');
                });
            });
            break;
            
        case 'vistas':
            camposExtras.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Calificación</label>
                    <div class="rating">
                        ${[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(valor => `
                            <input type="radio" name="calificacion" value="${valor}" 
                                   id="star${valor}" ${datos.calificacion === valor ? 'checked' : ''}>
                            <label for="star${valor}">★</label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
            
        default:
            camposExtras.innerHTML = '';
    }
}

// Guardar serie
async function guardarSerie() {
    const id = document.getElementById('serieId').value;
    const titulo = document.getElementById('titulo').value;
    const categoria = document.getElementById('categoria').value;
    const portada = document.getElementById('portada').value;
    
    if (!titulo) {
        alert('El título es obligatorio');
        return;
    }
    
    const datos = {
        titulo,
        categoria,
        portada
    };
    
    switch(categoria) {
        case 'pendiente_estreno':
            const fechaEstrenoPE = document.getElementById('fechaEstreno')?.value;
            if (fechaEstrenoPE) datos.fecha_estreno = fechaEstrenoPE;
            break;
            
        case 'en_emision':
            datos.fecha_estreno = document.getElementById('fechaEstreno').value;
            datos.total_capitulos = parseInt(document.getElementById('totalCapitulos').value);
            datos.dias_emision = Array.from(document.querySelectorAll('.dia-badge.seleccionado'))
                .map(badge => badge.dataset.dia);
            
            if (!datos.fecha_estreno || !datos.total_capitulos || datos.dias_emision.length === 0) {
                alert('Todos los campos son obligatorios para series en emisión');
                return;
            }
            break;
            
        case 'vistas':
            const calificacion = document.querySelector('input[name="calificacion"]:checked');
            if (calificacion) datos.calificacion = parseFloat(calificacion.value);
            break;
    }
    
    try {
        let resultado;
        if (id) {
            resultado = await SeriesManager.actualizarSerie(id, datos);
        } else {
            resultado = await SeriesManager.agregarSerie(datos);
        }
        
        if (resultado) {
            modalSerie.hide();
            UIManager.renderizarSeries(categoriaActual);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la serie');
    }
}

// Ver checklist
function verChecklist(id) {
    UIManager.mostrarChecklist(id);
}

// Eliminar serie
async function eliminarSerie(id) {
    if (confirm('¿Estás seguro de eliminar esta serie?')) {
        try {
            await SeriesManager.eliminarSerie(id);
            UIManager.renderizarSeries(categoriaActual);
        } catch (error) {
            alert('Error al eliminar la serie');
        }
    }
}

// Ver detalle de serie
function verDetalleSerie(id) {
    // Funcionalidad futura
}
