import { describe, expect, it, vi, beforeEach } from "vitest";
import { feedbackForMurmurOption, type MurmurItem } from "../../lib/games/murmurs";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(async () => ({ data: { session: null } })),
    signInWithPassword: vi.fn(async () => ({ data: { session: null }, error: null })),
    signOut: vi.fn(async () => ({ error: null }))
  }
}));

type FetchBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

const fetchChain: FetchBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn()
};

const selectMock = fetchChain.select;
const eqMock = fetchChain.eq;
const orderMock = fetchChain.order;
const limitMock = fetchChain.limit;

selectMock.mockImplementation(() => fetchChain);
eqMock.mockImplementation(() => fetchChain);
orderMock.mockImplementation(() => fetchChain);

const rpcMock = supabaseMocks.rpc;
const fromMock = supabaseMocks.from;
const authMock = supabaseMocks.auth;

vi.mock("../../lib/supabaseClient", () => ({
  __esModule: true,
  supabase: {
    auth: authMock,
    from: fromMock,
    rpc: rpcMock
  }
}));

vi.mock("../../lib/auth", () => ({
  __esModule: true,
  useSessionStore: () => ({ session: null })
}));

const { advanceMurmur, chooseMurmurOption, loadMurmurs } = await import("./Murmurs");

const supabaseClient = {
  from: fromMock,
  rpc: rpcMock
};

const handlers = () => ({
  setLoading: vi.fn(),
  setError: vi.fn(),
  setItems: vi.fn(),
  setIndex: vi.fn(),
  setSelected: vi.fn(),
  setFeedback: vi.fn()
});

const murmurRow = {
  id: "item-1",
  prompt_md: "prompt",
  rationale_md: "rationale",
  media_url: "media.mp3",
  murmur_options: [
    { id: "opt-a", label: "A", text_md: "Alpha", is_correct: true },
    { id: "opt-b", label: "B", text_md: "Beta", is_correct: false }
  ]
};

const murmurItem: MurmurItem = {
  id: "item-1",
  prompt_md: "prompt",
  rationale_md: "rationale",
  media_url: "media.mp3",
  options: [
    { id: "opt-a", label: "A", text_md: "Alpha", is_correct: true },
    { id: "opt-b", label: "B", text_md: "Beta", is_correct: false }
  ]
};

const attemptInsertMock = vi.fn();

beforeEach(() => {
  selectMock.mockClear();
  eqMock.mockClear();
  orderMock.mockClear();
  limitMock.mockReset();
  limitMock.mockResolvedValue({ data: [murmurRow], error: null });
  attemptInsertMock.mockReset();
  attemptInsertMock.mockResolvedValue({ error: null });
  rpcMock.mockReset();
  fromMock.mockReset();
  authMock.onAuthStateChange.mockReset();
  fromMock.mockImplementation((table: string) => {
    if (table === "murmur_items") {
      return fetchChain;
    }
    if (table === "murmur_attempts") {
      return { insert: attemptInsertMock };
    }
    throw new Error(`Unexpected table ${table}`);
  });
});

