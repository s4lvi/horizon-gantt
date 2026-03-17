"use client";

import { useState, useEffect } from "react";
import {
  inviteMember,
  removeMember,
  createOrgInviteLink,
  getOrgInviteLinks,
  deleteOrgInviteLink,
} from "@/lib/actions/org-actions";
import { X, UserPlus, Trash2, Clock, Users, Link, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function OrgMembersModal({
  open,
  onClose,
  orgId,
  members,
  invites,
  isAdmin,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  members: any[];
  invites: any[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && isAdmin) {
      getOrgInviteLinks(orgId).then(setInviteLinks).catch(() => {});
    }
  }, [open, orgId, isAdmin]);

  if (!open) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await inviteMember(orgId, email.trim());
      setEmail("");
      toast.success("Member added/invited");
    } catch (err: any) {
      toast.error(err.message || "Failed to invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    try {
      const link = await createOrgInviteLink(orgId);
      setInviteLinks((prev) => [link, ...prev]);
      toast.success("Invite link created");
    } catch {
      toast.error("Failed to create link");
    }
  };

  const handleCopyLink = (token: string, linkId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/org/${token}`);
    setCopiedId(linkId);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteOrgInviteLink(linkId, orgId);
      setInviteLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      toast.error("Failed to remove link");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember(orgId, memberId);
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} /> Members
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Invite by email */}
          {isAdmin && (
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Invite by email"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="p-2 bg-[var(--brand-navy)] text-white rounded-lg hover:bg-[var(--brand-navy-light)] disabled:opacity-50 transition-colors"
              >
                <UserPlus size={16} />
              </button>
            </form>
          )}

          {/* Invite link */}
          {isAdmin && (
            <div>
              <button
                onClick={handleCreateLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Link size={14} /> Create invite link
              </button>
              {inviteLinks.length > 0 && (
                <div className="mt-2 space-y-2">
                  {inviteLinks.map((link: any) => (
                    <div key={link.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 truncate font-mono flex-1 min-w-0">
                        /invite/org/{link.token.slice(0, 12)}...
                      </p>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => handleCopyLink(link.token, link.id)} className="p-1.5 text-gray-400 hover:text-[var(--brand-navy)] rounded">
                          {copiedId === link.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                        <button onClick={() => handleDeleteLink(link.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Member list */}
          <div className="space-y-2">
            {members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">{member.profiles?.full_name || member.profiles?.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                </div>
                {isAdmin && member.user_id !== currentUserId && member.role !== "owner" && (
                  <button onClick={() => handleRemove(member.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {invites.map((invite: any) => (
              <div key={invite.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-500">{invite.email}</p>
                  <p className="text-xs text-yellow-600 flex items-center gap-1"><Clock size={10} /> Pending</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
