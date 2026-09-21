from rest_framework.permissions import BasePermission
from .models import Membership
def membership_for(user, project):
    return Membership.objects.filter(project=project, user=user).first()
class IsProjectMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        project = getattr(obj, "project", obj)
        return Membership.objects.filter(project=project, user=request.user).exists()
class CanEditProject(BasePermission):
    def has_object_permission(self, request, view, obj):
        project = getattr(obj, "project", obj)
        return Membership.objects.filter(project=project, user=request.user, role__in=["OWNER","ADMIN","MEMBER"]).exists()
