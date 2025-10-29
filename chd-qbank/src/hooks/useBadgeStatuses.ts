import { useEffect, useReducer } from "react";
import { fetchBadgeStatuses, type BadgeStatus } from "../lib/badges";

export function useBadgeStatuses(userId: string | null) {
  const [{ badges, loading, error }, dispatch] = useReducer(
    (
      state: { badges: BadgeStatus[]; loading: boolean; error: string | null },
      action:
        | { type: "reset" }
        | { type: "start" }
        | { type: "success"; badges: BadgeStatus[] }
        | { type: "failure"; message: string }
    ) => {
      if (action.type === "reset") {
        return { badges: [], loading: false, error: null };
      }
      if (action.type === "start") {
        return { badges: [], loading: true, error: null };
      }
      if (action.type === "success") {
        return { badges: action.badges, loading: false, error: null };
      }
      return { badges: [], loading: false, error: action.message };
    },
    { badges: [], loading: false, error: null }
  );

  useEffect(() => {
    let active = true;

    if (!userId) {
      dispatch({ type: "reset" });
      return () => {
        active = false;
      };
    }

    dispatch({ type: "start" });

    fetchBadgeStatuses(userId)
      .then((badgeStatuses) => {
        if (!active) return;
        dispatch({ type: "success", badges: badgeStatuses.filter((badge) => badge.earned) });
      })
      .catch(() => {
        if (!active) return;
        dispatch({ type: "failure", message: "We couldn't load your badges. Try again soon." });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { badges, loading, error };
}
