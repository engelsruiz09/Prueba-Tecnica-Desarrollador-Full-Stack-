"""
Schemas Pydantic para transacciones (remesas).

Tres schemas de entrada distintos para tres operaciones distintas:
- SendTransactionCreate: Carlos registra un envío en USD
- RequestTransactionCreate: Don Alex solicita dinero en GTQ
- TransactionStatusUpdate: cualquiera cambia el estado (solo campo permitido)

Esta separación es intencional — es la primera línea de defensa para
garantizar la inmutabilidad de los campos financieros. Si el schema de
actualización no incluye amount_usd, Pydantic rechazará cualquier intento
de enviarlo, antes de que llegue al servicio o a la DB.
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.transaction import TransactionStatus, TransactionType
from app.schemas.user import UserResponse


class SendTransactionCreate(BaseModel):
    """Carlos (sender) registra un envío. Siempre en USD."""
    amount_usd: Decimal = Field(gt=0, decimal_places=2, description="Monto en USD a enviar")
    note: str | None = Field(default=None, max_length=500)


class RequestTransactionCreate(BaseModel):
    """Don Alex (receiver) solicita dinero. Siempre en GTQ."""
    amount_gtq: Decimal = Field(gt=0, decimal_places=2, description="Monto en GTQ solicitado")
    note: str = Field(min_length=3, max_length=500, description="Motivo de la solicitud (obligatorio)")


class TransactionStatusUpdate(BaseModel):
    """
    Schema de actualización — SOLO permite cambiar el estado.
    Ningún campo financiero está aquí: Pydantic bloqueará cualquier
    intento de modificar amount_usd, amount_gtq o exchange_rate.
    """
    status: TransactionStatus


class TransactionResponse(BaseModel):
    """Schema de salida completo para una transacción."""
    id: int
    sender_id: int
    receiver_id: int
    type: TransactionType
    status: TransactionStatus
    amount_usd: Decimal
    amount_gtq: Decimal
    exchange_rate: Decimal
    rate_date: date
    note: str | None
    created_at: datetime
    sender: UserResponse
    receiver: UserResponse

    model_config = {"from_attributes": True}


class PaginatedTransactions(BaseModel):
    """Respuesta paginada para listados de transacciones."""
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int