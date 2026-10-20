from django.urls import path

from . import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view(), name="admin-overview"),
    path("instructors/", views.InstructorListView.as_view(), name="admin-instructors"),
    path("instructors/<int:profile_id>/approve/", views.InstructorApproveView.as_view(), name="admin-instructor-approve"),
    path("instructors/<int:profile_id>/revoke/", views.InstructorRevokeView.as_view(), name="admin-instructor-revoke"),
    path("users/", views.UserListView.as_view(), name="admin-users"),
    path("courses/", views.CourseListView.as_view(), name="admin-courses"),
    path("courses/<int:course_id>/restore/", views.CourseRestoreView.as_view(), name="admin-course-restore"),
]
