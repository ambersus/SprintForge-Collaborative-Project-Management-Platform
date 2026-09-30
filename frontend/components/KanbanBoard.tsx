"use client";

import { useCallback, useEffect, useMemo, useState, useRef, type DragEvent, type FormEvent } from "react";
import { api, token } from "@/lib/api";
import { useToast } from "@/components/ToastContext";
import type { Analytics, Comment, Membership, Sprint, Task, TaskPriority, TaskStatus, TaskType } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────
const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "BACKLOG",     label: "Backlog" },
  { id: "TODO",        label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE",        label: "Done" },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  CRITICAL: "priority-CRITICAL", HIGH: "priority-HIGH", MEDIUM: "priority-MEDIUM", LOW: "priority-LOW",
};
const TYPE_STYLES: Record<TaskType, string> = {
  TASK: "type-TASK", ISSUE: "type-ISSUE", BUG: "type-BUG",
};
const TYPE_ICONS: Record<TaskType, string> = { TASK: "✓", ISSUE: "!", BUG: "🐛" };

// ── Shared UI ──────────────────────────────────────────────────────────────
function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  const colors = ["bg-violet-500","bg-forge","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500"];
  const c = colors[(name.charCodeAt(0)||0)%colors.length];
  return <div className={`avatar ${c}`} style={{width:size*4,height:size*4,fontSize:size*1.8}}>{name[0]?.toUpperCase()}</div>;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime(), m = Math.floor(diff/60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

// ── Task Modal ─────────────────────────────────────────────────────────────
function TaskModal({ task, members, sprints, onClose, onUpdate, onDelete }: {
  task: Task;
  members: Membership[];
  sprints: Sprint[];
  onClose: () => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>(task.comments);
  const [commentBody, setCommentBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Esc to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function postComment(e: FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    try {
      const c = await api<Comment>(`/tasks/${task.id}/comments/`, { method: "POST", body: JSON.stringify({ body: commentBody }) });
      setComments((prev) => [...prev, c]);
      setCommentBody("");
    } catch(err) { toast(err instanceof Error ? err.message : "Failed to post", "error"); }
  }

  async function updateField(field: Partial<Task>) {
    setSaving(true);
    try {
      const updated = await api<Task>(`/tasks/${task.id}/`, { method: "PATCH", body: JSON.stringify({ ...field, version: task.version }) });
      onUpdate(updated);
    } catch(err) { toast(err instanceof Error ? err.message : "Update failed", "error"); }
    finally { setSaving(false); }
  }

  async function moveTo(status: TaskStatus) {
    setSaving(true);
    try {
      const updated = await api<Task>(`/tasks/${task.id}/move/`, { method: "POST", body: JSON.stringify({ status, version: task.version }) });
      onUpdate(updated);
      toast(`Moved to ${status.replace("_", " ")}`, "success");
    } catch(err) { toast(err instanceof Error ? err.message : "Move failed", "error"); }
    finally { setSaving(false); }
  }

  async function destroy() {
    if (!confirm("Delete this task forever?")) return;
    try {
      await api(`/tasks/${task.id}/`, { method: "DELETE" });
      onDelete(task.id);
      toast("Task deleted", "success");
      onClose();
    } catch(err) { toast(err instanceof Error ? err.message : "Failed to delete", "error"); }
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-4xl max-h-[85vh] flex flex-row w-full shadow-2xl relative">
        {/* Left side: Main Content */}
        <div className="flex-1 overflow-y-auto flex flex-col p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-ink-muted font-mono bg-background px-1.5 py-0.5 rounded">{task.id.split("-")[0]}</span>
            <span className={`badge ${TYPE_STYLES[task.type]}`}>{TYPE_ICONS[task.type]} {task.type}</span>
          </div>
          
          <h1 className="text-2xl font-semibold text-ink leading-snug mb-4 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => e.currentTarget.textContent !== task.title && updateField({ title: e.currentTarget.textContent || "Untitled" })}>
            {task.title}
          </h1>
          
          <div className="mb-8">
            <h3 className="label">Description</h3>
            <div className="min-h-[100px] text-sm text-ink-muted p-3 rounded-lg border border-transparent hover:border-border hover:bg-background focus-within:border-forge focus-within:bg-surface focus-within:ring-2 focus-within:ring-forge transition-all outline-none"
                 contentEditable suppressContentEditableWarning onBlur={(e) => e.currentTarget.textContent !== task.description && updateField({ description: e.currentTarget.textContent || "" })}>
              {task.description || "Add a description..."}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            <h3 className="label mb-3">Activity</h3>
            <div className="space-y-4 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author.username} size={6} />
                  <div className="flex-1 bg-background rounded-lg rounded-tl-none p-3 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{c.author.username}</span>
                      <span className="text-xs text-ink-subtle">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={postComment} className="flex items-start gap-3 mt-auto">
              <Avatar name="Me" size={6} />
              <div className="flex-1 relative">
                <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Leave a comment... (Ctrl+Enter)" rows={2} className="input resize-none pb-10" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) postComment(e as unknown as FormEvent); }} />
                <button type="submit" disabled={!commentBody.trim()} className="btn-primary btn-sm absolute bottom-2 right-2">Post</button>
              </div>
            </form>
          </div>
        </div>

        {/* Right side: Sidebar (Attributes) */}
        <div className="w-80 border-l border-border bg-background p-6 flex flex-col gap-6 overflow-y-auto">
          <div className="flex justify-end gap-2">
            <button onClick={destroy} className="btn-icon btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            <button onClick={onClose} className="btn-icon btn-ghost"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>

          <div>
            <h3 className="label">Status</h3>
            <select value={task.status} onChange={(e) => moveTo(e.target.value as TaskStatus)} className="input font-medium bg-surface">
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <h3 className="label">Assignee</h3>
            <select value={task.assignee?.id || ""} onChange={(e) => updateField({ assignee_id: e.target.value ? Number(e.target.value) : null } as any)} className="input bg-surface">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.user.id}>{m.user.username}</option>)}
            </select>
          </div>

          <div>
            <h3 className="label">Priority</h3>
            <select value={task.priority} onChange={(e) => updateField({ priority: e.target.value as TaskPriority })} className="input bg-surface">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <h3 className="label">Sprint</h3>
            <select value={task.sprint || ""} onChange={(e) => updateField({ sprint: e.target.value ? Number(e.target.value) : null })} className="input bg-surface">
              <option value="">Backlog (No sprint)</option>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} {s.active && "(Active)"}</option>)}
            </select>
          </div>
          
          <div className="mt-auto pt-6 border-t border-border space-y-2 text-xs text-ink-muted">
            <p className="flex justify-between"><span>Created</span> <span>{new Date(task.created_at).toLocaleDateString()}</span></p>
            <p className="flex justify-between"><span>Reporter</span> <span>{task.reporter.username}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Task Modal ──────────────────────────────────────────────────────
