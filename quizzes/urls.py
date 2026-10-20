from django.urls import path

from . import views

urlpatterns = [
    path("courses/<int:course_id>/quiz/", views.CourseQuizView.as_view(), name="course-quiz"),
    path("quizzes/<int:quiz_id>/", views.QuizTakeView.as_view(), name="quiz-take"),
    path("quizzes/<int:quiz_id>/attempts/", views.QuizAttemptsView.as_view(), name="quiz-attempts"),
]
