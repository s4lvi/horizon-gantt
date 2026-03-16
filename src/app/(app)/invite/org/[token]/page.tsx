import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { acceptOrgInviteLink } from "@/lib/actions/org-actions";

export default async function AcceptOrgInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/org/${token}`);

  let orgId: string | null = null;
  let error = false;

  try {
    orgId = await acceptOrgInviteLink(token);
  } catch {
    error = true;
  }

  if (orgId) redirect(`/organizations/${orgId}`);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Invalid or Expired Link
        </h1>
        <p className="text-gray-500">
          This invite link is no longer valid.
        </p>
      </div>
    </div>
  );
}
