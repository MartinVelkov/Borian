"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signOut } from "firebase/auth";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  LogOut,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { auth } from "@/lib/firebase";

import {
  getCategories,
  getPublishedTournaments,
  submitTeamRegistration,
} from "@/lib/firestore-service";

import type {
  Category,
  Tournament,
} from "@/lib/types";

import logo from "../bulgarian-street-sports-logo.jpg";

/* ======================================================== */
/* PAGE                                                     */
/* ======================================================== */

export default function PlayerPage() {
  const router = useRouter();

  const {
    user,
    player,
    loading,
  } = useAuth();

  const [
    tournaments,
    setTournaments,
  ] = useState<Tournament[]>([]);

  const [
    tournamentId,
    setTournamentId,
  ] = useState("");

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<
    "success" | "error" | ""
  >("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    tournamentsLoading,
    setTournamentsLoading,
  ] = useState(true);

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] = useState(false);

  /* ====================================================== */
  /* AUTH                                                   */
  /* ====================================================== */

  useEffect(() => {
    if (
      !loading &&
      !user
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    if (
      !loading &&
      user &&
      !player?.profileCompleted
    ) {
      router.replace(
        "/complete-profile"
      );
    }
  }, [
    loading,
    user,
    player,
    router,
  ]);

  /* ====================================================== */
  /* LOAD TOURNAMENTS                                       */
  /* ====================================================== */

  useEffect(() => {
    let cancelled =
      false;

    setTournamentsLoading(
      true
    );

    void getPublishedTournaments()
      .then((items) => {
        if (cancelled) {
          return;
        }

        const open =
          items.filter(
            (item) =>
              item.registrationOpen
          );

        setTournaments(
          open
        );

        setTournamentId(
          open[0]?.id ?? ""
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Error loading tournaments:",
          error
        );

        setMessageType(
          "error"
        );

        setMessage(
          "Неуспешно зареждане на турнирите."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setTournamentsLoading(
            false
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ====================================================== */
  /* LOAD CATEGORIES                                        */
  /* ====================================================== */

  useEffect(() => {
    if (!tournamentId) {
      setCategories([]);
      setCategoryId("");

      return;
    }

    let cancelled =
      false;

    setCategoriesLoading(
      true
    );

    setCategories([]);
    setCategoryId("");

    void getCategories(
      tournamentId
    )
      .then((items) => {
        if (cancelled) {
          return;
        }

        const open =
          items.filter(
            (item) =>
              item.registrationOpen !==
              false
          );

        setCategories(open);

        /*
         * Не избираме просто първата категория.
         * Ако имаме birthDate, избираме първата категория,
         * за която играчът отговаря на възрастта.
         */

        const firstEligible =
          open.find((category) =>
            getCategoryEligibility(
              player?.birthDate,
              category,
              getTournamentSeasonYear(
                tournaments.find(
                  (tournament) =>
                    tournament.id ===
                    tournamentId
                )
              )
            ).eligible
          );

        setCategoryId(
          firstEligible?.id ??
            open[0]?.id ??
            ""
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Error loading categories:",
          error
        );

        setCategories([]);
        setCategoryId("");

        setMessageType(
          "error"
        );

        setMessage(
          "Неуспешно зареждане на категориите."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setCategoriesLoading(
            false
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    tournamentId,
    player?.birthDate,
    tournaments,
  ]);

  /* ====================================================== */
  /* SELECTED DATA                                          */
  /* ====================================================== */

  const selectedTournament =
    useMemo(
      () =>
        tournaments.find(
          (item) =>
            item.id ===
            tournamentId
        ),
      [
        tournaments,
        tournamentId,
      ]
    );

  const selectedCategory =
    useMemo(
      () =>
        categories.find(
          (item) =>
            item.id ===
            categoryId
        ),
      [
        categories,
        categoryId,
      ]
    );

  /* ====================================================== */
  /* SEASON YEAR                                            */
  /* ====================================================== */

  const seasonYear =
    useMemo(
      () =>
        getTournamentSeasonYear(
          selectedTournament
        ),
      [selectedTournament]
    );

  /* ====================================================== */
  /* PLAYER AGE                                             */
  /* ====================================================== */

  const playerAge =
    useMemo(
      () =>
        getAgeByBirthYear(
          player?.birthDate,
          seasonYear
        ),
      [
        player?.birthDate,
        seasonYear,
      ]
    );

  /* ====================================================== */
  /* CATEGORY ELIGIBILITY                                   */
  /* ====================================================== */

  const eligibility =
    useMemo(
      () =>
        getCategoryEligibility(
          player?.birthDate,
          selectedCategory,
          seasonYear
        ),
      [
        player?.birthDate,
        selectedCategory,
        seasonYear,
      ]
    );

  /* ====================================================== */
  /* REGISTER TEAM                                          */
  /* ====================================================== */

  async function register(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    const teamName =
      String(
        formData.get(
          "teamName"
        ) ?? ""
      ).trim();

    if (!tournamentId) {
      showError(
        "Избери турнир."
      );

      return;
    }

    if (!categoryId) {
      showError(
        "Избери категория."
      );

      return;
    }

    if (!selectedCategory) {
      showError(
        "Избраната категория не е намерена."
      );

      return;
    }

    /*
     * ВАЖНО:
     * Проверяваме възрастта отново при самото
     * изпращане, а не разчитаме само на disabled бутона.
     */

    const currentEligibility =
      getCategoryEligibility(
        player?.birthDate,
        selectedCategory,
        seasonYear
      );

    if (
      !currentEligibility.eligible
    ) {
      showError(
        currentEligibility.reason
      );

      return;
    }

    if (!teamName) {
      showError(
        "Въведи име на отбора."
      );

      return;
    }

    setSaving(true);

    setMessage("");
    setMessageType("");

    try {
      await submitTeamRegistration({
        tournamentId,
        categoryId,
        captainUid:
          user.uid,
        teamName,
      });

      setMessageType(
        "success"
      );

      setMessage(
        "Заявката е изпратена успешно и очаква одобрение."
      );

      form.reset();
    } catch (error) {
      console.error(
        "Team registration error:",
        error
      );

      setMessageType(
        "error"
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Заявката не може да бъде изпратена."
      );
    } finally {
      setSaving(false);
    }
  }

  function showError(
    text: string
  ) {
    setMessageType(
      "error"
    );

    setMessage(text);
  }

  /* ====================================================== */
  /* LOGOUT                                                 */
  /* ====================================================== */

  async function handleLogout() {
    await signOut(auth);

    router.replace("/");
  }

  /* ====================================================== */
  /* LOADING                                                */
  /* ====================================================== */

  if (
    loading ||
    !user ||
    !player?.profileCompleted
  ) {
    return (
      <PlayerLoading />
    );
  }

  /* ====================================================== */
  /* PLAYER DATA                                            */
  /* ====================================================== */

  const displayName =
    player.displayName ||
    user.displayName ||
    "Играч";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("") || "P";

  /* ====================================================== */
  /* UI                                                     */
  /* ====================================================== */

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      {/* ================================================= */}
      {/* NAVIGATION                                        */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 border-b border-black/[0.04] bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src={logo}
              alt="Bulgarian Street Sports"
              width={40}
              height={40}
              priority
              className="h-9 w-9 object-contain"
            />

            <div className="hidden leading-none sm:block">
              <p className="text-[13px] font-semibold tracking-tight">
                Bulgarian Street Sports
              </p>

              <p className="mt-1 text-[11px] text-black/45">
                Player
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-full px-4 py-2 text-[13px] font-medium text-[#6e6e73] transition hover:bg-black/[0.04] hover:text-black sm:block"
            >
              Турнири
            </Link>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="flex h-9 items-center gap-2 rounded-full bg-black/[0.045] px-4 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-black/[0.08]"
            >
              <LogOut className="h-3.5 w-3.5" />

              <span className="hidden sm:inline">
                Изход
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ================================================= */}
      {/* HERO                                              */}
      {/* ================================================= */}

      <section className="relative overflow-hidden bg-black text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-[180px] top-[-240px] h-[650px] w-[650px] rounded-full bg-blue-500/20 blur-[170px]" />

          <div className="absolute -bottom-[300px] right-[-120px] h-[700px] w-[700px] rounded-full bg-orange-500/25 blur-[180px]" />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-5 text-[14px] font-semibold text-[#f5a623]">
                Играчки профил
              </p>

              <div className="flex items-center gap-5">
                <PlayerAvatar
                  photoURL={
                    player.photoURL
                  }
                  initials={
                    initials
                  }
                />

                <div>
                  <p className="mb-1 text-[13px] font-medium text-white/40">
                    Добре дошъл
                  </p>

                  <h1 className="max-w-[700px] text-[38px] font-semibold leading-[1] tracking-[-0.045em] sm:text-[48px] md:text-[60px]">
                    {displayName}
                  </h1>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/45">
                {player.email && (
                  <span>
                    {player.email}
                  </span>
                )}

                {player.phone && (
                  <>
                    <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />

                    <span>
                      {player.phone}
                    </span>
                  </>
                )}

                {getBirthYear(
                  player.birthDate
                ) && (
                  <>
                    <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />

                    <span>
                      Роден{" "}
                      {getBirthYear(
                        player.birthDate
                      )} г.
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-full bg-white/[0.08] px-4 py-2.5 ring-1 ring-white/[0.08] backdrop-blur-xl">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>

              <div>
                <p className="text-[12px] font-semibold">
                  Активен профил
                </p>

                <p className="text-[10px] text-white/40">
                  Готов за участие
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* CONTENT                                           */}
      {/* ================================================= */}

      <section className="px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 md:flex md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-[13px] font-semibold text-[#f56300]">
                Ново участие
              </p>

              <h2 className="text-[36px] font-semibold leading-[1] tracking-[-0.04em] md:text-[48px]">
                Влез в играта.
              </h2>

              <p className="mt-4 max-w-[600px] text-[16px] leading-relaxed text-[#6e6e73] md:text-[17px]">
                Избери турнир и
                категория. Системата
                автоматично проверява
                дали възрастта ти
                отговаря на избраната
                категория.
              </p>
            </div>

            <div className="mt-6 hidden items-center gap-2 text-[12px] font-medium text-[#86868b] md:flex">
              <ShieldCheck className="h-4 w-4" />

              Автоматична проверка на възрастта
            </div>
          </div>

          {tournamentsLoading ? (
            <RegistrationLoading />
          ) : tournaments.length ===
            0 ? (
            <EmptyTournaments />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              {/* ========================================= */}
              {/* FORM                                      */}
              {/* ========================================= */}

              <div className="rounded-[32px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-black/[0.04] sm:p-8 md:p-10">
                <div className="mb-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#f5f5f7]">
                    <Trophy className="h-5 w-5 text-[#1d1d1f]" />
                  </div>

                  <h3 className="text-[25px] font-semibold tracking-[-0.025em]">
                    Регистрация за турнир
                  </h3>

                  <p className="mt-2 max-w-[520px] text-[14px] leading-relaxed text-[#86868b]">
                    Избери турнир и
                    категория и въведи
                    името на отбора.
                  </p>
                </div>

                <form
                  onSubmit={register}
                  className="space-y-5"
                >
                  {/* TOURNAMENT */}

                  <AppleSelect
                    id="tournament"
                    label="Турнир"
                    value={
                      tournamentId
                    }
                    onChange={(
                      value
                    ) => {
                      setTournamentId(
                        value
                      );

                      setMessage("");
                      setMessageType(
                        ""
                      );
                    }}
                    disabled={
                      saving
                    }
                  >
                    {tournaments.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.name}
                        </option>
                      )
                    )}
                  </AppleSelect>

                  {/* CATEGORY */}

                  <AppleSelect
                    id="category"
                    label="Категория"
                    value={
                      categoryId
                    }
                    onChange={(
                      value
                    ) => {
                      setCategoryId(
                        value
                      );

                      setMessage("");
                      setMessageType(
                        ""
                      );
                    }}
                    disabled={
                      saving ||
                      categoriesLoading ||
                      categories.length ===
                        0
                    }
                  >
                    {categoriesLoading ? (
                      <option value="">
                        Зареждане...
                      </option>
                    ) : categories.length ===
                      0 ? (
                      <option value="">
                        Няма отворени категории
                      </option>
                    ) : (
                      categories.map(
                        (item) => {
                          const status =
                            getCategoryEligibility(
                              player.birthDate,
                              item,
                              seasonYear
                            );

                          return (
                            <option
                              key={
                                item.id
                              }
                              value={
                                item.id
                              }
                              disabled={
                                !status.eligible
                              }
                            >
                              {getCategoryOptionLabel(
                                item,
                                status
                              )}
                            </option>
                          );
                        }
                      )
                    )}
                  </AppleSelect>

                  {/* AGE STATUS */}

                  {selectedCategory && (
                    <AgeEligibilityCard
                      eligibility={
                        eligibility
                      }
                      category={
                        selectedCategory
                      }
                      seasonYear={
                        seasonYear
                      }
                    />
                  )}

                  {/* TEAM NAME */}

                  <AppleInput
                    id="teamName"
                    name="teamName"
                    label="Име на отбора"
                    placeholder="Street Kings"
                    required
                    disabled={
                      saving ||
                      !eligibility.eligible
                    }
                    icon={
                      <Users />
                    }
                  />

                  {/* MESSAGE */}

                  {message && (
                    <StatusMessage
                      type={
                        messageType ||
                        "error"
                      }
                    >
                      {message}
                    </StatusMessage>
                  )}

                  {/* SUBMIT */}

                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      !tournamentId ||
                      !categoryId ||
                      !eligibility.eligible
                    }
                    className="group h-[56px] w-full rounded-full bg-[#0071e3] text-[15px] font-semibold text-white shadow-none transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                        Изпращане...
                      </>
                    ) : categoryId &&
                      !eligibility.eligible ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />

                        Не отговаряш на възрастта
                      </>
                    ) : (
                      <>
                        Изпрати заявка

                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* ========================================= */}
              {/* TOURNAMENT CARD                           */}
              {/* ========================================= */}

              <div className="relative overflow-hidden rounded-[32px] bg-black p-7 text-white sm:p-8 md:p-10">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-[100px] -top-[100px] h-[350px] w-[350px] rounded-full bg-orange-500/20 blur-[100px]" />

                  <div className="absolute -bottom-[150px] -left-[100px] h-[350px] w-[350px] rounded-full bg-blue-500/15 blur-[110px]" />
                </div>

                <div className="relative flex h-full min-h-[470px] flex-col">
                  <div>
                    <div className="mb-7 flex items-center justify-between">
                      <span className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white/60 ring-1 ring-white/[0.07]">
                        Избран турнир
                      </span>

                      <span className="text-[38px]">
                        {selectedTournament?.sport ===
                        "basketball"
                          ? "🏀"
                          : "⚽"}
                      </span>
                    </div>

                    <h3 className="max-w-[430px] text-[32px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[38px]">
                      {selectedTournament?.name ||
                        "Избери турнир"}
                    </h3>

                    {selectedTournament?.description && (
                      <p className="mt-5 line-clamp-3 text-[14px] leading-relaxed text-white/45">
                        {
                          selectedTournament.description
                        }
                      </p>
                    )}
                  </div>

                  {/* DETAILS */}

                  <div className="mt-9 space-y-3">
                    {selectedTournament?.startDate && (
                      <TournamentDetail
                        icon={
                          <CalendarDays />
                        }
                      >
                        {formatTournamentDate(
                          selectedTournament.startDate
                        )}
                      </TournamentDetail>
                    )}

                    {selectedTournament?.location && (
                      <TournamentDetail
                        icon={
                          <MapPin />
                        }
                      >
                        {
                          selectedTournament.location
                        }
                      </TournamentDetail>
                    )}

                    <TournamentDetail
                      icon={
                        <Users />
                      }
                    >
                      {selectedCategory
                        ? selectedCategory.name
                        : categoriesLoading
                          ? "Зареждане..."
                          : "Избери категория"}
                    </TournamentDetail>

                    {playerAge !== null && (
                      <TournamentDetail
                        icon={
                          <ShieldCheck />
                        }
                      >
                        Възраст за сезон{" "}
                        {seasonYear}:{" "}
                        {playerAge} г.
                      </TournamentDetail>
                    )}
                  </div>

                  {/* BOTTOM */}

                  <div className="mt-auto pt-10">
                    <div className="h-px bg-white/[0.08]" />

                    <div className="mt-6 flex items-start gap-3">
                      {eligibility.eligible ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                      ) : (
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#f5a623]" />
                      )}

                      <p className="text-[12px] leading-relaxed text-white/40">
                        {eligibility.eligible
                          ? "Отговаряш на възрастовите изисквания за избраната категория."
                          : eligibility.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* FOOTER                                            */}
      {/* ================================================= */}

      <footer className="px-5 pb-10 md:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 border-t border-black/[0.07] pt-7 text-[11px] text-[#86868b] sm:flex-row sm:items-center sm:justify-between">
          <p>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Bulgarian Street Sports
          </p>

          <Link
            href="/"
            className="transition hover:text-black"
          >
            Всички турнири
          </Link>
        </div>
      </footer>
    </main>
  );
}

/* ======================================================== */
/* AGE LOGIC                                                */
/* ======================================================== */

/**
 * Взима годината на раждане.
 *
 * Поддържа:
 * "2015-05-24"
 * "2015"
 */
function getBirthYear(
  birthDate?: string | null
): number | null {
  if (!birthDate) {
    return null;
  }

  const year =
    Number(
      String(
        birthDate
      ).slice(0, 4)
    );

  if (
    !Number.isFinite(year) ||
    year < 1900 ||
    year >
      new Date().getFullYear()
  ) {
    return null;
  }

  return year;
}

/**
 * Изчислява възрастта САМО по година.
 *
 * Пример:
 * seasonYear = 2026
 * birthYear = 2015
 *
 * age = 11
 */
function getAgeByBirthYear(
  birthDate:
    | string
    | null
    | undefined,
  seasonYear: number
): number | null {
  const birthYear =
    getBirthYear(
      birthDate
    );

  if (
    birthYear === null
  ) {
    return null;
  }

  return (
    seasonYear -
    birthYear
  );
}

/**
 * Опитва се да вземе годината на турнира.
 *
 * Ако startDate не може да се прочете,
 * използва текущата година.
 */
function getTournamentSeasonYear(
  tournament?:
    | Tournament
    | null
): number {
  if (!tournament) {
    return new Date().getFullYear();
  }

  const date =
    parseTournamentDate(
      tournament.startDate
    );

  if (
    date &&
    !Number.isNaN(
      date.getTime()
    )
  ) {
    return date.getFullYear();
  }

  return new Date().getFullYear();
}

/**
 * Проверява дали играчът отговаря
 * на minAge / maxAge на категорията.
 */
function getCategoryEligibility(
  birthDate:
    | string
    | null
    | undefined,
  category:
    | Category
    | undefined,
  seasonYear: number
): {
  eligible: boolean;
  age: number | null;
  birthYear: number | null;
  reason: string;
} {
  if (!category) {
    return {
      eligible: false,
      age: null,
      birthYear:
        getBirthYear(
          birthDate
        ),
      reason:
        "Избери категория.",
    };
  }

  const birthYear =
    getBirthYear(
      birthDate
    );

  if (
    birthYear === null
  ) {
    return {
      eligible: false,
      age: null,
      birthYear: null,
      reason:
        "В профила няма валидна дата на раждане. Попълни датата си на раждане, за да се регистрираш.",
    };
  }

  const age =
    getAgeByBirthYear(
      birthDate,
      seasonYear
    );

  if (age === null) {
    return {
      eligible: false,
      age: null,
      birthYear,
      reason:
        "Не можем да определим възрастта ти.",
    };
  }

  /*
   * Ако minAge/maxAge идват от Firestore
   * като number, това ще работи директно.
   */

  const minAge =
    typeof category.minAge ===
    "number"
      ? category.minAge
      : null;

  const maxAge =
    typeof category.maxAge ===
    "number"
      ? category.maxAge
      : null;

  if (
    minAge !== null &&
    age < minAge
  ) {
    return {
      eligible: false,
      age,
      birthYear,
      reason: `За категория „${category.name}“ минималната възраст е ${minAge} г. Твоята възраст за сезон ${seasonYear} е ${age} г.`,
    };
  }

  if (
    maxAge !== null &&
    age > maxAge
  ) {
    return {
      eligible: false,
      age,
      birthYear,
      reason: `За категория „${category.name}“ максималната възраст е ${maxAge} г. Твоята възраст за сезон ${seasonYear} е ${age} г.`,
    };
  }

  return {
    eligible: true,
    age,
    birthYear,
    reason: "",
  };
}

/* ======================================================== */
/* CATEGORY LABEL                                           */
/* ======================================================== */

function getCategoryOptionLabel(
  category: Category,
  eligibility: {
    eligible: boolean;
    age: number | null;
    reason: string;
  }
) {
  const ageRange =
    getAgeRangeLabel(
      category
    );

  if (
    !eligibility.eligible
  ) {
    return `${category.name}${ageRange ? ` · ${ageRange}` : ""} — недостъпна`;
  }

  return `${category.name}${ageRange ? ` · ${ageRange}` : ""}`;
}

function getAgeRangeLabel(
  category: Category
) {
  const minAge =
    typeof category.minAge ===
    "number"
      ? category.minAge
      : null;

  const maxAge =
    typeof category.maxAge ===
    "number"
      ? category.maxAge
      : null;

  if (
    minAge !== null &&
    maxAge !== null
  ) {
    return `${minAge}–${maxAge} г.`;
  }

  if (
    minAge !== null
  ) {
    return `${minAge}+ г.`;
  }

  if (
    maxAge !== null
  ) {
    return `до ${maxAge} г.`;
  }

  return "";
}

/* ======================================================== */
/* AGE ELIGIBILITY CARD                                     */
/* ======================================================== */

function AgeEligibilityCard({
  eligibility,
  category,
  seasonYear,
}: {
  eligibility: {
    eligible: boolean;
    age: number | null;
    birthYear: number | null;
    reason: string;
  };
  category: Category;
  seasonYear: number;
}) {
  const ageRange =
    getAgeRangeLabel(
      category
    );

  if (
    eligibility.eligible
  ) {
    return (
      <div className="rounded-[16px] bg-[#f0faf3] px-4 py-4 ring-1 ring-green-600/10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#167332]" />

          <div>
            <p className="text-[13px] font-semibold text-[#167332]">
              Имаш право да участваш
            </p>

            <p className="mt-1 text-[12px] leading-relaxed text-[#167332]/70">
              {eligibility.birthYear !==
                null &&
                `Роден/а си през ${eligibility.birthYear} г. `}

              За сезон{" "}
              {seasonYear} възрастта ти
              е{" "}
              {eligibility.age} г.
            </p>

            {ageRange && (
              <p className="mt-2 text-[11px] font-medium text-[#167332]/60">
                Възраст за категорията:{" "}
                {ageRange}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] bg-[#fff2f2] px-4 py-4 ring-1 ring-red-500/10">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#c50000]" />

        <div>
          <p className="text-[13px] font-semibold text-[#c50000]">
            Не можеш да се регистрираш в тази категория
          </p>

          <p className="mt-1 text-[12px] leading-relaxed text-[#c50000]/75">
            {
              eligibility.reason
            }
          </p>

          {ageRange && (
            <p className="mt-2 text-[11px] font-medium text-[#c50000]/60">
              Възраст за категорията:{" "}
              {ageRange}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======================================================== */
/* PLAYER AVATAR                                            */
/* ======================================================== */

function PlayerAvatar({
  photoURL,
  initials,
}: {
  photoURL?: string | null;
  initials: string;
}) {
  if (photoURL) {
    return (
      <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/15 sm:h-[88px] sm:w-[88px]">
        <img
          src={photoURL}
          alt="Профилна снимка"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[24px] font-semibold tracking-[-0.03em] text-white ring-1 ring-white/15 backdrop-blur-xl sm:h-[88px] sm:w-[88px] sm:text-[28px]">
      {initials}
    </div>
  );
}

/* ======================================================== */
/* APPLE INPUT                                              */
/* ======================================================== */

function AppleInput({
  id,
  label,
  icon,
  className = "",
  ...props
}: ComponentProps<
  typeof Input
> & {
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#86868b] [&>svg]:h-[17px] [&>svg]:w-[17px]">
          {icon}
        </span>
      )}

      <Input
        {...props}
        id={id}
        aria-label={label}
        className={`h-[60px] rounded-[16px] border-0 bg-[#f5f5f7] pb-[7px] pt-[22px] text-[15px] text-[#1d1d1f] shadow-none ring-1 ring-black/[0.04] transition placeholder:text-transparent hover:bg-[#f1f1f3] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0071e3] ${
          icon
            ? "pl-11 pr-4"
            : "px-4"
        } ${className}`}
        placeholder={
          props.placeholder ||
          label
        }
      />

      <label
        htmlFor={id}
        className={`pointer-events-none absolute top-[8px] z-10 text-[10px] font-medium text-[#86868b] ${
          icon
            ? "left-11"
            : "left-4"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

/* ======================================================== */
/* APPLE SELECT                                             */
/* ======================================================== */

function AppleSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        aria-label={label}
        className="h-[60px] w-full appearance-none rounded-[16px] border-0 bg-[#f5f5f7] px-4 pb-[7px] pr-12 pt-[22px] text-[15px] text-[#1d1d1f] outline-none ring-1 ring-black/[0.04] transition hover:bg-[#f1f1f3] focus:bg-white focus:ring-2 focus:ring-[#0071e3] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>

      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-[8px] z-10 text-[10px] font-medium text-[#86868b]"
      >
        {label}
      </label>

      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
    </div>
  );
}

/* ======================================================== */
/* STATUS MESSAGE                                           */
/* ======================================================== */

function StatusMessage({
  type,
  children,
}: {
  type:
    | "success"
    | "error";
  children: ReactNode;
}) {
  if (
    type === "success"
  ) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-[16px] bg-[#f0faf3] px-4 py-4 text-[13px] font-medium leading-relaxed text-[#167332] ring-1 ring-green-600/10"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

        <span>
          {children}
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-[16px] bg-[#fff2f2] px-4 py-4 text-[13px] font-medium leading-relaxed text-[#c50000] ring-1 ring-red-500/10"
    >
      {children}
    </div>
  );
}

/* ======================================================== */
/* TOURNAMENT DETAIL                                        */
/* ======================================================== */

function TournamentDetail({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.055] px-4 py-3.5 ring-1 ring-white/[0.06]">
      <span className="text-white/40 [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>

      <span className="text-[13px] font-medium text-white/70">
        {children}
      </span>
    </div>
  );
}

/* ======================================================== */
/* EMPTY TOURNAMENTS                                        */
/* ======================================================== */

function EmptyTournaments() {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-white px-6 py-20 text-center ring-1 ring-black/[0.04] md:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/15 blur-[100px]" />

      <div className="relative">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#f5f5f7]">
          <Trophy className="h-7 w-7 text-[#86868b]" />
        </div>

        <h3 className="text-[27px] font-semibold tracking-[-0.03em]">
          Очаквайте скоро.
        </h3>

        <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-[#86868b]">
          В момента няма публикувани
          турнири с отворена
          регистрация.
        </p>

        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-1 text-[14px] font-semibold text-[#0066cc]"
        >
          Виж всички турнири

          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ======================================================== */
/* LOADING                                                  */
/* ======================================================== */

function PlayerLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
      <div className="text-center">
        <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-[#0071e3]" />

        <p className="text-[13px] font-medium text-[#86868b]">
          Зареждане на профила...
        </p>
      </div>
    </main>
  );
}

function RegistrationLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="h-[520px] animate-pulse rounded-[32px] bg-white" />

      <div className="h-[520px] animate-pulse rounded-[32px] bg-black/90" />
    </div>
  );
}

/* ======================================================== */
/* DATE HELPERS                                             */
/* ======================================================== */

function parseTournamentDate(
  date: unknown
): Date | null {
  try {
    if (
      date instanceof Date
    ) {
      return date;
    }

    if (
      typeof date ===
        "string" ||
      typeof date ===
        "number"
    ) {
      const parsed =
        new Date(date);

      return Number.isNaN(
        parsed.getTime()
      )
        ? null
        : parsed;
    }

    if (
      date &&
      typeof date ===
        "object" &&
      "toDate" in date &&
      typeof (
        date as {
          toDate?: unknown;
        }
      ).toDate ===
        "function"
    ) {
      return (
        date as {
          toDate: () => Date;
        }
      ).toDate();
    }

    return null;
  } catch {
    return null;
  }
}

function formatTournamentDate(
  date: unknown
) {
  const parsedDate =
    parseTournamentDate(
      date
    );

  if (!parsedDate) {
    return "Дата предстои";
  }

  return new Intl.DateTimeFormat(
    "bg-BG",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    parsedDate
  );
}