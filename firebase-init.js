// Firebase設定ファイル
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase設定 (本番用の値を設定)
const firebaseConfig = {
  apiKey: "AIzaSyBKXW3sxA4dI7uQM-pCzZF98my5xgEJvOk",
  authDomain: "condate-cd2bb.firebaseapp.com",
  projectId: "condate-cd2bb",
  storageBucket: "condate-cd2bb.firebasestorage.app",
  messagingSenderId: "257424801062",
  appId: "1:257424801062:web:4c1c0c90f9a6fef67515e7",
  measurementId: "G-83MBXLP0NJ"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firestore初期化
const db = getFirestore(app);

// エクスポート
export { db };