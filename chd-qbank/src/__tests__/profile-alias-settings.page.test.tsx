import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() }
  }
}));

import AliasSettings, { fetchAliasStatus, saveAliasSelection } from "../pages/Profile/AliasSettings";

describe("Alias settings page", () => {
  it("renders a loading state by default", () => {
    const markup = renderToStaticMarkup(<AliasSettings />);
    expect(markup).toContain("Loading profile…");
  });

  type AliasResult = {
    data: { alias: string | null; alias_locked: boolean | null } | null;
    error: Error | null;
  };

  type AliasQueryBuilder = {
    select: () => AliasQueryBuilder;
    eq: (...args: unknown[]) => AliasQueryBuilder;
    maybeSingle: () => Promise<AliasResult>;
  };

  const createAliasQuery = (result: AliasResult): AliasQueryBuilder => {
    const builder: AliasQueryBuilder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve(result)
    };
    return builder;
  };

  type AliasUpdateBuilder = {
    update: (values: unknown) => AliasUpdateBuilder;
    eq: (...args: unknown[]) => AliasUpdateBuilder;
    select: () => AliasUpdateBuilder;
    maybeSingle: () => Promise<AliasResult>;
  };

  const createAliasUpdateQuery = (result: AliasResult): AliasUpdateBuilder => {
    const builder: AliasUpdateBuilder = {
      update: () => builder,
      eq: () => builder,
      select: () => builder,
      maybeSingle: () => Promise.resolve(result)
    };
    return builder;
  };

  it("fetches alias information for the current user", async () => {
    const queryBuilder = createAliasQuery({ data: { alias: "DocAce", alias_locked: true }, error: null });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof fetchAliasStatus>[0];

    const result = await fetchAliasStatus(supabaseMock, "user-1");

    expect(supabaseMock.from).toHaveBeenCalledWith("app_users");
    expect(queryBuilder.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toEqual({ alias: "DocAce", locked: true, error: null });
  });

  it("returns a friendly error when the alias query fails", async () => {
    const queryBuilder = createAliasQuery({ data: null, error: new Error("boom") });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof fetchAliasStatus>[0];

    const result = await fetchAliasStatus(supabaseMock, "user-1");
    expect(result).toEqual({ alias: "", locked: false, error: "boom" });
  });

  it("saves the alias selection and returns the updated status", async () => {
    const queryBuilder = createAliasUpdateQuery({ data: { alias: "DocAce", alias_locked: true }, error: null });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof saveAliasSelection>[0];

    const result = await saveAliasSelection(supabaseMock, "user-1", "DocAce");

    expect(queryBuilder.update).toHaveBeenCalledWith({ alias: "DocAce" });
    expect(queryBuilder.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toEqual({ alias: "DocAce", locked: true });
  });

  it("propagates errors from the alias update", async () => {
    const queryBuilder = createAliasUpdateQuery({ data: null, error: new Error("not allowed") });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof saveAliasSelection>[0];

    await expect(saveAliasSelection(supabaseMock, "user-1", "DocAce")).rejects.toThrow("not allowed");
  });
});
