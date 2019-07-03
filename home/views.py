from django.shortcuts import render
from chat.models import *

# Create your views here.

def home(request):
	chat = ChatMessage.objects.all()
	return render(request,'common/home.html', {'chat':chat})

def video(request):
	return render(request,'video.html')

def video3(request):
	return render(request,'video3.html')
