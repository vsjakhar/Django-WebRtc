from django.urls import path
from . import views


app_name = 'chat'

urlpatterns = [
	path('<str:room_name>/', views.room, name='room'),
	path('', views.index, name='index'),
]