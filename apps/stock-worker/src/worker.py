"""
Stock Worker — reserva ingressos e encaminha para notification-worker.

Conceito SD demonstrado:
- SELECT FOR UPDATE evita overbooking (race condition com múltiplos workers)
- Idempotência: se a ordem já está em stock_reserved, não processa de novo
- NACK sem requeue para out_of_stock → vai para DLQ
"""
import asyncio
import json
import logging
import random
import socket

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import AbstractIncomingMessage

from .config import settings
from .database import OutOfStockError, reserve_tickets
from .metrics import (
    dead_letter_total, orders_processed_total,
    orders_processing_seconds, stock_conflicts_total, tickets_sold_total,
)

logger = logging.getLogger(__name__)
HOSTNAME = socket.gethostname()
WORKER_TYPE = "stock"


async def _handle(msg: AbstractIncomingMessage, stock_confirmed_exchange: aio_pika.abc.AbstractExchange) -> None:
    async with msg.process(ignore_processed=True):
        body = json.loads(msg.body)
        order_id = body["order_id"]
        event_id = body["event_id"]
        quantity = body.get("quantity", 1)
        log_ctx = {"order_id": order_id, "event_id": event_id, "worker": HOSTNAME}

        logger.info("processing stock", extra=log_ctx)

        delay = random.uniform(settings.processing_delay_min, settings.processing_delay_max)
        await asyncio.sleep(delay)

        try:
            with orders_processing_seconds.labels(worker_type=WORKER_TYPE).time():
                await reserve_tickets(order_id, event_id, quantity, HOSTNAME)

            tickets_sold_total.labels(event_id=event_id).inc(quantity)
            next_msg = Message(
                body=msg.body,
                content_type="application/json",
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=msg.message_id,
            )
            await stock_confirmed_exchange.publish(next_msg, routing_key="notification")
            orders_processed_total.labels(status="stock_reserved", worker_type=WORKER_TYPE).inc()
            logger.info("stock reserved, forwarded to notification", extra=log_ctx)
            await msg.ack()

        except OutOfStockError:
            stock_conflicts_total.inc()
            dead_letter_total.inc()
            orders_processed_total.labels(status="out_of_stock", worker_type=WORKER_TYPE).inc()
            logger.warning("out of stock, dead lettering", extra=log_ctx)
            await msg.nack(requeue=False)

        except Exception as exc:
            logger.error("unexpected stock error", extra={**log_ctx, "error": str(exc)})
            await msg.nack(requeue=True)


async def run_worker() -> None:
    logger.info("stock worker starting", extra={"worker": HOSTNAME})
    while True:
        try:
            conn = await aio_pika.connect_robust(settings.rabbitmq_url, reconnect_interval=5)
            async with conn:
                channel = await conn.channel()
                await channel.set_qos(prefetch_count=10)

                stock_confirmed_exchange = await channel.declare_exchange(
                    "stock-confirmed", ExchangeType.DIRECT, durable=True
                )
                queue = await channel.declare_queue(
                    "stock-queue", durable=True,
                    arguments={
                        "x-dead-letter-exchange": "dead-letter-exchange",
                        "x-dead-letter-routing-key": "dead-letter",
                    },
                )
                await queue.consume(lambda m: _handle(m, stock_confirmed_exchange))
                logger.info("stock worker consuming", extra={"worker": HOSTNAME})
                await asyncio.Future()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("connection error, retrying", extra={"error": str(exc)})
            await asyncio.sleep(5)
