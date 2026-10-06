import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { isCountryCode } from "./countries";

export async function loadVisited(uid: string, customToken?: string): Promise<string[]> {
  if (!auth.currentUser && customToken) await signInWithCustomToken(auth, customToken);
  if (!auth.currentUser) throw new Error("Not signed in");
  const snapshot = await getDoc(doc(db, "users", uid));
  const stored: unknown = snapshot.data()?.visitedCountries;
  return Array.isArray(stored) ? stored.filter(isCountryCode) : [];
}

export async function saveVisited(uid: string, codes: string[]): Promise<void> {
  if (!auth.currentUser) throw new Error("Not signed in");
  await setDoc(
    doc(db, "users", uid),
    { visitedCountries: codes, visitedUpdatedAt: new Date().toISOString() },
    { merge: true },
  );
}
