# Importar todos los modelos aquí para que Alembic los descubra al generar migraciones.
# Si un modelo no está importado en este __init__, Alembic no lo incluirá.
from app.models.transaction import Transaction
from app.models.user import User

__all__ = ["User", "Transaction"]