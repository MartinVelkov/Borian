import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  canFinishMatch,
  resolveMatchParticipants,
  resolveMatchSource,
} from "@/lib/tournament-progression";
import type {
  Category,
  CompetitionFormat,
  Match,
  MatchSource,
  Player,
  Team,
  Tournament,
  TournamentFormat,
  TournamentRegistration,
  RegistrationStatus,
} from "@/lib/types";

export type CreateTournamentInput = {
  name: string;
  location: string;
  startDate: string;
  format: TournamentFormat;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
  endDate?: string;
  status?: Tournament["status"];
  description?: string;
  imageURL?: string;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  published?: boolean;
};

export type MatchTimerUpdate = Partial<
  Pick<
    Match,
    | "currentHalf"
    | "halfDurationSeconds"
    | "timerRemainingSeconds"
    | "timerState"
    | "timerEndsAt"
  >
>;

function withTimeout<T>(
  promise: Promise<T>,
  label = "Firebase заявката",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(
        new Error(
          `${label} не отговори до 10 секунди. Провери Firebase конфигурацията, Firestore Rules и интернет връзката.`,
        ),
      );
    }, 10_000);

    promise.then(
      (value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function matchStartTimestamp(match: Match) {
  if (!match.startTime) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(match.startTime).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function matchDefaults(match: Match): Match {
  const durationSeconds =
    match.halfDurationSeconds ?? match.timerRemainingSeconds ?? 5 * 60;

  return {
    ...match,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    homeFouls: match.homeFouls ?? 0,
    awayFouls: match.awayFouls ?? 0,
    homeCorners: match.homeCorners ?? 0,
    awayCorners: match.awayCorners ?? 0,
    homeTimeouts: match.homeTimeouts ?? 0,
    awayTimeouts: match.awayTimeouts ?? 0,
    currentHalf: match.currentHalf ?? 1,
    halfDurationSeconds: durationSeconds,
    timerRemainingSeconds: match.timerRemainingSeconds ?? durationSeconds,
    timerState: match.timerState ?? "STOPPED",
    timerEndsAt: match.timerEndsAt ?? null,
    sport: match.sport ?? "FOOTBALL",
    period: match.period ?? 1,
    possession: match.possession ?? null,
    updatedAt: new Date().toISOString(),
  };
}

async function commitInChunks(
  operations: Array<
    | { type: "delete"; path: string }
    | { type: "set"; path: string; data: Match }
    | { type: "update"; path: string; data: Partial<Match> }
  >,
  label: string,
) {
  const chunkSize = 400;

  for (let index = 0; index < operations.length; index += chunkSize) {
    const chunk = operations.slice(index, index + chunkSize);
    const batch = writeBatch(db);

    for (const operation of chunk) {
      const reference = doc(db, operation.path);

      if (operation.type === "delete") {
        batch.delete(reference);
      } else if (operation.type === "set") {
        batch.set(reference, operation.data);
      } else {
        batch.update(reference, operation.data);
      }
    }

    await withTimeout(batch.commit(), label);
  }
}

export async function createTournament(
  tournament: CreateTournamentInput,
): Promise<string> {
  const tournamentsCollection = collection(db, "tournaments");

  const tournamentDocument = await withTimeout(
    addDoc(tournamentsCollection, {
      ...tournament,
      createdAt: serverTimestamp(),
    }),
    "Създаването на турнир",
  );

  return tournamentDocument.id;
}

export async function getTournaments(): Promise<Tournament[]> {
  const tournamentsQuery = query(
    collection(db, "tournaments"),
    orderBy("createdAt", "desc"),
  );

  const snapshot = await withTimeout(
    getDocs(tournamentsQuery),
    "Зареждането на турнири",
  );

  return snapshot.docs.map(
    (document) =>
      ({
        id: document.id,
        ...document.data(),
      }) as Tournament,
  );
}

export async function getPublishedTournaments(): Promise<Tournament[]> {
  const snapshot = await withTimeout(
    getDocs(query(collection(db, "tournaments"), where("published", "==", true))),
    "Зареждането на публични турнири",
  );
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as Tournament)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export async function updateTournament(
  tournamentId: string,
  updates: Partial<Omit<Tournament, "id" | "createdAt">>,
): Promise<void> {
  await withTimeout(updateDoc(doc(db, "tournaments", tournamentId), {
    ...updates,
    updatedAt: serverTimestamp(),
  }), "Редактирането на турнира");
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  const [categories, teams, matches] = await Promise.all([
    getCategories(tournamentId), getTeams(tournamentId), getMatches(tournamentId),
  ]);
  if (categories.length || teams.length || matches.length) {
    throw new Error("Турнирът има свързани категории, отбори или мачове. Архивирайте го вместо да го изтривате.");
  }
  await withTimeout(deleteDoc(doc(db, "tournaments", tournamentId)), "Изтриването на турнира");
}

export async function getTournamentById(
  tournamentId: string,
): Promise<Tournament | null> {
  const snapshot = await withTimeout(
    getDoc(doc(db, "tournaments", tournamentId)),
    "Зареждането на турнира",
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Tournament;
}

export async function createTeam(
  data: Omit<Team, "id">,
): Promise<string> {
  const documentReference = await withTimeout(
    addDoc(collection(db, "teams"), {
      ...data,
      createdAt: serverTimestamp(),
    }),
    "Създаването на отбор",
  );

  return documentReference.id;
}

export async function getTeams(tournamentId: string, categoryId?: string): Promise<Team[]> {
  const teamsQuery = query(
    collection(db, "teams"),
    where("tournamentId", "==", tournamentId),
  );

  const snapshot = await withTimeout(
    getDocs(teamsQuery),
    "Зареждането на отбори",
  );

  return snapshot.docs.map(
    (document) =>
      ({
        id: document.id,
        ...document.data(),
      }) as Team,
  ).filter((team) => team.approvalStatus !== "pending" && team.approvalStatus !== "rejected")
    .filter((team) => !categoryId || team.categoryId === categoryId);
}

export async function getAllTeams(): Promise<Team[]> {
  const snapshot = await withTimeout(getDocs(collection(db, "teams")), "Зареждането на всички отбори");
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Team);
}

export async function updateTeam(teamId: string, updates: Partial<Omit<Team, "id">>) {
  await withTimeout(updateDoc(doc(db, "teams", teamId), { ...updates, updatedAt: serverTimestamp() }), "Редактирането на отбора");
}

export async function deleteTeam(teamId: string): Promise<void> {
  const matchSnapshot = await getDocs(query(collection(db, "matches"), where("homeTeamId", "==", teamId)));
  const awaySnapshot = await getDocs(query(collection(db, "matches"), where("awayTeamId", "==", teamId)));
  if (!matchSnapshot.empty || !awaySnapshot.empty) throw new Error("Отборът участва в мачове и не може да бъде изтрит.");
  await deleteDoc(doc(db, "teams", teamId));
}

export async function createPlayer(
  data: Player,
): Promise<string> {
  await withTimeout(
    setDoc(doc(db, "players", data.uid), data, { merge: true }),
    "Записването на профила",
  );
  return data.uid;
}

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const teamSnapshot = await withTimeout(
    getDoc(doc(db, "teams", teamId)),
    "Зареждането на отбора",
  );
  const memberUids = teamSnapshot.exists()
    ? ((teamSnapshot.data().members ?? []) as Array<{ uid: string }>).map(
        (member) => member.uid,
      )
    : [];

  if (memberUids.length > 0) {
    const snapshots = await Promise.all(
      memberUids.map((uid) => getDoc(doc(db, "players", uid))),
    );
    return snapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => ({ uid: snapshot.id, ...snapshot.data() }) as Player);
  }

  // Legacy fallback: old records linked players with teamId.
  const legacySnapshot = await withTimeout(
    getDocs(query(collection(db, "players"), where("teamId", "==", teamId))),
    "Зареждането на legacy играчи",
  );
  return legacySnapshot.docs.map(
    (document) => ({ uid: document.id, id: document.id, ...document.data() }) as Player,
  );
}

export async function getPlayerProfile(uid: string): Promise<Player | null> {
  const snapshot = await withTimeout(
    getDoc(doc(db, "players", uid)),
    "Зареждането на профила",
  );
  return snapshot.exists()
    ? ({ uid: snapshot.id, ...snapshot.data() } as Player)
    : null;
}

export async function getAvailablePlayers(): Promise<Player[]> {
  const snapshot = await withTimeout(
    getDocs(query(collection(db, "players"), where("profileCompleted", "==", true))),
    "Зареждането на регистрирани играчи",
  );
  return snapshot.docs.map(
    (document) => ({ uid: document.id, ...document.data() }) as Player,
  );
}

export async function getPlayers(): Promise<Player[]> {
  const snapshot = await withTimeout(getDocs(collection(db, "players")), "Зареждането на играчи");
  return snapshot.docs.map((item) => ({ uid: item.id, ...item.data() }) as Player);
}

export async function addPlayerToTeam(
  teamId: string,
  playerUid: string,
  role: "captain" | "player" = "player",
): Promise<void> {
  await withTimeout(
    runTransaction(db, async (transaction) => {
      const teamRef = doc(db, "teams", teamId);
      const playerRef = doc(db, "players", playerUid);
      const [teamSnapshot, playerSnapshot] = await Promise.all([
        transaction.get(teamRef),
        transaction.get(playerRef),
      ]);
      if (!teamSnapshot.exists()) throw new Error("Отборът не съществува.");
      if (!playerSnapshot.exists() || playerSnapshot.data().profileCompleted !== true) {
        throw new Error("Играчът няма завършен регистриран профил.");
      }
      const members = (teamSnapshot.data().members ?? []) as Array<{
        uid: string;
        role: "captain" | "player";
      }>;
      if (members.some((member) => member.uid === playerUid)) {
        throw new Error("Този играч вече е добавен в отбора.");
      }
      if (members.length >= 4) {
        throw new Error("Един 3x3 отбор може да има максимум 4 играчи.");
      }
      transaction.update(teamRef, {
        members: [...members, { uid: playerUid, role }],
        ...(role === "captain" ? { captainUid: playerUid } : {}),
        updatedAt: serverTimestamp(),
      });
    }),
    "Добавянето на играч към отбора",
  );
}

export async function saveGeneratedSchedule(matches: Match[]): Promise<void> {
  await saveMatches(matches);
}

export async function saveMatches(matches: Match[]): Promise<void> {
  if (matches.length === 0) {
    return;
  }

  const operations = matches.map((match) => ({
    type: "set" as const,
    path: `matches/${match.id}`,
    data: matchDefaults(match),
  }));

  await commitInChunks(operations, "Записването на програмата");
}

/*
 * Used by the generator screen. It removes the previous schedule for the
 * selected tournament and writes the newly generated one.
 */
export async function replaceTournamentSchedule(
  tournamentId: string,
  matches: Match[],
  categoryId?: string,
): Promise<void> {
  const oldMatches = (await getMatches(tournamentId)).filter((match) =>
    categoryId ? match.categoryId === categoryId : true,
  );

  const deleteOperations = oldMatches.map((match) => ({
    type: "delete" as const,
    path: `matches/${match.id}`,
  }));

  const setOperations = matches.map((match) => ({
    type: "set" as const,
    path: `matches/${match.id}`,
    data: matchDefaults(match),
  }));

  await commitInChunks(
    [...deleteOperations, ...setOperations],
    "Подмяната на програмата",
  );
}

export async function getMatches(tournamentId: string): Promise<Match[]> {
  const matchesQuery = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId),
  );

  const snapshot = await withTimeout(
    getDocs(matchesQuery),
    "Зареждането на мачове",
  );

  return snapshot.docs
    .map(
      (document) =>
        ({
          id: document.id,
          ...document.data(),
        }) as Match,
    )
    .sort(
      (firstMatch, secondMatch) =>
        matchStartTimestamp(firstMatch) - matchStartTimestamp(secondMatch),
    );
}

