from django.urls import path

from . import views

urlpatterns = [
    path("courses/", views.CourseListView.as_view(), name="course-list"),
    path("courses/<int:course_id>/", views.CourseDetailView.as_view(), name="course-detail"),
    path("courses/<int:course_id>/enroll/", views.EnrollView.as_view(), name="course-enroll"),
    path("courses/<int:course_id>/learners/", views.CourseLearnersView.as_view(), name="course-learners"),
    path("courses/<int:course_id>/lessons/", views.LessonCreateView.as_view(), name="lesson-create"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("my-courses/", views.MyCoursesView.as_view(), name="my-courses"),
    path("lessons/<int:lesson_id>/", views.LessonDetailView.as_view(), name="lesson-detail"),
    path("lessons/<int:lesson_id>/complete/", views.LessonCompleteView.as_view(), name="lesson-complete"),
]
