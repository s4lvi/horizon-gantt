"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createOrganization(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (orgError) throw new Error(orgError.message);

  const { error: memberError } = await supabase
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

  // Check if user already exists and is already a member
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profile) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", profile.id)
      .single();

    if (existingMember) throw new Error("User is already a member");

    // Add directly as member
    const { error } = await supabase.from("organization_members").insert({
      organization_id: orgId,
      user_id: profile.id,
      role: "member",
    });
    if (error) throw new Error(error.message);
  } else {
    // Create invite for non-registered user
    const { error } = await supabase.from("organization_invites").insert({
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
  const { error } = await supabase
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

  const { data: invite } = await supabase
    .from("organization_invites")
    .select("*")
    .eq("id", inviteId)
    .single();

  if (!invite) throw new Error("Invite not found");

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: "member",
    });

  if (memberError) throw new Error(memberError.message);

  await supabase.from("organization_invites").delete().eq("id", inviteId);
  revalidatePath("/organizations");
}
