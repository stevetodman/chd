import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: { onAuthStateChange: vi.fn() }
  }
}));

import Review, { FlaggedResponse, loadFlaggedResponses } from "../pages/Review";

describe("Review page", () => {
  it("renders the page heading", () => {
    const markup = renderToStaticMarkup(<Review />);
    expect(markup).toContain("Flagged for Review");
  });

  type ResponseQueryResult = {
    data: FlaggedResponse[] | null;
  };

  type ResponseQueryBuilder = {
    select: () => ResponseQueryBuilder;
    eq: (...args: unknown[]) => ResponseQueryBuilder;
    order: (column: string, options: { ascending: boolean }) => Promise<ResponseQueryResult>;
  };

  const createResponseQuery = (result: ResponseQueryResult): ResponseQueryBuilder => {
    const builder: ResponseQueryBuilder = {
      select: () => builder,
      eq: () => builder,
      order: () => Promise.resolve(result)
    };
    return builder;
  };

  it("loads flagged responses for a user", async () => {
    const responses: FlaggedResponse[] = [
      {
        id: "flag-1",
        questions: { lead_in: "Lead prompt", stem_md: "Body" }
      }
    ];

    const queryBuilder = createResponseQuery({ data: responses });
    const orderSpy = vi.spyOn(queryBuilder, "order");
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof loadFlaggedResponses>[0];

    const result = await loadFlaggedResponses(supabaseMock, "user-1");

    expect(supabaseMock.from).toHaveBeenCalledWith("responses");
    expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual(responses);
  });

  it("returns an empty array when the query has no data", async () => {
    const queryBuilder = createResponseQuery({ data: null });
    const supabaseMock = {
      from: vi.fn().mockReturnValue(queryBuilder)
    } as unknown as Parameters<typeof loadFlaggedResponses>[0];

    const result = await loadFlaggedResponses(supabaseMock, "user-1");
    expect(result).toEqual([]);
  });
});
