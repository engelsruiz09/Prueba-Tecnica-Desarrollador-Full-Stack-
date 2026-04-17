"""
Router de tipo de cambio.

Expone un endpoint de consulta para que el frontend pueda mostrar
la tasa actual USD ↔ GTQ antes de que el usuario confirme una operación.
Este endpoint NO crea transacciones — solo informa.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.exchange import ExchangeRateResult
from app.services.exchange_service import ExchangeRateService

router = APIRouter(prefix="/exchange", tags=["exchange"])


@router.get(
    "/rate",
    response_model=ExchangeRateResult,
    summary="Consultar tipo de cambio actual USD → GTQ",
)
async def get_current_rate(
    amount_usd: Decimal = Query(default=Decimal("1.00"), gt=0, description="Monto en USD"),
    _: User = Depends(get_current_user),  # Ruta protegida — requiere autenticación
):
    """
    Devuelve el tipo de cambio actual USD → GTQ y el monto convertido.
    Útil para mostrar una vista previa antes de registrar un envío.
    """
    service = ExchangeRateService()
    return await service.get_rate_usd_to_gtq(amount_usd=amount_usd)