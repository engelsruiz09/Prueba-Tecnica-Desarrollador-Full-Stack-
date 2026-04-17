"""
Modelo de transacción (remesa).

Los campos financieros (amount_usd, amount_gtq, exchange_rate) son INMUTABLES
una vez creada la transacción. Esta inmutabilidad se refuerza en tres capas:
  1. El schema de actualización (Pydantic) solo permite cambiar 'status'.
  2. El servicio de transacciones solo expone un método confirm() que toca 'status'.
  3. La lógica de negocio calcula y fija el tipo de cambio en el momento de creación.
"""
import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TransactionType(str, enum.Enum):
    send = "send"        # Carlos envía dinero a Don Alex
    request = "request"  # Don Alex solicita dinero a Carlos


class TransactionStatus(str, enum.Enum):
    pending = "pending"      # Creada, esperando confirmación
    confirmed = "confirmed"  # Don Alex confirmó que recibió el dinero
    cancelled = "cancelled"  # Cancelada por cualquiera de los dos


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    sender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    receiver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.pending, nullable=False
    )

    # ── Campos financieros inmutables ──────────────────────────────────────
    # Numeric(12, 2): hasta 9,999,999,999.99 con 2 decimales
    amount_usd: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount_gtq: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # Numeric(12, 6): el tipo de cambio necesita más precisión (ej: 7.743251)
    exchange_rate: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False)
    # Fecha en la que se consultó el tipo de cambio a Frankfurter
    rate_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Motivo de la transacción (obligatorio en solicitudes, opcional en envíos)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones ORM
    sender: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[sender_id], back_populates="sent_transactions"
    )
    receiver: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[receiver_id], back_populates="received_transactions"
    )