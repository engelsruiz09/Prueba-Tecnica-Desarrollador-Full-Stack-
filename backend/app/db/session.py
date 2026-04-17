"""
Configuración del motor async de SQLAlchemy y la fábrica de sesiones.

Usamos el patrón async session factory con AsyncEngine para que FastAPI
pueda manejar múltiples requests concurrentes sin bloquear el event loop
mientras espera respuestas de la base de datos.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# El engine gestiona el pool de conexiones a PostgreSQL.
# pool_pre_ping=True verifica que la conexión sigue viva antes de usarla,
# evitando errores si la DB se reinició o cortó la conexión por inactividad.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,        # True imprime SQL en consola — útil para debug, ruidoso en prod
    pool_pre_ping=True,
)

# La fábrica de sesiones. Cada request HTTP obtiene su propia sesión.
# expire_on_commit=False evita que SQLAlchemy invalide los objetos después
# del commit, lo que causaría errores al acceder a atributos tras guardar.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)