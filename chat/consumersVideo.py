from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import json
from .models import *

class VideoConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.room_name = self.scope['url_route']['kwargs']['room_name']
		self.room_group_name = 'chat_%s' % self.room_name
		print(self.scope["user"], "Video Call")

		# Join room group
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)

		await self.accept()

	async def disconnect(self, close_code):
		# Leave room group
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)

	# Receive message from WebSocket
	async def receive(self, text_data):
		text_data_json = json.loads(text_data)
		message = text_data_json['message']
		mtype = text_data_json['mtype']
		# print(message)
		await self.save_chat(message)
		# print(text_data_json,self.scope["user"])

		# Send message to room group
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'chat_message',
				'message': message,
				'mtype': mtype,
				'uid': self.scope["user"].id,
				'username': self.scope["user"].username,
				'display': self.scope["user"].first_name+' '+self.scope["user"].last_name,
			}
		)

	# Receive message from room group
	async def chat_message(self, event):

		# Send message to WebSocket
		await self.send(text_data=json.dumps({
			'message': event['message'],
			'mtype': event['mtype'],
			'uid': event['uid'],
			'user': event['username'],
			'display': event['display'],
		}))

	@database_sync_to_async
	def save_chat(self, message):
		if 'AnonymousUser' != str(self.scope["user"]):
			room = Room.objects.last()
			# msg = ChatMessage.objects.create(room=room, user=self.scope["user"], message=message)
		return True
