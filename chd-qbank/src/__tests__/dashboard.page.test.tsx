import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() }
  }
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>
}));

import Dashboard, { fetchAliasRequirement, loadFeaturedQuestions } from "../pages/Dashboard";

describe("Dashboard page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  type AliasQueryResult = {
    data: { alias: string | null; alias_locked?: boolean | null } | null;
    error: Error | null;
  };

  type AliasQueryBuilder = {
    select: () => AliasQueryBuilder;
    eq: (...args: unknown[]) => AliasQueryBuilder;
    maybeSingle: () => Promise<AliasQueryResult>;
  };

  const createAliasQuery = (result: AliasQueryResult): AliasQueryBuilder => {
    const builder: AliasQueryBuilder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve(result)
    };
    return builder;
  };

  type QuestionsQueryResult = {
    data: { id: string; lead_in: string | null }[] | null;
    error: Error | null;
  };

  type QuestionsQueryBuilder = {
    select: () => QuestionsQueryBuilder;
    eq: (...args: unknown[]) => QuestionsQueryBuilder;
    limit: (count: number) => Promise<QuestionsQueryResult>;
  };

  const createQuestionsQuery = (result: QuestionsQueryResult): QuestionsQueryBuilder => {
    const builder: QuestionsQueryBuilder = {
      select: () => builder,
      eq: () => builder,
      limit: () => Promise.resolve(result)
    };
    return builder;
  };

  it("renders the key dashboard sections", () => {
    const markup = renderToStaticMarkup(<Dashboard />);
    expect(markup).toContain("Next up");
    expect(markup).toContain("Published content");
    expect(markup).toContain("Games");
  });

  it("determines when an alias is required", async () => {
    const queryBuilder = createAliasQuery({ data: { alias: null }, error: null });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof fetchAliasRequirement>[0];

    const result = await fetchAliasRequirement(supabaseMock, "user-1");

    expect(supabaseMock.from).toHaveBeenCalledWith("app_users");
    expect(queryBuilder.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toBe(true);
  });

  it("treats query errors as a non-blocking alias state", async () => {
    const queryBuilder = createAliasQuery({ data: null, error: new Error("boom") });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof fetchAliasRequirement>[0];

    const result = await fetchAliasRequirement(supabaseMock, "user-1");
    expect(result).toBe(false);
  });

  it("loads featured questions and normalizes the result", async () => {
    const queryBuilder = createQuestionsQuery({
      data: [
        { id: "q1", lead_in: "First" },
        { id: "q2", lead_in: null }
      ],
      error: null
    });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof loadFeaturedQuestions>[0];

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const result = await loadFeaturedQuestions(supabaseMock);

    expect(supabaseMock.from).toHaveBeenCalledWith("questions");
    expect(queryBuilder.eq).toHaveBeenCalledWith("status", "published");
    expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    expect(result.error).toBeNull();
    expect(result.items.map((item) => item.id).sort()).toEqual(["q1", "q2"]);
    randomSpy.mockRestore();
  });

  it("returns an error when the featured query fails", async () => {
    const queryBuilder = createQuestionsQuery({ data: null, error: new Error("unavailable") });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof loadFeaturedQuestions>[0];

    const result = await loadFeaturedQuestions(supabaseMock);
    expect(result).toEqual({ items: [], error: "unavailable" });
  });
});
