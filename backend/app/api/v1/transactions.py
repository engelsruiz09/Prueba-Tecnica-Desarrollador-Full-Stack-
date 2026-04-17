"""
Router de transacciones.

Endpoints:
  POST /transactions/send      → Carlos registra un envío (solo sender)
  POST /transactions/request   → Don Alex solicita dinero (solo receiver)
  GET  /transactions           → historial paginado del usuario autenticado
  PATCH /transactions/{id}     → cambiar estado (confirmar / cancelar)
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_receiver, require_sender
from app.db.deps import get_db
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    RequestTransactionCreate,
    SendTransactionCreate,
    TransactionResponse,
    TransactionStatusUpdate,
)
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post(
    "/send",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar envío de remesa (solo emisor)",
)
async def create_send(
    data: SendTransactionCreate,
    current_user: User = Depends(require_sender),
    db: AsyncSession = Depends(get_db),
):
    """Carlos registra un envío en USD. El tipo de cambio se fija automáticamente."""
    return await TransactionService(db).create_send(data, current_user)


@router.post(
    "/request",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar dinero (solo receptor)",
)
async def create_request(
    data: RequestTransactionCreate,
    current_user: User = Depends(require_receiver),
    db: AsyncSession = Depends(get_db),
):
    """Don Alex solicita un monto en GTQ con motivo obligatorio."""
    return await TransactionService(db).create_request(data, current_user)


@router.get(
    "",
    response_model=PaginatedTransactions,
    summary="Historial paginado de transacciones",
)
async def list_transactions(
    page: int = Query(default=1, ge=1, description="Número de página"),
    page_size: int = Query(default=10, ge=1, le=50, description="Resultados por página"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Devuelve las transacciones del usuario autenticado (como sender o receiver).
    Ordenadas por fecha descendente, con paginación.
    """
    return await TransactionService(db).get_my_transactions(current_user, page, page_size)


@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
    summary="Actualizar estado de una transacción",
)
async def update_transaction_status(
    transaction_id: int,
    data: TransactionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cambia el estado a 'confirmed' o 'cancelled'.
    Solo el receptor puede confirmar. Ambos pueden cancelar si está pendiente.
    """
    return await TransactionService(db).update_status(transaction_id, data, current_user)