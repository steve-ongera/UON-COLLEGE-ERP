"""
UON ERP System — Main URL Configuration
uon_erp/urls.py
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def api_root(request):
    return JsonResponse({
        'system': 'UON College ERP System',
        'version': '1.0.0',
        'institution': 'University of Nairobi',
        'api': '/api/',
        'admin': '/admin/',
        'status': 'operational',
    })


urlpatterns = [
    # System root
    path('', api_root, name='api-root'),

    # Django admin
    path('admin/', admin.site.urls),

    # Core API — all endpoints under /api/
    path('api/', include('core.urls')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) \
  + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


# Admin site branding
admin.site.site_header = 'UON ERP Administration'
admin.site.site_title = 'UON ERP Admin'
admin.site.index_title = 'University of Nairobi — ERP System'