import { createAdminClient } from "@/lib/supabase/admin";
import { OrgRole } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

// Mirrors the chart page's permission model: owner, edit-share, or org member.
export async function canEditChart(
  admin: Admin,
  userId: string,
  chartId: string
): Promise<boolean> {
  const { data: chart } = await admin
    .from("charts")
    .select("owner_id, organization_id")
    .eq("id", chartId)
    .single();
  if (!chart) return false;
  if (chart.owner_id === userId) return true;

  const { data: share } = await admin
    .from("chart_shares")
    .select("permission")
    .eq("chart_id", chartId)
    .eq("user_id", userId)
    .single();
  if (share?.permission === "edit") return true;

  if (chart.organization_id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", chart.organization_id)
      .eq("user_id", userId)
      .single();
    if (membership) return true;
  }
  return false;
}

export async function canViewChart(
  admin: Admin,
  userId: string,
  chartId: string
): Promise<boolean> {
  const { data: chart } = await admin
    .from("charts")
    .select("owner_id, organization_id")
    .eq("id", chartId)
    .single();
  if (!chart) return false;
  if (chart.owner_id === userId) return true;

  const { data: share } = await admin
    .from("chart_shares")
    .select("id")
    .eq("chart_id", chartId)
    .eq("user_id", userId)
    .single();
  if (share) return true;

  if (chart.organization_id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", chart.organization_id)
      .eq("user_id", userId)
      .single();
    if (membership) return true;
  }
  return false;
}

export async function assertCanEditChart(
  admin: Admin,
  userId: string,
  chartId: string
): Promise<void> {
  if (!(await canEditChart(admin, userId, chartId))) {
    throw new Error("Not authorized");
  }
}

export async function assertCanViewChart(
  admin: Admin,
  userId: string,
  chartId: string
): Promise<void> {
  if (!(await canViewChart(admin, userId, chartId))) {
    throw new Error("Not authorized");
  }
}

// Sharing and share links are managed by the chart owner only (matches ShareDialog).
export async function assertChartOwner(
  admin: Admin,
  userId: string,
  chartId: string
): Promise<void> {
  const { data: chart } = await admin
    .from("charts")
    .select("owner_id")
    .eq("id", chartId)
    .single();
  if (!chart || chart.owner_id !== userId) {
    throw new Error("Not authorized");
  }
}

export async function assertOrgRole(
  admin: Admin,
  userId: string,
  orgId: string,
  roles: OrgRole[]
): Promise<void> {
  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .single();
  if (!membership || !roles.includes(membership.role)) {
    throw new Error("Not authorized");
  }
}
