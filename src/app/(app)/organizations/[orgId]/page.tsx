import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ChartCard } from "@/components/dashboard/chart-card";
import { OrgMembers } from "@/components/organizations/org-members";
import { CreateOrgChartButton } from "@/components/organizations/create-org-chart-button";

export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) notFound();

  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user!.id)
    .single();

  const isAdmin =
    membership?.role === "owner" || membership?.role === "admin";

  const { data: charts } = await admin
    .from("charts")
    .select("*, profiles(*)")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  const { data: members } = await admin
    .from("organization_members")
    .select("*, profiles(*)")
    .eq("organization_id", orgId);

  const { data: invites } = await admin
    .from("organization_invites")
    .select("*")
    .eq("organization_id", orgId);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          {org.logo_url && (
            <img src={org.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
          )}
          <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{org.name}</h1>
          {(org.description || org.location) && (
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {org.location && <span>{org.location}</span>}
              {org.description && <span>{org.description}</span>}
            </div>
          )}
          </div>
        </div>
        <CreateOrgChartButton orgId={orgId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Projects</h2>
          {charts && charts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {charts.map((chart: any) => (
                <ChartCard key={chart.id} chart={chart} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500">
                No projects in this organization yet.
              </p>
            </div>
          )}
        </div>

        <div>
          <OrgMembers
            orgId={orgId}
            org={org}
            members={members || []}
            invites={invites || []}
            isAdmin={isAdmin}
            currentUserId={user!.id}
          />
        </div>
      </div>
    </div>
  );
}
