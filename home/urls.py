from django.urls import path
from . import views


app_name = 'home'

urlpatterns = [
	path('call', views.call, name='call'),
	path('video6', views.video6, name='video6'),
	path('video5', views.video5, name='video5'),
	path('video3', views.video3, name='video3'),
	path('video', views.video, name='video'),
	path('', views.home, name='index'),
]