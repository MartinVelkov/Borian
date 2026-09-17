"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import type { HomeRoute } from "@/lib/auth-routing";

type AuthRouteGuardProps = {
  children: React.ReactNode;
  route: HomeRoute;
};

export function AuthRouteGuard({ children, route }: AuthRouteGuardProps) {
  const router = useRouter();
  const { user, loading, homeRoute } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(route)}`);
      return;
    }

    if (homeRoute && homeRoute !== route) {
      router.replace(homeRoute);
    }
  }, [homeRoute, loading, route, router, user]);

  if (loading || !user || homeRoute !== route) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Проверка на достъпа...
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <AuthRouteGuard route="/dashboard">{children}</AuthRouteGuard>;
}
