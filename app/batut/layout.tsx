import type { ReactNode } from "react";
import { AuthRouteGuard } from "@/components/auth/admin-guard";

export default function BatutLayout({ children }: { children: ReactNode }) {
  return <AuthRouteGuard route="/batut">{children}</AuthRouteGuard>;
}
