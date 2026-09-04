import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  projectId: "suiit-campus-nexus-12345",
  appId: "1:79912759981:web:2d7fd67b13778891c0cc24",
  storageBucket: "suiit-campus-nexus-12345.firebasestorage.app",
  apiKey: "AIzaSyABH5KQx_x79_pClxQoEYENkw9m0u9yAA4",
  authDomain: "suiit-campus-nexus-12345.firebaseapp.com",
  messagingSenderId: "79912759981",
  projectNumber: "79912759981",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    if (err?.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Redirecting to Google Sign-In...");
    }
    throw err;
  }
}

export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}
