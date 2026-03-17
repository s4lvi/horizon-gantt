import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ChartCard } from "@/components/dashboard/chart-card";
import { OrgPageClient } from "@/components/organizations/org-page-client";
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
      <OrgPageClient
        org={org}
        orgId={orgId}
        isAdmin={isAdmin}
        members={members || []}
        invites={invites || []}
        currentUserId={user!.id}
      />

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Projects</h2>
        {charts && charts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </section>
    </div>
  );
}
