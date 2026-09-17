export const ADMIN_EMAIL = "martivelkov5@gmail.com";
export const BATUT_EMAIL = "svetomirraychev07@gmail.com";

export type HomeRoute =
  | "/dashboard"
  | "/batut"
  | "/player"
  | "/complete-profile";

export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export function getHomeRoute(
  email: string | null,
  profileComplete: boolean,
): HomeRoute {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === ADMIN_EMAIL) {
    return "/dashboard";
  }

  if (normalizedEmail === BATUT_EMAIL) {
    return "/batut";
  }

  return profileComplete ? "/player" : "/complete-profile";
}