export async function getAllMatches(): Promise<Match[]> {
  const snapshot = await withTimeout(getDocs(collection(db, "matches")), "Зареждането на всички мачове");
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Match);
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const matchReference = doc(db, "matches", matchId);

  const snapshot = await withTimeout(
    getDoc(matchReference),
    "Зареждането на мач",
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Match;
}

export function listenToTournamentMatches(
  tournamentId: string,
  onChange: (matches: Match[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const matchesQuery = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId),
  );

  return onSnapshot(
    matchesQuery,
    (snapshot) => {
      const matches = snapshot.docs
        .map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            }) as Match,
        )
        .sort(
          (firstMatch, secondMatch) =>
            matchStartTimestamp(firstMatch) -
            matchStartTimestamp(secondMatch),
        );

      onChange(matches);
    },
    (error) => {
      console.error("Tournament matches listener error:", error);
      onError?.(error);
    },
  );
}

export function listenToMatch(
  matchId: string,
  onChange: (match: Match | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const matchReference = doc(db, "matches", matchId);

  return onSnapshot(
    matchReference,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      onChange({
        id: snapshot.id,
        ...snapshot.data(),
      } as Match);
    },
    (error) => {
      console.error("Match listener error:", error);
      onError?.(error);
    },
  );
}

export async function updateMatchScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const matchReference = doc(db, "matches", matchId);

  await withTimeout(
    updateDoc(matchReference, {
      homeScore,
      awayScore,
      updatedAt: new Date().toISOString(),
    }),
    "Обновяването на резултата",
  );
}

