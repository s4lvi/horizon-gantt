import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { acceptShareLink } from "@/lib/actions/share-actions";

export default async function AcceptChartSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/chart/${token}`);

  let chartId: string | null = null;

  try {
    chartId = await acceptShareLink(token);
  } catch {
    // fall through to error UI
  }

  if (chartId) redirect(`/charts/${chartId}`);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Invalid or Expired Link
        </h1>
        <p className="text-gray-500">
          This share link is no longer valid.
        </p>
      </div>
    </div>
  );
}
