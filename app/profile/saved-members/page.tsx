import type { Metadata } from "next";
import SavedMembersWorkspace from "@/components/saved-members/SavedMembersWorkspace";
import { requestLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const title =
    locale === "id"
      ? "Profil Anggota Tersimpan - Kancara"
      : "Saved Member Profiles - Kancara";
  const description =
    locale === "id"
      ? "Simpan kebutuhan dan preferensi anggota rombongan untuk perjalanan berikutnya tanpa wawancara ulang."
      : "Save members' needs and preferences for future journeys without repeating the interview.";
  return {
    title,
    description,
  };
}

export default function ProfileSavedMembersPage() {
  return (
    <main className="relative isolate flex-1 pt-28 pb-16 lg:pt-32">
      <SavedMembersWorkspace />
    </main>
  );
}
