from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import NotificationViewSet, ProjectViewSet, RegisterViewSet, TaskViewSet
router=DefaultRouter();router.register("projects",ProjectViewSet,basename="project");router.register("tasks",TaskViewSet,basename="task");router.register("notifications",NotificationViewSet,basename="notification");router.register("auth/register",RegisterViewSet,basename="register")
urlpatterns=[path("auth/token/",TokenObtainPairView.as_view()),path("auth/token/refresh/",TokenRefreshView.as_view()),path("",include(router.urls))]
