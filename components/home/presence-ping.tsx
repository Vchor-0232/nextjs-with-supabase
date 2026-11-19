"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PING_EVERY_MS } from "@/lib/presence-shared";

// Tells Gamesprout "I'm here" while the site is open and visible, so
// friends can see you're online. Renders nothing.
export function PresencePing() {
  useEffect(() => {
    const supabase = createClient();
    const ping = () => {
      if (document.visibilityState === "visible") {
        // Errors are fine to ignore (e.g. before the database update).
        void supabase.rpc("touch_presence").then(() => undefined);
      }
    };
    ping();
    const timer = setInterval(ping, PING_EVERY_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}
