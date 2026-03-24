"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Profile, Organization } from "@/lib/types";
import { useState } from "react";

export function Sidebar({
  profile,
  organizations,
  onNavigate,
  compact,
}: {
  profile: Profile | null;
  organizations: Organization[];
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const show = compact ? true : !collapsed;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onNavigate?.();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/assignments", label: "My Assignments", icon: ClipboardList },
    { href: "/organizations", label: "Organizations", icon: Building2 },
  ];

  return (
    <aside
      className={cn(
        "bg-white flex flex-col transition-all duration-200",
        compact ? "w-full" : "border-r border-gray-200",
        !compact && (collapsed ? "w-16" : "w-64")
      )}
    >
      {!compact && (
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {show ? (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="flex items-center gap-2 text-xl font-bold text-gray-900"
              style={{ fontFamily: "'Eurostile', sans-serif" }}
            >
              <img src="/horizon-logo.svg" alt="" className="w-7 h-7 rounded" />
              Horizon Gantt
            </Link>
          ) : (
            <Link href="/dashboard" onClick={onNavigate}>
              <img src="/horizon-logo.svg" alt="" className="w-7 h-7 rounded" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "bg-[#e8eef5] text-[var(--brand-navy)]"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon size={18} />
            {show && item.label}
          </Link>
        ))}

        {show && organizations.length > 0 && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Organizations
            </p>
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.id}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === `/organizations/${org.id}`
                    ? "bg-[#e8eef5] text-[var(--brand-navy)]"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                ) : (
                  <Building2 size={16} />
                )}
                {org.name}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="p-2 border-t border-gray-200">
        {show && profile && (
          <div className="px-3 py-2 text-sm text-gray-600 truncate">
            {profile.full_name || profile.email}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 w-full transition-colors"
        >
          <LogOut size={18} />
          {show && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
