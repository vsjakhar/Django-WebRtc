from django.urls import path
from . import views


app_name = 'home'

urlpatterns = [
	path('video', views.video, name='video'),
	path('', views.home, name='index'),
]