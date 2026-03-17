"use client";

import { useState, useEffect, useRef } from "react";
import { ProjectComment } from "@/lib/types";
import {
  getComments,
  addComment,
  deleteComment,
} from "@/lib/actions/comment-actions";
import { MessageSquare, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export function ProjectComments({
  chartId,
  currentUserId,
  onClose,
}: {
  chartId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    getComments(chartId)
      .then(setComments)
      .catch(() => toast.error("Failed to load comments"))
      .finally(() => setIsLoading(false));
  }, [chartId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;

    setIsSubmitting(true);
    try {
      const comment = await addComment(chartId, content);
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="border-t border-gray-200 bg-white flex flex-col" style={{ height: 320 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-[var(--brand-navy)]" />
          <span className="text-sm font-semibold text-gray-900">
            Discussion
          </span>
          <span className="text-xs text-gray-400">({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No comments yet. Start the discussion!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group flex gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--brand-navy)] text-white flex items-center justify-center text-xs font-medium">
                {(
                  comment.profiles?.full_name?.[0] ||
                  comment.profiles?.email?.[0] ||
                  "?"
                ).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {comment.profiles?.full_name ||
                      comment.profiles?.email ||
                      "Unknown"}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatTime(comment.created_at)}
                  </span>
                  {comment.user_id === currentUserId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
                      title="Delete comment"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-2 border-t border-gray-100"
      >
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="flex items-center justify-center p-2 rounded-lg bg-[var(--brand-navy)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
