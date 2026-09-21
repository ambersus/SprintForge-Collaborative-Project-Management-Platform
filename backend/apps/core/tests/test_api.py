import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.core.models import Membership, Project, Task

@pytest.mark.django_db
def test_owner_can_create_project_and_task():
    user=User.objects.create_user(username="ada",password="password123")
    client=APIClient();client.force_authenticate(user)
    response=client.post("/api/projects/",{"name":"Compiler"},format="json")
    assert response.status_code==201
    project=Project.objects.get(name="Compiler")
    assert Membership.objects.get(project=project,user=user).role=="OWNER"
    response=client.post("/api/tasks/",{"project":project.slug,"title":"Parse tokens"},format="json")
    assert response.status_code==201
    assert Task.objects.get().reporter==user

@pytest.mark.django_db
def test_stale_task_version_is_rejected():
    user=User.objects.create_user(username="lin",password="password123"); project=Project.objects.create(name="Kernel",slug="kernel",owner=user)
    Membership.objects.create(project=project,user=user,role="OWNER")
    task=Task.objects.create(project=project,title="Schedule",reporter=user,version=2)
    client=APIClient();client.force_authenticate(user)
    response=client.post(f"/api/tasks/{task.id}/move/",{"status":"DONE","version":1},format="json")
    assert response.status_code==400
    task.refresh_from_db();assert task.status=="BACKLOG"

@pytest.mark.django_db
def test_non_member_cannot_view_project():
    owner=User.objects.create_user(username="owner",password="password123"); outsider=User.objects.create_user(username="other",password="password123")
    project=Project.objects.create(name="Private",slug="private",owner=owner);Membership.objects.create(project=project,user=owner,role="OWNER")
    client=APIClient();client.force_authenticate(outsider)
    assert client.get(f"/api/projects/{project.slug}/").status_code==404

@pytest.mark.django_db
def test_viewer_cannot_delete_task():
    owner=User.objects.create_user(username="manager",password="password123"); viewer=User.objects.create_user(username="viewer",password="password123")
    project=Project.objects.create(name="Secure",slug="secure",owner=owner); Membership.objects.create(project=project,user=owner,role="OWNER"); Membership.objects.create(project=project,user=viewer,role="VIEWER")
    task=Task.objects.create(project=project,title="Keep",reporter=owner)
    client=APIClient();client.force_authenticate(viewer)
    assert client.delete(f"/api/tasks/{task.id}/").status_code==403
    assert Task.objects.filter(id=task.id).exists()
