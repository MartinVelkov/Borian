"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TD, TH, TBody, THead, TR, Table } from "@/components/ui/table";
import { addPlayerToTeam, getAvailablePlayers, getPlayersByTeam, getTeams, getTournaments } from "@/lib/firestore-service";
import type { Player, Team, Tournament } from "@/lib/types";

const fullName = (player: Player) => player.displayName || `${player.firstName} ${player.lastName}`.trim();
const maskedEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 2)}***@${domain}` : "";
};

export function PlayerStep() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [available, setAvailable] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingUid, setAddingUid] = useState("");

  async function loadTeamPlayers(id: string) {
    setPlayers(id ? await getPlayersByTeam(id) : []);
  }

  useEffect(() => { void (async () => {
    try {
      const [tournamentItems, playerItems] = await Promise.all([getTournaments(), getAvailablePlayers()]);
      setTournaments(tournamentItems); setAvailable(playerItems); setTournamentId(tournamentItems[0]?.id ?? "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Данните не могат да бъдат заредени."); }
    finally { setLoading(false); }
  })(); }, []);

  useEffect(() => { void (async () => {
    if (!tournamentId) { setTeams([]); setTeamId(""); return; }
    try { const items = await getTeams(tournamentId); setTeams(items); setTeamId(items[0]?.id ?? ""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Отборите не могат да бъдат заредени."); }
  })(); }, [tournamentId]);

  useEffect(() => { void loadTeamPlayers(teamId).catch((error) => setMessage(error.message)); }, [teamId]);

  const currentUids = useMemo(() => new Set(players.map((player) => player.uid)), [players]);
  const results = useMemo(() => {
    const value = search.trim().toLocaleLowerCase("bg");
    if (!value) return [];
    return available.filter((player) => !currentUids.has(player.uid) &&
      [fullName(player), player.email, player.phone].some((field) => field.toLocaleLowerCase("bg").includes(value))).slice(0, 8);
  }, [available, currentUids, search]);

  async function add(uid: string) {
    if (!teamId) return;
    setAddingUid(uid); setMessage("");
    try { await addPlayerToTeam(teamId, uid, players.length === 0 ? "captain" : "player"); await loadTeamPlayers(teamId); setSearch(""); setMessage("Играчът е добавен успешно."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Играчът не може да бъде добавен."); }
    finally { setAddingUid(""); }
  }

  return <Card><CardHeader><CardTitle>Регистрирани играчи</CardTitle><CardDescription>Избери реален профил от Firestore. В отбора се записва само Firebase UID.</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="playerTournament">Турнир</Label><Select id="playerTournament" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} disabled={loading}>{tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
        <div className="space-y-2"><Label htmlFor="playerTeam">Отбор</Label><Select id="playerTeam" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!teams.length}>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
      </div>
      <div className="space-y-2 rounded-lg border p-4"><Label htmlFor="playerSearch">Добави играч</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="playerSearch" className="pl-9" placeholder="Търси по име, телефон или email..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={!teamId || players.length >= 4} /></div>
        {search && <div className="divide-y rounded-md border">{results.length ? results.map((player) => <div key={player.uid} className="flex items-center justify-between gap-3 p-3"><div><p className="font-medium">{fullName(player)}</p><p className="text-xs text-muted-foreground">{maskedEmail(player.email)}</p></div><Button size="sm" onClick={() => void add(player.uid)} disabled={Boolean(addingUid)}><UserPlus className="mr-2 h-4 w-4" />Добави</Button></div>) : <p className="p-3 text-sm text-muted-foreground">Няма намерени завършени профили.</p>}</div>}
      </div>
      <div className="overflow-hidden rounded-lg border"><div className="flex justify-between border-b bg-muted/40 p-3"><span className="font-semibold">Състав</span><Badge variant="outline">{players.length}/4</Badge></div><Table><THead><TR><TH>Играч</TH><TH>Статус</TH></TR></THead><TBody>{players.length ? players.map((player, index) => <TR key={player.uid}><TD>{fullName(player) || "Legacy играч"}{player.teamId && <div className="text-xs text-amber-700">⚠ Legacy играч – няма потвърден Firebase акаунт</div>}</TD><TD><Badge variant={player.teamId ? "outline" : index === 0 ? "default" : "secondary"}>{player.teamId ? "Несвързан" : index === 0 ? "Капитан" : "Играч"}</Badge></TD></TR>) : <TR><TD colSpan={2}>Все още няма свързани играчи.</TD></TR>}</TBody></Table></div>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </CardContent></Card>;
}