export async function updateMatchControlStats(
  matchId: string,
  updates: Partial<Omit<Match, "id">>,
): Promise<void> {
  const matchReference = doc(db, "matches", matchId);

  await withTimeout(
    updateDoc(matchReference, {
      ...updates,
      updatedAt: new Date().toISOString(),
    }),
    "Обновяването на контролния панел",
  );
}

export async function updateMatchTimer(
  matchId: string,
  updates: MatchTimerUpdate,
): Promise<void> {
  const matchReference = doc(db, "matches", matchId);

  await withTimeout(
    updateDoc(matchReference, {
      ...updates,
      updatedAt: new Date().toISOString(),
    }),
    "Обновяването на таймера",
  );
}


function firstKnockoutStageForSize(
  knockoutSize: CompetitionFormat["knockoutSize"],
): Match["stage"] | null {
  switch (knockoutSize) {
    case 16:
      return "ROUND_OF_16";
    case 8:
      return "QUARTER_FINAL";
    case 4:
      return "SEMI_FINAL";
    case 2:
      return "FINAL";
    default:
      return null;
  }
}

function teamPoolId(
  teamId: string,
  format: CompetitionFormat,
): string | null {
  return (
    format.pools.find((pool) =>
      pool.teams.some((team) => team.id === teamId),
    )?.id ?? null
  );
}

