export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: User;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: number;
  user: User;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  created_at: string;
};

export type Sprint = {
  id: number;
  project: string;
  name: string;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskType = "TASK" | "ISSUE" | "BUG";

export type Comment = {
  id: number;
  task: string;
  author: User;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: number;
  task: string;
  uploaded_by: User;
  file: string;
  original_name: string;
  size: number;
  created_at: string;
};

export type Task = {
  id: string;
  project: string;
  sprint: number | null;
  title: string;
  type: TaskType;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: User | null;
  reporter: User;
  position: number;
  version: number;
  due_date: string | null;
  comments: Comment[];
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: number;
  project: string;
  actor: User | null;
  task: string | null;
  verb: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Notification = {
  id: number;
  project: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type Analytics = {
  active_sprint: Sprint | null;
  status_counts: Record<TaskStatus, number>;
  sprint_total: number;
  sprint_completed: number;
  workload: { assignee__id: number; assignee__username: string; total: number; completed: number }[];
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
