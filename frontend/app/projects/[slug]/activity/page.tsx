"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";

const VERB_CONFIG: Record<string, { icon: string; color: string; label: (m: Record<string, unknown>) => string }> = {
  created_project:  { icon: "🚀", color: "bg-indigo-100", label: () => "created the project" },
  created_task:     { icon: "✅", color: "bg-blue-100",   label: () => "created a task" },
  updated_task:     { icon: "✏️", color: "bg-amber-100",  label: () => "updated a task" },
  moved_task:       { icon: "↗️", color: "bg-purple-100", label: (m) => `moved a task to ${m.to ?? ""}` },
  deleted_task:     { icon: "🗑️", color: "bg-red-100",   label: () => "deleted a task" },
  commented:        { icon: "💬", color: "bg-green-100",  label: () => "left a comment" },
  assigned_task:    { icon: "👤", color: "bg-cyan-100",   label: () => "assigned a task" },
  attached_file:    { icon: "📎", color: "bg-orange-100", label: () => "attached a file" },
  created_sprint:   { icon: "⚡", color: "bg-violet-100", label: () => "created a sprint" },
  added_member:     { icon: "👥", color: "bg-teal-100",   label: () => "added a member" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Avatar({ name }: { name: string }) {
  const colors = ["bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return <div className={`avatar ${color} text-xs`} style={{ width: 28, height: 28, fontSize: 11 }}>{name[0]?.toUpperCase()}</div>;
}

export default function ActivityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Activity[]>(`/projects/${slug}/activity/`)
      .then(setActivities)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Activity feed</h1>
        <p className="text-sm text-muted mt-0.5">Everything happening in this project</p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠ {error}</div>}

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-7 h-7 skeleton rounded-full shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 skeleton rounded w-2/3" />
                <div className="h-3 skeleton rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <span className="text-4xl mb-3">📋</span>
          <h3 className="font-semibold text-slate-900">No activity yet</h3>
          <p className="text-muted text-sm mt-1">Activity will appear here as your team works on the project</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-px bg-border" />

          <div className="space-y-5">
            {activities.map((activity, i) => {
              const cfg = VERB_CONFIG[activity.verb] ?? { icon: "•", color: "bg-slate-100", label: () => activity.verb.replace(/_/g, " ") };
              const actor = activity.actor?.username ?? "Someone";
              return (
                <div key={activity.id} className="flex gap-4 relative animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  {/* Icon dot */}
                  <div className={`w-7 h-7 rounded-full ${cfg.color} flex items-center justify-center text-sm shrink-0 z-10`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{actor}</span>
                      {" "}
                      <span>{cfg.label(activity.metadata)}</span>
                    </p>
                    {activity.task && (
                      <p className="text-xs text-muted mt-0.5 truncate">Task ID: {activity.task}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">{timeAgo(activity.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
