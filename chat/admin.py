from django.contrib import admin
from .models import *

# Register your models here.

class RoomAdmin(admin.ModelAdmin):
	filter_horizontal = ('users',)

admin.site.register(Room, RoomAdmin)
admin.site.register(ChatMessage)