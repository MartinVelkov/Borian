"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, GraduationCap } from "lucide-react";

import logo from "./bulgarian-street-sports-logo.jpg";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicTournamentCard } from "@/components/tournament/public-tournament-card";

import {
  getCategories,
  getPublishedTournaments,
} from "@/lib/firestore-service";
import { getHomeRoute } from "@/lib/auth-routing";

import type { Category, Tournament } from "@/lib/types";

type Sport = "FOOTBALL" | "BASKETBALL";

export default function HomePage() {
  const router = useRouter();
  const { user, player, logout } = useAuth();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<
    Record<string, Category[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeSport, setActiveSport] =
    useState<Sport>("FOOTBALL");

  useEffect(() => {
    void (async () => {
      try {
        const items = await getPublishedTournaments();
        const standardItems = items.filter(
          (item) => (item.type ?? "standard") === "standard",
        );

        setTournaments(standardItems);

        const pairs = await Promise.all(
          standardItems.map(
            async (item) =>
              [
                item.id,
                await getCategories(item.id),
              ] as const
          )
        );

        setCategories(Object.fromEntries(pairs));
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Събитията не могат да бъдат заредени."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const accountHref = !user
    ? "/register"
    : getHomeRoute(user.email, player?.profileCompleted === true);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(
      (tournament) =>
        (tournament.type ?? "standard") === "standard" &&
        tournament.sport === activeSport
    );
  }, [tournaments, activeSport]);

  const selectSport = (
    sport: Sport,
    shouldScroll = true
  ) => {
    setActiveSport(sport);

    if (!shouldScroll) {
      return;
    }

    requestAnimationFrame(() => {
      document
        .getElementById("events")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  };

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      router.replace("/");
      router.refresh();
    } catch (cause) {
      console.error("Logout failed:", cause);
      setLogoutError(
        "Излизането не беше успешно. Моля, опитайте отново.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f5f7] text-[#1d1d1f]">
      {/* ================================================= */}
      {/* NAVIGATION                                        */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 border-b border-black/[0.04] bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src={logo}
              alt="Bulgarian Street Sports"
              width={44}
              height={44}
              className="h-10 w-10 object-contain"
              priority
            />

            <div className="hidden leading-none sm:block">
              <div className="text-[13px] font-bold tracking-tight">
                Bulgarian
              </div>

              <div className="mt-1 text-[11px] font-medium text-black/45">
                Street Sports
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium md:flex">
            <a
              href="#events"
              className="text-black/65 transition hover:text-black"
            >
              Турнири
            </a>

            <Link
              href="/school-championship"
              className="text-black/65 transition hover:text-black"
            >
              Ученическо първенство
            </Link>

            <button
              type="button"
              onClick={() =>
                selectSport("FOOTBALL")
              }
              className="text-black/65 transition hover:text-black"
            >
              Футбол
            </button>

            <button
              type="button"
              onClick={() =>
                selectSport("BASKETBALL")
              }
              className="text-black/65 transition hover:text-black"
            >
              Баскетбол
            </button>
          </nav>

          {user ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                asChild
                className="h-9 rounded-full bg-[#0071e3] px-4 text-[13px] font-medium text-white shadow-none hover:bg-[#0077ed] sm:px-5"
              >
                <Link href={accountHref}>Моят профил</Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-black/10 bg-white/80 px-3 text-[13px] font-medium text-[#1d1d1f] shadow-none hover:bg-black/[0.04] sm:px-4"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Излизане…" : "Изход"}
              </Button>
            </div>
          ) : (
            <Button
              asChild
              className="h-9 rounded-full bg-[#0071e3] px-5 text-[13px] font-medium text-white shadow-none hover:bg-[#0077ed]"
            >
              <Link href="/register">Регистрация</Link>
            </Button>
          )}
        </div>
      </header>

      {logoutError && (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-5 py-2 text-center text-sm text-red-700"
        >
          {logoutError}
        </div>
      )}

      {/* ================================================= */}
      {/* HERO                                              */}
      {/* ================================================= */}

      <section className="relative bg-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[25%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-400/15 via-blue-400/5 to-transparent blur-[120px]" />
        </div>

        <div className="relative mx-auto flex min-h-[760px] max-w-[1200px] flex-col items-center justify-center px-6 pb-16 pt-20 text-center md:min-h-[850px]">
          {/* LOGO */}

          <div className="mb-10">
            <div className="relative mx-auto flex h-[145px] w-[145px] items-center justify-center rounded-[38px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04] md:h-[170px] md:w-[170px]">
              <div className="absolute inset-0 rounded-[38px] bg-gradient-to-br from-white via-white to-[#f3f3f3]" />

              <Image
                src={logo}
                alt="Bulgarian Street Sports"
                width={145}
                height={145}
                className="relative z-10 h-[125px] w-[125px] object-contain md:h-[145px] md:w-[145px]"
                priority
              />
            </div>
          </div>

          <p className="mb-5 text-[17px] font-semibold tracking-tight text-[#f56300]">
            Bulgarian Street Sports
          </p>

          <h1 className="max-w-[950px] text-[52px] font-semibold leading-[0.97] tracking-[-0.055em] sm:text-[68px] md:text-[88px] lg:text-[104px]">
            Street sport.
            <br />

            <span className="bg-gradient-to-r from-[#ff7a00] via-[#ff9500] to-[#ffbd2e] bg-clip-text text-transparent">
              Reimagined.
            </span>
          </h1>

          <p className="mt-8 max-w-[700px] text-[19px] font-medium leading-relaxed tracking-[-0.015em] text-[#6e6e73] md:text-[24px]">
            Футбол и баскетбол 3x3.
            <br className="hidden sm:block" />
            Турнири, общност и състезание на едно
            място.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              className="h-12 rounded-full bg-[#0071e3] px-7 text-[16px] font-medium text-white shadow-none hover:bg-[#0077ed]"
            >
              <a href="#events">
                Виж турнирите
              </a>
            </Button>

            <Link
              href={accountHref}
              className="group flex h-12 items-center gap-1 text-[17px] font-medium text-[#0066cc]"
            >
              {user
                ? "Моят профил"
                : "Създай профил"}

              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/school-championship"
              className="group flex h-12 items-center gap-1 text-[17px] font-medium text-[#f56300]"
            >
              Ученическо първенство
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* SPORT BUTTONS */}

          <div className="mt-20 flex items-center gap-4 md:gap-7">
            <button
              type="button"
              aria-label="Покажи футболни турнири"
              onClick={() =>
                selectSport("FOOTBALL")
              }
              className="group relative flex h-[105px] w-[105px] items-center justify-center rounded-[32px] bg-[#f5f5f7] transition duration-500 hover:-translate-y-2 hover:shadow-xl md:h-[125px] md:w-[125px]"
            >
              <span className="text-[50px] transition-transform duration-500 group-hover:scale-110 md:text-[62px]">
                ⚽
              </span>
            </button>

            <div className="h-[70px] w-px bg-black/10" />

            <button
              type="button"
              aria-label="Покажи баскетболни турнири"
              onClick={() =>
                selectSport("BASKETBALL")
              }
              className="group relative flex h-[105px] w-[105px] items-center justify-center rounded-[32px] bg-[#f5f5f7] transition duration-500 hover:-translate-y-2 hover:shadow-xl md:h-[125px] md:w-[125px]"
            >
              <span className="text-[50px] transition-transform duration-500 group-hover:scale-110 md:text-[62px]">
                🏀
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8 md:py-24">
        <Link
          href="/school-championship"
          className="group mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 overflow-hidden rounded-[38px] bg-gradient-to-br from-[#132a20] via-[#17422e] to-[#0b2117] p-9 text-white shadow-[0_30px_80px_rgba(15,60,35,0.18)] transition-transform duration-500 hover:-translate-y-1 sm:p-12 md:flex-row md:items-center md:p-16"
        >
          <div className="max-w-[720px]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <GraduationCap className="h-8 w-8" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200/80">
              Спорт за ученици
            </p>
            <h2 className="text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[48px] md:text-[58px]">
              Ученическо първенство
            </h2>
            <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-white/65 md:text-[19px]">
              Открий публикуваните училищни турнири по футбол и баскетбол.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#17422e] transition-transform group-hover:translate-x-1">
            Виж първенствата
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* ================================================= */}
      {/* EVENTS                                            */}
      {/* ================================================= */}

      <section
        id="events"
        className="scroll-mt-[100px] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[15px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">
              Събития
            </p>

            <h2 className="text-[42px] font-semibold leading-none tracking-[-0.04em] md:text-[64px]">
              Избери играта.
            </h2>
          </div>

          {/* SEGMENTED CONTROL */}

          <div className="mx-auto mb-16 flex w-fit rounded-full bg-[#e8e8ed] p-[5px]">
            <button
              type="button"
              onClick={() =>
                selectSport(
                  "FOOTBALL",
                  false
                )
              }
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 ${
                activeSport === "FOOTBALL"
                  ? "bg-white text-black shadow-sm"
                  : "text-black/50 hover:text-black"
              }`}
            >
              <span>⚽</span>
              Футбол
            </button>

            <button
              type="button"
              onClick={() =>
                selectSport(
                  "BASKETBALL",
                  false
                )
              }
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 ${
                activeSport === "BASKETBALL"
                  ? "bg-white text-black shadow-sm"
                  : "text-black/50 hover:text-black"
              }`}
            >
              <span>🏀</span>
              Баскетбол
            </button>
          </div>

          {/* EVENT CONTENT */}

          {loading ? (
            <EventsSkeleton />
          ) : error ? (
            <div className="rounded-[32px] bg-white p-10 text-center">
              <p className="font-medium text-red-500">
                {error}
              </p>
            </div>
          ) : filteredTournaments.length ===
            0 ? (
            <EmptySport
              sport={activeSport}
            />
          ) : (
            <div className="space-y-7">
              {filteredTournaments.map(
                (tournament, index) => (
                  <PublicTournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    categories={
                      categories[
                        tournament.id
                      ]?.length ?? 0
                    }
                    accountHref={
                      accountHref
                    }
                    isLoggedIn={!!user}
                    profileCompleted={
                      player?.profileCompleted
                    }
                    featured={index === 0}
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* BRAND SECTION                                     */}
      {/* ================================================= */}

      <section className="bg-black px-6 py-28 text-white md:py-40">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="mx-auto mb-10 flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-[28px] bg-white">
            <Image
              src={logo}
              alt="Bulgarian Street Sports"
              width={110}
              height={110}
              className="h-[105px] w-[105px] object-contain"
            />
          </div>

          <p className="mb-4 text-[16px] font-semibold text-white/50">
            Bulgarian Street Sports
          </p>

          <h2 className="text-[44px] font-semibold leading-[1] tracking-[-0.045em] md:text-[74px]">
            Играта принадлежи
            <br />
            на улицата.
          </h2>

          <p className="mx-auto mt-7 max-w-[650px] text-[18px] leading-relaxed text-white/55 md:text-[21px]">
            Повече турнири. Повече градове. Повече
            играчи. Една общност.
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* FOOTER                                            */}
      {/* ================================================= */}

      <footer className="bg-[#f5f5f7] px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-5 border-t border-black/10 pt-8 text-[12px] text-[#6e6e73] sm:flex-row">
          <p>
            © {new Date().getFullYear()} Bulgarian
            Street Sports.
          </p>

          <div className="flex gap-6">
            <Link
              href="/register"
              className="transition hover:text-black"
            >
              Регистрация
            </Link>

            <Link
              href="/player"
              className="transition hover:text-black"
            >
              Профил
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ====================================================== */
/* EMPTY STATE                                            */
/* ====================================================== */

function EmptySport({
  sport,
}: {
  sport: Sport;
}) {
  const FOOTBALL = sport === "FOOTBALL";

  return (
    <div className="relative overflow-hidden rounded-[38px] bg-white px-8 py-24 text-center md:py-32">
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] ${
          FOOTBALL
            ? "bg-blue-300/20"
            : "bg-orange-300/25"
        }`}
      />

      <div className="relative">
        <div className="mb-7 text-[90px]">
          {FOOTBALL ? "⚽" : "🏀"}
        </div>

        <h3 className="text-[32px] font-semibold tracking-[-0.035em]">
          Очаквайте скоро.
        </h3>

        <p className="mx-auto mt-4 max-w-[500px] text-[17px] leading-relaxed text-[#6e6e73]">
          В момента няма публикувани{" "}
          {FOOTBALL
            ? "футболни"
            : "баскетболни"}{" "}
          турнири.
        </p>
      </div>
    </div>
  );
}

/* ====================================================== */
/* LOADING                                                */
/* ====================================================== */

function EventsSkeleton() {
  return (
    <div className="space-y-7">
      <Skeleton className="h-[620px] rounded-[38px]" />
      <Skeleton className="h-[160px] rounded-[32px]" />
      <Skeleton className="h-[160px] rounded-[32px]" />
    </div>
  );
}
