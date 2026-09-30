from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health(request):
    """Lightweight health-check endpoint for Docker/Caddy/monitoring."""
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("health/", health),
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

