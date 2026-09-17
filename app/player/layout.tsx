import type { ReactNode } from "react";
import { AuthRouteGuard } from "@/components/auth/admin-guard";

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <AuthRouteGuard route="/player">{children}</AuthRouteGuard>;
}
