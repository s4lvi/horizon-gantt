import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3, Users, Share2, Calendar } from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Horizon</h1>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Gantt chart planning,
            <br />
            <span className="text-blue-600">simplified.</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Create, share, and collaborate on Gantt charts with your team.
            Drag-and-drop scheduling with dependency management.
          </p>
          <Link
            href="/login"
            className="inline-flex px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
          >
            Get Started Free
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: BarChart3,
              title: "Visual Planning",
              desc: "Drag and drop activities on an interactive timeline with multiple view modes.",
            },
            {
              icon: Users,
              title: "Team Collaboration",
              desc: "Create organizations, invite members, and assign work to your team.",
            },
            {
              icon: Share2,
              title: "Flexible Sharing",
              desc: "Share charts with view or edit permissions. Everyone stays in sync.",
            },
            {
              icon: Calendar,
              title: "Dependencies",
              desc: "Link activities together. Moving one automatically adjusts its dependents.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-gray-50 rounded-xl border border-gray-100"
            >
              <feature.icon size={28} className="text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
