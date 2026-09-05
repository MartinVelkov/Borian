"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import { auth } from "@/lib/firebase";
import {
  getCategories,
  getPublishedTournaments,
  submitTeamRegistration,
} from "@/lib/firestore-service";

import type { Category, Tournament } from "@/lib/types";

export default function PlayerPage() {
  const router = useRouter();
  const { user, player, loading } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Проверка дали потребителят е логнат
  // и дали профилът му е завършен
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (!loading && user && !player?.profileCompleted) {
      router.replace("/complete-profile");
    }
  }, [loading, user, player, router]);

  // Зареждане на публикуваните турнири
  useEffect(() => {
    void getPublishedTournaments()
      .then((items) => {
        const open = items.filter((item) => item.registrationOpen);

        setTournaments(open);
        setTournamentId(open[0]?.id ?? "");
      })
      .catch((error) => {
        console.error("Error loading tournaments:", error);
        setMessage("Неуспешно зареждане на турнирите.");
      });
  }, []);

  // Зареждане на категориите според избрания турнир
  useEffect(() => {
    if (!tournamentId) {
      setCategories([]);
      setCategoryId("");
      return;
    }

    void getCategories(tournamentId)
      .then((items) => {
        const open = items.filter(
          (item) => item.registrationOpen !== false
        );

        setCategories(open);
        setCategoryId(open[0]?.id ?? "");
      })
      .catch((error) => {
        console.error("Error loading categories:", error);
        setCategories([]);
        setCategoryId("");
        setMessage("Неуспешно зареждане на категориите.");
      });
  }, [tournamentId]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    // ВАЖНО:
    // Запазваме form reference преди await,
    // защото след await event.currentTarget може да е null.
    const form = event.currentTarget;

    const formData = new FormData(form);

    const teamName = String(
      formData.get("teamName") ?? ""
    ).trim();

    if (!tournamentId) {
      setMessage("Избери турнир.");
      return;
    }

    if (!categoryId) {
      setMessage("Избери категория.");
      return;
    }

    if (!teamName) {
      setMessage("Въведи име на отбора.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await submitTeamRegistration({
        tournamentId,
        categoryId,
        captainUid: user.uid,
        teamName,
      });

      setMessage(
        "Заявката е изпратена и очаква одобрение."
      );

      // Поправката е тук:
      form.reset();
    } catch (error) {
      console.error("Team registration error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Заявката не може да бъде изпратена."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !player?.profileCompleted) {
    return (
      <main className="p-10 text-center">
        Зареждане...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Профил */}
        <Card>
          <CardHeader>
            <CardTitle>{player.displayName}</CardTitle>

            <CardDescription>
              {player.email} · {player.phone}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut(auth);
                router.replace("/");
              }}
            >
              Изход
            </Button>
          </CardContent>
        </Card>

        {/* Регистрация за турнир */}
        <Card>
          <CardHeader>
            <CardTitle>
              Регистрация за турнир
            </CardTitle>

            <CardDescription>
              Създай заявка за отбор. Отборът влиза в
              програмата едва след администраторско одобрение.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {tournaments.length === 0 ? (
              <p className="text-muted-foreground">
                Няма публикувани турнири с отворена
                регистрация.
              </p>
            ) : (
              <form
                onSubmit={register}
                className="space-y-4"
              >
                {/* Турнир */}
                <div className="space-y-2">
                  <Label htmlFor="tournament">
                    Турнир
                  </Label>

                  <Select
                    id="tournament"
                    value={tournamentId}
                    onChange={(event) => {
                      setTournamentId(event.target.value);
                      setMessage("");
                    }}
                  >
                    {tournaments.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Категория */}
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Категория
                  </Label>

                  <Select
                    id="category"
                    value={categoryId}
                    onChange={(event) => {
                      setCategoryId(event.target.value);
                      setMessage("");
                    }}
                    disabled={categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">
                        Няма отворени категории
                      </option>
                    ) : (
                      categories.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      ))
                    )}
                  </Select>
                </div>

                {/* Име на отбора */}
                <div className="space-y-2">
                  <Label htmlFor="teamName">
                    Име на отбора
                  </Label>

                  <Input
                    id="teamName"
                    name="teamName"
                    placeholder="Например: Street Kings"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    saving ||
                    !tournamentId ||
                    !categoryId
                  }
                >
                  {saving
                    ? "Изпращане..."
                    : "Изпрати заявка"}
                </Button>
              </form>
            )}

            {message && (
              <p className="mt-4 text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}