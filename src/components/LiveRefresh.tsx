"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Re-renders the page when anyone joins, leaves, pays, or the split gets sliced. */
export function LiveRefresh({ requestId }: { requestId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };
    const channel = supabase
      .channel(`live-${requestId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", ...(requestId ? { filter: `request_id=eq.${requestId}` } : {}) },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "requests", ...(requestId ? { filter: `id=eq.${requestId}` } : {}) }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [requestId, router]);

  return null;
}
