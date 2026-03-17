"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createOrganization(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (orgError) throw new Error(orgError.message);

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) throw new Error(memberError.message);
  revalidatePath("/organizations");
  redirect(`/organizations/${org.id}`);
}

export async function inviteMember(orgId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profile) {
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", profile.id)
      .single();

    if (existingMember) throw new Error("User is already a member");

    const { error } = await admin.from("organization_members").insert({
      organization_id: orgId,
      user_id: profile.id,
      role: "member",
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("organization_invites").insert({
      organization_id: orgId,
      email,
      invited_by: user.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/organizations/${orgId}`);
}

export async function removeMember(orgId: string, memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_members")
    .delete()
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organizations/${orgId}`);
}

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("organization_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (!invite) throw new Error("Invite not found");

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: "member",
    });

  if (memberError) throw new Error(memberError.message);

  await admin.from("organization_invites").delete().eq("id", inviteId);
  revalidatePath("/organizations");
}

export async function updateOrganization(
  orgId: string,
  updates: { name?: string; description?: string | null; location?: string | null; logo_url?: string | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
  revalidatePath(`/organizations/${orgId}`);
}

export async function createOrgInviteLink(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_invite_links")
    .insert({
      organization_id: orgId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getOrgInviteLinks(orgId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_invite_links")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteOrgInviteLink(linkId: string, orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin
    .from("organization_invite_links")
    .delete()
    .eq("id", linkId);
  if (error) throw new Error(error.message);
  revalidatePath(`/organizations/${orgId}`);
}

export async function acceptOrgInviteLink(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("organization_invite_links")
    .select("*")
    .eq("token", token)
    .single();

  if (!link) throw new Error("Invalid or expired link");
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new Error("This link has expired");
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", link.organization_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    await admin.from("organization_members").insert({
      organization_id: link.organization_id,
      user_id: user.id,
      role: "member",
    });
  }

  return link.organization_id;
}
