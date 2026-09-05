"use client";

import { useEffect, useState } from "react";

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
  getRegistrations,
  getTournaments,
  updateRegistrationStatus,
} from "@/lib/firestore-service";

import type {
  Tournament,
  TournamentRegistration,
} from "@/lib/types";

export default function RegistrationsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [items, setItems] = useState<TournamentRegistration[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void getTournaments()
      .then((data) => {
        setTournaments(data);
        setTournamentId(data[0]?.id ?? "");
      })
      .catch((e) => {
        setMessage(e.message);
      });
  }, []);

  async function load(id: string) {
    setItems(id ? await getRegistrations(id) : []);
  }

  useEffect(() => {
    void load(tournamentId).catch((e) => {
      setMessage(e.message);
    });
  }, [tournamentId]);

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
            <Table>
              <THead>
                <TR>
                  <TH>Отбор</TH>
                  <TH>Категория</TH>
                  <TH>Капитан UID</TH>
                  <TH>Статус</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>

              <TBody>
                {items.map((item) => (
                  <TR key={item.id}>
                    <TD>{item.name}</TD>

                    <TD>{item.categoryId}</TD>

                    <TD className="font-mono text-xs">
                      {item.captainUid}
                    </TD>

                    <TD>
                      <Badge
                        variant={
                          item.status === "approved"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TD>

                    <TD className="space-x-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void change(item.id, "approved")
                        }
                        disabled={item.status === "approved"}
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
                ))}
              </TBody>
            </Table>
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