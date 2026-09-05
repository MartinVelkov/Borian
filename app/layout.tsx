import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";

export const metadata: Metadata = {
  title: "3x3 Футбол Мениджър",
  description: "Уеб базиран мениджър за 3x3 футболни турнири.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