describe("loadMurmurs", () => {
  it("loads and normalizes murmur items", async () => {
    const h = handlers();

    await loadMurmurs(supabaseClient, h, () => true);

    expect(h.setLoading).toHaveBeenNthCalledWith(1, true);
    expect(h.setError).toHaveBeenCalledWith(null);
    expect(h.setItems).toHaveBeenCalledWith([
      {
        id: "item-1",
        prompt_md: "prompt",
        rationale_md: "rationale",
        media_url: "media.mp3",
        options: murmurItem.options
      }
    ]);
    expect(h.setIndex).toHaveBeenCalledWith(0);
    expect(h.setSelected).toHaveBeenCalledWith(null);
    expect(h.setFeedback).toHaveBeenCalledWith(null);
    expect(h.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("handles fetch errors", async () => {
    const h = handlers();
    limitMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });

    await loadMurmurs(supabaseClient, h, () => true);

    expect(h.setError).toHaveBeenCalledWith("boom");
    expect(h.setItems).toHaveBeenCalledWith([]);
    expect(h.setIndex).toHaveBeenCalledWith(0);
    expect(h.setSelected).toHaveBeenCalledWith(null);
    expect(h.setFeedback).toHaveBeenCalledWith(null);
    expect(h.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("skips updates when inactive", async () => {
    const h = handlers();

    await loadMurmurs(supabaseClient, h, () => false);

    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.setLoading).toHaveBeenCalledTimes(1);
  });
});

describe("chooseMurmurOption", () => {
  const session = { user: { id: "user-1" } };

  it("records attempts and awards points for correct answers", async () => {
    const setSelected = vi.fn();
    const setFeedback = vi.fn();
    const option = murmurItem.options[0];

    await chooseMurmurOption({
      option,
      current: murmurItem,
      session,
      supabaseClient,
      setSelected,
      setFeedback
    });

    expect(setSelected).toHaveBeenCalledWith(option);
    expect(setFeedback).toHaveBeenCalledWith(feedbackForMurmurOption(option));
    expect(attemptInsertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      item_id: "item-1",
      option_id: "opt-a",
      is_correct: true
    });
    expect(rpcMock).toHaveBeenCalledWith("increment_points", { delta: 1 });
  });

  it("records incorrect attempts without awarding points", async () => {
    const setSelected = vi.fn();
    const setFeedback = vi.fn();
    const option = murmurItem.options[1];

    await chooseMurmurOption({
      option,
      current: murmurItem,
      session,
      supabaseClient,
      setSelected,
      setFeedback
    });

    expect(setSelected).toHaveBeenCalledWith(option);
    expect(setFeedback).toHaveBeenCalledWith(feedbackForMurmurOption(option));
    expect(attemptInsertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      item_id: "item-1",
      option_id: "opt-b",
      is_correct: false
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("skips persistence without a session", async () => {
    const setSelected = vi.fn();
    const setFeedback = vi.fn();
    const option = murmurItem.options[1];

    await chooseMurmurOption({
      option,
      current: murmurItem,
      session: null,
      supabaseClient,
      setSelected,
      setFeedback
    });

    expect(setSelected).toHaveBeenCalledWith(option);
    expect(setFeedback).toHaveBeenCalledWith(feedbackForMurmurOption(option));
    expect(attemptInsertMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("ignores choices without a current murmur", async () => {
    const setSelected = vi.fn();
    const setFeedback = vi.fn();

    await chooseMurmurOption({
      option: murmurItem.options[0],
      current: null,
      session,
      supabaseClient,
      setSelected,
      setFeedback
    });

    expect(setSelected).not.toHaveBeenCalled();
    expect(setFeedback).not.toHaveBeenCalled();
    expect(attemptInsertMock).not.toHaveBeenCalled();
  });
});

describe("advanceMurmur", () => {
  it("does nothing when no items are available", () => {
    const setIndex = vi.fn();
    const setSelected = vi.fn();
    const setFeedback = vi.fn();

    advanceMurmur({
      itemsLength: 0,
      setIndex,
      setSelected,
      setFeedback
    });

    expect(setIndex).not.toHaveBeenCalled();
    expect(setSelected).not.toHaveBeenCalled();
    expect(setFeedback).not.toHaveBeenCalled();
  });

  it("resets selection and advances the index", () => {
    const setIndex = vi.fn();
    const setSelected = vi.fn();
    const setFeedback = vi.fn();

    advanceMurmur({
      itemsLength: 3,
      setIndex,
      setSelected,
      setFeedback
    });

    expect(setSelected).toHaveBeenCalledWith(null);
    expect(setFeedback).toHaveBeenCalledWith(null);
    expect(setIndex).toHaveBeenCalledTimes(1);
    const updater = setIndex.mock.calls[0][0] as (value: number) => number;
    expect(updater(0)).toBe(1);
    expect(updater(2)).toBe(0);
  });
});
