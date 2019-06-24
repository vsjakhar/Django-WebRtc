from django.shortcuts import render

# Create your views here.

def home(request):
	return render(request,'common/home.html')

def video(request):
	return render(request,'video.html')
