"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";

const SESSION_COOKIE_NAME = "session";
// 14 days in milliseconds
const EXPIRES_IN = 1000 * 60 * 60 * 24 * 14;

export async function createSession(idToken: string) {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN,
    });
    
    // Signing in makes sure the person has a row and a workspace in the database. The module is loaded here
    // because it imports this file in turn.
    const decodedIdToken = await adminAuth.verifyIdToken(idToken);
    const { ensureAccount } = await import("@/lib/account");
    await ensureAccount({
      uid: decodedIdToken.uid,
      email: decodedIdToken.email,
      name: typeof decodedIdToken.name === "string" ? decodedIdToken.name : null,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: EXPIRES_IN,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating session:", error);
    return { success: false, error: "Gagal membuat sesi." };
  }
}

export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch {
    return null;
  }
}
