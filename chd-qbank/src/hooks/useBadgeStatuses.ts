import { useEffect, useState } from "react";
import { fetchBadgeStatuses, type BadgeStatus } from "../lib/badges";

export function useBadgeStatuses(userId: string | null) {
  const [badges, setBadges] = useState<BadgeStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const schedule = (callback: () => void) => {
      Promise.resolve().then(() => {
        if (!active) return;
        callback();
      });
    };

    if (!userId) {
      schedule(() => {
        setBadges([]);
        setLoading(false);
        setError(null);
      });
      return () => {
        active = false;
      };
    }

    schedule(() => {
      setLoading(true);
      setError(null);
    });

    fetchBadgeStatuses(userId)
      .then((badgeStatuses) => {
        schedule(() => {
          setBadges(badgeStatuses.filter((badge) => badge.earned));
        });
      })
      .catch(() => {
        schedule(() => {
          setBadges([]);
          setError("We couldn't load your badges. Try again soon.");
        });
      })
      .finally(() => {
        schedule(() => {
          setLoading(false);
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { badges, loading, error };
}
