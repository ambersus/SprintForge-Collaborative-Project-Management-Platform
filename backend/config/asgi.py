import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from apps.core.routing import websocket_urlpatterns
from apps.core.middleware import JwtAuthMiddleware
application = ProtocolTypeRouter({"http": get_asgi_application(), "websocket": JwtAuthMiddleware(URLRouter(websocket_urlpatterns))})
