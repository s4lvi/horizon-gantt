"use client";

import { useState } from "react";
import { Settings, Users, Plus } from "lucide-react";
import { OrgSettingsModal } from "./org-settings-modal";
import { OrgMembersModal } from "./org-members-modal";
import { createChart } from "@/lib/actions/chart-actions";

export function OrgPageClient({
  org,
  orgId,
  isAdmin,
  members,
  invites,
  currentUserId,
}: {
  org: any;
  orgId: string;
  isAdmin: boolean;
  members: any[];
  invites: any[];
  currentUserId: string;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createChart(orgId);
    } catch {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          {org.logo_url ? (
            <img src={org.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
          ) : null}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{org.name}</h1>
            {(org.description || org.location) && (
              <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                {org.location && <span>{org.location}</span>}
                {org.location && org.description && <span>·</span>}
                {org.description && <span>{org.description}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Users size={16} />
            <span className="hidden sm:inline">Members</span>
            <span className="text-xs text-gray-400 ml-0.5">{members.length}</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-navy)] text-white rounded-lg hover:bg-[var(--brand-navy-light)] transition-colors font-medium text-sm disabled:opacity-50"
          >
            <Plus size={18} />
            {creating ? "Creating..." : "New Project"}
          </button>
        </div>
      </div>

      <OrgSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        org={org}
        orgId={orgId}
      />

      <OrgMembersModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        orgId={orgId}
        members={members}
        invites={invites}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </>
  );
}
