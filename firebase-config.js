// Firebase SDK 초기화 및 내보내기 모듈
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCopSCGhf-EsgyUduCLcg0jevsmQyoTkHU",
  authDomain: "fir-190fb.firebaseapp.com",
  projectId: "fir-190fb",
  storageBucket: "fir-190fb.firebasestorage.app",
  messagingSenderId: "429708930656",
  appId: "1:429708930656:web:9bc0591a11ab6334a41d05",
  measurementId: "G-S7S7NPBTKW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, analytics };
