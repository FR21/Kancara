import { verifySession } from "@/lib/auth/session";
import ProfileContent from "./ProfileContent";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/admin";

export default async function ProfilePage() {
  const session = await verifySession();

  if (!session) {
    redirect("/login");
  }

  // Mint a custom token so the client-side Firebase SDK can authenticate in memory
  const customToken = await adminAuth.createCustomToken(session.uid);

  return (
    <main className="flex-1 pt-28 pb-16 lg:pt-32">
      <ProfileContent 
        user={{ email: session.email, uid: session.uid, name: session.name, picture: session.picture }} 
        customToken={customToken}
      />
    </main>
  );
}
