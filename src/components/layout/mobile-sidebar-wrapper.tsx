"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Profile, Organization } from "@/lib/types";

export function MobileSidebarWrapper({
  profile,
  organizations,
  children,
}: {
  profile: Profile | null;
  organizations: Organization[];
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMenuOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        <Menu size={20} className="text-gray-700" />
      </button>

      {/* Mobile modal overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "'Eurostile', sans-serif" }}
              >
                Horizon Gantt
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                profile={profile}
                organizations={organizations}
                onNavigate={() => setMenuOpen(false)}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar profile={profile} organizations={organizations} />
        </div>
        {children}
      </div>
    </>
  );
}
