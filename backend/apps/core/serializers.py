from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Project, Membership, Sprint, Task, Comment, TaskAttachment, Activity, Notification

class UserSerializer(serializers.ModelSerializer):
    class Meta: model=User; fields=["id","username","email","first_name","last_name"]
class RegisterSerializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True, min_length=8)
    class Meta: model=User; fields=["username","email","password"]
    def create(self, data): return User.objects.create_user(**data)
class MembershipSerializer(serializers.ModelSerializer):
    user=UserSerializer(read_only=True); user_id=serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all(), write_only=True)
    class Meta: model=Membership; fields=["id","user","user_id","role","created_at"]
class ProjectSerializer(serializers.ModelSerializer):
    owner=UserSerializer(read_only=True); member_count=serializers.IntegerField(read_only=True)
    class Meta: model=Project; fields=["id","name","slug","description","owner","member_count","created_at","updated_at"]; read_only_fields=["slug"]
class SprintSerializer(serializers.ModelSerializer):
    class Meta: model=Sprint; fields="__all__"; read_only_fields=["project"]
class CommentSerializer(serializers.ModelSerializer):
    author=UserSerializer(read_only=True)
    class Meta: model=Comment; fields=["id","task","author","body","created_at","updated_at"]; read_only_fields=["task"]
class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by=UserSerializer(read_only=True)
    class Meta: model=TaskAttachment; fields=["id","task","uploaded_by","file","original_name","size","created_at"]; read_only_fields=["task","uploaded_by","original_name","size"]
class TaskSerializer(serializers.ModelSerializer):
    assignee=UserSerializer(read_only=True); assignee_id=serializers.PrimaryKeyRelatedField(source="assignee", queryset=User.objects.all(), required=False, allow_null=True, write_only=True)
    reporter=UserSerializer(read_only=True); comments=CommentSerializer(many=True, read_only=True); attachments=TaskAttachmentSerializer(many=True, read_only=True)
    class Meta:
        model=Task; fields=["id","project","sprint","title","type","description","status","priority","assignee","assignee_id","reporter","position","version","due_date","comments","attachments","created_at","updated_at"]
        read_only_fields=["project","reporter","version"]
    def validate_assignee_id(self, user):
        project=self.instance.project if self.instance else self.context.get("project")
        if user and not Membership.objects.filter(project=project,user=user).exists(): raise serializers.ValidationError("Assignee must be a project member.")
        return user
class ActivitySerializer(serializers.ModelSerializer):
    actor=UserSerializer(read_only=True)
    class Meta: model=Activity; fields="__all__"
class NotificationSerializer(serializers.ModelSerializer):
    class Meta: model=Notification; fields="__all__"
