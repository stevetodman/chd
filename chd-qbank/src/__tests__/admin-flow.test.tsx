import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ItemEditor from "../pages/Admin/ItemEditor";

const editableItem = {
  id: "item-1",
  stem_md: "Original stem",
  lead_in: "Original lead",
  explanation_brief_md: "Original brief",
  explanation_deep_md: "Original deep",
  status: "draft",
  version: 1,
  choices: [
    { id: "choice-1", label: "A", text_md: "First choice", is_correct: true },
    { id: "choice-2", label: "B", text_md: "Second choice", is_correct: false }
  ]
};

const upsertMock = vi.fn(async () => ({ error: null }));
const updateMock = vi.fn(() => ({
  eq: vi.fn(async () => ({ error: null }))
}));
const selectMock = vi.fn(() => ({
  eq: () => ({
    maybeSingle: async () => ({ data: editableItem, error: null })
  })
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "questions") {
        return {
          select: selectMock,
          update: updateMock
        };
      }
      if (table === "choices") {
        return {
          upsert: upsertMock
        };
      }
      throw new Error(`Unexpected table ${table}`);
    })
  }
}));

describe("admin item editing flow", () => {
  beforeEach(() => {
    upsertMock.mockClear();
    updateMock.mockClear();
    selectMock.mockClear();
  });

  it("loads an item, allows edits, and saves changes", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/admin/item/item-1"]}>
        <Routes>
          <Route path="/admin/item/:id" element={<ItemEditor />} />
        </Routes>
      </MemoryRouter>
    );

    const leadInput = await screen.findByLabelText(/lead-in/i);
    expect((leadInput as HTMLInputElement).value).toBe("Original lead");

    await user.clear(leadInput);
    await user.type(leadInput, "Updated lead");

    const choiceCards = screen.getAllByText(/choice [ab]/i).map((heading) => heading.closest("div"));
    const secondChoice = choiceCards[1];
    const secondChoiceRadio = within(secondChoice!).getByRole("radio", { name: /correct answer/i });
    await user.click(secondChoiceRadio);

    const briefTextarea = screen.getByLabelText(/brief explanation/i);
    await user.clear(briefTextarea);
    await user.type(briefTextarea, "Updated brief explanation");

    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    expect(upsertMock.mock.calls[0][0]).toEqual([
      {
        id: "choice-1",
        question_id: "item-1",
        label: "A",
        text_md: "First choice",
        is_correct: false
      },
      {
        id: "choice-2",
        question_id: "item-1",
        label: "B",
        text_md: "Second choice",
        is_correct: true
      }
    ]);
    expect(upsertMock.mock.calls[0][1]).toEqual({ onConflict: "id" });

    expect(updateMock).toHaveBeenCalledWith({
      stem_md: "Original stem",
      lead_in: "Updated lead",
      explanation_brief_md: "Updated brief explanation",
      explanation_deep_md: "Original deep",
      status: "draft",
      version: 2
    });

    expect(await screen.findByText("Saved!")).toBeInTheDocument();
  });
});
