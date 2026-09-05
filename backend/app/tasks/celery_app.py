from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Initialize Celery Application
celery_app = Celery(
    "dealflow360",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.health_checks",
        "app.tasks.fulfillment_tasks",
    ],
)

# Celery Configuration Settings
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)

# Celery Beat Scheduled Tasks (Periodic Execution every 60 minutes)
celery_app.conf.beat_schedule = {
    "periodic_check_stalled_deals": {
        "task": "app.tasks.health_checks.check_stalled_deals",
        "schedule": 3600.0,  # Every 60 minutes
    },
    "periodic_check_discount_anomalies": {
        "task": "app.tasks.health_checks.check_discount_anomalies",
        "schedule": 3600.0,  # Every 60 minutes
    },
    "periodic_check_delivery_slippage": {
        "task": "app.tasks.health_checks.check_delivery_slippage",
        "schedule": 3600.0,  # Every 60 minutes
    },
}
