"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";

import logo from "../bulgarian-street-sports-logo.jpg";

import { useAuth } from "@/components/auth/auth-provider";
import { PublicTournamentCard } from "@/components/tournament/public-tournament-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getHomeRoute } from "@/lib/auth-routing";
import {
  getCategories,
  getPublishedTournaments,
} from "@/lib/firestore-service";
import type { Category, MatchSport, Tournament } from "@/lib/types";

export default function SchoolChampionshipPage() {
  const { user, player } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Record<string, Category[]>>({});
  const [activeSport, setActiveSport] = useState<MatchSport>("FOOTBALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const published = await getPublishedTournaments();
        const schoolTournaments = published.filter(
          (tournament) => tournament.type === "school",
        );
        setTournaments(schoolTournaments);

        const pairs = await Promise.all(
          schoolTournaments.map(
            async (tournament) =>
              [tournament.id, await getCategories(tournament.id)] as const,
          ),
        );
        setCategories(Object.fromEntries(pairs));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Училищните турнири не могат да бъдат заредени.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const accountHref = !user
    ? "/register"
    : getHomeRoute(user.email, player?.profileCompleted === true);

  const visibleTournaments = useMemo(
    () =>
      tournaments.filter((tournament) => tournament.sport === activeSport),
    [activeSport, tournaments],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f5f7] text-[#1d1d1f]">
      <header className="sticky top-0 z-50 border-b border-black/[0.04] bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Bulgarian Street Sports"
              width={44}
              height={44}
              className="h-10 w-10 object-contain"
              priority
            />
            <span className="hidden text-[13px] font-bold tracking-tight sm:block">
              Bulgarian Street Sports
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Начало</span>
              </Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-[#0071e3] px-5 text-white shadow-none hover:bg-[#0077ed]"
            >
              <Link href={accountHref}>{user ? "Моят профил" : "Регистрация"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#10291d] px-5 py-24 text-white md:px-8 md:py-36">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/15 blur-[130px]" />
        <div className="relative mx-auto max-w-[1000px] text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 ring-1 ring-white/15">
            <GraduationCap className="h-11 w-11" />
          </div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
            Bulgarian Street Sports
          </p>
          <h1 className="text-[48px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[64px] md:text-[82px]">
            Ученическо
            <br />
            първенство
          </h1>
          <p className="mx-auto mt-7 max-w-[650px] text-[18px] leading-relaxed text-white/65 md:text-[21px]">
            Турнири за училищни отбори, млади таланти и следващото поколение
            шампиони.
          </p>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 flex flex-col items-center justify-between gap-7 text-center md:flex-row md:text-left">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
                Училищни турнири
              </p>
              <h2 className="text-[38px] font-semibold tracking-[-0.04em] md:text-[56px]">
                Избери своя спорт.
              </h2>
            </div>

            <div className="flex rounded-full bg-[#e8e8ed] p-[5px]">
              {(["FOOTBALL", "BASKETBALL"] as const).map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setActiveSport(sport)}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition-all sm:px-6 ${
                    activeSport === sport
                      ? "bg-white text-black shadow-sm"
                      : "text-black/50 hover:text-black"
                  }`}
                >
                  {sport === "FOOTBALL" ? "⚽ Футбол" : "🏀 Баскетбол"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <SchoolTournamentsSkeleton />
          ) : error ? (
            <div role="alert" className="rounded-[32px] bg-white p-10 text-center text-red-600">
              {error}
            </div>
          ) : visibleTournaments.length === 0 ? (
            <div className="rounded-[38px] bg-white px-8 py-24 text-center md:py-32">
              <div className="mb-7 text-[82px]">
                {activeSport === "FOOTBALL" ? "⚽" : "🏀"}
              </div>
              <h3 className="text-[30px] font-semibold tracking-[-0.035em]">
                Очаквайте скоро.
              </h3>
              <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-relaxed text-[#6e6e73]">
                В момента няма публикувани училищни турнири за този спорт.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {visibleTournaments.map((tournament, index) => (
                <PublicTournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  categories={categories[tournament.id]?.length ?? 0}
                  accountHref={accountHref}
                  isLoggedIn={Boolean(user)}
                  profileCompleted={player?.profileCompleted}
                  featured={index === 0}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-4 border-t border-black/10 pt-8 text-xs text-[#6e6e73] sm:flex-row">
          <p>© {new Date().getFullYear()} Bulgarian Street Sports.</p>
          <Link href="/" className="transition hover:text-black">
            Всички стандартни турнири
          </Link>
        </div>
      </footer>
    </main>
  );
}

function SchoolTournamentsSkeleton() {
  return (
    <div className="space-y-7">
      <Skeleton className="h-[620px] rounded-[38px]" />
      <Skeleton className="h-[160px] rounded-[32px]" />
    </div>
  );
}
