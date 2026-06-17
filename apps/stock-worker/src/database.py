import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, DateTime, Numeric, select, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_size=5)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("message_id", name="uq_order_message_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    event_id: Mapped[str] = mapped_column(String(50))
    buyer_name: Mapped[str] = mapped_column(String(255))
    buyer_email: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer)
    payment_method: Mapped[str] = mapped_column(String(50))
    simulate_failure: Mapped[bool] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(String(50))
    ticket_code: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    processed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    venue: Mapped[str] = mapped_column(String(255))
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    total_tickets: Mapped[int] = mapped_column(Integer)
    available_tickets: Mapped[int] = mapped_column(Integer)
    image_placeholder: Mapped[str] = mapped_column(String(255))


class OutOfStockError(Exception):
    pass


async def reserve_tickets(order_id: str, event_id: str, quantity: int, worker: str) -> None:
    """
    Reserva ingressos com SELECT FOR UPDATE para prevenir overbooking.

    Conceito SD: race condition intencional — dois stock-workers processando
    o mesmo evento simultaneamente. O SELECT FOR UPDATE serializa o acesso,
    garantindo que o decremento de available_tickets seja atômico.
    """
    async with AsyncSessionLocal() as session:
        async with session.begin():
            event = await session.execute(
                select(Event).where(Event.id == event_id).with_for_update()
            )
            event = event.scalar_one_or_none()
            if not event or event.available_tickets < quantity:
                order = await session.get(Order, uuid.UUID(order_id))
                if order:
                    order.status = "out_of_stock"
                    order.processed_by = worker
                    order.updated_at = datetime.now(timezone.utc)
                raise OutOfStockError(f"sem ingressos para {event_id}")

            event.available_tickets -= quantity
            order = await session.get(Order, uuid.UUID(order_id))
            if order:
                order.status = "stock_reserved"
                order.processed_by = worker
                order.updated_at = datetime.now(timezone.utc)
