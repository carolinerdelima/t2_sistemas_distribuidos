"""
Payment Worker — valida pagamento e encaminha para stock-worker.

Conceito SD:
- ACK manual: só confirma após processamento + persistência
- Retry via republish com x-retry-count no header
- Após MAX_RETRIES: NACK → DLX → dead-letter-queue
- Perfect Link: mensagem PERSISTENT gravada em disco antes do ACK
"""
import asyncio
import json
import logging
import random
import socket
from datetime import datetime, timezone

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import AbstractIncomingMessage

from .config import settings
from .database import update_order_status
from .metrics import (
    dead_letter_total, orders_processed_total,
    orders_processing_seconds, payment_failures_total,
)

logger = logging.getLogger(__name__)
HOSTNAME = socket.gethostname()
WORKER_TYPE = "payment"


async def _process(body: dict) -> None:
    delay = random.uniform(settings.processing_delay_min, settings.processing_delay_max)
    await asyncio.sleep(delay)
    if body.get("simulate_failure"):
        raise RuntimeError("payment declined (simulate_failure=True)")


async def _handle(
    msg: AbstractIncomingMessage,
    payment_approved_exchange: aio_pika.abc.AbstractExchange,
    ticket_sales_exchange: aio_pika.abc.AbstractExchange,
) -> None:
    async with msg.process(ignore_processed=True):
        body = json.loads(msg.body)
        order_id = body["order_id"]
        headers = dict(msg.headers or {})
        retry_count = int(headers.get("x-retry-count", 0))
        log_ctx = {"order_id": order_id, "retry": retry_count, "worker": HOSTNAME}

        logger.info("processing payment", extra=log_ctx)
        await update_order_status(order_id, "processing", HOSTNAME, retry_count)

        try:
            with orders_processing_seconds.labels(worker_type=WORKER_TYPE).time():
                await _process(body)

            next_msg = Message(
                body=msg.body,
                content_type="application/json",
                delivery_mode=DeliveryMode.PERSISTENT,
                message_id=msg.message_id,
            )
            await payment_approved_exchange.publish(next_msg, routing_key="stock")
            orders_processed_total.labels(status="payment_approved", worker_type=WORKER_TYPE).inc()
            logger.info("payment approved, forwarded to stock", extra=log_ctx)
            await msg.ack()

        except Exception as exc:
            payment_failures_total.inc()
            logger.warning("payment failed", extra={**log_ctx, "error": str(exc)})

            if retry_count < settings.max_retries:
                retry_msg = Message(
                    body=msg.body,
                    headers={**headers, "x-retry-count": retry_count + 1},
                    content_type="application/json",
                    delivery_mode=DeliveryMode.PERSISTENT,
                    message_id=msg.message_id,
                )
                await ticket_sales_exchange.publish(retry_msg, routing_key="payment")
                orders_processed_total.labels(status="retry", worker_type=WORKER_TYPE).inc()
                await msg.ack()
            else:
                await update_order_status(order_id, "payment_failed", HOSTNAME, retry_count)
                dead_letter_total.inc()
                orders_processed_total.labels(status="payment_failed", worker_type=WORKER_TYPE).inc()
                logger.error("payment exhausted retries, dead lettering", extra=log_ctx)
                await msg.nack(requeue=False)


async def run_worker() -> None:
    logger.info("payment worker starting", extra={"worker": HOSTNAME})
    while True:
        try:
            conn = await aio_pika.connect_robust(settings.rabbitmq_url, reconnect_interval=5)
            async with conn:
                channel = await conn.channel()
                await channel.set_qos(prefetch_count=10)

                ticket_sales_exchange = await channel.declare_exchange(
                    "ticket-sales", ExchangeType.DIRECT, durable=True
                )
                payment_approved_exchange = await channel.declare_exchange(
                    "payment-approved", ExchangeType.DIRECT, durable=True
                )
                queue = await channel.declare_queue(
                    "payment-queue", durable=True,
                    arguments={
                        "x-dead-letter-exchange": "dead-letter-exchange",
                        "x-dead-letter-routing-key": "dead-letter",
                    },
                )
                await queue.consume(lambda m: _handle(m, payment_approved_exchange, ticket_sales_exchange))
                logger.info("payment worker consuming", extra={"worker": HOSTNAME})
                await asyncio.Future()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("connection error, retrying", extra={"error": str(exc)})
            await asyncio.sleep(5)
