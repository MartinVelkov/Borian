"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  TD,
  TH,
  TBody,
  THead,
  TR,
  Table,
} from "@/components/ui/table";

import {
  getAllTeams,
  getCategories,
  getPlayers,
  getRegistrations,
  getTournaments,
  updateRegistrationStatus,
} from "@/lib/firestore-service";

import type {
  Category,
  Player,
  Team,
  Tournament,
  TournamentRegistration,
} from "@/lib/types";

export default function RegistrationsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [items, setItems] = useState<TournamentRegistration[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([getTournaments(), getPlayers(), getAllTeams()])
      .then(([tournamentData, playerData, teamData]) => {
        setTournaments(tournamentData);
        setPlayers(playerData);
        setTeams(teamData);
        setTournamentId(tournamentData[0]?.id ?? "");
      })
      .catch((e) => {
        setMessage(e.message);
      });
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setItems([]);
      setCategories([]);
      return;
    }

    const [registrationData, categoryData] = await Promise.all([
      getRegistrations(id),
      getCategories(id),
    ]);
    setItems(registrationData);
    setCategories(categoryData);
  }, []);

  const tournamentById = useMemo(
    () => new Map(tournaments.map((item) => [item.id, item])),
    [tournaments],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((item) => [item.id, item])),
    [categories],
  );
  const playerByUid = useMemo(
    () => new Map(players.map((item) => [item.uid, item])),
    [players],
  );
  const teamById = useMemo(
    () => new Map(teams.map((item) => [item.id, item])),
    [teams],
  );

  useEffect(() => {
    void load(tournamentId).catch((e) => {
      setMessage(e.message);
    });
  }, [load, tournamentId]);

  async function change(
    id: string,
    status: "approved" | "rejected",
  ) {
    try {
      await updateRegistrationStatus(id, status);
      await load(tournamentId);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Неуспешна операция.",
      );
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Турнири"
        title="Регистрации"
        description="Реални заявки от public registration flow."
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <Select
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
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

          {items.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Няма регистрации за този турнир.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Отбор</TH>
                  <TH>Турнир</TH>
                  <TH>Категория</TH>
                  <TH>Капитан</TH>
                  <TH>Статус</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>

              <TBody>
                {items.map((item) => {
                  const status = getRegistrationStatus(item);
                  const captain = getCaptainLabel(
                    item,
                    playerByUid.get(item.captainUid),
                  );
                  const team = teamById.get(item.teamId);

                  return (
                    <TR key={item.id}>
                    <TD>{item.name || team?.name || "Без име"}</TD>

                    <TD>
                      {item.tournamentName ||
                        tournamentById.get(item.tournamentId)?.name ||
                        item.tournamentId}
                    </TD>

                    <TD>
                      {item.categoryName ||
                        categoryById.get(item.categoryId)?.name ||
                        item.categoryId}
                    </TD>

                    <TD>{captain}</TD>

                    <TD>
                      <Badge
                        variant={
                          status === "approved"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {status}
                      </Badge>
                    </TD>

                    <TD className="space-x-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void change(item.id, "approved")
                        }
                        disabled={status === "approved"}
                      >
                        Одобри
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void change(item.id, "rejected")
                        }
                      >
                        Откажи
                      </Button>
                    </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            </div>
          )}

          {message && (
            <p className="text-sm text-destructive">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function getRegistrationStatus(
  registration: TournamentRegistration,
) {
  return registration.approvalStatus ?? registration.status ?? "pending";
}

function getCaptainLabel(
  registration: TournamentRegistration,
  player?: Player,
) {
  if (registration.captainName) return registration.captainName;
  if (registration.captainEmail) return registration.captainEmail;
  if (player?.displayName) return player.displayName;

  const profileName = [player?.firstName, player?.lastName]
    .filter(Boolean)
    .join(" ");

  return profileName || player?.email || registration.captainUid;
}
