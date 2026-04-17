"""
Dependencias de FastAPI para proteger rutas con autenticación JWT.

get_current_user: extrae y valida el token del header Authorization.
require_sender: verifica que el usuario sea de rol 'sender'.
require_receiver: verifica que el usuario sea de rol 'receiver'.

Usar estas dependencias en los endpoints es tan simple como:
    current_user: User = Depends(get_current_user)
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.deps import get_db
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository

# HTTPBearer extrae automáticamente el token del header: "Authorization: Bearer <token>"
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Valida el JWT y devuelve el usuario autenticado.
    Lanza 401 si el token es inválido, expirado, o el usuario no existe.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id))
    if user is None:
        raise credentials_exception

    return user


def require_role(required_role: UserRole):
    """
    Factory de dependencias para verificar roles.
    Devuelve una dependencia que lanza 403 si el usuario no tiene el rol requerido.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso restringido a usuarios con rol '{required_role.value}'",
            )
        return current_user
    return role_checker


# Dependencias listas para usar en los routers
require_sender = require_role(UserRole.sender)
require_receiver = require_role(UserRole.receiver)