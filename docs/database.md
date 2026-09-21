# Database model

```mermaid
erDiagram
  USER ||--o{ PROJECT : owns
  USER ||--o{ MEMBERSHIP : joins
  PROJECT ||--o{ MEMBERSHIP : has
  PROJECT ||--o{ SPRINT : plans
  PROJECT ||--o{ TASK : contains
  SPRINT o|--o{ TASK : scopes
  USER o|--o{ TASK : assigned
  TASK ||--o{ COMMENT : receives
  TASK ||--o{ TASKATTACHMENT : stores
  PROJECT ||--o{ ACTIVITY : records
  USER ||--o{ NOTIFICATION : receives
```

Important invariants: membership is unique per user/project; only one active sprint can exist per project; task positions are unique inside a project status column; a task references its project through all collaboration records. Indexed project/status and project/assignee paths support the board and filtering queries.
