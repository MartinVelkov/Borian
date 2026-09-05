"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { getPlayers } from "@/lib/firestore-service";
import type { Player } from "@/lib/types";

function dateLabel(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleDateString("bg-BG");
  return "—";
}
export function PlayerProfiles() {
  const [players, setPlayers] = useState<Player[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { void getPlayers().then(setPlayers).catch((cause) => setError(cause.message)).finally(() => setLoading(false)); }, []);
  return <Card><CardHeader><CardTitle>Потребителски профили</CardTitle></CardHeader><CardContent>{error ? <p className="text-destructive">{error}</p> : loading ? <p>Зареждане...</p> : players.length === 0 ? <p className="py-8 text-center text-muted-foreground">Няма регистрирани играчи.</p> : <div className="overflow-x-auto"><Table><THead><TR><TH>Играч</TH><TH>Email</TH><TH>Телефон</TH><TH>Профил</TH><TH>Верификация</TH><TH>Регистрация</TH></TR></THead><TBody>{players.map((player) => <TR key={player.uid}><TD><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-semibold">{player.displayName?.slice(0,1) || "?"}</div>{player.displayName || `${player.firstName} ${player.lastName}`}</div></TD><TD>{player.email || "—"}</TD><TD>{player.phone || "—"}</TD><TD><Badge variant={player.profileCompleted ? "secondary" : "outline"}>{player.profileCompleted ? "Завършен" : "Непълен"}</Badge></TD><TD><span className="text-xs">Email: {player.emailVerified ? "✓" : "—"}<br />Телефон: {player.phoneVerified ? "✓" : "—"}</span></TD><TD>{dateLabel(player.createdAt)}</TD></TR>)}</TBody></Table></div>}</CardContent></Card>;
}
