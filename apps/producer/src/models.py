import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr


class OrderRequest(BaseModel):
    event_id: str
    buyer_name: str = Field(min_length=2)
    buyer_email: str
    quantity: int = Field(default=1, ge=1, le=4)
    payment_method: str = Field(default="credit_card", pattern="^(credit_card|pix)$")
    simulate_failure: bool = False


class OrderResponse(BaseModel):
    id: str
    message_id: str
    event_id: str
    buyer_name: str
    buyer_email: str
    quantity: int
    payment_method: str
    simulate_failure: bool
    status: str
    ticket_code: Optional[str]
    retry_count: int
    processed_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    id: str
    name: str
    venue: str
    event_date: datetime
    price: float
    total_tickets: int
    available_tickets: int
    image_placeholder: str

    model_config = {"from_attributes": True}


class BatchRequest(BaseModel):
    count: int = Field(default=100, ge=1, le=10000)
    failure_rate: float = Field(default=0.0, ge=0.0, le=1.0)


class BatchResponse(BaseModel):
    requested: int
    published: int
    failed: int
    sample_ids: list[str]


class StatsResponse(BaseModel):
    by_status: dict[str, int]
    total: int
    queue_depths: dict[str, int]
    tickets: list[dict]
