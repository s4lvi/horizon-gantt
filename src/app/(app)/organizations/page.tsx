import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await admin
    .from("organization_members")
    .select("role, organizations(id, name, logo_url, created_at)")
    .eq("user_id", user!.id);

  const { data: invites } = await admin
    .from("organization_invites")
    .select("id, organization_id, organizations(name)")
    .eq("email", user!.email!);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <Link
          href="/organizations/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-navy)] text-white rounded-lg hover:bg-[var(--brand-navy-light)] transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          New Organization
        </Link>
      </div>

      {invites && invites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Pending Invites
          </h2>
          <div className="space-y-2">
            {invites.map((invite: any) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-yellow-600" />
                  <span className="font-medium text-gray-900">
                    {invite.organizations?.name}
                  </span>
                </div>
                <form
                  action={async () => {
                    "use server";
                    const { acceptInvite } = await import(
                      "@/lib/actions/org-actions"
                    );
                    await acceptInvite(invite.id);
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Accept
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {memberships && memberships.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((m: any) => (
            <Link
              key={m.organizations.id}
              href={`/organizations/${m.organizations.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-navy-light)] hover:shadow-md transition-all"
            >
              {m.organizations.logo_url ? (
                <img src={m.organizations.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 bg-[#e8eef5] rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-[var(--brand-navy)]" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {m.organizations.name}
                </h3>
                <p className="text-xs text-gray-500 capitalize">{m.role}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            No organizations yet. Create one to collaborate!
          </p>
        </div>
      )}
    </div>
  );
}
