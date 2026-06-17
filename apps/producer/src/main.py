import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger
from starlette.responses import Response

from .config import settings
from .database import init_db
from .publisher import Publisher
from .routers.orders import router as orders_router, set_publisher
from .routers.events import router as events_router

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
logging.root.handlers = [handler]
logging.root.setLevel(settings.log_level.upper())
logger = logging.getLogger(__name__)

publisher = Publisher(settings.rabbitmq_url)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await publisher.connect()
    set_publisher(publisher)
    logger.info("producer started")
    yield
    await publisher.close()


app = FastAPI(title="Ticket Sales — Producer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders_router)
app.include_router(events_router)


@app.get("/health", tags=["infra"])
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/metrics", tags=["infra"], include_in_schema=False)
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
