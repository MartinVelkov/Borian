"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          router.push("/dashboard");
        }
      })
      .catch(() => {
        setError("Неуспешен Google вход.");
      });
  }, [router]);

  async function finish(_uid: string) {
    // Временно не пренасочваме към /player или /complete-profile.
    router.push("/dashboard");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true); setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, String(data.get("email")), String(data.get("password")));
      await finish(result.user.uid);
    } catch (error) { setError(authErrorMessage(error)); } finally { setLoading(false); }
  }

  async function googleLogin() {
    setLoading(true); setError("");
    try {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        await finish(result.user.uid);
      } catch (error: any) {
        if (error?.code === "auth/popup-blocked") {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw error;
      }
    } catch (error) { setError(authErrorMessage(error)); } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Вход</CardTitle><CardDescription>Влез в своя играчки профил.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <Button type="button" variant="outline" className="w-full" onClick={googleLogin} disabled={loading}>Продължи с Google</Button>
        <div className="border-t" />
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="email">Имейл</Label><Input id="email" name="email" type="email" required disabled={loading} /></div>
          <div className="space-y-2"><Label htmlFor="password">Парола</Label><Input id="password" name="password" type="password" required disabled={loading} /></div>
          {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "Влизане..." : "Влез"}</Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">Нямаш профил? <Link className="font-semibold text-primary" href="/register">Регистрирай се</Link></p>
      </CardContent>
    </Card>
  </main>;
}
