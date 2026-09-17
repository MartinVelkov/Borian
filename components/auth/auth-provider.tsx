"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getPlayerProfile } from "@/lib/firestore-service";
import { getHomeRoute, isAdminEmail, type HomeRoute } from "@/lib/auth-routing";
import type { Player } from "@/lib/types";

type AuthState = {
  user: User | null;
  player: Player | null;
  loading: boolean;
  isAdmin: boolean;
  homeRoute: HomeRoute | null;
  refreshPlayer: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  const refreshPlayer = useCallback(async () => {
    const currentUser = auth.currentUser;
    const requestId = ++profileRequestId.current;

    try {
      const nextPlayer = currentUser
        ? await getPlayerProfile(currentUser.uid)
        : null;

      if (
        requestId === profileRequestId.current &&
        auth.currentUser?.uid === currentUser?.uid
      ) {
        setPlayer(nextPlayer);
      }
    } finally {
      if (
        requestId === profileRequestId.current &&
        auth.currentUser?.uid === currentUser?.uid
      ) {
        setLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    profileRequestId.current += 1;
    setUser(null);
    setPlayer(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const requestId = ++profileRequestId.current;
      setLoading(true);
      setUser(nextUser);
      setPlayer(null);

      try {
        const nextPlayer = nextUser
          ? await getPlayerProfile(nextUser.uid)
          : null;

        if (
          active &&
          requestId === profileRequestId.current &&
          auth.currentUser?.uid === nextUser?.uid
        ) {
          setPlayer(nextPlayer);
        }
      } catch (error) {
        console.error("Failed to load the authenticated player profile:", error);
      } finally {
        if (
          active &&
          requestId === profileRequestId.current &&
          auth.currentUser?.uid === nextUser?.uid
        ) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const isAdmin = isAdminEmail(user?.email);
  const homeRoute = user
    ? getHomeRoute(user.email, player?.profileCompleted === true)
    : null;

  const value = useMemo(
    () => ({ user, player, loading, isAdmin, homeRoute, refreshPlayer, logout }),
    [user, player, loading, isAdmin, homeRoute, refreshPlayer, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth трябва да се използва в AuthProvider.");
  return value;
}
