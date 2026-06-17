import logging
import random
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from prometheus_client import Counter
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import Order, Event, get_session
from ..models import OrderRequest, OrderResponse, BatchResponse, StatsResponse
from ..publisher import Publisher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])

orders_published_total = Counter("orders_published_total", "Total de pedidos publicados")

_publisher: Publisher | None = None


def set_publisher(p: Publisher) -> None:
    global _publisher
    _publisher = p


def get_publisher() -> Publisher:
    return _publisher


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(
    req: OrderRequest,
    session: AsyncSession = Depends(get_session),
):
    event = await session.get(Event, req.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")

    msg_id = uuid.uuid4()
    order = Order(
        id=uuid.uuid4(),
        message_id=msg_id,
        event_id=req.event_id,
        buyer_name=req.buyer_name,
        buyer_email=req.buyer_email,
        quantity=req.quantity,
        payment_method=req.payment_method,
        simulate_failure=req.simulate_failure,
        status="pending",
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    envelope = {
        "order_id": str(order.id),
        "message_id": str(msg_id),
        "event_id": order.event_id,
        "buyer_name": order.buyer_name,
        "buyer_email": order.buyer_email,
        "quantity": order.quantity,
        "payment_method": order.payment_method,
        "simulate_failure": order.simulate_failure,
    }
    try:
        await get_publisher().publish_order(envelope)
        orders_published_total.inc()
    except Exception as exc:
        logger.error("publish failed", extra={"order_id": str(order.id), "error": str(exc)})
        raise HTTPException(status_code=503, detail="Broker indisponível")

    return order


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    status: str | None = Query(None),
    event_id: str | None = Query(None),
    limit: int = Query(default=100, le=500),
    session: AsyncSession = Depends(get_session),
):
    q = select(Order).order_by(Order.created_at.desc()).limit(limit)
    if status:
        q = q.where(Order.status == status)
    if event_id:
        q = q.where(Order.event_id == event_id)
    result = await session.execute(q)
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, session: AsyncSession = Depends(get_session)):
    order = await session.get(Order, uuid.UUID(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order
