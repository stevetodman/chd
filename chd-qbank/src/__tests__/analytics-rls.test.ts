import { createClient } from "@supabase/supabase-js";
import { describe, expect, test } from "vitest";

/**
 * This test ensures that Supabase row-level security (RLS) prevents anonymous
 * users from calling analytics RPC endpoints directly.
 *
 * To run it locally, define SUPABASE_URL and SUPABASE_ANON_KEY in the
 * environment. Vitest will pick them up from files such as `.env`, `.env.test`,
 * or from variables exported in your shell before invoking `npm run test`:
 *
 * SUPABASE_URL="https://<project>.supabase.co"
 * SUPABASE_ANON_KEY="<anon-public-key>"
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const describeOrSkip =
  supabaseUrl && supabaseAnonKey ? describe : describe.skip;

describeOrSkip("analytics RLS policies", () => {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const expectRpcToReject = async (functionName: string) => {
    await expect(
      (async () => {
        const { error } = await supabase.rpc(functionName);
        if (!error) {
          throw new Error(
            `Expected ${functionName} to reject anonymous access but it succeeded.`,
          );
        }

        throw error;
      })(),
    ).rejects.toThrow();
  };

  test("anonymous clients cannot call analytics RPCs", async () => {
    await expectRpcToReject("analytics_heatmap_admin");
    await expectRpcToReject("analytics_refresh_heatmap");
  });
});

if (!supabaseUrl || !supabaseAnonKey) {
  test.skip(
    "analytics RLS policies",
    () => {},
  );
}
