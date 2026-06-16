// Configuración de Firebase - Series Tracker
const firebaseConfig = {
  apiKey: "AIzaSyDKLUWmgqjFqhp8CBvX1IgP0qpWV2l17JY",
  authDomain: "series-tracker-a8953.firebaseapp.com",
  projectId: "series-tracker-a8953",
  storageBucket: "series-tracker-a8953.firebasestorage.app",
  messagingSenderId: "267875236634",
  appId: "1:267875236634:web:c9a397bf4b97132cf60aa3"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencia a Firestore
const db = firebase.firestore();

// Referencia a la colección de series
const seriesRef = db.collection('series');

// Configuración de servicios de imágenes soportados
const IMAGE_SERVICES = {
    drive: {
        name: 'Google Drive',
        pattern: /drive\.google\.com/,
        icon: 'fab fa-google-drive'
    },
    imgur: {
        name: 'Imgur',
        pattern: /imgur\.com/,
        icon: 'fab fa-imgur'
    },
    cloudinary: {
        name: 'Cloudinary',
        pattern: /cloudinary\.com/,
        icon: 'fas fa-cloud'
    },
    direct: {
        name: 'URL Directa',
        pattern: /\.(jpg|jpeg|png|gif|webp|svg)/i,
        icon: 'fas fa-link'
    }
};

// Configuración de automatizaciones
const AUTOMATIZACION = {
    estrenoAEmision: true,
    emisionAVistas: true
};

// Configuración de Google Calendar
const GOOGLE_CALENDAR = {
    apiKey: "AIzaSyDGipdLbS3OUcycgctqubO5rKbfEnntU08",
    email: "raquelcuellarg20@gmail.com",
    horaRecordatorio: "07:00" // 7:00 AM
};

console.log('✅ Firebase inicializado correctamente');
console.log('🖼️ Sistema de portadas configurado');
console.log('🤖 Sistema de automatización configurado');
console.log('📅 Google Calendar configurado');
