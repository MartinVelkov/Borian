"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, storage } from "@/lib/firebase";
import { getHomeRoute } from "@/lib/auth-routing";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, player, loading: authLoading, refreshPlayer } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState("");
  const [birthDate, setBirthDate] = useState(player?.birthDate ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(player?.photoURL ?? null);
  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    setBirthDate(player?.birthDate ?? "");
    setPhotoPreview(player?.photoURL ?? null);
  }, [player]);

  async function uploadProfilePhoto(userId: string, file: File) {
    setPhotoUploading(true);
    try {
      const photoRef = ref(storage, `players/${userId}/${Date.now()}-${file.name}`);
      await uploadBytes(photoRef, file);
      return await getDownloadURL(photoRef);
    } finally {
      setPhotoUploading(false);
    }
  }

  function handlePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(player?.photoURL ?? null);
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    if (!firstName || !lastName || !phone) { setError("Всички полета са задължителни."); return; }
    setLoading(true); setError("");
    try {
      const displayName = `${firstName} ${lastName}`;
      let photoURL = player?.photoURL ?? user.photoURL ?? null;

      if (photoFile) {
        photoURL = await uploadProfilePhoto(user.uid, photoFile);
      }

      await updateProfile(user, { displayName });
      await setDoc(doc(db, "players", user.uid), {
        uid: user.uid, firstName, lastName, displayName, phone,
        birthDate: birthDate || null,
        email: user.email ?? "", photoURL, role: "player",
        authProviders: user.providerData.map((item) => item.providerId),
        profileCompleted: true, emailVerified: user.emailVerified,
        phoneVerified: player?.phoneVerified ?? false,
        createdAt: player?.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });
      await refreshPlayer();
      router.replace(getHomeRoute(user.email, true));
    } catch { setError("Профилът не можа да бъде запазен."); } finally { setLoading(false); }
  }

  if (authLoading || !user) return <main className="p-10 text-center">Зареждане...</main>;
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="w-full max-w-lg">
    <CardHeader><CardTitle>Завърши профила</CardTitle><CardDescription>Тези данни са задължителни за участие в отбор и турнир.</CardDescription></CardHeader>
    <CardContent><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="firstName">Име</Label><Input id="firstName" name="firstName" defaultValue={player?.firstName ?? ""} required /></div><div className="space-y-2"><Label htmlFor="lastName">Фамилия</Label><Input id="lastName" name="lastName" defaultValue={player?.lastName ?? ""} required /></div></div>
      <div className="space-y-2"><Label htmlFor="phone">Телефон</Label><Input id="phone" name="phone" type="tel" defaultValue={player?.phone ?? ""} required /></div>
      <div className="space-y-2"><Label htmlFor="birthDate">Дата на раждане</Label><Input id="birthDate" name="birthDate" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="photo">Снимка</Label><Input id="photo" name="photo" type="file" accept="image/*" onChange={handlePhotoSelection} disabled={photoUploading} /><div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">{photoPreview ? <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full border bg-muted" />}<p className="text-sm text-muted-foreground">Може да качиш снимка за профила.</p></div></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" disabled={loading || photoUploading}>{loading ? "Записване..." : "Запази профила"}</Button>
    </form></CardContent>
  </Card></main>;
}
