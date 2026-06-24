import logging
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/debug", tags=["debug"])

_SERVICE_MAP = {
    "payment": "payment-worker",
    "stock": "stock-worker",
    "notification": "notification-worker",
}


@router.post("/kill-worker")
async def kill_worker(worker: str = Query(..., description="payment | stock | notification")):
    service = _SERVICE_MAP.get(worker)
    if not service:
        raise HTTPException(status_code=400, detail="worker inválido. Use: payment, stock ou notification")
    logger.warning("DEBUG endpoint (didático): kill-worker", extra={"service": service})
    return {
        "status": "manual",
        "command": f"docker compose kill {service}",
        "note": "Execute no terminal do host onde o docker compose está rodando",
    }


@router.post("/scale")
async def scale_worker(
    worker: str = Query(...),
    replicas: int = Query(..., ge=1, le=5),
):
    service = _SERVICE_MAP.get(worker)
    if not service:
        raise HTTPException(status_code=400, detail="worker inválido")
    logger.warning("DEBUG endpoint (didático): scale", extra={"service": service, "replicas": replicas})
    return {
        "status": "manual",
        "command": f"docker compose up -d --scale {service}={replicas} --no-recreate",
        "replicas": replicas,
        "note": "Execute no terminal do host",
    }


@router.post("/restart-rabbit")
async def restart_rabbit():
    logger.warning("DEBUG endpoint (didático): restart-rabbit")
    return {
        "status": "manual",
        "command": "docker compose restart rabbitmq",
        "note": "Execute no terminal do host",
    }
