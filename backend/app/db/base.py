"""
Base declarativa compartida por todos los modelos SQLAlchemy.

Todos los modelos deben heredar de esta clase para que Alembic
los descubra automáticamente al generar migraciones.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass