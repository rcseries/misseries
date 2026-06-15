// Configuración de Firebase - Series Tracker
// Proyecto: series-tracker-a8953
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

// Verificación en consola
console.log('✅ Firebase inicializado correctamente');
console.log('📦 Firestore conectado a colección: series');
