// Gestor de Imágenes y Portadas
class ImageManager {
    // Detectar servicio de origen de la URL
    static detectarServicio(url) {
        if (!url) return null;
        
        for (const [key, service] of Object.entries(IMAGE_SERVICES)) {
            if (service.pattern.test(url)) {
                return { id: key, ...service };
            }
        }
        return { id: 'unknown', name: 'Desconocido', pattern: null, icon: 'fas fa-question' };
    }

    // Convertir URL a enlace directo según el servicio
    static convertirAEnlaceDirecto(url) {
        if (!url) return '';
        
        const servicio = this.detectarServicio(url);
        
        switch (servicio.id) {
            case 'drive':
                return this.convertirDriveUrl(url);
            
            case 'imgur':
                return this.convertirImgurUrl(url);
            
            case 'cloudinary':
                return url; // Cloudinary ya proporciona URLs directas
            
            case 'direct':
                return url; // Ya es una URL directa
            
            default:
                // Intentar detectar si es una URL de imagen por extensión
                if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
                    return url;
                }
                return url;
        }
    }

    // Convertir URL de Google Drive
    static convertirDriveUrl(url) {
        let id = null;
        
        // Formato: /file/d/ID/view
        const matchFile = url.match(/\/file\/d\/([^\/]+)/);
        if (matchFile) id = matchFile[1];
        
        // Formato: open?id=ID
        const matchOpen = url.match(/open\?id=([^&]+)/);
        if (matchOpen) id = matchOpen[1];
        
        // Formato: uc?id=ID
        const matchUc = url.match(/uc\?id=([^&]+)/);
        if (matchUc) id = matchUc[1];
        
        if (id) {
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }
        
        return url;
    }

    // Convertir URL de Imgur
    static convertirImgurUrl(url) {
        // Si ya es i.imgur.com, es directo
        if (url.includes('i.imgur.com')) return url;
        
        // Extraer ID de imgur.com/ID
        const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
        if (match) {
            return `https://i.imgur.com/${match[1]}.jpg`;
        }
        
        return url;
    }

    // Validar si una URL es accesible
    static async validarUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            setTimeout(() => resolve(false), 5000); // Timeout de 5 segundos
        });
    }

    // Generar placeholder personalizado
    static generarPlaceholder(titulo = 'Sin Portada', color = '#667eea') {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                    </filter>
                </defs>
                <rect width="400" height="600" fill="url(#grad)"/>
                <circle cx="200" cy="250" r="80" fill="rgba(255,255,255,0.1)"/>
                <text x="200" y="270" font-size="80" text-anchor="middle" fill="white" opacity="0.7">📺</text>
                <text x="200" y="370" font-size="22" text-anchor="middle" fill="white" font-weight="bold" filter="url(#shadow)">${titulo}</text>
                <text x="200" y="400" font-size="16" text-anchor="middle" fill="white" opacity="0.8">Sin portada</text>
                <rect x="50" y="440" width="300" height="45" rx="22.5" fill="rgba(255,255,255,0.2)"/>
                <text x="200" y="468" font-size="15" text-anchor="middle" fill="white">📷 Agregar imagen</text>
            </svg>
        `;
        
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    // Obtener portada final (con manejo de errores)
    static async obtenerPortada(url, titulo) {
        // Si no hay URL, devolver placeholder
        if (!url || url.trim() === '') {
            return {
                url: this.generarPlaceholder(titulo),
                esPlaceholder: true
            };
        }
        
        // Convertir a enlace directo
        const urlDirecta = this.convertirAEnlaceDirecto(url);
        
        // Validar URL (opcional, puede desactivarse para mejorar rendimiento)
        const esValida = await this.validarUrl(urlDirecta);
        
        if (esValida) {
            return {
                url: urlDirecta,
                esPlaceholder: false,
                servicio: this.detectarServicio(url)
            };
        } else {
            // Si la URL no es válida, mostrar placeholder con aviso
            return {
                url: this.generarPlaceholder(titulo, '#e74c3c'),
                esPlaceholder: true,
                error: 'URL no válida o inaccesible'
            };
        }
    }

    // Procesar múltiples portadas (para futura galería)
    static async procesarPortadas(urls, titulo) {
        const resultados = [];
        
        for (const url of urls) {
            const resultado = await this.obtenerPortada(url, titulo);
            resultados.push(resultado);
        }
        
        return resultados;
    }
}

console.log('🖼️ ImageManager cargado correctamente');
