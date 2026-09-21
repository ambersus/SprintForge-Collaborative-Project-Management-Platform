import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils.text import slugify

class Timestamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta: abstract = True

class Project(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, max_length=140)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_projects")
    def save(self, *args, **kwargs):
        if not self.slug: self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    class Meta: indexes=[models.Index(fields=["owner", "slug"], name="project_owner_slug_idx")]

class Membership(Timestamped):
    class Role(models.TextChoices): OWNER="OWNER", "Owner"; ADMIN="ADMIN", "Admin"; MEMBER="MEMBER", "Member"; VIEWER="VIEWER", "Viewer"
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["project", "user"], name="unique_project_member")]
        indexes=[models.Index(fields=["user", "project"], name="membership_user_project_idx")]

class Sprint(Timestamped):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="sprints")
    name = models.CharField(max_length=120)
    goal = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=False)
    class Meta: constraints=[models.UniqueConstraint(fields=["project"], condition=Q(active=True), name="one_active_sprint_per_project")]

class Task(Timestamped):
    class Type(models.TextChoices): TASK="TASK", "Task"; ISSUE="ISSUE", "Issue"; BUG="BUG", "Bug"
    class Status(models.TextChoices): BACKLOG="BACKLOG", "Backlog"; TODO="TODO", "To do"; IN_PROGRESS="IN_PROGRESS", "In progress"; DONE="DONE", "Done"
    class Priority(models.TextChoices): LOW="LOW", "Low"; MEDIUM="MEDIUM", "Medium"; HIGH="HIGH", "High"; CRITICAL="CRITICAL", "Critical"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, related_name="tasks", null=True, blank=True)
    title = models.CharField(max_length=240)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.TASK)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.BACKLOG)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reported_tasks")
    position = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    due_date = models.DateField(null=True, blank=True)
    class Meta:
        ordering = ["status", "position", "created_at"]
        constraints=[models.UniqueConstraint(fields=["project", "status", "position"], name="unique_task_position")]
        indexes=[models.Index(fields=["project", "status"], name="task_project_status_idx"), models.Index(fields=["project", "assignee"], name="task_project_assignee_idx")]

class Comment(Timestamped):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    body = models.TextField(max_length=5000)

class TaskAttachment(Timestamped):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    file = models.FileField(upload_to="task_attachments/%Y/%m/%d")
    original_name = models.CharField(max_length=255)
    size = models.PositiveBigIntegerField()

class Activity(Timestamped):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True)
    verb = models.CharField(max_length=80)
    metadata = models.JSONField(default=dict)

class Notification(Timestamped):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    message = models.CharField(max_length=255)
    read_at = models.DateTimeField(null=True, blank=True)
