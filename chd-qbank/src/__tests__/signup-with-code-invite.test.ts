import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashInviteCode, timingSafeEqual, validateInviteCode, type AppSettingRow, type SupabaseLike } from "../../supabase/functions/signup-with-code/logic.ts";

type InReturn = Promise<{ data: AppSettingRow[] | null; error: { message: string; code?: string } | null }>;

describe("signup-with-code invite validation", () => {
  const inMock = vi.fn<(column: string, values: string[]) => InReturn>();
  const supabaseStub: SupabaseLike = {
    from: () => ({
      select: () => ({
        in: inMock
      })
    })
  };

  beforeEach(() => {
    inMock.mockReset();
  });

  const seedSettings = (rows: AppSettingRow[]) => {
    inMock.mockResolvedValueOnce({ data: rows, error: null });
  };

  it("allows matching invite codes that have not expired", async () => {
    const salt = "pepper";
    const expectedHash = await hashInviteCode("ABC123", salt);
    seedSettings([
      { key: "invite_code_hash", value: expectedHash },
      { key: "invite_code_salt", value: salt },
      { key: "invite_expires", value: new Date(Date.now() + 60_000).toISOString() }
    ]);

    const result = await validateInviteCode({ supabase: supabaseStub, inviteCode: "ABC123" });
    expect(result).toBeNull();
  });

  it("rejects mismatched invite codes", async () => {
    const salt = "pepper";
    const expectedHash = await hashInviteCode("CORRECT", salt);
    seedSettings([
      { key: "invite_code_hash", value: expectedHash },
      { key: "invite_code_salt", value: salt },
      { key: "invite_expires", value: new Date(Date.now() + 60_000).toISOString() }
    ]);

    const result = await validateInviteCode({ supabase: supabaseStub, inviteCode: "WRONG" });
    expect(result).toEqual({
      status: 403,
      body: { ok: false, error: "Invalid invite code" },
      headers: { "content-type": "application/json" }
    });
  });

  it("rejects expired invites even when hashes match", async () => {
    const salt = "pepper";
    const expectedHash = await hashInviteCode("LATE", salt);
    seedSettings([
      { key: "invite_code_hash", value: expectedHash },
      { key: "invite_code_salt", value: salt },
      { key: "invite_expires", value: new Date(Date.now() - 5_000).toISOString() }
    ]);

    const result = await validateInviteCode({
      supabase: supabaseStub,
      inviteCode: "LATE",
      now: () => new Date(Date.now())
    });

    expect(result).toEqual({
      status: 403,
      body: { ok: false, error: "Invite expired" },
      headers: { "content-type": "application/json" }
    });
  });

  it("throws when settings are incomplete", async () => {
    seedSettings([
      { key: "invite_code_hash", value: "" },
      { key: "invite_code_salt", value: "" },
      { key: "invite_expires", value: "" }
    ]);

    await expect(
      validateInviteCode({ supabase: supabaseStub, inviteCode: "ANY" })
    ).rejects.toThrow("Invite not configured securely");
  });

  it("uses timingSafeEqual for comparisons", async () => {
    const equalsSpy = vi.fn(timingSafeEqual);
    const salt = "pepper";
    const expectedHash = await hashInviteCode("MATCH", salt);
    seedSettings([
      { key: "invite_code_hash", value: expectedHash },
      { key: "invite_code_salt", value: salt },
      { key: "invite_expires", value: new Date(Date.now() + 60_000).toISOString() }
    ]);

    await validateInviteCode({
      supabase: supabaseStub,
      inviteCode: "MATCH",
      equals: equalsSpy
    });

    expect(equalsSpy).toHaveBeenCalledWith(expectedHash, await hashInviteCode("MATCH", salt));
  });
});
