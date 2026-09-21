from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Max, Q
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Activity, Comment, Membership, Notification, Project, Sprint, Task, TaskAttachment
from .permissions import CanEditProject, IsProjectMember, membership_for
from .serializers import ActivitySerializer, CommentSerializer, MembershipSerializer, NotificationSerializer, ProjectSerializer, RegisterSerializer, SprintSerializer, TaskAttachmentSerializer, TaskSerializer, UserSerializer

def broadcast(project_id, event, payload):
    async_to_sync(get_channel_layer().group_send)(f"project_{project_id}", {"type":"project.event", "event":event, "payload":payload})
def record(project, actor, verb, task=None, **metadata):
    Activity.objects.create(project=project, actor=actor, task=task, verb=verb, metadata=metadata)

class RegisterViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class=RegisterSerializer; permission_classes=[AllowAny]
    def create(self, request, *args, **kwargs):
        s=self.get_serializer(data=request.data); s.is_valid(raise_exception=True); user=s.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class=ProjectSerializer
    lookup_field="slug"
    def get_queryset(self): return Project.objects.filter(memberships__user=self.request.user).annotate(member_count=Count("memberships")).order_by("name")
    def perform_create(self, serializer):
        project=serializer.save(owner=self.request.user)
        Membership.objects.create(project=project,user=self.request.user,role=Membership.Role.OWNER)
        record(project, self.request.user, "created_project")
    def perform_update(self, serializer):
        if membership_for(self.request.user, self.get_object()).role not in ["OWNER", "ADMIN"]: raise PermissionDenied("Only owners and admins can edit a project.")
        serializer.save()
    def perform_destroy(self, instance):
        if membership_for(self.request.user, instance).role != "OWNER": raise PermissionDenied("Only the owner can delete a project.")
        instance.delete()
    def get_object(self):
        obj=super().get_object()
        if not membership_for(self.request.user,obj): raise PermissionDenied("Project membership is required.")
        return obj
    @action(detail=True, methods=["get","post"], url_path="members")
    def members(self, request, slug=None):
        project=self.get_object()
        if request.method=="GET": return Response(MembershipSerializer(project.memberships.select_related("user"),many=True).data)
        if membership_for(request.user,project).role not in ["OWNER","ADMIN"]: raise PermissionDenied("Only owners and admins can add members.")
        s=MembershipSerializer(data=request.data); s.is_valid(raise_exception=True); member=s.save(project=project)
        record(project,request.user,"added_member", member_id=member.id); return Response(MembershipSerializer(member).data,status=201)
    @action(detail=True, methods=["get","post"], url_path="sprints")
    def sprints(self, request, slug=None):
        project=self.get_object()
        if request.method=="GET": return Response(SprintSerializer(project.sprints.all(),many=True).data)
        if membership_for(request.user,project).role == "VIEWER": raise PermissionDenied("Viewers cannot plan sprints.")
        s=SprintSerializer(data=request.data);s.is_valid(raise_exception=True); sprint=s.save(project=project)
        record(project,request.user,"created_sprint");return Response(SprintSerializer(sprint).data,status=201)
    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self,request,slug=None):
        project=self.get_object(); page=self.paginate_queryset(project.activities.select_related("actor","task"))
        return self.get_paginated_response(ActivitySerializer(page,many=True).data)
    @action(detail=True, methods=["get"], url_path="analytics")
    def analytics(self, request, slug=None):
        project=self.get_object()
        statuses={value: project.tasks.filter(status=value).count() for value in Task.Status.values}
        active=project.sprints.filter(active=True).first()
        sprint_tasks=Task.objects.filter(project=project, sprint=active) if active else Task.objects.none()
        workload=list(sprint_tasks.values("assignee__id", "assignee__username").annotate(total=Count("id"), completed=Count("id", filter=Q(status=Task.Status.DONE))).order_by("assignee__username"))
        return Response({"active_sprint":SprintSerializer(active).data if active else None,"status_counts":statuses,"sprint_total":sprint_tasks.count(),"sprint_completed":sprint_tasks.filter(status=Task.Status.DONE).count(),"workload":workload})

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class=TaskSerializer
    def get_queryset(self):
        qs=Task.objects.filter(project__memberships__user=self.request.user).select_related("assignee","reporter","project","sprint").prefetch_related("comments__author", "attachments__uploaded_by")
        params=self.request.query_params
        if project:=params.get("project"): qs=qs.filter(project__slug=project)
        if status_value:=params.get("status"): qs=qs.filter(status=status_value)
        if assignee:=params.get("assignee"): qs=qs.filter(assignee_id=assignee)
        if search:=params.get("search"): qs=qs.filter(Q(title__icontains=search)|Q(description__icontains=search))
        return qs.distinct()
    def _project(self):
        slug=self.request.data.get("project") or self.request.query_params.get("project")
        try: return Project.objects.get(slug=slug, memberships__user=self.request.user)
        except Project.DoesNotExist: raise ValidationError({"project":"A project you belong to is required."})
    def perform_create(self, serializer):
        project=self._project()
        if membership_for(self.request.user,project).role=="VIEWER": raise PermissionDenied("Viewers cannot create tasks.")
        task=serializer.save(project=project, reporter=self.request.user, position=(Task.objects.filter(project=project,status=serializer.validated_data.get("status",Task.Status.BACKLOG)).aggregate(max=Max("position"))["max"] or 0)+1)
        record(project,self.request.user,"created_task",task=task); broadcast(project.id,"task.created",TaskSerializer(task).data)
    def perform_update(self, serializer):
        task=self.get_object(); role=membership_for(self.request.user,task.project).role
        if role=="VIEWER": raise PermissionDenied("Viewers cannot edit tasks.")
        expected=self.request.data.get("version")
        if expected is None or int(expected)!=task.version: raise ValidationError({"version":"This task changed elsewhere. Refresh and retry."})
        old_assignee=task.assignee_id
        updated=serializer.save(version=task.version+1)
        if updated.assignee_id and updated.assignee_id != old_assignee:
            Notification.objects.create(recipient=updated.assignee,project=updated.project,message=f"You were assigned to {updated.title}")
            record(task.project,self.request.user,"assigned_task",task=updated,assignee_id=updated.assignee_id)
        record(task.project,self.request.user,"updated_task",task=updated); broadcast(task.project.id,"task.updated",TaskSerializer(updated).data)
    def perform_destroy(self, instance):
        if membership_for(self.request.user, instance.project).role == "VIEWER": raise PermissionDenied("Viewers cannot delete tasks.")
        project_id=instance.project_id; task_id=str(instance.id); record(instance.project,self.request.user,"deleted_task",task_id=task_id)
        instance.delete(); broadcast(project_id,"task.deleted",{"id":task_id})
    @action(detail=True, methods=["post"])
    def move(self,request,pk=None):
        task=self.get_object(); role=membership_for(request.user,task.project).role
        if role=="VIEWER": raise PermissionDenied("Viewers cannot move tasks.")
        expected=request.data.get("version")
        status_value=request.data.get("status")
        if expected is None or int(expected)!=task.version: raise ValidationError({"version":"This task changed elsewhere. Refresh and retry."})
        if status_value not in Task.Status.values: raise ValidationError({"status":"Invalid status."})
        with transaction.atomic():
            # Append to target column, avoiding unique position collisions.
            task.status=status_value; task.position=(Task.objects.filter(project=task.project,status=status_value).exclude(pk=task.pk).aggregate(max=Max("position"))["max"] or 0)+1; task.version+=1; task.save(update_fields=["status","position","version","updated_at"])
        record(task.project,request.user,"moved_task",task=task,to=status_value); broadcast(task.project.id,"task.moved",TaskSerializer(task).data)
        return Response(TaskSerializer(task).data)
    @action(detail=True,methods=["get","post"])
    def comments(self,request,pk=None):
        task=self.get_object()
        if request.method=="GET": return Response(CommentSerializer(task.comments.select_related("author"),many=True).data)
        if membership_for(request.user,task.project).role=="VIEWER": raise PermissionDenied("Viewers cannot comment.")
        s=CommentSerializer(data=request.data);s.is_valid(raise_exception=True); comment=s.save(task=task,author=request.user)
        record(task.project,request.user,"commented",task=task); broadcast(task.project.id,"comment.created",CommentSerializer(comment).data);return Response(CommentSerializer(comment).data,status=201)
    @action(detail=True,methods=["get","post"])
    def attachments(self,request,pk=None):
        task=self.get_object()
        if request.method=="GET": return Response(TaskAttachmentSerializer(task.attachments.select_related("uploaded_by"),many=True,context={"request":request}).data)
        if membership_for(request.user,task.project).role=="VIEWER": raise PermissionDenied("Viewers cannot upload attachments.")
        upload=request.FILES.get("file")
        if not upload: raise ValidationError({"file":"A file upload is required."})
        if upload.size > 10*1024*1024: raise ValidationError({"file":"Attachments are limited to 10 MiB."})
        attachment=TaskAttachment.objects.create(task=task,uploaded_by=request.user,file=upload,original_name=upload.name[:255],size=upload.size)
        record(task.project,request.user,"attached_file",task=task,attachment_id=attachment.id); broadcast(task.project.id,"attachment.created",TaskAttachmentSerializer(attachment,context={"request":request}).data)
        return Response(TaskAttachmentSerializer(attachment,context={"request":request}).data,status=201)

class NotificationViewSet(mixins.ListModelMixin,viewsets.GenericViewSet):
    serializer_class=NotificationSerializer
    def get_queryset(self): return Notification.objects.filter(recipient=self.request.user).order_by("-created_at")
    @action(detail=True,methods=["post"])
    def read(self,request,pk=None):
        n=self.get_object();n.read_at=timezone.now();n.save(update_fields=["read_at"]);return Response(NotificationSerializer(n).data)
