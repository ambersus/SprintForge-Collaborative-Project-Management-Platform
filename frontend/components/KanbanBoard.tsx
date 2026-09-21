"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { api, token } from "@/lib/api";
import type { Paginated, Task, TaskStatus } from "@/lib/types";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "BACKLOG", label: "Backlog" }, { id: "TODO", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" }, { id: "DONE", label: "Done" },
];
type Analytics = { sprint_total: number; sprint_completed: number; active_sprint: { name: string } | null };

export function KanbanBoard({ project }: { project: string }) {
  const [tasks, setTasks] = useState<Task[]>([]); const [title, setTitle] = useState("");
  const [error, setError] = useState(""); const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const load = useCallback(async () => {
    try { const [items, metrics] = await Promise.all([api<Paginated<Task>>(`/tasks/?project=${encodeURIComponent(project)}&page_size=100`), api<Analytics>(`/projects/${project}/analytics/`)]); setTasks(items.results); setAnalytics(metrics); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load board"); }
  }, [project]);
  useEffect(() => { load(); const host = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"; let socket: WebSocket | undefined;
    api<{ id: string }>(`/projects/${project}/`).then((p) => { socket = new WebSocket(`${host}/ws/projects/${p.id}/?token=${encodeURIComponent(token() ?? "")}`); socket.onmessage = () => load(); }).catch(() => undefined);
    return () => socket?.close();
  }, [project, load]);
  async function create(event: FormEvent) { event.preventDefault(); try { await api("/tasks/", { method: "POST", body: JSON.stringify({ project, title, status: "BACKLOG", priority: "MEDIUM", type: "TASK" }) }); setTitle(""); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Could not create task"); } }
  async function move(task: Task, status: TaskStatus) { if (task.status === status) return; try { const saved = await api<Task>(`/tasks/${task.id}/move/`, { method: "POST", body: JSON.stringify({ status, version: task.version }) }); setTasks((all) => all.map((item) => item.id === saved.id ? saved : item)); } catch (err) { setError(err instanceof Error ? err.message : "Move failed; board reloaded."); await load(); } }
  function drop(event: DragEvent<HTMLElement>, status: TaskStatus) { event.preventDefault(); const task = tasks.find((item) => item.id === event.dataTransfer.getData("text/plain")); if (task) void move(task, status); }
  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [column.id, tasks.filter((task) => task.status === column.id)])) as Record<TaskStatus, Task[]>, [tasks]);
  const progress = analytics?.sprint_total ? Math.round((analytics.sprint_completed / analytics.sprint_total) * 100) : 0;
  return <>
    {analytics?.active_sprint && <section className="card mb-5 flex items-center justify-between p-4"><div><p className="font-semibold">Active sprint: {analytics.active_sprint.name}</p><p className="text-sm text-slate-500">{analytics.sprint_completed} of {analytics.sprint_total} tasks complete</p></div><div className="w-40"><div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-forge" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-right text-xs text-slate-500">{progress}%</p></div></section>}
    <form onSubmit={create} className="mb-6 flex gap-2"><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={240} className="w-full rounded border bg-white px-3 py-2" placeholder="Add a task to backlog" /><button className="rounded bg-forge px-4 font-semibold text-white">Add task</button></form>
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    <div className="grid min-w-[900px] grid-cols-4 gap-4">{columns.map((column) => <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, column.id)} className="min-h-72 rounded-xl bg-slate-200 p-3"><div className="mb-3 flex justify-between text-sm font-bold"><span>{column.label}</span><span>{grouped[column.id].length}</span></div><div className="space-y-3">{grouped[column.id].map((task) => <article key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)} className="card cursor-grab p-3 active:cursor-grabbing"><div className="flex items-start justify-between gap-2"><h3 className="font-medium">{task.title}</h3><span className={`rounded px-2 py-0.5 text-xs ${task.priority === "CRITICAL" || task.priority === "HIGH" ? "bg-red-100 text-red-700" : "bg-slate-100"}`}>{task.priority}</span></div><p className="mt-1 text-xs font-medium text-blue-700">{task.type}</p>{task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-1">{columns.filter((candidate) => candidate.id !== task.status).map((candidate) => <button type="button" title={`Move to ${candidate.label}`} onClick={() => void move(task, candidate.id)} key={candidate.id} className="rounded border px-2 py-1 text-xs hover:bg-slate-50">→ {candidate.label}</button>)}</div></article>)}</div></section>)}</div>
  </>;
}
