"""
Repositorio de usuarios: acceso a datos puro, sin lógica de negocio.

El patrón Repository aísla las queries de SQLAlchemy del resto de la app.
Beneficios:
  - Si cambiamos de ORM, solo tocamos este archivo.
  - Los servicios llaman métodos semánticos (get_by_email) en vez de escribir SQL.
  - Los tests pueden mockear el repositorio sin tocar la DB.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, user_data: dict) -> User:
        """
        Crea un usuario en la DB.
        Recibe un dict ya procesado (con password_hash, sin password en texto plano).
        """
        user = User(**user_data)
        self.db.add(user)
        await self.db.flush()   # flush asigna el ID sin hacer commit todavía
        await self.db.refresh(user)  # refresca para obtener valores generados por la DB
        return user

    async def update_linked_user(self, user: User, linked_id: int) -> User:
        """Vincula dos usuarios (emisor ↔ receptor)."""
        user.linked_user_id = linked_id
        await self.db.flush()
        await self.db.refresh(user)
        return user