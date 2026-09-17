export type TournamentFormat =
  | "ROUND_ROBIN"
  | "GROUP_KNOCKOUT"
  | "CUSTOM";

export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export type MatchTimerState =
  | "STOPPED"
  | "RUNNING"
  | "PAUSED";

export type MatchSport =
  | "FOOTBALL"
  | "BASKETBALL";

export type MatchPossession =
  | "HOME"
  | "AWAY"
  | null;

export type PoolSeedingMode =
  | "SNAKE"
  | "RANDOM"
  | "ALPHABETICAL";

export type KnockoutSize =
  | 0
  | 2
  | 4
  | 8
  | 16;

export type ActiveKnockoutSize = Exclude<KnockoutSize, 0>;

export type MatchStage =
  | "POOL"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

export type PoolRankingRule =
  | "POINTS"
  | "SCORE_DIFFERENCE"
  | "SCORED"
  | "WINS"
  | "HEAD_TO_HEAD"
  | "ALPHABETICAL";

export type CategoryGender = "OPEN" | "MALE" | "FEMALE" | "MIXED";

export type TournamentGroup = {
  id: string;
  name: string;
  teamIds: string[];
};

export type Team = {
  id: string;
  tournamentId: string;
  name: string;

  /* 1 = highest seed. */
  seed?: number;

  categoryId?: string;
  jerseyColor?: string;
  logoUrl?: string;
  captainUid?: string;
  members?: TeamMember[];
  approvalStatus?: "pending" | "approved" | "rejected";
  createdAt?: string;
  updatedAt?: string;
};

export type TeamMember = {
  uid: string;
  role: "captain" | "player";
  number?: number;
};

export type Player = {
  uid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  birthDate?: string | null;
  photoURL?: string | null;
  role: "player";
  authProviders: string[];
  profileCompleted: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;

  /* Compatibility with legacy player documents. */
  id?: string;
  teamId?: string;
  number?: number;
  photoUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type MatchPlayerStat = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type Category = {
  id: string;
  tournamentId: string;
  name: string;
  description?: string;
  sport?: MatchSport;
  minAge?: number | null;
  maxAge?: number | null;
  gender?: CategoryGender;
  startDate?: string;
  startTime?: string;
  maxTeams?: number;
  registrationOpen?: boolean;
  order?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TournamentPool = {
  id: string;
  name: string;
  order: number;
  teams: Team[];
};

/*
 * Describes where a participant in a match comes from.
 */
export type MatchSource =
  | {
      type: "TEAM";
      teamId: string;
      teamName: string;
      label: string;
    }
  | {
      type: "POOL_POSITION";
      poolId: string;
      poolName: string;
      position: number;
      label: string;
    }
  | {
      /*
       * Example: the best runner-up across all groups.
       * rank = 1 means the best team at the selected position,
       * rank = 2 means the second-best team at that position, etc.
       */
      type: "BEST_POOL_POSITION";
      position: number;
      rank: number;
      poolIds?: string[];
      label: string;
    }
  | {
      type: "MATCH_WINNER";
      matchId: string;
      label: string;
    }
  | {
      type: "MATCH_LOSER";
      matchId: string;
      label: string;
    };

export type QualificationSource = Extract<
  MatchSource,
  | { type: "TEAM" }
  | { type: "POOL_POSITION" }
  | { type: "BEST_POOL_POSITION" }
>;

/*
 * slot 0 = home side of knockout match 1
 * slot 1 = away side of knockout match 1
 * slot 2 = home side of knockout match 2
 * slot 3 = away side of knockout match 2
 */
export type QualificationSlot = {
  slot: number;
  source: QualificationSource;
};

export type CompetitionFormat = {
  type: "GROUP_KNOCKOUT";
  seedingMode: PoolSeedingMode;
  pools: TournamentPool[];
  knockoutSize: KnockoutSize;
  qualificationSlots: QualificationSlot[];
  rankingRules: PoolRankingRule[];
  includeThirdPlaceMatch: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  location?: string;
  startDate: string;
  format: TournamentFormat;
  matchDuration: number;
  breakDuration: number;
  fieldCount: number;
  sport?: MatchSport;
  endDate?: string;
  status?: "UPCOMING" | "ACTIVE" | "FINISHED" | "CANCELLED";
  description?: string;
  imageURL?: string;
  registrationOpen?: boolean;
  registrationDeadline?: string;
  published?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  /* Optional for compatibility with old tournaments. */
  poolCount?: number;
  pools?: TournamentPool[];
  competitionFormat?: CompetitionFormat;
};

export type RegistrationStatus = "pending" | "approved" | "rejected";

export type TournamentRegistration = {
  id: string;
  name:string;
  email: string;
  phone: string;
  tournamentId: string;
  categoryId: string;
  teamId: string;
  captainUid: string;
  status: RegistrationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Match = {
  id: string;
  tournamentId: string;
  categoryId?: string;

  /*
   * Unresolved knockout games can use an empty ID while the name contains
   * a label such as "Победител от полуфинал 1".
   */
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;

  startTime?: string;
  endTime?: string;
  field?: string;
  status: MatchStatus;

  homeScore?: number;
  awayScore?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeCorners?: number;
  awayCorners?: number;

  currentHalf?: 1 | 2;
  halfDurationSeconds?: number;

  timerRemainingSeconds?: number;
  timerState?: MatchTimerState;
  timerEndsAt?: string | null;

  sport?: MatchSport;

  period?: number;
  possession?: MatchPossession;
  homeTimeouts?: number;
  awayTimeouts?: number;

  stage?: MatchStage;
  roundLabel?: string;

  poolId?: string;
  poolName?: string;
  poolRound?: number;
  /* Legacy aliases retained while old schedules are migrated. */
  phase?: "GROUP" | "KNOCKOUT";
  groupId?: string;

  /* Position inside a knockout round, starting from 0. */
  bracketOrder?: number;

  homeSource?: MatchSource;
  awaySource?: MatchSource;

  playerStats?: Record<string, MatchPlayerStat>;

  createdAt?: string;
  updatedAt?: string;
};

export type PoolStanding = {
  poolId: string;
  poolName: string;
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scored: number;
  conceded: number;
  difference: number;
  points: number;
};

export type PoolStandings = {
  poolId: string;
  poolName: string;
  completed: boolean;
  standings: PoolStanding[];
};
