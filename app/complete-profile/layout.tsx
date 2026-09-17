import type { ReactNode } from "react";
import { AuthRouteGuard } from "@/components/auth/admin-guard";

export default function CompleteProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthRouteGuard route="/complete-profile">{children}</AuthRouteGuard>
  );
}
