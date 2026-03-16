"use client";

import { useState } from "react";
import { inviteMember, removeMember } from "@/lib/actions/org-actions";
import { UserPlus, Trash2, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export function OrgMembers({
  orgId,
  members,
  invites,
  isAdmin,
  currentUserId,
}: {
  orgId: string;
  members: any[];
  invites: any[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await inviteMember(orgId, email.trim());
      setEmail("");
      toast.success("Member added/invited successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to invite member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await removeMember(orgId, memberId);
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Users size={18} />
        Members
      </h2>

      {isAdmin && (
        <form onSubmit={handleInvite} className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus size={16} />
          </button>
        </form>
      )}

      <div className="space-y-2">
        {members.map((member: any) => (
          <div
            key={member.id}
            className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">
                {member.profiles?.full_name || member.profiles?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{member.role}</p>
            </div>
            {isAdmin &&
              member.user_id !== currentUserId &&
              member.role !== "owner" && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={14} />
                </button>
              )}
          </div>
        ))}

        {invites.map((invite: any) => (
          <div
            key={invite.id}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100"
          >
            <div>
              <p className="text-sm font-medium text-gray-500">
                {invite.email}
              </p>
              <p className="text-xs text-yellow-600 flex items-center gap-1">
                <Clock size={10} />
                Pending invite
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
