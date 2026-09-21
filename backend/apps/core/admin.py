from django.contrib import admin
from .models import Project, Membership, Sprint, Task, Comment, TaskAttachment, Activity, Notification
admin.site.register([Project,Membership,Sprint,Task,Comment,TaskAttachment,Activity,Notification])
