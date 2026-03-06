"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ensureOpenChallengesStatusAction } from "./home-actions";
import { formatDateLocal } from "@/lib/cadence";

/**
 * On home mount, run ensure with the user's local date so open challenges past
 * end_date get marked completed, then refresh so the list re-renders with correct status.
 */
export default function HomePageSync() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    const clientToday = formatDateLocal(new Date());
    ensureOpenChallengesStatusAction(clientToday).then(() => {
      router.refresh();
    });
  }, [router]);

  return null;
}
