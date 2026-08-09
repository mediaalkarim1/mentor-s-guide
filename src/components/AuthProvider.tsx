import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthContextType = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  mentor: { id: string; name: string } | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  loading: true,
  user: null,
  session: null,
  isAdmin: false,
  mentor: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mentor, setMentor] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleSession(currentSession: Session | null) {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const email = currentSession.user.email?.toLowerCase() ?? "";
        const isAdminEmail = email.includes("admin") || email === "admin@mutabaah.sch.id";
        setIsAdmin(isAdminEmail);
      } else {
        setIsAdmin(false);
        setMentor(null);
      }
      setLoading(false);
    }

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        await handleSession(data.session ?? null);
      } catch (err) {
        console.error("AuthProvider initAuth error:", err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession ?? null);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setMentor(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ loading, user, session, isAdmin, mentor, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
