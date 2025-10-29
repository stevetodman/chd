let murmurItemsBuilder: ReturnType<typeof createMurmurItemsBuilder>;
let murmurAttemptsBuilder: ReturnType<typeof createMurmurAttemptsBuilder>;
let storageBuilder: ReturnType<typeof createStorageBuilder>;

const supabaseState = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn()
}));

type MurmurItemsQueryMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

function createMurmurItemsBuilder(): MurmurItemsQueryMock {
  const builder: MurmurItemsQueryMock = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn()
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  return builder;
}

type MurmurAttemptsQueryMock = {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function createMurmurAttemptsBuilder(): MurmurAttemptsQueryMock {
  const builder: MurmurAttemptsQueryMock = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn()
  };
  builder.insert.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  return builder;
}

function createStorageBuilder() {
  return {
    createSignedUrl: vi.fn()
  };
}

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => supabaseState.from(...args),
    rpc: (...args: unknown[]) => supabaseState.rpc(...args),
    storage: {
      from: (...args: unknown[]) => supabaseState.storageFrom(...args)
    },
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}));

import { render, screen, waitFor } from "../../src/testing/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import Murmurs from "../../src/pages/Games/Murmurs";
import { useSessionStore } from "../../src/lib/auth";
import { clearSupabaseAssetUrlCache } from "../../src/lib/storage";

describe("murmurs game flow", () => {
  const rows = [
    {
      id: "item-1",
      prompt_md: "Prompt **1**",
      rationale_md: "Rationale 1",
      media_url: "clip1.mp3",
      murmur_options: [
        { id: "opt-1", label: "A", text_md: "Systolic ejection", is_correct: false },
        { id: "opt-2", label: "B", text_md: "Holosystolic murmur", is_correct: true }
      ]
    },
    {
      id: "item-2",
      prompt_md: "Prompt 2",
      rationale_md: null,
      media_url: "clip2.mp3",
      murmur_options: [
        { id: "opt-3", label: "A", text_md: "Diastolic rumble", is_correct: true },
        { id: "opt-4", label: "B", text_md: "Continuous murmur", is_correct: false }
      ]
    }
  ];

  beforeEach(() => {
    clearSupabaseAssetUrlCache();
    murmurItemsBuilder = createMurmurItemsBuilder();
    murmurAttemptsBuilder = createMurmurAttemptsBuilder();
    storageBuilder = createStorageBuilder();

    supabaseState.from.mockReset();
    supabaseState.rpc.mockReset();
    supabaseState.storageFrom.mockReset();

    supabaseState.from.mockImplementation((table: string) => {
      if (table === "murmur_items") return murmurItemsBuilder;
      if (table === "murmur_attempts") return murmurAttemptsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });
    supabaseState.storageFrom.mockImplementation((bucket: string) => {
      if (bucket === "murmurs") return storageBuilder;
      throw new Error(`Unexpected bucket: ${bucket}`);
    });
    supabaseState.rpc.mockResolvedValue({ data: null, error: null });

    murmurItemsBuilder.limit.mockResolvedValue({ data: rows, error: null });
    murmurAttemptsBuilder.single
      .mockResolvedValueOnce({ data: { id: "attempt-incorrect" }, error: null })
      .mockResolvedValueOnce({ data: { id: "attempt-correct" }, error: null });

    storageBuilder.createSignedUrl.mockImplementation(async (path: string, expiresIn: number) => ({
      data: { signedUrl: `https://signed.example.com/${path}?expires=${expiresIn}` },
      error: null
    }));

    const session = { user: { id: "user-42" } } as ReturnType<typeof useSessionStore.getState>["session"];
    useSessionStore.setState({ session, loading: false, initialized: true });
  });

  afterEach(() => {
    useSessionStore.setState({ session: null, loading: true, initialized: false });
  });

  it("loads murmur clips, records attempts, and awards points for correct answers", async () => {
    const user = userEvent.setup();

    render(<Murmurs />);

    await waitFor(() => expect(supabaseState.from).toHaveBeenCalledWith("murmur_items"));
    await waitFor(() => expect(storageBuilder.createSignedUrl).toHaveBeenCalledWith("clip1.mp3", 3600));

    const incorrectButton = await screen.findByRole("button", { name: /A\.\s*Systolic ejection/i });
    await user.click(incorrectButton);

    await screen.findByText("Try again");

    expect(murmurAttemptsBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-42",
      item_id: "item-1",
      option_id: "opt-1",
      is_correct: false
    });

    expect(supabaseState.rpc).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next clip/i }));

    await waitFor(() => expect(screen.getByText(/Prompt\s*2/)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Try again")).not.toBeInTheDocument());

    const correctButton = screen.getByRole("button", { name: /A\.\s*Diastolic rumble/i });
    await user.click(correctButton);

    await screen.findByText("Correct!");

    expect(murmurAttemptsBuilder.insert).toHaveBeenLastCalledWith({
      user_id: "user-42",
      item_id: "item-2",
      option_id: "opt-3",
      is_correct: true
    });

    expect(supabaseState.rpc).toHaveBeenCalledWith("increment_points", {
      source: "murmur_attempt",
      source_id: "attempt-correct"
    });
    await waitFor(() => expect(storageBuilder.createSignedUrl).toHaveBeenLastCalledWith("clip2.mp3", 3600));
  });
});
