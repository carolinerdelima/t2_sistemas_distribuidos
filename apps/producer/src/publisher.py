import json
import logging
from typing import Optional

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message

logger = logging.getLogger(__name__)


class Publisher:
    def __init__(self, url: str):
        self._url = url
        self._connection: Optional[aio_pika.RobustConnection] = None
        self._channel: Optional[aio_pika.RobustChannel] = None
        self._exchange: Optional[aio_pika.RobustExchange] = None

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(self._url)
        self._channel = await self._connection.channel()
        self._exchange = await self._channel.declare_exchange(
            "ticket-sales", ExchangeType.DIRECT, durable=True
        )
        logger.info("publisher connected")

    async def publish_order(self, envelope: dict) -> None:
        body = json.dumps(envelope, default=str).encode()
        msg = Message(
            body=body,
            content_type="application/json",
            delivery_mode=DeliveryMode.PERSISTENT,
            message_id=envelope["message_id"],
        )
        await self._exchange.publish(msg, routing_key="payment")

    async def close(self) -> None:
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
