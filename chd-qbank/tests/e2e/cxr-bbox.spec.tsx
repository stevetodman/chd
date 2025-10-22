import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CxrMatch from "../../src/pages/Games/CxrMatch";

interface CxrLabelRow {
  id: string;
  label: string;
  is_correct: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CxrItemRow {
  id: string;
  image_url: string;
  caption_md: string | null;
  cxr_labels: CxrLabelRow[];
}

const itemResponse: { data: CxrItemRow[]; error: string | null } = { data: [], error: null };

const createItemQuery = () => {
  const promise = Promise.resolve({ data: itemResponse.data, error: itemResponse.error });
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn(() => promise)
  };
};

const createDefaultQuery = () => ({
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: { id: "attempt" }, error: null }))
    }))
  }))
});

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn()
  }
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: mockSupabase
}));

const createDomRect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    x: left,
    y: top,
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({})
  } as DOMRect);

const createDataTransfer = () => {
  const store: Record<string, string> = {};
  return {
    dropEffect: "move",
    effectAllowed: "move",
    files: [],
    items: [],
    types: [] as string[],
    setData(type: string, value: string) {
      store[type] = value;
      if (!this.types.includes(type)) {
        this.types.push(type);
      }
    },
    getData(type: string) {
      return store[type] ?? "";
    },
    clearData(type?: string) {
      if (type) {
        delete store[type];
      } else {
        Object.keys(store).forEach((key) => delete store[key]);
      }
    },
    setDragImage() {}
  } as unknown as DataTransfer;
};

let randomSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(() => {
  if (typeof (globalThis as any).ResizeObserver === "undefined") {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

beforeEach(() => {
  itemResponse.data = [
    {
      id: "item-1",
      image_url: "https://example.test/cxr.png",
      caption_md: "Locate the lesion",
      cxr_labels: [
        { id: "label-1", label: "Lesion", is_correct: true, x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
        { id: "label-2", label: "Other", is_correct: false, x: 0, y: 0, w: 0, h: 0 }
      ]
    }
  ];
  itemResponse.error = null;
  mockSupabase.from.mockReset();
  mockSupabase.rpc.mockReset();
  mockSupabase.auth.onAuthStateChange.mockReset();
  mockSupabase.auth.getSession.mockReset();
  mockSupabase.auth.signInWithPassword.mockReset();
  mockSupabase.auth.signOut.mockReset();
  mockSupabase.from.mockImplementation((table: string) =>
    table === "cxr_items" ? createItemQuery() : createDefaultQuery()
  );
  mockSupabase.rpc.mockResolvedValue({ error: null });
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn()
      }
    }
  });
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabase.auth.signOut.mockResolvedValue({ error: null });
  randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.25);
});

afterEach(() => {
  randomSpy?.mockRestore();
  randomSpy = null;
});

describe("CXR hotspots", () => {
  it("enforces bounding box hits before accepting drops", async () => {
    render(
      <MemoryRouter initialEntries={["/games/cxr?debug=bbox"]}>
        <CxrMatch />
      </MemoryRouter>
    );

    const dropZone = await screen.findByTestId("cxr-drop-zone");
    const image = dropZone.querySelector("img") as HTMLImageElement;
    expect(image).toBeTruthy();

    const rect = createDomRect(60, 80, 400, 400);
    Object.defineProperty(dropZone, "getBoundingClientRect", {
      configurable: true,
      value: () => rect
    });
    Object.defineProperty(image, "getBoundingClientRect", {
      configurable: true,
      value: () => rect
    });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1024 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1024 });

    fireEvent.load(image);

    const lesionButton = await screen.findByRole("button", { name: "Lesion" });

    const missTransfer = createDataTransfer();
    fireEvent.dragStart(lesionButton, { dataTransfer: missTransfer });
    fireEvent.dragEnter(dropZone, { dataTransfer: missTransfer });
    fireEvent.dragOver(dropZone, { dataTransfer: missTransfer });
    const missDrop = createEvent.drop(dropZone, { dataTransfer: missTransfer });
    Object.defineProperty(missDrop, "clientX", { value: rect.left + 20 });
    Object.defineProperty(missDrop, "clientY", { value: rect.top + 20 });
    fireEvent(dropZone, missDrop);
    fireEvent.dragEnd(lesionButton, { dataTransfer: missTransfer });

    await waitFor(() =>
      expect(
        screen.getByText("Drop the label on the highlighted region to submit.")
      ).toBeInTheDocument()
    );
    expect(lesionButton).not.toBeDisabled();

    const hitTransfer = createDataTransfer();
    fireEvent.dragStart(lesionButton, { dataTransfer: hitTransfer });
    fireEvent.dragEnter(dropZone, { dataTransfer: hitTransfer });
    fireEvent.dragOver(dropZone, { dataTransfer: hitTransfer });
    const hitDrop = createEvent.drop(dropZone, { dataTransfer: hitTransfer });
    Object.defineProperty(hitDrop, "clientX", { value: rect.left + rect.width / 2 });
    Object.defineProperty(hitDrop, "clientY", { value: rect.top + rect.height / 2 });
    fireEvent(dropZone, hitDrop);
    fireEvent.dragEnd(lesionButton, { dataTransfer: hitTransfer });

    await waitFor(() => expect(screen.getByText("Correct!")).toBeInTheDocument());
    expect(lesionButton).toBeDisabled();
  });
});
