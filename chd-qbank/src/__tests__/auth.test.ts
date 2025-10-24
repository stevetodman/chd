import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../lib/auth';

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signOut: authMocks.signOut,
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
    from: authMocks.from,
    rpc: authMocks.rpc,
  },
}));

const authModulePromise = import('../lib/auth');

type StoreSession = ReturnType<typeof useSessionStore.getState>['session'];

describe('auth helpers', () => {
  let signIn: (email: string, password: string) => Promise<unknown>;
  let signOut: () => Promise<void>;
  let getSession: () => Promise<unknown>;
  let requireAuth: () => Promise<unknown>;
  let requireAdmin: () => Promise<boolean>;

  beforeAll(async () => {
    ({ signIn, signOut, getSession, requireAuth, requireAdmin } = await authModulePromise);
  });

  beforeEach(() => {
    useSessionStore.setState({ session: null, loading: true, initialized: false });
    Object.values(authMocks).forEach((mock) => {
      if ('mockClear' in mock && typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
    });
  });

  it('signs in a user and stores the session', async () => {
    const session = { user: { id: 'user-1' } } as const;
    authMocks.signInWithPassword.mockResolvedValueOnce({ data: { session }, error: null });

    const result = await signIn('user@example.com', 'password');

    expect(result).toBe(session);
    expect(useSessionStore.getState().session).toBe(session);
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    });
  });

  it('throws when sign in fails', async () => {
    const error = new Error('Invalid credentials');
    authMocks.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error });

    await expect(signIn('user@example.com', 'password')).rejects.toThrow(error);
  });

  it('signs out and clears the session', async () => {
    const session: StoreSession = { user: { id: 'user-1' } } as StoreSession;
    useSessionStore.setState({ session });
    authMocks.signOut.mockResolvedValueOnce({ error: null });

    await signOut();

    expect(authMocks.signOut).toHaveBeenCalled();
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('retrieves the current session and updates loading flags', async () => {
    authMocks.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } });

    const promise = getSession();
    expect(useSessionStore.getState().loading).toBe(true);

    const session = await promise;
    const state = useSessionStore.getState();

    expect(session).toEqual({ user: { id: 'user-1' } });
    expect(state.session).toEqual({ user: { id: 'user-1' } });
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(true);
  });

  it('requireAuth throws when session is missing', async () => {
    authMocks.getSession.mockResolvedValueOnce({ data: { session: null } });

    await expect(requireAuth()).rejects.toThrow('AUTH_REQUIRED');
  });

  it('requireAdmin checks the user role', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });

    authMocks.from.mockReturnValueOnce({
      select: selectMock,
      eq: eqMock,
      maybeSingle: maybeSingleMock,
    });

    await expect(requireAdmin()).resolves.toBe(true);
    expect(authMocks.from).toHaveBeenCalledWith('app_users');
    expect(eqMock).toHaveBeenCalledWith('id', 'user-1');

    authMocks.from.mockReturnValueOnce({
      select: selectMock,
      eq: eqMock,
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
    });
    await expect(requireAdmin()).resolves.toBe(false);
  });

  it('requireAdmin propagates errors', async () => {
    authMocks.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } });
    authMocks.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: new Error('boom') }),
        }),
      }),
    });

    await expect(requireAdmin()).rejects.toThrow('boom');
  });
});
