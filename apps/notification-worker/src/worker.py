"""
Notification Worker — gera ingresso e simula envio de email.

Etapa final do pipeline: payment → stock → notification.
Conceito SD: o encadeamento das três filas implementa um padrão de
Saga coreografada — cada serviço reage a eventos dos anteriores sem
um orquestrador central.
"""
import asyncio
import json
import logging
import random
import socket
import uuid

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from .config import settings
from .database import confirm_order
from .metrics import dead_letter_total, orders_processed_total, orders_processing_seconds

logger = logging.getLogger(__name__)
HOSTNAME = socket.gethostname()
WORKER_TYPE = "notification"


async def _handle(msg: AbstractIncomingMessage) -> None:
    async with msg.process(ignore_processed=True):
        body = json.loads(msg.body)
        order_id = body["order_id"]
        buyer_email = body.get("buyer_email", "")
        log_ctx = {"order_id": order_id, "worker": HOSTNAME}

        logger.info("sending notification", extra=log_ctx)

        delay = random.uniform(settings.processing_delay_min, settings.processing_delay_max)
        await asyncio.sleep(delay)

        ticket_code = uuid.uuid4()

        with orders_processing_seconds.labels(worker_type=WORKER_TYPE).time():
            confirmed = await confirm_order(order_id, ticket_code, HOSTNAME)

        if confirmed:
            orders_processed_total.labels(status="confirmed", worker_type=WORKER_TYPE).inc()
            logger.info(
                "ticket confirmed",
                extra={**log_ctx, "ticket_code": str(ticket_code), "email": buyer_email},
            )
        else:
            # Idempotência: já foi confirmado por outra réplica
            logger.warning("order already confirmed, skipping", extra=log_ctx)

        await msg.ack()


async def run_worker() -> None:
    logger.info("notification worker starting", extra={"worker": HOSTNAME})
    while True:
        try:
            conn = await aio_pika.connect_robust(settings.rabbitmq_url, reconnect_interval=5)
            async with conn:
                channel = await conn.channel()
                await channel.set_qos(prefetch_count=10)
                queue = await channel.declare_queue(
                    "notification-queue", durable=True,
                    arguments={
                        "x-dead-letter-exchange": "dead-letter-exchange",
                        "x-dead-letter-routing-key": "dead-letter",
                    },
                )
                await queue.consume(_handle)
                logger.info("notification worker consuming", extra={"worker": HOSTNAME})
                await asyncio.Future()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("connection error, retrying", extra={"error": str(exc)})
            await asyncio.sleep(5)
