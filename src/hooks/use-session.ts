import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/store";
import { syncSession } from "../server/auth.functions";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export function useSession({
  onSessionSynced,
}: { onSessionSynced?: () => void | Promise<void> } = {}) {
  const { setUser, setLoading } = useAuth();
  const lastTokenRef = useRef<string | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    async function handleSession(session: Session | null) {
      if (session) {
        const token = session.access_token;
        document.cookie = `sb-access-token=${token}; path=/; max-age=${session.expires_in}; SameSite=Lax; Secure`;

        if (lastTokenRef.current === token) {
          if (syncPromiseRef.current) await syncPromiseRef.current;
          return;
        }

        lastTokenRef.current = token;
        setLoading(true);
        const syncPromise = syncSession({})
          .then(async (dbUser) => {
            setUser(dbUser);
            try {
              await onSessionSynced?.();
            } catch (err) {
              console.error("Failed to refresh routes after session sync:", err);
            }
          })
          .catch((err) => {
            console.error("Failed to sync session with Prisma:", err);
            lastTokenRef.current = null;
            setUser(null);
          })
          .finally(() => {
            syncPromiseRef.current = null;
            setLoading(false);
          });
        syncPromiseRef.current = syncPromise;
        await syncPromise;
      } else {
        lastTokenRef.current = null;
        syncPromiseRef.current = null;
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure`;
        setUser(null);
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
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
  }, [setUser, setLoading, onSessionSynced]);
}
