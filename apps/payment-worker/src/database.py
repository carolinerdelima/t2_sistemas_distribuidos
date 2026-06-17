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


async def update_order_status(order_id: str, status: str, worker: str, retry_count: int = 0) -> None:
    async with AsyncSessionLocal() as session:
        order = await session.get(Order, uuid.UUID(order_id))
        if order:
            order.status = status
            order.processed_by = worker
            order.retry_count = retry_count
            order.updated_at = datetime.now(timezone.utc)
            await session.commit()
