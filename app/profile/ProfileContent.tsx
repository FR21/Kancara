"use client";

import { useMessages } from "@/lib/use-messages";
import { auth, storage, db } from "@/lib/firebase/client";
import { removeSession, createSession } from "@/lib/auth/session";
import { signOut, updateProfile, signInWithCustomToken } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, LogOut, Mail, Hash, Edit2, Check, X, Camera, Loader2, Globe, Calendar, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function ProfileContent({ user, customToken }: { user: { email?: string; uid: string; name?: string; picture?: string }, customToken?: string }) {
  const t = useMessages("profile");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Auth States
  const [name, setName] = useState(user.name || "");
  const [photo, setPhoto] = useState(user.picture || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Firestore States
  const [username, setUsername] = useState("");
  const [nationality, setNationality] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadFirestoreData() {
      try {
        if (!customToken) {
          console.warn("customToken is missing. Server component might need a hard refresh.");
        }
        if (!auth.currentUser && customToken) {
          await signInWithCustomToken(auth, customToken);
        }
        
        // Ensure auth state is ready
        if (auth.currentUser) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUsername(data.username || "");
            setNationality(data.nationality || "");
            setAge(data.age || "");
            setGender(data.gender || "");
          }
        } else {
          console.warn("User is not authenticated on the client. Cannot load firestore data.");
        }
      } catch (err) {
        console.error("Failed to load firestore data", err);
      } finally {
        setDataLoading(false);
      }
    }
    loadFirestoreData();
  }, [user.uid, customToken]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await removeSession();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError("Harap pilih file gambar (JPG/PNG).");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Ukuran gambar maksimal 2MB.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not found");

      let newPhotoUrl = photo;

      if (selectedFile) {
        const fileRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
        await uploadBytes(fileRef, selectedFile);
        newPhotoUrl = await getDownloadURL(fileRef);
      }
      
      // Update Firebase Auth
      await updateProfile(currentUser, { 
        displayName: name, 
        photoURL: newPhotoUrl || null 
      });
      
      // Update Firestore
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, {
        username: username,
        nationality: nationality,
        age: age,
        gender: gender,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Refresh Session
      const idToken = await currentUser.getIdToken(true);
      const sessionResult = await createSession(idToken);
      
      if (sessionResult.success) {
        setSuccess(t.success);
        setIsEditing(false);
        setPhoto(newPhotoUrl);
        router.refresh();
      } else {
        setError(sessionResult.error || t.error);
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error & { code?: string }).code?.includes("permission-denied") || (err as Error & { code?: string }).code === "storage/unauthorized" 
        ? "Gagal menyimpan. Pastikan aturan (Rules) Firestore & Storage di Firebase Console sudah diizinkan untuk Anda."
        : t.error);
    } finally {
      setLoading(false);
    }
  };

  const displayPhoto = previewUrl || photo || user.picture;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-heading font-bold text-text">{t.title}</h1>
          <p className="mt-2 text-body text-text-muted">{t.subtitle}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {/* Header / Avatar Section */}
        <div className="border-b border-border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full sm:w-auto">
            
            <div className="relative group">
              <div className={`relative flex h-20 w-20 sm:h-16 sm:w-16 overflow-hidden items-center justify-center rounded-full bg-primary-subtle text-primary shrink-0 border-2 border-transparent transition-colors ${isEditing ? "group-hover:border-primary cursor-pointer" : ""}`}
                   onClick={() => isEditing && fileInputRef.current?.click()}
              >
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Profile" className="object-cover w-full h-full" />
                ) : (
                  <User className="h-8 w-8" />
                )}
                
                {isEditing && (
                  <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              {isEditing && (
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />
              )}
            </div>

            <div className="text-center sm:text-left mt-2 sm:mt-0">
              <h2 className="text-h3 font-heading font-semibold text-text line-clamp-1 break-all">
                {user.name || user.email?.split("@")[0] || "User"}
              </h2>
              <p className="text-body-sm text-primary font-medium">{username ? username : "Member"}</p>
              {isEditing && (
                <p className="mt-1 text-xs text-text-muted sm:hidden">
                  Ketuk foto untuk mengubah
                </p>
              )}
            </div>
          </div>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              disabled={dataLoading}
              className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-md bg-surface-muted px-4 text-label text-text transition-[background-color,color,scale] hover:bg-surface-active active:scale-95 shrink-0 disabled:opacity-50"
            >
              {dataLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
              <span>{t.editProfile}</span>
            </button>
          )}
        </div>

        {/* Form / Details Section */}
        <div className="p-6">
          {error && (
            <div className="mb-6 rounded-md bg-error-subtle p-4">
              <p className="text-body-sm font-medium text-on-error-subtle">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-md bg-success-subtle p-4">
              <p className="text-body-sm font-medium text-on-success-subtle">{success}</p>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-label-sm font-medium text-text">
                    {t.nameLabel}
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="mt-2 block w-full rounded-md border border-border-strong bg-background py-3 px-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-label-sm font-medium text-text">
                    {t.usernameLabel || "Username"}
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="mt-2 block w-full rounded-md border border-border-strong bg-background py-3 px-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                    placeholder={t.usernamePlaceholder || "@johndoe"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="nationality" className="block text-label-sm font-medium text-text">
                    {t.nationalityLabel || "Nationality"}
                  </label>
                  <input
                    id="nationality"
                    type="text"
                    className="mt-2 block w-full rounded-md border border-border-strong bg-background py-3 px-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                    placeholder={t.nationalityPlaceholder}
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="age" className="block text-label-sm font-medium text-text">
                      {t.ageLabel || "Age"}
                    </label>
                    <input
                      id="age"
                      type="number"
                      className="mt-2 block w-full rounded-md border border-border-strong bg-background py-3 px-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                      placeholder={t.agePlaceholder}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-label-sm font-medium text-text">
                      {t.genderLabel || "Gender"}
                    </label>
                    <select
                      id="gender"
                      className="mt-2 block w-full rounded-md border border-border-strong bg-background py-3 px-3 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">{t.genderOptions?.none || "Select Gender"}</option>
                      <option value="male">{t.genderOptions?.male || "Male"}</option>
                      <option value="female">{t.genderOptions?.female || "Female"}</option>
                      <option value="other">{t.genderOptions?.other || "Other"}</option>
                      <option value="preferNotToSay">{t.genderOptions?.preferNotToSay || "Prefer not to say"}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(user.name || "");
                    setPhoto(user.picture || "");
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setError("");
                  }}
                  disabled={loading}
                  className="inline-flex h-12 sm:h-10 items-center justify-center gap-2 rounded-md bg-surface px-4 text-label text-text border border-border transition-[background-color,color,scale] hover:bg-surface-muted active:scale-95"
                >
                  <X className="h-4 w-4" />
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 sm:h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-label text-on-primary shadow-sm transition-[background-color,color,scale] hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {loading ? t.saving : t.saveButton}
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-2 text-label-sm font-medium text-text-muted">
                  <User className="h-4 w-4" />
                  {t.nameLabel}
                </dt>
                <dd className="mt-2 text-body font-medium text-text">
                  {user.name || "-"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-label-sm font-medium text-text-muted">
                  <Hash className="h-4 w-4" />
                  {t.usernameLabel || "Username"}
                </dt>
                <dd className="mt-2 text-body font-medium text-text">
                  {username || "-"}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-label-sm font-medium text-text-muted">
                  <Globe className="h-4 w-4" />
                  {t.nationalityLabel || "Nationality"}
                </dt>
                <dd className="mt-2 text-body font-medium text-text">
                  {nationality || "-"}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="flex items-center gap-2 text-label-sm font-medium text-text-muted">
                    <Calendar className="h-4 w-4" />
                    {t.ageLabel || "Age"}
                  </dt>
                  <dd className="mt-2 text-body font-medium text-text">
                    {age || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-label-sm font-medium text-text-muted">
                    <UserIcon className="h-4 w-4" />
                    {t.genderLabel || "Gender"}
                  </dt>
                  <dd className="mt-2 text-body font-medium text-text capitalize">
                    {gender ? t.genderOptions?.[gender as keyof typeof t.genderOptions] || gender : "-"}
                  </dd>
                </div>
              </div>
              <div className="sm:col-span-2 border-t border-border pt-6 mt-2">
                <dt className="flex items-center gap-2 text-label-sm font-medium text-text-muted">
                  <Mail className="h-4 w-4" />
                  {t.emailLabel}
                </dt>
                <dd className="mt-2 text-body font-medium text-text">
                  {user.email || "-"}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-surface-muted p-6 flex justify-end gap-4">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto inline-flex h-12 sm:h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-label text-error transition-[background-color,color,scale] hover:bg-error-subtle active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            {t.logoutButton}
          </button>
        </div>
      </div>
    </div>
  );
}
