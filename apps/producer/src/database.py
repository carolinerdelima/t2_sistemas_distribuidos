import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, DateTime, Numeric, UniqueConstraint, select, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_size=10, max_overflow=20)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("message_id", name="uq_order_message_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    event_id: Mapped[str] = mapped_column(String(50), nullable=False)
    buyer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    buyer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    simulate_failure: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    ticket_code: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    processed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    venue: Mapped[str] = mapped_column(String(255), nullable=False)
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_tickets: Mapped[int] = mapped_column(Integer, nullable=False)
    available_tickets: Mapped[int] = mapped_column(Integer, nullable=False)
    image_placeholder: Mapped[str] = mapped_column(String(255), default="placeholder.jpg")


async def get_session():
    async with AsyncSessionLocal() as session:
        yield session


_SEED_EVENTS = [
    {
        "id": "coldplay-2025",
        "name": "Coldplay — Music of the Spheres World Tour",
        "venue": "Estádio Nilton Santos, Rio de Janeiro",
        "event_date": datetime(2025, 9, 13, 21, 0, tzinfo=timezone.utc),
        "price": 350.00,
        "total_tickets": 5000,
        "available_tickets": 5000,
        "image_placeholder": "coldplay.jpg",
    },
    {
        "id": "lollapalooza-2025",
        "name": "Lollapalooza Brasil 2025",
        "venue": "Autódromo de Interlagos, São Paulo",
        "event_date": datetime(2025, 3, 28, 15, 0, tzinfo=timezone.utc),
        "price": 650.00,
        "total_tickets": 8000,
        "available_tickets": 8000,
        "image_placeholder": "lollapalooza.jpg",
    },
    {
        "id": "tomorrowland-2025",
        "name": "Tomorrowland Brasil 2025",
        "venue": "Parque Maeda, Itu — SP",
        "event_date": datetime(2025, 10, 10, 14, 0, tzinfo=timezone.utc),
        "price": 800.00,
        "total_tickets": 3000,
        "available_tickets": 3000,
        "image_placeholder": "tomorrowland.jpg",
    },
    {
        "id": "anime-friends-2025",
        "name": "Anime Friends 2025",
        "venue": "Transamerica Expo Center, São Paulo",
        "event_date": datetime(2025, 7, 19, 10, 0, tzinfo=timezone.utc),
        "price": 120.00,
        "total_tickets": 2000,
        "available_tickets": 2000,
        "image_placeholder": "anime-friends.jpg",
    },
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for ev_data in _SEED_EVENTS:
            existing = await session.get(Event, ev_data["id"])
            if not existing:
                session.add(Event(**ev_data))
        await session.commit()
