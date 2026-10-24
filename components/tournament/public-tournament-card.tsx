import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Tournament } from "@/lib/types";

export function PublicTournamentCard({
  tournament,
  categories,
  accountHref,
  isLoggedIn,
  profileCompleted,
  featured,
}: {
  tournament: Tournament;
  categories: number;
  accountHref: string;
  isLoggedIn: boolean;
  profileCompleted?: boolean;
  featured?: boolean;
}) {
  const isFootball = tournament.sport === "FOOTBALL";

  return (
    <article
      className={`group relative overflow-hidden bg-white transition-shadow duration-500 hover:shadow-[0_30px_80px_rgba(0,0,0,0.07)] ${
        featured
          ? "min-h-[610px] rounded-[38px] md:min-h-[650px]"
          : "rounded-[32px]"
      }`}
    >
      {featured ? (
        <div className="relative grid min-h-[610px] md:grid-cols-2">
          <div className="relative z-10 flex flex-col justify-center p-8 sm:p-12 md:p-16">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <p
                className={`text-[14px] font-semibold ${
                  isFootball ? "text-[#0071e3]" : "text-[#f56300]"
                }`}
              >
                {isFootball ? "3x3 FOOTBALL" : "3x3 BASKETBALL"}
              </p>

              {!tournament.registrationOpen && (
                <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-semibold text-[#6e6e73]">
                  Записването е затворено
                </span>
              )}
            </div>

            <h3 className="max-w-[500px] text-[42px] font-semibold leading-[0.98] tracking-[-0.045em] md:text-[58px]">
              {tournament.name}
            </h3>

            <p className="mt-6 max-w-[460px] text-[17px] leading-relaxed text-[#6e6e73]">
              {tournament.description ||
                (isFootball
                  ? "3x3 футболен турнир"
                  : "3x3 баскетболен турнир")}
            </p>

            <div className="mt-8 space-y-4 text-[15px]">
              <TournamentInfo
                icon={<CalendarDays />}
                value={formatTournamentDate(tournament.startDate)}
              />
              <TournamentInfo
                icon={<MapPin />}
                value={tournament.location || "Локацията предстои"}
              />
              <TournamentInfo
                icon={<Users />}
                value={`${categories} ${
                  categories === 1 ? "категория" : "категории"
                }`}
              />
            </div>

            {tournament.registrationOpen && (
              <div className="mt-9">
                <Button
                  asChild
                  className="h-11 rounded-full bg-[#0071e3] px-6 text-white shadow-none hover:bg-[#0077ed]"
                >
                  <Link href={accountHref}>
                    {!isLoggedIn
                      ? "Регистрирай се"
                      : !profileCompleted
                        ? "Завърши профила"
                        : "Участвай"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="relative min-h-[340px] overflow-hidden md:min-h-full">
            <div
              className={`absolute inset-0 ${
                isFootball
                  ? "bg-gradient-to-br from-[#dff4ff] via-[#e9f8ff] to-[#ffffff]"
                  : "bg-gradient-to-br from-[#fff0dd] via-[#fff6e9] to-[#ffffff]"
              }`}
            />
            <div
              className={`absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px] ${
                isFootball ? "bg-blue-400/20" : "bg-orange-400/30"
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="select-none text-[180px] drop-shadow-[0_35px_25px_rgba(0,0,0,0.15)] transition-transform duration-700 group-hover:-rotate-3 group-hover:scale-[1.08] md:text-[230px]">
                {isFootball ? "⚽" : "🏀"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p
                className={`text-[13px] font-semibold ${
                  isFootball ? "text-[#0071e3]" : "text-[#f56300]"
                }`}
              >
                {isFootball ? "3x3 FOOTBALL" : "3x3 BASKETBALL"}
              </p>

              {!tournament.registrationOpen && (
                <span className="rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[10px] font-semibold text-[#6e6e73]">
                  Затворено
                </span>
              )}
            </div>

            <h3 className="text-[28px] font-semibold tracking-[-0.03em]">
              {tournament.name}
            </h3>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[14px] text-[#6e6e73]">
              <TournamentInfo
                icon={<CalendarDays />}
                value={formatTournamentDate(tournament.startDate)}
              />
              <TournamentInfo
                icon={<MapPin />}
                value={tournament.location || "Локацията предстои"}
              />
              <TournamentInfo
                icon={<Users />}
                value={`${categories} ${
                  categories === 1 ? "категория" : "категории"
                }`}
              />
            </div>
          </div>

          {tournament.registrationOpen && (
            <Button
              asChild
              variant="ghost"
              className="w-fit rounded-full text-[#0066cc] hover:bg-transparent hover:text-[#0077ed]"
            >
              <Link href={accountHref}>
                Участвай
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function TournamentInfo({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[#6e6e73]">
      <span className="[&>svg]:h-[17px] [&>svg]:w-[17px]">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function formatTournamentDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Датата предстои";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}
