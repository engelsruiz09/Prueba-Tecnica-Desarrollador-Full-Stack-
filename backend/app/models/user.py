"""
Modelo de usuario. Soporta dos roles: sender (hijo emisor) y receiver (Don Alex).

El campo linked_user_id crea una relación autoreferencial entre los dos
miembros de la familia, permitiendo que el sistema sepa quién puede ver
las transacciones del otro.
"""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    sender = "sender"      # Carlos (hijo en USA)
    receiver = "receiver"  # Don Alex (padre en Guatemala)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)

    # Relación autoreferencial: empareja al emisor con su receptor y viceversa.
    # nullable=True porque al registrarse puede no conocer aún el email del familiar.
    linked_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones ORM (no columnas en DB, solo navegación en Python)
    linked_user: Mapped["User | None"] = relationship(
        "User", remote_side="User.id", foreign_keys=[linked_user_id]
    )
    sent_transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction", foreign_keys="Transaction.sender_id", back_populates="sender"
    )
    received_transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction", foreign_keys="Transaction.receiver_id", back_populates="receiver"
    )