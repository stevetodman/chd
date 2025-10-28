import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "../testing/render";
import userEvent from "@testing-library/user-event";
import EkgInterpretation from "../pages/Games/EkgInterpretation";
import { useSessionStore } from "../lib/auth";
import { createMockSession } from "./test-helpers";
import { syntheticEkgItems } from "./fixtures/syntheticData";

const items = syntheticEkgItems.map((item) => ({
  ...item,
  ekg_options: item.ekg_options.map((option) => ({ ...option }))
}));

const attemptId = "ekg-attempt-9";
const { selectMock, insertMock, rpcMock } = vi.hoisted(() => {
  const selectMock = vi.fn(() => ({
    single: async () => ({ data: { id: attemptId }, error: null })
  }));
  const insertMock = vi.fn(() => ({ select: selectMock }));
  const rpcMock = vi.fn(async () => ({ data: null, error: null }));
  return { selectMock, insertMock, rpcMock };
});

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn()
    },
    rpc: rpcMock,
    from: vi.fn((table: string) => {
      if (table === "ekg_items") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: items, error: null })
              })
            })
          })
        };
      }

      if (table === "ekg_attempts") {
        return {
          insert: insertMock
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  }
}));

describe("ekg interpretation game flow", () => {
  beforeEach(() => {
    insertMock.mockClear();
    selectMock.mockClear();
    rpcMock.mockClear();
    useSessionStore.setState({ session: createMockSession("user-55"), loading: false, initialized: true });
  });

  it("records ekg attempts and awards points", async () => {
    const user = userEvent.setup();

    render(<EkgInterpretation />);

    expect(await screen.findByText(/read the ekg/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /complete atrioventricular block/i }));

    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-55",
      item_id: "ekg-item-1",
      option_id: "ekg-opt-b",
      is_correct: true
    });
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(rpcMock).toHaveBeenCalledWith("increment_points", {
      source: "ekg_attempt",
      source_id: attemptId
    });
    expect(await screen.findByText("Correct!")).toBeInTheDocument();
  });
});
