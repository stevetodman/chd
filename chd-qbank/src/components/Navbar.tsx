import { Link, NavLink } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/dashboard" className="text-lg font-semibold text-brand-600">
          {APP_NAME}
        </Link>
        {session ? (
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/practice" className={({ isActive }) => (isActive ? "font-semibold" : "")}> 
              Practice
            </NavLink>
            <NavLink to="/review" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
              Review
            </NavLink>
            <NavLink to="/games/murmurs" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
              Murmurs
            </NavLink>
            <NavLink to="/games/cxr" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
              CXR Match
            </NavLink>
            {leaderboardEnabled && settingsLoaded ? (
              <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
                Leaderboard
              </NavLink>
            ) : null}
            <NavLink to="/profile/alias" className={({ isActive }) => (isActive ? "font-semibold" : "")}>
              Profile
            </NavLink>
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className="rounded bg-neutral-900 px-3 py-1 text-white hover:bg-neutral-700"
            >
              Sign out
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/signup">Signup</NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}
