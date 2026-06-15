// ============================================================
// AUTH.JS - Protección de rutas y manejo de sesión
// ============================================================

(function () {
    // Si no está autenticado, redirigir al login
    if (localStorage.getItem('st_auth') !== 'true') {
        window.location.href = 'index.html';
    }
})();

function cerrarSesion() {
    localStorage.removeItem('st_auth');
    localStorage.removeItem('st_user');
    window.location.href = 'index.html';
}

console.log('✅ Auth cargado');
