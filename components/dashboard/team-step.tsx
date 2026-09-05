"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  TD,
  TH,
  TBody,
  THead,
  TR,
  Table,
} from "@/components/ui/table";

import {
  createTeam,
  getTeams,
  getTournaments,
  getCategories,
  updateTeam,
  deleteTeam,
} from "@/lib/firestore-service";

import type {
  Category,
  Team,
  Tournament,
} from "@/lib/types";

export function TeamStep() {
  const [message, setMessage] = useState("");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [teams, setTeams] = useState<Team[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null);

  const selectedTournament = tournaments.find(
    (tournament) => tournament.id === selectedTournamentId,
  );

  /**
   * Load tournaments
   */
  async function loadTournaments() {
    setLoadingLists(true);
    setMessage("");

    try {
      const items = await getTournaments();

      setTournaments(items);

      setSelectedTournamentId((currentId) => {
        const currentTournamentExists = items.some(
          (tournament) => tournament.id === currentId,
        );

        if (currentTournamentExists) {
          return currentId;
        }

        return items[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Failed to load tournaments:", error);

      setTournaments([]);
      setSelectedTournamentId("");
      setTeams([]);
      setCategories([]);
      setSelectedCategoryId("");

      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на турнири.",
      );
    } finally {
      setLoadingLists(false);
    }
  }

  /**
   * Load teams for selected tournament
   */
  async function loadTeams(tournamentId: string) {
    if (!tournamentId) {
      setTeams([]);
      return;
    }

    setLoadingTeams(true);
    setMessage("");

    try {
      const items = await getTeams(tournamentId);

      const sortedTeams = [...items].sort((firstTeam, secondTeam) =>
        firstTeam.name.localeCompare(secondTeam.name, "bg"),
      );

      setTeams(sortedTeams);
    } catch (error) {
      console.error("Failed to load teams:", error);

      setTeams([]);

      setMessage(
        error instanceof Error
          ? error.message
          : "Неуспешно зареждане на отбори.",
      );
    } finally {
      setLoadingTeams(false);
    }
  }

  /**
   * Load categories for selected tournament
   */
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
        const categoryStillExists = items.some(
          (category) => category.id === currentId,
        );

        if (categoryStillExists) {
          return currentId;
        }

        return items[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Failed to load categories:", error);

      setCategories([]);
      setSelectedCategoryId("");
    }
  }

  /**
   * Initial tournament load
   */
  useEffect(() => {
    void loadTournaments();
  }, []);

  /**
   * Reload teams/categories whenever tournament changes
   */
  useEffect(() => {
    if (!selectedTournamentId) {
      setTeams([]);
      setCategories([]);
      setSelectedCategoryId("");
      setEditingTeam(null);

      return;
    }

    setEditingTeam(null);

    void loadTeams(selectedTournamentId);
    void loadCategories(selectedTournamentId);
  }, [selectedTournamentId]);

  /**
   * Create or edit team
   */
  async function addTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const teamName = String(
      formData.get("teamName") ?? "",
    ).trim();

    const jerseyColor = String(
      formData.get("jerseyColor") ?? "",
    ).trim();

    if (!selectedTournamentId) {
      setMessage("Първо избери турнир.");
      return;
    }

    if (!teamName) {
      setMessage("Въведи име на отбора.");
      return;
    }

    setLoadingTeam(true);
    setMessage("");

    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: teamName,
          categoryId: selectedCategoryId || undefined,
          jerseyColor,
        });

        setMessage(`Отборът „${teamName}“ беше редактиран успешно.`);
      } else {
        await createTeam({
          tournamentId: selectedTournamentId,
          categoryId: selectedCategoryId || undefined,
          name: teamName,
          jerseyColor,
        });

        setMessage(
          `Отборът „${teamName}“ беше добавен успешно в турнир „${
            selectedTournament?.name ?? ""
          }“.`,
        );
      }

      form.reset();

      setEditingTeam(null);

      await loadTeams(selectedTournamentId);
    } catch (error) {
      console.error("Failed to save team:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : editingTeam
            ? "Неуспешно редактиране на отбора."
            : "Неуспешно създаване на отбора.",
      );
    } finally {
      setLoadingTeam(false);
    }
  }

  /**
   * Delete team
   */
  async function removeTeam() {
    if (!pendingDelete) {
      return;
    }

    setLoadingTeam(true);
    setMessage("");

    try {
      const deletedTeamName = pendingDelete.name;

      await deleteTeam(pendingDelete.id);

      setPendingDelete(null);

      if (editingTeam?.id === pendingDelete.id) {
        setEditingTeam(null);
      }

      await loadTeams(selectedTournamentId);

      setMessage(
        `Отборът „${deletedTeamName}“ беше изтрит успешно.`,
      );
    } catch (error) {
      console.error("Failed to delete team:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Отборът не може да бъде изтрит.",
      );
    } finally {
      setLoadingTeam(false);
    }
  }

  /**
   * Start editing a team
   */
  function startEditing(team: Team) {
    setEditingTeam(team);
    setSelectedCategoryId(team.categoryId ?? "");
    setMessage("");
  }

  /**
   * Cancel editing
   */
  function cancelEditing() {
    setEditingTeam(null);
    setSelectedCategoryId(categories[0]?.id ?? "");
    setMessage("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Отбори</CardTitle>

        <CardDescription>
          Работиш с имена. Турнирното ID се записва автоматично във Firebase.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tournament selector */}
        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="tournamentSelect">
              Турнир
            </Label>

            <Select
              id="tournamentSelect"
              value={selectedTournamentId}
              onChange={(event) =>
                setSelectedTournamentId(event.target.value)
              }
              disabled={
                loadingLists ||
                loadingTeam ||
                tournaments.length === 0
              }
            >
              {tournaments.length === 0 && (
                <option value="">
                  Няма създадени турнири
                </option>
              )}

              {tournaments.map((tournament) => (
                <option
                  key={tournament.id}
                  value={tournament.id}
                >
                  {tournament.name}
                  {tournament.location
                    ? ` — ${tournament.location}`
                    : ""}
                </option>
              ))}
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadTournaments()}
            disabled={loadingLists || loadingTeam}
          >
            {loadingLists
              ? "Зареждане..."
              : "Обнови"}
          </Button>
        </div>

        {/* Team form */}
        <form
          key={editingTeam?.id ?? "new-team"}
          onSubmit={addTeam}
          className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
          aria-busy={loadingTeam}
        >
          {/* Team name */}
          <div className="space-y-2">
            <Label htmlFor="teamName">
              Име на отбора
            </Label>

            <Input
              id="teamName"
              name="teamName"
              placeholder="Зелените тигри"
              defaultValue={editingTeam?.name ?? ""}
              required
              disabled={
                loadingTeam ||
                !selectedTournamentId
              }
            />
          </div>

          {/* Jersey color */}
          <div className="space-y-2">
            <Label htmlFor="jerseyColor">
              Цвят
            </Label>

            <Input
              id="jerseyColor"
              name="jerseyColor"
              placeholder="Зелен"
              defaultValue={
                editingTeam?.jerseyColor ?? ""
              }
              disabled={
                loadingTeam ||
                !selectedTournamentId
              }
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="teamCategory">
              Категория
            </Label>

            <Select
              id="teamCategory"
              value={selectedCategoryId}
              onChange={(event) =>
                setSelectedCategoryId(
                  event.target.value,
                )
              }
              disabled={
                loadingTeam ||
                !selectedTournamentId ||
                categories.length === 0
              }
            >
              {categories.length === 0 ? (
                <option value="">
                  Без категория
                </option>
              ) : (
                <>
                  <option value="">
                    Без категория
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </>
              )}
            </Select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                loadingTeam ||
                !selectedTournamentId
              }
            >
              {loadingTeam
                ? "Записване..."
                : editingTeam
                  ? "Запази"
                  : "Добави отбор"}
            </Button>

            {editingTeam && (
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditing}
                disabled={loadingTeam}
              >
                Отказ
              </Button>
            )}
          </div>
        </form>

        {/* Teams table */}
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
            <h3 className="font-semibold">
              Отбори в „
              {selectedTournament?.name ??
                "избрания турнир"}
              “
            </h3>

            <span className="text-sm text-muted-foreground">
              {teams.length}{" "}
              {teams.length === 1
                ? "отбор"
                : "отбора"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Отбор</TH>
                  <TH>Цвят</TH>
                  <TH>Категория</TH>
                  <TH>Действия</TH>
                </TR>
              </THead>

              <TBody>
                {loadingTeams ? (
                  <TR>
                    <TD colSpan={4}>
                      Зареждане на отборите...
                    </TD>
                  </TR>
                ) : teams.length === 0 ? (
                  <TR>
                    <TD colSpan={4}>
                      Все още няма отбори в този
                      турнир.
                    </TD>
                  </TR>
                ) : (
                  teams.map((team) => (
                    <TR key={team.id}>
                      <TD className="font-medium">
                        {team.name}
                      </TD>

                      <TD>
                        {team.jerseyColor || "-"}
                      </TD>

                      <TD>
                        {team.category?.name || "-"}
                      </TD>

                      <TD>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              startEditing(team)
                            }
                            disabled={loadingTeam}
                          >
                            Редактирай
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPendingDelete(team)
                            }
                            disabled={loadingTeam}
                          >
                            Изтрий
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </div>

        {/* Status message */}
        {message && (
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}

        {/* Delete confirmation */}
        <AlertDialog
          open={Boolean(pendingDelete)}
          title="Изтриване на отбор"
          description={
            pendingDelete
              ? `Сигурен ли си, че искаш да изтриеш отбора „${pendingDelete.name}“? Отбор, който участва в мачове, няма да бъде изтрит.`
              : "Отбор, който участва в мачове, няма да бъде изтрит."
          }
          onCancel={() =>
            setPendingDelete(null)
          }
          onConfirm={() =>
            void removeTeam()
          }
          loading={loadingTeam}
        />
      </CardContent>
    </Card>
  );
}