import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtBfUkMGlHPkLNv41Mfz9IXRMu9xm5kgk",
  authDomain: "songlin-7f563.firebaseapp.com",
  projectId: "songlin-7f563",
  storageBucket: "songlin-7f563.firebasestorage.app",
  messagingSenderId: "732508622635",
  appId: "1:732508622635:web:e698e19ebed37097b97f6e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
window.fsDoc = doc;
window.fsGetDoc = getDoc;
window.fsSetDoc = setDoc;
window.fsDeleteDoc = deleteDoc;
window.fsCollection = collection;
window.fsOnSnapshot = onSnapshot;

window.dispatchEvent(new Event('firebase-init'));