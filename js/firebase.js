// Firebase initialization and auth helpers
// Replace the firebaseConfig object with your project values

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmrY4uDyR2hMlrT32wvi6UGTfaaG8LmoE",
  authDomain: "produco-5a2aa.firebaseapp.com",
  projectId: "produco-5a2aa",
  storageBucket: "produco-5a2aa.firebasestorage.app",
  messagingSenderId: "636576377133",
  appId: "1:636576377133:web:ee04ffda1446a4a5358ba4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup() {
  return await signInWithPopup(auth, googleProvider);
}

export async function signInWithGoogleRedirect() {
  return await signInWithRedirect(auth, googleProvider);
}

export async function emailPasswordSignIn(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function emailPasswordSignUp(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return await signOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function getUserOrders(uid) {
  // data: { userId, currency, items:[{id, name, qty, unitPriceOriginal, unitPriceConverted, currencyOriginal, currencyConverted}], subtotalOriginal, subtotalConverted }
  const ordersCol = collection(db, "orders");
  const q = query(ordersCol, where("userId", "==", uid), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export { auth, db };

// Users profile helpers
export async function upsertUserProfile(user, extra = {}) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const base = {
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    updatedAt: serverTimestamp(),
    ...extra,
  };
  if (snap.exists()) {
    await updateDoc(ref, base);
  } else {
    await setDoc(ref, { ...base, createdAt: serverTimestamp() });
  }
}

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function getUserSettings(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { preferredCurrency: 'USD', theme: 'light' };
}

export async function updateUserSettings(uid, settings) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

// Orders helpers
export async function createOrder(data) {
  const ordersCol = collection(db, "orders");
  const docRef = await addDoc(ordersCol, { ...data, createdAt: serverTimestamp(), status: data.status || 'completed' });
  return docRef.id;
}

// Preference helpers
export async function setPreferredCurrency(uid, currency) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { preferredCurrency: currency, updatedAt: serverTimestamp() }, { merge: true });
}
