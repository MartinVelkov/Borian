"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, RefreshCw, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TournamentBracketView } from "@/components/tournament/tournament-bracket-view";
import {
  getCategories,
  getMatches,
  getTournaments,
  listenToTournamentMatches,
} from "@/lib/firestore-service";
import type { Category, Match, Tournament } from "@/lib/types";

export function BracketViewerPanel() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [message, setMessage] = useState("");

  const selectedTournament = useMemo(
    () =>
      tournaments.find(
        (tournament) => tournament.id === selectedTournamentId,
      ) ?? null,
    [selectedTournamentId, tournaments],
  );

  async function loadTournaments() {
    setLoadingTournaments(true);
    setMessage("");

    try {
      const items = await getTournaments();
      const groupTournaments = items.filter(
        (tournament) =>
          tournament.format === "GROUP_KNOCKOUT" ||
          tournament.competitionFormat?.type === "GROUP_KNOCKOUT",
      );

      setTournaments(groupTournaments);
      setSelectedTournamentId((currentId) => {
        const stillExists = groupTournaments.some(
          (tournament) => tournament.id === currentId,
        );

        return stillExists
          ? currentId
          : groupTournaments[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Failed to load bracket tournaments:", error);
      setTournaments([]);
      setSelectedTournamentId("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на турнирите.",
      );
    } finally {
      setLoadingTournaments(false);
    }
  }

  function filterMatchesByCategory(items: Match[], categoryId: string) {
    return categoryId ? items.filter((match) => match.categoryId === categoryId) : items;
  }

  async function loadCategories(tournamentId: string) {
    if (!tournamentId) {
      setCategories([]);
      setSelectedCategoryId("");
      return;
    }

    try {
      const items = await getCategories(tournamentId);
      setCategories(items);
      setSelectedCategoryId((currentId) => {
        if (currentId && items.some((category) => category.id === currentId)) {
          return currentId;
        }

        return "";
      });
    } catch (error) {
      console.error("Failed to load bracket categories:", error);
      setCategories([]);
      setSelectedCategoryId("");
    }
  }

  async function refreshMatches() {
    if (!selectedTournamentId) {
      setMatches([]);
      return;
    }

    setLoadingMatches(true);
    setMessage("");

    try {
      const nextMatches = await getMatches(selectedTournamentId);
      setMatches(filterMatchesByCategory(nextMatches, selectedCategoryId));
    } catch (error) {
      console.error("Failed to refresh bracket matches:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно обновяване на схемата.",
      );
    } finally {
      setLoadingMatches(false);
    }
  }

  useEffect(() => {
    void loadTournaments();
  }, []);

  useEffect(() => {
    void loadCategories(selectedTournamentId);
  }, [selectedTournamentId]);

  useEffect(() => {
    setMatches([]);
    setMessage("");

    if (!selectedTournamentId) {
      return;
    }

    setLoadingMatches(true);

    const unsubscribe = listenToTournamentMatches(
      selectedTournamentId,
      (nextMatches) => {
        setMatches(filterMatchesByCategory(nextMatches, selectedCategoryId));
        setLoadingMatches(false);
      },
      (error) => {
        console.error("Bracket live listener failed:", error);
        setLoadingMatches(false);
        setMessage(
          error.message || "Неуспешно обновяване на схемата в реално време.",
        );
      },
    );

    return unsubscribe;
  }, [selectedTournamentId, selectedCategoryId]);

  const standaloneUrl = useMemo(() => {
    if (!selectedTournamentId) {
      return "";
    }

    const params = new URLSearchParams({
      tournamentId: selectedTournamentId,
    });

    if (selectedCategoryId) {
      params.set("categoryId", selectedCategoryId);
    }

    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/print/bracket?${params.toString()}`;
  }, [selectedTournamentId, selectedCategoryId]);

  function openStandaloneView() {
    if (!standaloneUrl) {
      return;
    }

    const popup = window.open(standaloneUrl, "tournament-bracket-print", "width=1100,height=1400,menubar=no,toolbar=no,location=no,status=no");

    if (popup) {
      popup.focus();
    } else {
      setMessage("Браузърът блокира изскачащия прозорец. Разреши попъп прозорците и опитай отново.");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
              <GitBranch className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>Зрителски екран — турнирна схема</CardTitle>
              <CardDescription className="mt-1">
                Групите, класирането и пътят до финала се обновяват автоматично.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="bracketViewerTournament">Турнир</Label>
            <Select
              id="bracketViewerTournament"
              value={selectedTournamentId}
              onChange={(event) =>
                setSelectedTournamentId(event.target.value)
              }
              disabled={
                loadingTournaments || tournaments.length === 0
              }
            >
              {tournaments.length === 0 && (
                <option value="">
                  Няма турнир с групи и елиминации
                </option>
              )}

              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                  {tournament.location
                    ? ` — ${tournament.location}`
                    : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="bracketViewerCategory">Категория</Label>
            <Select
              id="bracketViewerCategory"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              disabled={!selectedTournamentId || categories.length === 0}
            >
              <option value="">Всички категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedTournamentId || loadingMatches}
              onClick={() => void refreshMatches()}
            >
              {loadingMatches ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Обнови
            </Button>

            <Button
              type="button"
              disabled={!standaloneUrl}
              onClick={openStandaloneView}
            >
              Генерирай A4 QR
            </Button>
          </div>
        </CardContent>
      </Card>

      {standaloneUrl && (
        <Card className="overflow-hidden border bg-muted/10">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">QR код за чисто A4 преглеждане</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Сканирай линка, за да видиш само схемата без останалите елементи.
              </p>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(standaloneUrl)}`}
              alt="QR код за турнира"
              className="h-40 w-40 rounded-xl border bg-white p-2 shadow-sm"
            />
          </CardContent>
        </Card>
      )}

      {loadingMatches && matches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 font-medium">Зареждане на схемата...</p>
          </CardContent>
        </Card>
      ) : selectedTournament ? (
        <TournamentBracketView
          tournament={selectedTournament}
          matches={matches}
          title={selectedTournament.name}
          description="Групите, продължаващите отбори и елиминационната схема се виждат на един екран."
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <Trophy className="h-9 w-9 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Няма избран турнир</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Генерирай турнир във формат „Групи + елиминации“.
            </p>
          </CardContent>
        </Card>
      )}

      {message && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {message}
        </div>
      )}
    </div>
  );
}