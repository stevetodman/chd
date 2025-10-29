import { useEffect, useState } from "react";
import { fetchBadgeStatuses, type BadgeStatus } from "../lib/badges";

type BadgeState = {
  badges: BadgeStatus[];
  loading: boolean;
  error: string | null;
};

export function useBadgeStatuses(userId: string | null) {
  const [state, setState] = useState<BadgeState>({ badges: [], loading: false, error: null });

  useEffect(() => {
    if (!userId) {
      return () => {};
    }

    let active = true;

    const loadingTimer = setTimeout(() => {
      if (!active) return;
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }, 0);

    fetchBadgeStatuses(userId)
      .then((badgeStatuses) => {
        if (!active) return;
        setState({ badges: badgeStatuses.filter((badge) => badge.earned), loading: false, error: null });
      })
      .catch(() => {
        if (!active) return;
        setState({ badges: [], loading: false, error: "We couldn't load your badges. Try again soon." });
      });

    return () => {
      active = false;
      clearTimeout(loadingTimer);
    };
  }, [userId]);

  if (!userId) {
    return { badges: [], loading: false, error: null };
  }

  return state;
}