type ResolvedBracketSide = {
  source: MatchSource;
  team: Team;
};

/*
 * With three groups the recommended bracket is built from the three group
 * winners plus the best runner-up. If that runner-up comes from the same
 * group as their initially assigned opponent, we swap one side with the
 * other semi-final so the first knockout round does not repeat a group game.
 */
function normalizeFirstRoundPoolRematches(params: {
  matches: Match[];
  teams: Team[];
  format?: CompetitionFormat;
}): {
  matches: Match[];
  updates: Array<{ matchId: string; data: Partial<Match> }>;
} {
  const { format } = params;

  if (!format || format.knockoutSize < 4) {
    return { matches: params.matches, updates: [] };
  }

  const activeFormat = format;
  const firstStage = firstKnockoutStageForSize(activeFormat.knockoutSize);

  if (!firstStage) {
    return { matches: params.matches, updates: [] };
  }

  const workingMatches = params.matches.map((match) => ({ ...match }));
  const firstRoundMatches = workingMatches
    .filter((match) => match.stage === firstStage)
    .sort(
      (first, second) =>
        (first.bracketOrder ?? 0) - (second.bracketOrder ?? 0),
    );

  if (firstRoundMatches.length < 2) {
    return { matches: workingMatches, updates: [] };
  }

  const usesBestCrossPoolSlot = firstRoundMatches.some(
    (match) =>
      match.homeSource?.type === "BEST_POOL_POSITION" ||
      match.awaySource?.type === "BEST_POOL_POSITION",
  );

  if (!usesBestCrossPoolSlot) {
    return { matches: workingMatches, updates: [] };
  }

  const resolved = firstRoundMatches.map((match) => {
    const homeSource = match.homeSource;
    const awaySource = match.awaySource;

    if (!homeSource || !awaySource) {
      return null;
    }

    const homeTeam = resolveMatchSource({
      source: homeSource,
      teams: params.teams,
      matches: workingMatches,
      format: activeFormat,
    });
    const awayTeam = resolveMatchSource({
      source: awaySource,
      teams: params.teams,
      matches: workingMatches,
      format: activeFormat,
    });

    if (!homeTeam || !awayTeam) {
      return null;
    }

    return {
      match,
      home: { source: homeSource, team: homeTeam } satisfies ResolvedBracketSide,
      away: { source: awaySource, team: awayTeam } satisfies ResolvedBracketSide,
    };
  });

  if (resolved.some((item) => !item)) {
    return { matches: workingMatches, updates: [] };
  }

  const entries = resolved.filter(
    (item): item is NonNullable<(typeof resolved)[number]> => Boolean(item),
  );

  function hasPoolRematch(entry: (typeof entries)[number]) {
    const homePoolId = teamPoolId(entry.home.team.id, activeFormat);
    const awayPoolId = teamPoolId(entry.away.team.id, activeFormat);

    return Boolean(homePoolId && awayPoolId && homePoolId === awayPoolId);
  }

  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index];

    if (!hasPoolRematch(current)) {
      continue;
    }

    for (let candidateIndex = index + 1; candidateIndex < entries.length; candidateIndex += 1) {
      const candidate = entries[candidateIndex];
      const currentAway = current.away;
      const candidateAway = candidate.away;

      current.away = candidateAway;
      candidate.away = currentAway;

      if (!hasPoolRematch(current) && !hasPoolRematch(candidate)) {
        break;
      }

      current.away = currentAway;
      candidate.away = candidateAway;
    }
  }

  const updates: Array<{ matchId: string; data: Partial<Match> }> = [];

  for (const entry of entries) {
    const data: Partial<Match> = {
      homeSource: entry.home.source,
      awaySource: entry.away.source,
      homeTeamId: entry.home.team.id,
      homeTeamName: entry.home.team.name,
      awayTeamId: entry.away.team.id,
      awayTeamName: entry.away.team.name,
    };

    Object.assign(entry.match, data);
    updates.push({ matchId: entry.match.id, data });
  }

  return { matches: workingMatches, updates };
}

