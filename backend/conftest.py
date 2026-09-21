import os
os.environ.setdefault("DATABASE_ENGINE", "django.db.backends.sqlite3")
os.environ.setdefault("SQLITE_NAME", ":memory:")
os.environ.setdefault("CHANNEL_BACKEND", "memory")
