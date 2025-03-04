from django.contrib import admin
from .models import User, Ft42Profile, BlockedUser, Relationship
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

class CustomUserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'avatar', 'status')}),
        ('Two-factor authentication', {'fields': ('is_2fa_enabled', 'totp_secret')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('created_at', 'updated_at', 'last_login')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )
    
    list_display = ('username', 'email', 'first_name', 'last_name', 'status', 'is_staff')
    list_filter = ('is_staff', 'is_active', 'status')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    readonly_fields = ('created_at', 'updated_at', 'last_login')

admin.site.register(User, CustomUserAdmin)
admin.site.register(Ft42Profile)
admin.site.register(BlockedUser)
admin.site.register(Relationship)