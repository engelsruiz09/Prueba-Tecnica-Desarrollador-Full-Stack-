"""
Schemas para el tipo de cambio retornado por Frankfurter.

Definimos nuestro propio schema interno en vez de exponer directamente
la respuesta de Frankfurter. Así si cambiamos de proveedor de API,
el resto de la app no se entera — solo cambia este servicio.
"""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ExchangeRateResult(BaseModel):
    """
    Resultado estandarizado de una consulta de tipo de cambio.
    Este es el contrato interno entre el servicio de exchange y el de transacciones.
    """
    rate: Decimal          # Tipo de cambio USD → GTQ (ej: 7.743251)
    rate_date: date        # Fecha en la que se obtuvo el tipo de cambio
    amount_usd: Decimal    # Monto en USD (origen)
    amount_gtq: Decimal    # Monto en GTQ calculado (inmutable desde este momento)