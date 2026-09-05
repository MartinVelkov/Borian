"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { TournamentBracketView } from "@/components/tournament/tournament-bracket-view";
import { getCategories, getMatches, getTournaments } from "@/lib/firestore-service";
import type { Category, Match, Tournament } from "@/lib/types";

export default function PrintBracketPage() {
  const searchParams = useSearchParams();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const tournamentId = searchParams.get("tournamentId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === tournamentId) ?? null,
    [tournamentId, tournaments],
  );

  useEffect(() => {
    async function load() {
      if (!tournamentId) {
        setLoading(false);
        setMessage("Липсва турнир.");
        return;
      }

      try {
        setLoading(true);
        const [nextTournaments, nextMatches, nextCategories] = await Promise.all([
          getTournaments(),
          getMatches(tournamentId),
          getCategories(tournamentId),
        ]);

        setTournaments(nextTournaments);
        setCategories(nextCategories);
        setMatches(categoryId ? nextMatches.filter((match) => match.categoryId === categoryId) : nextMatches);
      } catch (error) {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "Неуспешно зареждане на схемата.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [tournamentId, categoryId]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? null,
    [categories, categoryId],
  );

  return (
    <main className="min-h-screen bg-white p-6 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:mx-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none print:p-4">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Турнирна схема
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {selectedTournament?.name ?? "Турнирна схема"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {selectedCategory ? `Категория: ${selectedCategory.name}` : "Всички категории"}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <Trophy className="h-6 w-6 text-slate-700" />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-600">
            Зареждане на схемата...
          </div>
        ) : message ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        ) : selectedTournament ? (
          <div className="overflow-x-auto">
            <TournamentBracketView
              tournament={selectedTournament}
              matches={matches}
              title={selectedTournament.name}
              description={selectedCategory ? `Схема за ${selectedCategory.name}` : "Схема за турнира"}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            Няма избран турнир.
          </div>
        )}
      </div>
    </main>
  );
}
