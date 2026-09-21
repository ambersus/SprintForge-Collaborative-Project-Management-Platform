import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Membership

@database_sync_to_async
def may_join(user, project_id):
    return Membership.objects.filter(user=user, project_id=project_id).exists()
class ProjectConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close(code=4401); return
        project_id=self.scope["url_route"]["kwargs"]["project_id"]
        if not await may_join(self.scope["user"],project_id):
            await self.close(code=4403); return
        self.group_name=f"project_{project_id}"
        await self.channel_layer.group_add(self.group_name,self.channel_name);await self.accept()
    async def disconnect(self, close_code): await self.channel_layer.group_discard(self.group_name,self.channel_name)
    async def project_event(self,event): await self.send(text_data=json.dumps({"event":event["event"],"payload":event["payload"]},default=str))
