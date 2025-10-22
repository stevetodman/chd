import { vi } from "vitest";

type AsyncResult = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number;
};

type MaybePromise<T> = T | Promise<T> | (() => T | Promise<T>);

type TableConfig = {
  rangeResult?: MaybePromise<AsyncResult>;
  maybeSingleResult?: MaybePromise<AsyncResult>;
  limitResult?: MaybePromise<AsyncResult>;
  orderResult?: MaybePromise<AsyncResult>;
  insertResult?: MaybePromise<AsyncResult>;
  updateResult?: MaybePromise<AsyncResult>;
  lastSelectArgs?: unknown[];
  eqCalls?: Array<[string, unknown]>;
  builder?: ReturnType<typeof createBuilder>;
};

const tableConfigs = new Map<string, TableConfig>();

function resolve(result?: MaybePromise<AsyncResult>) {
  if (typeof result === "function") {
    const value = (result as () => MaybePromise<AsyncResult>)();
    return value instanceof Promise ? value : Promise.resolve(value);
  }
  if (result instanceof Promise) {
    return result;
  }
  return Promise.resolve(result ?? { data: null, error: null });
}

function getConfig(table: string): TableConfig {
  if (!tableConfigs.has(table)) {
    tableConfigs.set(table, {});
  }
  return tableConfigs.get(table)!;
}

function createBuilder(config: TableConfig) {
  const builder = {
    select: vi.fn((...args: unknown[]) => {
      config.lastSelectArgs = args;
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      if (!config.eqCalls) {
        config.eqCalls = [];
      }
      config.eqCalls.push([column, value]);
      return builder;
    }),
    range: vi.fn(() => resolve(config.rangeResult)),
    maybeSingle: vi.fn(() => resolve(config.maybeSingleResult)),
    limit: vi.fn(() => resolve(config.limitResult)),
    order: vi.fn(() => resolve(config.orderResult)),
    insert: vi.fn(() => resolve(config.insertResult)),
    update: vi.fn(() => resolve(config.updateResult))
  };
  return builder;
}

const supabaseMock = {
  from: vi.fn((table: string) => {
    const config = getConfig(table);
    const builder = createBuilder(config);
    config.builder = builder;
    return builder;
  }),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
  },
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn()
  }
};

type SessionLike = { user: { id: string } } | null;

let currentSession: SessionLike = { user: { id: "test-user" } };

supabaseMock.auth.signInWithPassword.mockImplementation(async () => ({
  data: { session: currentSession },
  error: null
}));

supabaseMock.auth.signOut.mockImplementation(async () => {
  currentSession = null;
  return { error: null };
});

supabaseMock.auth.getSession.mockImplementation(async () => ({
  data: { session: currentSession },
  error: null
}));

supabaseMock.auth.onAuthStateChange.mockImplementation(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
  error: null
}));

export function setMockSession(session: SessionLike) {
  currentSession = session;
}

export function resetMockSession() {
  currentSession = { user: { id: "test-user" } };
}

export function setTableConfig(table: string, config: Partial<TableConfig>) {
  const existing = getConfig(table);
  Object.assign(existing, config);
}

export function getTableConfig(table: string): TableConfig {
  return getConfig(table);
}

export function resetTableConfig() {
  tableConfigs.clear();
}

export function resetSupabaseMock() {
  supabaseMock.from.mockClear();
  supabaseMock.rpc.mockClear();
  supabaseMock.rpc.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  supabaseMock.functions.invoke.mockClear();
  supabaseMock.functions.invoke.mockImplementation(() => Promise.resolve({ data: null, error: null }));
  supabaseMock.auth.signInWithPassword.mockClear();
  supabaseMock.auth.signOut.mockClear();
  supabaseMock.auth.getSession.mockClear();
  supabaseMock.auth.onAuthStateChange.mockClear();
  supabaseMock.auth.signInWithPassword.mockImplementation(async () => ({
    data: { session: currentSession },
    error: null
  }));
  supabaseMock.auth.signOut.mockImplementation(async () => {
    currentSession = null;
    return { error: null };
  });
  supabaseMock.auth.getSession.mockImplementation(async () => ({
    data: { session: currentSession },
    error: null
  }));
  supabaseMock.auth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null
  }));
  resetTableConfig();
}

export { supabaseMock };
