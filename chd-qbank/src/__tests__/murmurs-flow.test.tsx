import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Murmurs from "../pages/Games/Murmurs";
import { useSessionStore } from "../lib/auth";
import { createMockSession } from "./test-helpers";

const items = [
  {
    id: "item-1",
    prompt_md: "Listen to this systolic murmur.",
    rationale_md: "It is caused by a stenotic aortic valve.",
    media_url: "https://example.com/murmur.mp3",
    murmur_options: [
      { id: "opt-1", label: "A", text_md: "Mitral regurgitation", is_correct: false },
      { id: "opt-2", label: "B", text_md: "Aortic stenosis", is_correct: true }
    ]
  }
];

const attemptId = "attempt-7";
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
      if (table === "murmur_items") {
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

      if (table === "murmur_attempts") {
        return {
          insert: insertMock
        };
      }

      throw new Error(`Unexpected table ${table}`);
    })
  }
}));

describe("murmur game flow", () => {
  beforeEach(() => {
    insertMock.mockClear();
    selectMock.mockClear();
    rpcMock.mockClear();
    useSessionStore.setState({ session: createMockSession("user-42"), loading: false, initialized: true });
  });

  it("records attempts and awards points for correct answers", async () => {
    const user = userEvent.setup();

    render(<Murmurs />);

    expect(await screen.findByText(/guess the murmur/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /b\./i }));

    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-42",
      item_id: "item-1",
      option_id: "opt-2",
      is_correct: true
    });
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(rpcMock).toHaveBeenCalledWith("increment_points", {
      source: "murmur_attempt",
      source_id: attemptId
    });
    expect(await screen.findByText("Correct!")).toBeInTheDocument();
  });
});
