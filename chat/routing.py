from django.conf.urls import url
from django.urls import path, re_path

from . import consumers
from . import consumersVideo

websocket_urlpatterns = [
	path('ws/chat/<str:room_name>/', consumers.ChatConsumer.as_asgi()),
	path('ws/video/<str:room_name>/', consumersVideo.VideoConsumer.as_asgi()),
	# url(r'^ws/chat/(?P<room_name>[^/]+)/$', consumers.ChatConsumer),
	# re_path('ws/chat/<str:room_name>/', consumers.ChatConsumer),
]