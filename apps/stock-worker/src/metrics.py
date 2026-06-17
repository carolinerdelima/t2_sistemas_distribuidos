import threading
import logging
from prometheus_client import Counter, Histogram, start_http_server
from .config import settings

logger = logging.getLogger(__name__)

orders_processed_total = Counter(
    "orders_processed_total", "Pedidos processados", ["status", "worker_type"],
)
orders_processing_seconds = Histogram(
    "orders_processing_seconds", "Tempo de processamento", ["worker_type"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.0],
)
stock_conflicts_total = Counter("stock_conflicts_total", "Conflitos de estoque (overbooking evitado)")
dead_letter_total = Counter("dead_letter_total", "Total enviado para DLQ")
tickets_sold_total = Counter("tickets_sold_total", "Ingressos vendidos", ["event_id"])


def start_metrics_server() -> None:
    threading.Thread(target=start_http_server, args=(settings.metrics_port,), daemon=True).start()
    logger.info("metrics server started", extra={"port": settings.metrics_port})
