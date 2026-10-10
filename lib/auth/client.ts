import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "./session";

export type AuthErrorKey =
  | "invalidCredentials"
  | "emailInUse"
  | "weakPassword"
  | "invalidEmail"
  | "tooManyRequests"
  | "network"
  | "default";

const ERROR_KEYS: Record<string, AuthErrorKey> = {
  "auth/invalid-credential": "invalidCredentials",
  "auth/wrong-password": "invalidCredentials",
  "auth/user-not-found": "invalidCredentials",
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/invalid-email": "invalidEmail",
  "auth/too-many-requests": "tooManyRequests",
  "auth/network-request-failed": "network",
};

const DISMISSED = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function authErrorCode(caught: unknown): string {
  return caught instanceof FirebaseError ? caught.code : "unknown";
}

export function authErrorKey(caught: unknown): AuthErrorKey | null {
  const code = authErrorCode(caught);
  if (DISMISSED.has(code)) return null;
  return ERROR_KEYS[code] ?? "default";
}

export async function startSession(user: User): Promise<boolean> {
  const idToken = await user.getIdToken(true);
  const session = await createSession(idToken);
  if (!session.success) return false;
  await auth.signOut();
  return true;
}

export async function signInWithGoogle(): Promise<boolean> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return startSession(credential.user);
}
