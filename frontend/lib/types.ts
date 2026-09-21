export type User={id:number;username:string;email:string;first_name:string;last_name:string};
export type Project={id:string;name:string;slug:string;description:string;owner:User;member_count:number};
export type TaskStatus="BACKLOG"|"TODO"|"IN_PROGRESS"|"DONE";
export type Task={id:string;project:string;sprint:number|null;title:string;type:"TASK"|"ISSUE"|"BUG";description:string;status:TaskStatus;priority:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL";assignee:User|null;reporter:User;position:number;version:number;due_date:string|null;attachments:{id:number;file:string;original_name:string;size:number}[];created_at:string;updated_at:string};
export type Paginated<T>={count:number;next:string|null;previous:string|null;results:T[]};
