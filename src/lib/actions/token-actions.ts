"use server";

import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createApiToken(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!name.trim() || name.length > 100) throw new Error("Invalid name");

  // "hg_" prefix makes tokens recognizable in configs and secret scanners.
  const token = `hg_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_tokens")
    .insert({
      user_id: user.id,
      name: name.trim(),
      token_hash: tokenHash,
    })
    .select("id, name, created_at")
    .single();

  if (error) throw new Error(error.message);
  // The plaintext token is returned exactly once — only the hash is stored.
  return { ...data, token };
}

export async function listApiTokens() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteApiToken(tokenId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("api_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
