import { Link } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";
import { NavigationBar, type NavigationLink } from "../design-system";
import { Button } from "./ui/Button";

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));

  const primaryLinks: NavigationLink[] = [
    { to: "/practice", label: "Practice" },
    { to: "/review", label: "Review" },
    { to: "/games/murmurs", label: "Murmurs" },
    { to: "/games/cxr", label: "CXR Match" }
  ];

  if (leaderboardEnabled && settingsLoaded) {
    primaryLinks.push({ to: "/leaderboard", label: "Leaderboard" });
  }

  const accountLinks: NavigationLink[] = session
    ? [{ to: "/profile/alias", label: "Profile" }]
    : [
        { to: "/login", label: "Login" },
        { to: "/signup", label: "Signup" }
      ];

  const brand = (
    <Link to="/dashboard" className="text-lg font-semibold text-brand-600 transition-colors hover:text-brand-500">
      {APP_NAME}
    </Link>
  );

  const desktopActions = session ? (
    <Button
      type="button"
      variant="secondary"
      className="hidden md:inline-flex"
      onClick={() => {
        void signOut();
      }}
    >
      Sign out
    </Button>
  ) : null;

  const mobileActions = session ? (
    <Button
      type="button"
      className="w-full"
      onClick={() => {
        void signOut();
      }}
    >
      Sign out
    </Button>
  ) : null;

  return (
    <NavigationBar
      brand={brand}
      primaryLinks={session ? primaryLinks : []}
      secondaryLinks={accountLinks}
      actions={desktopActions}
      mobileActions={mobileActions}
    />
  );
}
