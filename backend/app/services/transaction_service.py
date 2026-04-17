"""
Servicio de transacciones: lógica de negocio para remesas.

Responsabilidades:
  1. Determinar el par (sender, receiver) según el rol del usuario.
  2. Llamar al servicio de tipo de cambio para fijar la conversión.
  3. Persistir la transacción con todos los campos financieros inmutables.
  4. Controlar quién puede cambiar el estado y a qué estado puede pasar.

Flujo de envío (sender):
  Carlos ingresa amount_usd → se consulta GTQ → se guarda todo inmutable.

Flujo de solicitud (receiver):
  Don Alex ingresa amount_gtq → se consulta USD → se guarda todo inmutable.
"""
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import TransactionStatus, TransactionType
from app.models.user import User, UserRole
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.transaction import (
    PaginatedTransactions,
    RequestTransactionCreate,
    SendTransactionCreate,
    TransactionResponse,
    TransactionStatusUpdate,
)
from app.services.exchange_service import ExchangeRateService

import math


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.repo = TransactionRepository(db)
        self.user_repo = UserRepository(db)
        self.exchange_svc = ExchangeRateService()

    def _get_linked_user_id(self, current_user: User) -> int:
        """
        Verifica que el usuario tenga un familiar vinculado.
        Sin vínculo no hay remesa — ambos extremos deben existir.
        """
        if current_user.linked_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Tu cuenta no está vinculada a ningún familiar. "
                       "Registra el email de tu familiar al crear la cuenta.",
            )
        return current_user.linked_user_id

    async def create_send(
        self, data: SendTransactionCreate, sender: User
    ) -> TransactionResponse:
        """
        Carlos registra un envío en USD.
        Se consulta el tipo de cambio actual y se fija de forma inmutable.
        """
        if sender.role != UserRole.sender:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el emisor puede registrar envíos.",
            )

        receiver_id = self._get_linked_user_id(sender)

        # Fijar el tipo de cambio en este momento exacto — inmutable desde aquí
        exchange = await self.exchange_svc.get_rate_usd_to_gtq(
            amount_usd=data.amount_usd
        )

        transaction_data = {
            "sender_id": sender.id,
            "receiver_id": receiver_id,
            "type": TransactionType.send,
            "status": TransactionStatus.pending,
            "amount_usd": exchange.amount_usd,
            "amount_gtq": exchange.amount_gtq,
            "exchange_rate": exchange.rate,
            "rate_date": exchange.rate_date,
            "note": data.note,
        }

        transaction = await self.repo.create(transaction_data)
        return TransactionResponse.model_validate(transaction)

    async def create_request(
        self, data: RequestTransactionCreate, receiver: User
    ) -> TransactionResponse:
        """
        Don Alex solicita un monto en GTQ.
        Se calcula el equivalente en USD para que Carlos sepa cuánto enviar.
        """
        if receiver.role != UserRole.receiver:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el receptor puede crear solicitudes.",
            )

        sender_id = self._get_linked_user_id(receiver)

        # Convertir GTQ → USD y fijar inmutablemente
        exchange = await self.exchange_svc.get_rate_gtq_to_usd(
            amount_gtq=data.amount_gtq
        )

        transaction_data = {
            "sender_id": sender_id,
            "receiver_id": receiver.id,
            "type": TransactionType.request,
            "status": TransactionStatus.pending,
            "amount_usd": exchange.amount_usd,
            "amount_gtq": exchange.amount_gtq,
            "exchange_rate": exchange.rate,
            "rate_date": exchange.rate_date,
            "note": data.note,
        }

        transaction = await self.repo.create(transaction_data)
        return TransactionResponse.model_validate(transaction)

    async def get_my_transactions(
        self, user: User, page: int, page_size: int
    ) -> PaginatedTransactions:
        """Listado paginado de transacciones del usuario autenticado."""
        items, total = await self.repo.get_paginated_for_user(
            user_id=user.id, page=page, page_size=page_size
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return PaginatedTransactions(
            items=[TransactionResponse.model_validate(t) for t in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def update_status(
        self, transaction_id: int, data: TransactionStatusUpdate, current_user: User
    ) -> TransactionResponse:
        """
        Cambia el estado de una transacción.

        Reglas de negocio:
        - Solo el receiver puede confirmar (él es quien recibe el dinero).
        - Cualquiera de los dos puede cancelar si está pendiente.
        - Una transacción confirmada NO puede cancelarse (dinero ya entregado).
        """
        transaction = await self.repo.get_by_id(transaction_id)
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transacción no encontrada.",
            )

        # Verificar que el usuario sea parte de esta transacción
        user_ids = {transaction.sender_id, transaction.receiver_id}
        if current_user.id not in user_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar esta transacción.",
            )

        # Solo el receiver confirma
        if data.status == TransactionStatus.confirmed:
            if current_user.id != transaction.receiver_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo el receptor puede confirmar la recepción del dinero.",
                )

        # No se puede cancelar lo que ya fue confirmado
        if (
            transaction.status == TransactionStatus.confirmed
            and data.status == TransactionStatus.cancelled
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede cancelar una transacción ya confirmada.",
            )

        updated = await self.repo.update_status(transaction, data.status)
        return TransactionResponse.model_validate(updated)