function CreateTaskModal({ project, onClose, onCreate }: { project: string; onClose: () => void; onCreate: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("TASK");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await api("/tasks/", { method: "POST", body: JSON.stringify({ project, title, type, priority, status: "BACKLOG" }) });
      toast("Task created", "success");
      onCreate();
      onClose();
    } catch(err) { toast(err instanceof Error ? err.message : "Failed to create", "error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay items-start pt-32" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="modal-panel max-w-xl shadow-2xl animate-enter">
        <div className="p-4 border-b border-border flex gap-3">
          <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className="input w-32 bg-background border-transparent shadow-none text-xs">
            <option value="TASK">Task</option><option value="ISSUE">Issue</option><option value="BUG">Bug</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input w-32 bg-background border-transparent shadow-none text-xs">
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </select>
        </div>
        <input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." className="w-full px-5 py-4 text-lg outline-none bg-transparent placeholder:text-ink-subtle" required />
        <div className="p-3 bg-background border-t border-border flex justify-between items-center">
          <span className="text-xs text-ink-muted flex items-center gap-1">Press <kbd className="kbd">Enter</kbd> to create</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary btn-sm">Create</button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Kanban Board ───────────────────────────────────────────────────────────
export function KanbanBoard({ project }: { project: string }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals & Selection
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [dragColumn, setDragColumn] = useState<TaskStatus | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterSprint, setFilterSprint] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const [items, metrics, mem, spr] = await Promise.all([
        api<Task[]>(`/tasks/?project=${encodeURIComponent(project)}&page_size=100`),
        api<Analytics>(`/projects/${project}/analytics/`),
        api<Membership[]>(`/projects/${project}/members/`),
        api<Sprint[]>(`/projects/${project}/sprints/`),
      ]);
      setTasks(items);
      setAnalytics(metrics);
      setMembers(mem);
      setSprints(spr);
    } catch (err) { toast(err instanceof Error ? err.message : "Unable to load board", "error"); }
    finally { setLoading(false); }
  }, [project, toast]);

  useEffect(() => {
    load();
    const host = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
    let socket: WebSocket | undefined;
    api<{ id: string }>(`/projects/${project}/`).then((p) => {
        socket = new WebSocket(`${host}/ws/projects/${p.id}/?token=${encodeURIComponent(token() ?? "")}`);
        socket.onmessage = () => load();
    }).catch(() => undefined);
    return () => socket?.close();
  }, [project, load]);

  // Keyboard shortcut for 'c' to create task
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger if inside an input or textarea
      if (e.key === "c" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShowCreate(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  async function move(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    // Optimistic UI
    const original = [...tasks];
    setTasks(all => all.map(t => t.id === task.id ? { ...t, status } : t));
    try {
      const saved = await api<Task>(`/tasks/${task.id}/move/`, { method: "POST", body: JSON.stringify({ status, version: task.version }) });
      setTasks(all => all.map(t => t.id === saved.id ? saved : t));
    } catch (err) {
      setTasks(original);
      toast(err instanceof Error ? err.message : "Move failed", "error");
    }
  }

  function drop(e: DragEvent<HTMLElement>, status: TaskStatus) {
    e.preventDefault();
    setDragColumn(null);
    setDragItem(null);
    const task = tasks.find((t) => t.id === e.dataTransfer.getData("text/plain"));
    if (task) void move(task, status);
  }

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (search) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));
    if (filterAssignee !== "all") {
      if (filterAssignee === "unassigned") result = result.filter(t => !t.assignee);
      else result = result.filter(t => t.assignee?.id === Number(filterAssignee));
    }
    if (filterSprint !== "all") {
      if (filterSprint === "backlog") result = result.filter(t => !t.sprint);
      else result = result.filter(t => t.sprint === Number(filterSprint));
    }
    return result;
  }, [tasks, search, filterAssignee, filterSprint]);

  const grouped = useMemo(() =>
    Object.fromEntries(COLUMNS.map((col) => [col.id, filteredTasks.filter((t) => t.status === col.id)])) as Record<TaskStatus, Task[]>,
    [filteredTasks]
  );

  const progress = analytics?.sprint_total ? Math.round((analytics.sprint_completed / analytics.sprint_total) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-96 bg-background rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-surface p-2 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="input pl-9 border-transparent shadow-none bg-transparent h-9 focus:ring-0 focus:bg-background" />
        </div>
        <div className="w-px h-6 bg-border" />
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="input w-auto h-9 text-xs border-transparent shadow-none bg-transparent hover:bg-background cursor-pointer">
          <option value="all">Assignee: All</option>
          <option value="unassigned">Unassigned</option>
          {members.map(m => <option key={m.id} value={m.user.id}>{m.user.username}</option>)}
        </select>
        <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} className="input w-auto h-9 text-xs border-transparent shadow-none bg-transparent hover:bg-background cursor-pointer">
          <option value="all">Sprint: All</option>
          <option value="backlog">Backlog</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name} {s.active ? "(Active)" : ""}</option>)}
        </select>
        <div className="w-px h-6 bg-border" />
        <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm px-3 gap-1.5 whitespace-nowrap">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4"/></svg>
          New Issue
        </button>
      </div>

      {/* Active Sprint Analytics */}
      {analytics?.active_sprint && filterSprint === "all" && (
        <div className="flex items-center gap-6 p-4 mb-6 bg-surface border border-border shadow-xs rounded-xl overflow-x-auto scrollbar-hide">
          <div className="shrink-0 flex items-center gap-3 pr-6 border-r border-border">
            <div className="w-10 h-10 rounded-lg bg-forge text-white border border-forge flex items-center justify-center text-forge"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">{analytics.active_sprint.name}</p>
              <p className="font-semibold text-ink text-sm">{analytics.sprint_completed} / {analytics.sprint_total} done</p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-forge rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-medium text-ink-muted w-8">{progress}%</span>
          </div>
          <div className="shrink-0 flex -space-x-2 pl-6 border-l border-border">
            {analytics.workload.map((w, i) => (
              <div key={w.assignee__id} className="relative group cursor-help z-10 hover:z-20">
                <Avatar name={w.assignee__username} size={8} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {w.assignee__username}: {w.completed}/{w.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board columns */}
      <div className="flex-1 grid min-w-[1000px] grid-cols-4 gap-4 pb-4">
        {COLUMNS.map((col) => {
          const colTasks = grouped[col.id];
          const isDragOver = dragColumn === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setDragColumn(col.id); }}
              onDragLeave={() => setDragColumn(null)}
              onDrop={(e) => drop(e, col.id)}
              className={`flex flex-col rounded-xl transition-colors duration-200 ${isDragOver ? "bg-surface shadow-sm ring-2 ring-forge ring-inset" : "bg-background"}`}
            >
              {/* Column header */}
              <div className="px-3 pt-3 pb-2 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    col.id === "DONE" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                    col.id === "IN_PROGRESS" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                    col.id === "TODO" ? "bg-blue-500" : "bg-border-strong"
                  }`} />
                  <h2 className="text-sm font-semibold text-ink">{col.label}</h2>
                </div>
                <span className="text-xs font-mono text-ink-muted bg-background px-1.5 rounded">{colTasks.length}</span>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto min-h-[150px]">
                {colTasks.map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      setDragItem(task.id);
                      e.dataTransfer.setData("text/plain", task.id);
                      e.dataTransfer.effectAllowed = "move";
                      setTimeout(() => { if (e.target instanceof HTMLElement) e.target.style.opacity = "0.4"; }, 0);
                    }}
                    onDragEnd={(e) => {
                      setDragItem(null);
                      setDragColumn(null);
                      if (e.target instanceof HTMLElement) e.target.style.opacity = "1";
                    }}
                    onClick={() => setSelectedTask(task)}
                    className={`card p-3 cursor-pointer group hover:border-border-strong hover:shadow-sm transition-all duration-200 ${dragItem === task.id ? "opacity-40 scale-95" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-ink-subtle">{task.id.split("-")[0]}</span>
                      <Avatar name={task.assignee?.username || "?"} size={5} />
                    </div>
                    <h3 className="font-medium text-ink text-[13px] leading-snug mb-3 group-hover:text-forge transition-colors">{task.title}</h3>
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <span className={`badge ${TYPE_STYLES[task.type]}`}>{TYPE_ICONS[task.type]}</span>
                        <span className={`badge ${PRIORITY_STYLES[task.priority]}`}>{task.priority[0]}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-ink-subtle">
                        {task.comments.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-medium"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>{task.comments.length}</div>
                        )}
                        {task.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-medium"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>{task.attachments.length}</div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask} members={members} sprints={sprints}
          onClose={() => setSelectedTask(null)}
          onUpdate={(t) => setTasks(all => all.map(x => x.id === t.id ? t : x))}
          onDelete={(id) => setTasks(all => all.filter(x => x.id !== id))}
        />
      )}
      {showCreate && <CreateTaskModal project={project} onClose={() => setShowCreate(false)} onCreate={load} />}
    </div>
  );
}


