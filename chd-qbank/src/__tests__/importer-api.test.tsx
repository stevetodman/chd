import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Importer from "../pages/Admin/Importer";

const hoistedMocks = vi.hoisted(() => {
  return {
    parseMock: vi.fn(),
    rpcMock: vi.fn()
  };
});

vi.mock("papaparse", () => ({
  default: {
    parse: hoistedMocks.parseMock
  }
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    rpc: hoistedMocks.rpcMock
  }
}));

const parseMock = hoistedMocks.parseMock as ReturnType<typeof vi.fn>;
const rpcMock = hoistedMocks.rpcMock as ReturnType<typeof vi.fn>;

describe("import_question_rows edge cases", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    parseMock.mockReset();
    rpcMock.mockReset();
  });

  it("sends normalized payload and surfaces API errors", async () => {
    const user = userEvent.setup();
    parseMock.mockImplementation((_file, options) => {
      options?.complete?.({
        data: [
          {
            slug: " question-one ",
            stem_md: "Stem 1",
            lead_in: "Lead 1",
            explanation_brief_md: "Brief 1",
            explanation_deep_md: "",
            topic: "",
            subtopic: "",
            lesion: "Lesion",
            difficulty: "easy",
            bloom: "remember",
            lecture_link: "",
            status: "draft",
            media_murmur: "murmur-1.mp3",
            media_cxr: "",
            media_ekg: "",
            media_diagram: "diagram.svg",
            alt_text: "Diagram alt",
            choiceA: "Choice A",
            choiceB: "Choice B",
            choiceC: "",
            choiceD: "",
            choiceE: "",
            correct_label: "a"
          }
        ]
      } as unknown as { data: Array<Record<string, string>> });
    });

    rpcMock.mockResolvedValueOnce({
      data: {
        processed: 1,
        errors: [
          { slug: "question-one", error: "Duplicate slug" }
        ]
      },
      error: null
    });

    const { container } = render(<Importer />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(["slug"], "import.csv", { type: "text/csv" }));

    await screen.findByText(/previewing 1 rows/i);

    await user.click(screen.getByRole("button", { name: /publish to supabase/i }));

    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    expect(rpcMock).toHaveBeenCalledWith("import_question_rows", {
      rows: [
        {
          slug: "question-one",
          stem_md: "Stem 1",
          lead_in: "Lead 1",
          explanation_brief_md: "Brief 1",
          explanation_deep_md: "",
          topic: "",
          subtopic: "",
          lesion: "Lesion",
          difficulty: "easy",
          bloom: "remember",
          lecture_link: "",
          status: "draft",
          media_murmur: "murmur-1.mp3",
          media_cxr: "",
          media_ekg: "",
          media_diagram: "diagram.svg",
          alt_text: "Diagram alt",
          choiceA: "Choice A",
          choiceB: "Choice B",
          choiceC: "",
          choiceD: "",
          choiceE: "",
          correct_label: "A"
        }
      ]
    });

    expect(await screen.findByText(/processed 1 rows/i)).toBeInTheDocument();
    expect(await screen.findByText(/duplicate slug/i)).toBeInTheDocument();
  });

  it("reports failures returned from supabase", async () => {
    const user = userEvent.setup();
    parseMock.mockImplementation((_file, options) => {
      options?.complete?.({
        data: [
          {
            slug: "question-two",
            stem_md: "Stem 2",
            lead_in: "Lead 2",
            explanation_brief_md: "Brief 2",
            explanation_deep_md: "Deep 2",
            topic: "Topic",
            subtopic: "Subtopic",
            lesion: "Lesion",
            difficulty: "medium",
            bloom: "apply",
            lecture_link: "http://example.com",
            status: "published",
            media_murmur: "",
            media_cxr: "",
            media_ekg: "",
            media_diagram: "",
            alt_text: "",
            choiceA: "A",
            choiceB: "B",
            choiceC: "C",
            choiceD: "D",
            choiceE: "E",
            correct_label: "b"
          }
        ]
      } as unknown as { data: Array<Record<string, string>> });
    });

    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Admin privileges required" }
    });

    const { container } = render(<Importer />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(["slug"], "import.csv", { type: "text/csv" }));

    await screen.findByText(/previewing 1 rows/i);

    await user.click(screen.getByRole("button", { name: /publish to supabase/i }));

    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    expect(await screen.findByText(/import failed/i)).toBeInTheDocument();
    expect(await screen.findByText(/admin privileges required/i)).toBeInTheDocument();
  });
});
