import { useEffect, useState } from "react";

/**
 * React hook that subscribes to a CSS media query and returns whether it currently matches.
 *
 * @param query - Media query string, e.g. `(min-width: 1024px)`.
 * @returns Boolean flag that updates whenever the match state changes.
 */
export function useMediaQuery(query: string) {
  const getMatches = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQueryList.matches);

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    // Safari < 14
    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [query]);

  return matches;
}
