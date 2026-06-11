import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/store";
import { syncSession } from "../server/auth.functions";

export function useSession() {
  const { user, setUser, setLoading } = useAuth();

  useEffect(() => {
    async function handleSession(session: any) {
      if (session) {
        // Set the session cookie for TanStack Start Server Functions
        // session.expires_in is in seconds, max-age expects seconds
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
        // Clear session cookie
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
        setUser(null);
        setLoading(false);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);
}
