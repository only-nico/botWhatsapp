// Import the functions you need from the SDKs you need
const {initializeApp}=require("firebase/app")


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
