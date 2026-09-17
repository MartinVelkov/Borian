"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/firebase";

export default function BatutPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Батут</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut(auth);
              router.replace("/login");
            }}
          >
            Изход
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
