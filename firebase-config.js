// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALIhKFz4bpOPmES6t2fAdx8VMPP0ye1wc",
  authDomain: "rhf-resmi.firebaseapp.com",
  projectId: "rhf-resmi",
  storageBucket: "rhf-resmi.firebasestorage.app",
  messagingSenderId: "313439235544",
  appId: "1:313439235544:web:b19a2ad538e34c1fe516ad",
  measurementId: "G-LNCVH73P3X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
