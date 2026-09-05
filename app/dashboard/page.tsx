"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllMatches, getAllTeams, getPlayers, getTournaments } from "@/lib/firestore-service";

type Counts = { tournaments: number; upcoming: number; active: number; players: number; teams: number; scheduled: number; live: number; finished: number };

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void (async () => {
    try {
      const [tournaments, players, teams, matches] = await Promise.all([getTournaments(), getPlayers(), getAllTeams(), getAllMatches()]);
      const now = Date.now();
      setCounts({
        tournaments: tournaments.length,
        upcoming: tournaments.filter((item) => item.status === "UPCOMING" || (!item.status && new Date(item.startDate).getTime() > now)).length,
        active: tournaments.filter((item) => item.status === "ACTIVE").length,
        players: players.filter((item) => item.profileCompleted).length,
        teams: teams.length,
        scheduled: matches.filter((item) => item.status === "SCHEDULED").length,
        live: matches.filter((item) => item.status === "LIVE").length,
        finished: matches.filter((item) => item.status === "FINISHED").length,
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Статистиката не може да бъде заредена."); }
  })(); }, []);

  const cards = counts ? [
    ["Общо турнири", counts.tournaments, `${counts.upcoming} предстоящи`],
    ["Активни турнири", counts.active, "В момента"],
    ["Регистрирани играчи", counts.players, "Завършени профили"],
    ["Общо отбори", counts.teams, "Във всички турнири"],
    ["Предстоящи мачове", counts.scheduled, "SCHEDULED"],
    ["Мачове на живо", counts.live, "LIVE"],
    ["Приключени мачове", counts.finished, "FINISHED"],
  ] as const : [];

  return <><PageHeader eyebrow="Администраторски панел" title="Общ преглед" description="Стойностите се изчисляват от реалните Firestore collections."><Button asChild><Link href="/dashboard/tournaments">Управление на турнири</Link></Button></PageHeader>
    {error ? <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card> : !counts ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32" />)}</section> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title, value, note]) => <StatCard key={title} title={title} value={String(value)} note={note} />)}</section>}
  </>;
}
