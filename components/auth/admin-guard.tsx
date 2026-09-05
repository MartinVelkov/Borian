"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Временно премахваме блокировката за админ достъп.
    if (!loading && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Проверка на достъпа...</div>;
  }

  return <>{children}</>;
}
