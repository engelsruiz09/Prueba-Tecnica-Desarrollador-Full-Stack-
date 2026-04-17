"""
Router de autenticación: registro y login.

Los routers son delgados — solo definen el contrato HTTP (método, path,
status codes, schemas) y delegan toda la lógica al servicio.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.schemas.user import LoginRequest, TokenResponse, UserCreate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Registra un nuevo usuario (sender o receiver) y devuelve un JWT.
    Si se provee linked_email, vincula automáticamente las cuentas familiares.
    """
    return await AuthService(db).register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Iniciar sesión",
)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Autentica al usuario y devuelve un JWT con expiración."""
    return await AuthService(db).login(data)