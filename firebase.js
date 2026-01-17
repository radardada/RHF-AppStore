import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyHSaALeuwibcF22VNL_6WDlcZepcDB3A",
  authDomain: "rhf-gamestore.firebaseapp.com",
  databaseURL: "https://rhf-gamestore-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rhf-gamestore",
  storageBucket: "rhf-gamestore.firebasestorage.app",
  messagingSenderId: "52065906934",
  appId: "1:52065906934:web:c15f0eff91cc937f787cd7",
  measurementId: "G-RYFR9D5R5H"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

document.getElementById("status").innerText = "Firebase berhasil terhubung ✅";
