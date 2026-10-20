from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("accounts.urls")),
    path("api/", include("courses.urls")),
    path("api/", include("quizzes.urls")),
    path("admin/", admin.site.urls),
]
