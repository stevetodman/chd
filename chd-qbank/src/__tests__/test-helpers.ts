import type { Session, User } from '@supabase/supabase-js';

const baseUser: Omit<User, 'id'> = {
  app_metadata: { provider: 'email' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  role: 'authenticated',
};

export const createMockSession = (id: string): Session => ({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: { id, ...baseUser } satisfies User,
});
