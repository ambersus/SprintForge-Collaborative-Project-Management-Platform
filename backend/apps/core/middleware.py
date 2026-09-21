from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication

@database_sync_to_async
def user_from_token(raw):
    try:
        validated=JWTAuthentication().get_validated_token(raw)
        return JWTAuthentication().get_user(validated)
    except Exception:
        return AnonymousUser()

class JwtAuthMiddleware:
    """Authenticate websocket connections with ?token=<JWT access token>."""
    def __init__(self, app): self.app=app
    async def __call__(self, scope, receive, send):
        token=parse_qs(scope.get("query_string",b"").decode()).get("token",[""])[0]
        scope["user"]=await user_from_token(token)
        return await self.app(scope,receive,send)
