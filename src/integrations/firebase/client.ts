import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

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
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}
