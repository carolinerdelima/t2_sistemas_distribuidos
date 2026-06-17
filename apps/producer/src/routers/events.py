import logging
import random
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import Order, Event, get_session
from ..models import BatchResponse, EventResponse, StatsResponse
from ..publisher import Publisher
from .orders import set_publisher, get_publisher, orders_published_total

logger = logging.getLogger(__name__)
router = APIRouter(tags=["events"])

_BUYER_NAMES = [
    "Ana Silva", "Bruno Costa", "Carla Santos", "Diego Lima",
    "Elena Ferreira", "Fábio Alves", "Gabriela Rocha", "Hugo Mendes",
]


@router.get("/events", response_model=list[EventResponse])
async def list_events(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Event).order_by(Event.event_date))
    return result.scalars().all()


@router.post("/batch", response_model=BatchResponse)
async def send_batch(
    count: int = Query(default=100, ge=1, le=10000),
    failure_rate: float = Query(default=0.0, ge=0.0, le=1.0),
    session: AsyncSession = Depends(get_session),
):
    events_result = await session.execute(select(Event))
    events = events_result.scalars().all()
    if not events:
        return BatchResponse(requested=count, published=0, failed=0, sample_ids=[])

    published = 0
    failed = 0
    sample_ids: list[str] = []

    from ..database import Order, AsyncSessionLocal
    import asyncio

    for i in range(count):
        event = random.choice(events)
        buyer = random.choice(_BUYER_NAMES)
        msg_id = uuid.uuid4()
        order_id = uuid.uuid4()
        simulate = random.random() < failure_rate

        async with AsyncSessionLocal() as s:
            order = Order(
                id=order_id,
                message_id=msg_id,
                event_id=event.id,
                buyer_name=f"{buyer} #{i+1}",
                buyer_email=f"user{i+1}@lab.com",
                quantity=random.randint(1, 2),
                payment_method=random.choice(["credit_card", "pix"]),
                simulate_failure=simulate,
                status="pending",
            )
            s.add(order)
            await s.commit()

        envelope = {
            "order_id": str(order_id),
            "message_id": str(msg_id),
            "event_id": event.id,
            "buyer_name": f"{buyer} #{i+1}",
            "buyer_email": f"user{i+1}@lab.com",
            "quantity": order.quantity,
            "payment_method": order.payment_method,
            "simulate_failure": simulate,
        }
        try:
            await get_publisher().publish_order(envelope)
            orders_published_total.inc()
            published += 1
            if len(sample_ids) < 5:
                sample_ids.append(str(order_id))
        except Exception as exc:
            logger.warning("batch publish error", extra={"index": i, "error": str(exc)})
            failed += 1

    return BatchResponse(requested=count, published=published, failed=failed, sample_ids=sample_ids)


@router.get("/stats", response_model=StatsResponse)
async def get_stats(session: AsyncSession = Depends(get_session)):
    rows = await session.execute(
        select(Order.status, func.count()).group_by(Order.status)
    )
    by_status = {row[0]: row[1] for row in rows}
    total = sum(by_status.values())

    tickets_rows = await session.execute(
        select(Event.id, Event.name, Event.total_tickets, Event.available_tickets)
    )
    tickets = [
        {"event_id": r[0], "name": r[1], "total": r[2], "available": r[3], "sold": r[2] - r[3]}
        for r in tickets_rows
    ]

    queue_depths: dict[str, int] = {}
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            for queue in ["payment-queue", "stock-queue", "notification-queue", "dead-letter-queue"]:
                r = await client.get(
                    f"http://{settings.rabbitmq_host}:15672/api/queues/%2F/{queue}",
                    auth=(settings.rabbitmq_user, settings.rabbitmq_pass),
                )
                if r.status_code == 200:
                    queue_depths[queue] = r.json().get("messages", 0)
    except Exception:
        pass

    return StatsResponse(by_status=by_status, total=total, queue_depths=queue_depths, tickets=tickets)
