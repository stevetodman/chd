// supabase/functions/signup-with-code/index.ts
// Deno Edge Function: validates invite code server-side, creates user, seeds alias.
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in Supabase Function env.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serverEnv } from "../_shared/env.ts";

const { supabaseUrl, supabaseServiceRoleKey } = serverEnv;
const sb = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function genAlias(): string {
  const adjectives = ["Brisk","Calm","Keen","Nimble","Quiet","Spry","Sturdy","Swift","Tidy","Witty"];
  const birds = ["Sparrow","Finch","Wren","Robin","Heron","Swift","Kite","Tern","Lark","Ibis"];
  const a = adjectives[Math.floor(Math.random()*adjectives.length)];
  const b = birds[Math.floor(Math.random()*birds.length)];
  const n = (100 + Math.floor(Math.random()*900)).toString();
  return `${a}-${b}-${n}`;
}

serve(async (req) => {
  try {
    const { email, password, invite_code, desired_alias } = await req.json();

    const { data: settings, error: settingsErr } = await sb
      .from("app_settings").select("key,value");
    if (settingsErr) throw settingsErr;

    const code = settings?.find((s) => s.key === "invite_code")?.value;
    const expires = settings?.find((s) => s.key === "invite_expires")?.value;
    if (!code || !expires) return new Response("Invite not configured", { status: 400 });
    if (invite_code !== code) return new Response("Invalid invite code", { status: 403 });
    if (new Date() > new Date(expires)) return new Response("Invite expired", { status: 403 });

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr) throw createErr;
    const user = created.user;

    let alias = (desired_alias ?? genAlias()).slice(0, 40);
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await sb.from("app_users").select("id").eq("alias", alias).maybeSingle();
      if (!exists) break;
      alias = genAlias();
    }
    await sb.from("app_users").update({ alias, alias_locked: false }).eq("id", user.id);

    return new Response(JSON.stringify({ ok: true, alias, user_id: user.id }), {
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
});
