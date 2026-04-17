"""
Repositorio de transacciones: queries a la DB sin lógica de negocio.

Implementa paginación en el nivel de DB (LIMIT/OFFSET) para no traer
todos los registros a memoria. En tablas grandes esto es crítico.
"""
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.transaction import Transaction, TransactionStatus


class TransactionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, transaction_data: dict) -> Transaction:
        """Crea una transacción con todos sus campos financieros ya calculados."""
        transaction = Transaction(**transaction_data)
        self.db.add(transaction)
        await self.db.flush()
        # selectinload carga las relaciones sender y receiver en la misma query
        # para evitar el problema N+1 al serializar con Pydantic
        await self.db.refresh(transaction)
        result = await self.db.execute(
            select(Transaction)
            .options(selectinload(Transaction.sender), selectinload(Transaction.receiver))
            .where(Transaction.id == transaction.id)
        )
        return result.scalar_one()

    async def get_by_id(self, transaction_id: int) -> Transaction | None:
        result = await self.db.execute(
            select(Transaction)
            .options(selectinload(Transaction.sender), selectinload(Transaction.receiver))
            .where(Transaction.id == transaction_id)
        )
        return result.scalar_one_or_none()

    async def get_paginated_for_user(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 10,
    ) -> tuple[list[Transaction], int]:
        """
        Devuelve transacciones donde el usuario es sender o receiver.
        Retorna una tupla (items, total) para construir la respuesta paginada.
        """
        base_query = (
            select(Transaction)
            .options(selectinload(Transaction.sender), selectinload(Transaction.receiver))
            .where(
                or_(
                    Transaction.sender_id == user_id,
                    Transaction.receiver_id == user_id,
                )
            )
            .order_by(Transaction.created_at.desc())
        )

        # Contar total sin paginación (para calcular total_pages en el frontend)
        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()

        # Aplicar LIMIT y OFFSET para la página solicitada
        offset = (page - 1) * page_size
        paginated_result = await self.db.execute(
            base_query.limit(page_size).offset(offset)
        )
        items = list(paginated_result.scalars().all())

        return items, total

    async def update_status(
        self,
        transaction: Transaction,
        new_status: TransactionStatus,
    ) -> Transaction:
        """
        Actualiza SOLO el estado. Método explícito para reforzar inmutabilidad:
        no existe ningún método update_amount o update_rate en este repositorio.
        """
        transaction.status = new_status
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction