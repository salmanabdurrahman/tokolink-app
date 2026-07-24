import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/store";
import { syncSession } from "../server/auth.functions";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export function useSession() {
  const { user, setUser, setLoading } = useAuth();

  useEffect(() => {
    async function handleSession(session: Session | null) {
      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;

        try {
          setLoading(true);
          const dbUser = await syncSession({});
          setUser(dbUser);
        } catch (err) {
          console.error("Failed to sync session with Prisma:", err);
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
        setUser(null);
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }: any) => {
      handleSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        handleSession(session);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);
}
