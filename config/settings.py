import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name, default):
    """A comma-separated environment variable as a list."""
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# Local development works with no environment variables set. In production,
# set DJANGO_SECRET_KEY, DJANGO_DEBUG=false and the host/origin lists below.
# A misconfigured production server refuses to start rather than running
# with debug pages or a publicly known key.
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

if DEBUG and set(ALLOWED_HOSTS) - {"localhost", "127.0.0.1"}:
    raise ImproperlyConfigured("DEBUG is on but real hosts are configured. Set DJANGO_DEBUG=false.")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY when DEBUG is off.")
    SECRET_KEY = "django-insecure-local-development-only"

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    # Our apps
    'accounts',
    'courses',
    'quizzes',
    'adminpanel',
]

# Use our own User model (email login) instead of Django's built-in one.
# This must be set before the first migration; changing it later is very hard.
AUTH_USER_MODEL = 'accounts.User'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # serves the admin's CSS/JS in production
    'corsheaders.middleware.CorsMiddleware',  # before CommonMiddleware, as the package requires
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-gb'

# Dates are stored in UTC and shown to users in Indian time.
TIME_ZONE = 'Asia/Kolkata'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # filled by `collectstatic` when deploying

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    # Session cookie auth: the same login Django's admin uses. DRF enforces
    # CSRF on every unsafe request from a logged-in session.
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    # Locked by default: every endpoint needs a logged-in user unless a
    # view explicitly opens it (signup, login, csrf, me).
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Login and sign-up are rate-limited per client (see accounts/views.py),
    # generous enough for a whole office sharing one IP address.
    'DEFAULT_THROTTLE_RATES': {
        'auth': '20/minute',
    },
}

# Where the React app is served from. It may call Django directly
# (VITE_API_URL) or through a proxy; both need the origin trusted for CSRF.
FRONTEND_ORIGINS = env_list(
    "DJANGO_FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173",
)
CSRF_TRUSTED_ORIGINS = FRONTEND_ORIGINS
CORS_ALLOWED_ORIGINS = FRONTEND_ORIGINS
CORS_ALLOW_CREDENTIALS = True  # let the browser send the session cookie cross-origin

# Production over HTTPS, with the frontend on a different site (e.g. Vercel
# calling Django elsewhere): cookies must be SameSite=None and Secure, or the
# browser won't send them. Set DJANGO_CROSS_SITE_COOKIES=true for that case.
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Hosts like Render end HTTPS at their proxy and forward plain HTTP;
    # this header tells Django the original request was HTTPS.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24  # browsers use HTTPS only, for a day
if os.environ.get("DJANGO_CROSS_SITE_COOKIES", "false").lower() == "true":
    SESSION_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SAMESITE = "None"
