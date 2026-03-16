import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { GanttChart } from "@/components/gantt/gantt-chart";

export default async function ChartPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const { chartId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chart } = await admin
    .from("charts")
    .select("*")
    .eq("id", chartId)
    .single();

  if (!chart) notFound();

  const { data: activities } = await admin
    .from("activities")
    .select("*, profiles(*)")
    .eq("chart_id", chartId)
    .order("sort_order", { ascending: true });

  const { data: dependencies } = await admin
    .from("dependencies")
    .select("*")
    .eq("chart_id", chartId);

  // Determine edit permission
  const isOwner = chart.owner_id === user.id;
  let canEdit = isOwner;

  if (!canEdit) {
    const { data: share } = await admin
      .from("chart_shares")
      .select("permission")
      .eq("chart_id", chartId)
      .eq("user_id", user.id)
      .single();

    if (share?.permission === "edit") canEdit = true;
  }

  if (!canEdit && chart.organization_id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", chart.organization_id)
      .eq("user_id", user.id)
      .single();

    if (membership) canEdit = true;
  }

  // Get org members for assignee dropdown
  let members: any[] = [];
  if (chart.organization_id) {
    const { data } = await admin
      .from("organization_members")
      .select("user_id, profiles(id, email, full_name, avatar_url)")
      .eq("organization_id", chart.organization_id);
    members = data?.map((m: any) => m.profiles) || [];
  }

  // Also get chart shares for assignee options
  const { data: shares } = await admin
    .from("chart_shares")
    .select("user_id, profiles(id, email, full_name, avatar_url)")
    .eq("chart_id", chartId);

  const shareMembers = shares?.map((s: any) => s.profiles) || [];

  // Get owner profile
  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", chart.owner_id)
    .single();

  const allMembers = [
    ownerProfile,
    ...members,
    ...shareMembers,
  ].filter(
    (m, i, arr) => m && arr.findIndex((x: any) => x?.id === m?.id) === i
  );

  return (
    <GanttChart
      chart={chart}
      initialActivities={activities || []}
      initialDependencies={dependencies || []}
      canEdit={canEdit}
      isOwner={isOwner}
      members={allMembers}
      currentUserId={user.id}
    />
  );
}
