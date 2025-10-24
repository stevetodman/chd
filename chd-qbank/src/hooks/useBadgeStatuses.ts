import { useEffect, useState } from "react";
import { fetchBadgeStatuses, type BadgeStatus } from "../lib/badges";

export function useBadgeStatuses(userId: string | null) {
  const [badges, setBadges] = useState<BadgeStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setBadges([]);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    fetchBadgeStatuses(userId)
      .then((badgeStatuses) => {
        if (!active) return;
        setBadges(badgeStatuses.filter((badge) => badge.earned));
      })
      .catch(() => {
        if (!active) return;
        setBadges([]);
        setError("We couldn't load your badges. Try again soon.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { badges, loading, error };
}
