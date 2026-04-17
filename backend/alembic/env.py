"""
Configuración del entorno de migraciones Alembic.

Alembic necesita saber:
1. La URL de conexión a la DB.
2. El metadata de los modelos para detectar cambios automáticamente (autogenerate).
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Importamos settings y Base para que Alembic conozca la DB y los modelos
from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401 — importar modelos para que Base los registre

# Configuración de logging de Alembic (viene del alembic.ini)
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Le decimos a Alembic qué metadata inspeccionar para autogenerate
target_metadata = Base.metadata

# Sobreescribimos la URL con la de nuestros settings (ignora la del alembic.ini)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """Modo offline: genera SQL sin conectarse a la DB."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Modo online async: se conecta a la DB y corre las migraciones."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # NullPool: no mantener conexiones abiertas en migraciones
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()