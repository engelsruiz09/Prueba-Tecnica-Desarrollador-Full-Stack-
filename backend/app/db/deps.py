"""
Dependencias de FastAPI para inyección de la sesión de base de datos.

El patrón de dependency injection de FastAPI garantiza que:
1. Cada request obtiene su propia sesión aislada.
2. La sesión se cierra automáticamente al finalizar el request,
   incluso si ocurre una excepción (gracias al bloque finally).
3. Los tests pueden sobreescribir esta dependencia para usar una DB de prueba.
"""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Generador async que provee una sesión de DB por request.
    Se usa como dependencia en los endpoints: db: AsyncSession = Depends(get_db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()