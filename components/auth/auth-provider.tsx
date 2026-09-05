"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getPlayerProfile } from "@/lib/firestore-service";
import type { Player } from "@/lib/types";

type AuthState = {
  user: User | null;
  player: Player | null;
  loading: boolean;
  isAdmin: boolean;
  refreshPlayer: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function refreshPlayer() {
    setPlayer(auth.currentUser ? await getPlayerProfile(auth.currentUser.uid) : null);
  }

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);
    try {
      // Временно премахваме проверката за админ права.
      setIsAdmin(false);
      setPlayer(nextUser ? await getPlayerProfile(nextUser.uid) : null);
    } finally {
      setLoading(false);
    }
  }), []);

  const value = useMemo(
    () => ({ user, player, loading, isAdmin, refreshPlayer }),
    [user, player, loading, isAdmin],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth трябва да се използва в AuthProvider.");
  return value;
}
