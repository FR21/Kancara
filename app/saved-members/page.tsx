import { redirect } from "next/navigation";

export default function SavedMembersRedirectPage() {
  redirect("/profile/saved-members");
}