export async function resolveTournamentProgression(
  tournamentId: string,
): Promise<void> {
  const [tournament, teams, matches, categories] = await Promise.all([
    getTournamentById(tournamentId),
    getTeams(tournamentId),
    getMatches(tournamentId),
    getCategories(tournamentId),
  ]);

  const format = tournament?.competitionFormat;
  const operations: Array<{
    type: "update";
    path: string;
    data: Partial<Match>;
  }> = [];

  // If there are categories, resolve progression separately per category so
  // knockout phases don't mix teams from different categories. If there are
  // no categories, run a single pass over all teams and matches.
  if (categories.length === 0) {
    const normalizedBracket = normalizeFirstRoundPoolRematches({
      matches,
      teams,
      format,
    });

    const workingMatches = normalizedBracket.matches;

    for (const update of normalizedBracket.updates) {
      operations.push({
        type: "update",
        path: `matches/${update.matchId}`,
        data: {
          ...update.data,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    for (const match of workingMatches) {
      const updates = resolveMatchParticipants({
        match,
        teams,
        matches: workingMatches,
        format,
      });

      if (!updates) {
        continue;
      }

      operations.push({
        type: "update",
        path: `matches/${match.id}`,
        data: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  } else {
    for (const category of categories) {
      const categoryTeams = teams.filter((t) => t.categoryId === category.id);
      const categoryMatches = matches.filter((m) => m.categoryId === category.id);

      const normalizedBracket = normalizeFirstRoundPoolRematches({
        matches: categoryMatches,
        teams: categoryTeams,
        format,
      });

      const workingMatches = normalizedBracket.matches;

      for (const update of normalizedBracket.updates) {
        operations.push({
          type: "update",
          path: `matches/${update.matchId}`,
          data: {
            ...update.data,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      for (const match of workingMatches) {
        const updates = resolveMatchParticipants({
          match,
          teams: categoryTeams,
          matches: workingMatches,
          format,
        });

        if (!updates) {
          continue;
        }

        operations.push({
          type: "update",
          path: `matches/${match.id}`,
          data: {
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    }
  }

  if (operations.length > 0) {
    await commitInChunks(
      operations,
      "Обновяването на елиминационната схема",
    );
  }
}

export async function finishMatch(matchId: string): Promise<void> {
  const match = await getMatchById(matchId);

  if (!match) {
    throw new Error("Мачът не е намерен.");
  }

  if (!match.homeTeamId || !match.awayTeamId) {
    throw new Error(
      "Участниците в този елиминационен мач още не са определени.",
    );
  }

  if (!canFinishMatch(match)) {
    throw new Error(
      "Елиминационен мач не може да завърши наравно. Въведи краен резултат след продължения или дузпи.",
    );
  }

  await withTimeout(
    updateDoc(doc(db, "matches", matchId), {
      status: "FINISHED",
      timerState: "STOPPED",
      timerEndsAt: null,
      timerRemainingSeconds: 0,
      updatedAt: new Date().toISOString(),
    }),
    "Завършването на мача",
  );

  await resolveTournamentProgression(match.tournamentId);
}

export async function setMatchStatus(
  matchId: string,
  status: Match["status"],
): Promise<void> {
  if (status === "FINISHED") {
    await finishMatch(matchId);
    return;
  }

  const matchReference = doc(db, "matches", matchId);

  await withTimeout(
    updateDoc(matchReference, {
      status,
      updatedAt: new Date().toISOString(),
    }),
    "Промяната на статус",
  );
}

export type CreateCategoryInput = Omit<Category, "id" | "createdAt">;

export async function createCategory(
  data: CreateCategoryInput,
): Promise<string> {
  const name = data.name.trim();

  if (!name) {
    throw new Error("Името на категорията е задължително.");
  }

  const existingCategories = await getCategories(data.tournamentId);

  const categoryAlreadyExists = existingCategories.some(
    (category) =>
      category.name.trim().toLocaleLowerCase("bg") ===
      name.toLocaleLowerCase("bg"),
  );

  if (categoryAlreadyExists) {
    throw new Error("Категория с това име вече съществува в турнира.");
  }

  const categoryReference = await withTimeout(
    addDoc(collection(db, "categories"), {
      ...data,
      name,
      createdAt: serverTimestamp(),
    }),
    "Създаването на категория",
  );

  return categoryReference.id;
}

export async function getCategories(
  tournamentId: string,
): Promise<Category[]> {
  const categoriesQuery = query(
    collection(db, "categories"),
    where("tournamentId", "==", tournamentId),
  );

  const snapshot = await withTimeout(
    getDocs(categoriesQuery),
    "Зареждането на категории",
  );

  return snapshot.docs
    .map(
      (document) =>
        ({
          id: document.id,
          ...document.data(),
        }) as Category,
    )
    .sort((firstCategory, secondCategory) =>
      firstCategory.name.localeCompare(secondCategory.name, "bg"),
    );
}

export async function updateCategory(categoryId: string, updates: Partial<Omit<Category, "id" | "tournamentId" | "createdAt">>) {
  await withTimeout(updateDoc(doc(db, "categories", categoryId), { ...updates, updatedAt: serverTimestamp() }), "Редактирането на категорията");
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const teamsSnapshot = await getDocs(query(collection(db, "teams"), where("categoryId", "==", categoryId)));
  const matchesSnapshot = await getDocs(query(collection(db, "matches"), where("categoryId", "==", categoryId)));
  if (!teamsSnapshot.empty || !matchesSnapshot.empty) throw new Error("Категорията има свързани отбори или мачове и не може да бъде изтрита.");
  await withTimeout(deleteDoc(doc(db, "categories", categoryId)), "Изтриването на категорията");
}

export async function getRegistrations(tournamentId?: string): Promise<TournamentRegistration[]> {
  const registrationsQuery = tournamentId
    ? query(collection(db, "registrations"), where("tournamentId", "==", tournamentId))
    : query(collection(db, "registrations"));
  const snapshot = await withTimeout(getDocs(registrationsQuery), "Зареждането на регистрации");
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TournamentRegistration);
}

export async function createRegistration(data: Omit<TournamentRegistration, "id" | "status" | "createdAt" | "updatedAt">): Promise<string> {
  const [tournamentSnapshot, categorySnapshot, teamSnapshot] = await Promise.all([
    getDoc(doc(db, "tournaments", data.tournamentId)),
    getDoc(doc(db, "categories", data.categoryId)),
    getDoc(doc(db, "teams", data.teamId)),
  ]);
  if (!tournamentSnapshot.exists() || tournamentSnapshot.data().registrationOpen !== true) throw new Error("Регистрацията за турнира е затворена.");
  if (!categorySnapshot.exists() || categorySnapshot.data().tournamentId !== data.tournamentId || categorySnapshot.data().registrationOpen === false) throw new Error("Категорията не приема регистрации.");
  if (!teamSnapshot.exists() || teamSnapshot.data().captainUid !== data.captainUid) throw new Error("Само капитанът може да регистрира този отбор.");
  const duplicate = await getDocs(query(collection(db, "registrations"), where("teamId", "==", data.teamId)));
  if (duplicate.docs.some((item) => item.data().tournamentId === data.tournamentId && item.data().categoryId === data.categoryId)) throw new Error("Отборът вече има регистрация за тази категория.");
  const reference = await withTimeout(addDoc(collection(db, "registrations"), { ...data, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() }), "Изпращането на регистрацията");
  return reference.id;
}

export async function submitTeamRegistration(data: {
  tournamentId: string;
  categoryId: string;
  captainUid: string;
  teamName: string;
}): Promise<string> {
  const [tournamentSnapshot, categorySnapshot, playerSnapshot] = await Promise.all([
    getDoc(doc(db, "tournaments", data.tournamentId)),
    getDoc(doc(db, "categories", data.categoryId)),
    getDoc(doc(db, "players", data.captainUid)),
  ]);
  if (!playerSnapshot.exists() || playerSnapshot.data().profileCompleted !== true) throw new Error("Профилът трябва да бъде завършен.");
  if (!tournamentSnapshot.exists() || tournamentSnapshot.data().registrationOpen !== true) throw new Error("Регистрацията е затворена.");
  if (!categorySnapshot.exists() || categorySnapshot.data().tournamentId !== data.tournamentId || categorySnapshot.data().registrationOpen === false) throw new Error("Категорията не приема регистрации.");
  const teamRef = doc(collection(db, "teams"));
  const registrationRef = doc(collection(db, "registrations"));
  const batch = writeBatch(db);
  batch.set(teamRef, { name: data.teamName.trim(), tournamentId: data.tournamentId, categoryId: data.categoryId, captainUid: data.captainUid, members: [{ uid: data.captainUid, role: "captain" }], approvalStatus: "pending", createdAt: serverTimestamp() });
  batch.set(registrationRef, { tournamentId: data.tournamentId, categoryId: data.categoryId, teamId: teamRef.id, captainUid: data.captainUid, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await withTimeout(batch.commit(), "Изпращането на отборната регистрация");
  return registrationRef.id;
}

export async function updateRegistrationStatus(registrationId: string, status: RegistrationStatus): Promise<void> {
  await withTimeout(runTransaction(db, async (transaction) => {
    const registrationRef = doc(db, "registrations", registrationId);
    const registrationSnapshot = await transaction.get(registrationRef);
    if (!registrationSnapshot.exists()) throw new Error("Регистрацията не съществува.");
    const registration = registrationSnapshot.data() as TournamentRegistration;
    if (status === "approved") {
      const teamSnapshot = await transaction.get(doc(db, "teams", registration.teamId));
      if (!teamSnapshot.exists()) throw new Error("Свързаният отбор не съществува.");
      transaction.update(doc(db, "teams", registration.teamId), { approvalStatus: "approved", updatedAt: serverTimestamp() });
    } else if (status === "rejected") {
      transaction.update(doc(db, "teams", registration.teamId), { approvalStatus: "rejected", updatedAt: serverTimestamp() });
    }
    transaction.update(registrationRef, { status, updatedAt: serverTimestamp() });
  }), "Промяната на регистрацията");
}

export async function updatePlayerStat(
  matchId: string,
  playerUid: string,
  field: keyof import("@/lib/types").MatchPlayerStat,
  delta: number,
): Promise<void> {
  await withTimeout(runTransaction(db, async (transaction) => {
    const matchRef = doc(db, "matches", matchId);
    const snapshot = await transaction.get(matchRef);
    if (!snapshot.exists()) throw new Error("Мачът не съществува.");
    const match = snapshot.data() as Match;
    const current = match.playerStats?.[playerUid] ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    transaction.update(matchRef, {
      [`playerStats.${playerUid}.${field}`]: Math.max(0, current[field] + delta),
      updatedAt: serverTimestamp(),
    });
  }), "Записването на статистика за играч");
}

export async function updatePlayerGoal(
  matchId: string,
  side: "home" | "away",
  playerUid: string,
  delta: number,
): Promise<void> {
  await withTimeout(
    runTransaction(db, async (transaction) => {
      const matchRef = doc(db, "matches", matchId);

      const matchSnapshot =
        await transaction.get(matchRef);

      if (!matchSnapshot.exists()) {
        throw new Error("Мачът не съществува.");
      }

      const match =
        matchSnapshot.data() as Match;

      const teamId =
        side === "home"
          ? match.homeTeamId
          : match.awayTeamId;

      if (!teamId) {
        throw new Error(
          "Отборът не е определен за този мач.",
        );
      }

      const teamRef = doc(db, "teams", teamId);
      const playerRef = doc(
        db,
        "players",
        playerUid,
      );

      const teamSnapshot =
        await transaction.get(teamRef);

      const playerSnapshot =
        await transaction.get(playerRef);

      if (!teamSnapshot.exists()) {
        throw new Error(
          "Отборът не съществува.",
        );
      }

      if (!playerSnapshot.exists()) {
        throw new Error(
          "Играчът не съществува.",
        );
      }

      const teamData = teamSnapshot.data();
      const playerData = playerSnapshot.data();

      const members =
        (teamData.members ?? []) as Array<{
          uid: string;
          role?: "captain" | "player";
        }>;

      // Нова система:
      // teams/{teamId}.members[]
      const isModernMember = members.some(
        (member) =>
          member.uid === playerUid,
      );

      // Стара система:
      // players/{uid}.teamId
      const isLegacyMember =
        playerData.teamId === teamId;

      if (!isModernMember && !isLegacyMember) {
        throw new Error(
          "Играчът не е член на този отбор.",
        );
      }

      const scoreField =
        side === "home"
          ? "homeScore"
          : "awayScore";

      const currentScore = Number(
        match[scoreField] ?? 0,
      );

      const currentStats =
        match.playerStats?.[playerUid];

      const currentGoals =
        currentStats?.goals ?? 0;

      const nextGoals = Math.max(
        0,
        currentGoals + delta,
      );

      // Ако играчът има 0 гола и натиснем -,
      // резултатът НЕ трябва да се намалява.
      const appliedDelta =
        nextGoals - currentGoals;

      if (appliedDelta === 0) {
        return;
      }

      const nextScore = Math.max(
        0,
        currentScore + appliedDelta,
      );

      transaction.update(matchRef, {
        [scoreField]: nextScore,

        [`playerStats.${playerUid}.goals`]:
          nextGoals,

        [`playerStats.${playerUid}.assists`]:
          currentStats?.assists ?? 0,

        [`playerStats.${playerUid}.yellowCards`]:
          currentStats?.yellowCards ?? 0,

        [`playerStats.${playerUid}.redCards`]:
          currentStats?.redCards ?? 0,

        updatedAt: serverTimestamp(),
      });
    }),
    "Записването на гола",
  );
}

export async function saveCompetitionFormat(
  tournamentId: string,
  format: CompetitionFormat,
): Promise<void> {
  await withTimeout(
    setDoc(
      doc(db, "tournaments", tournamentId),
      {
        format: "GROUP_KNOCKOUT",
        poolCount: format.pools.length,
        pools: format.pools,
        competitionFormat: format,
        updatedAt: new Date().toISOString(),
      },
      {
        merge: true,
      },
    ),
    "Записването на формата на турнира",
  );
}

export async function saveTournamentFormat(
  tournamentId: string,
  format: TournamentFormat,
): Promise<void> {
  await withTimeout(
    setDoc(
      doc(db, "tournaments", tournamentId),
      {
        format,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    ),
    "Записването на формата на турнира",
  );
}
