import type { ReactNode } from "react";
import { StepSidebar } from "@/components/dashboard/step-sidebar";
import { AdminGuard } from "@/components/auth/admin-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard><div className="flex min-h-screen">
      <StepSidebar />
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div></AdminGuard>
  );
}
