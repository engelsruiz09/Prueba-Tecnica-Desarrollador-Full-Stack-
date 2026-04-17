"""
Router de usuarios: endpoints relacionados al perfil del usuario autenticado.
"""
from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Obtener perfil del usuario autenticado",
)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Devuelve los datos del usuario autenticado.
    El frontend usa este endpoint al cargar la app para restaurar la sesión.
    """
    return current_user