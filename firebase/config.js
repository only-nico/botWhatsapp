// Importa las funciones que necesitas desde el SDK de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAM1PpSGWz7gWSp70Dmnn3ZOqD5GwgpLEE",
  authDomain: "fir-1-38912.firebaseapp.com",
  databaseURL: "https://fir-1-38912-default-rtdb.firebaseio.com",
  projectId: "fir-1-38912",
  storageBucket: "fir-1-38912.appspot.com",
  messagingSenderId: "541488014443",
  appId: "1:541488014443:web:694f6a0cb4cb532a04bd2e",
  measurementId: "G-GWSFHKHTYM"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exporta los módulos necesarios
export { app, db };
