"""
Utilidades de seguridad: hashing de contraseñas y manejo de JWT.

Separamos estas responsabilidades en un módulo propio para que tanto
el servicio de auth como los tests puedan importarlas sin depender
de FastAPI ni de la DB.
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Contexto de hashing. bcrypt es el algoritmo recomendado para contraseñas:
# es lento por diseño (dificulta ataques de fuerza bruta) y maneja el salt automáticamente.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hashea una contraseña en texto plano. Nunca almacenar la contraseña original."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compara una contraseña en texto plano con su hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: int, role: str) -> str:
    """
    Genera un JWT firmado con los datos del usuario.

    El 'subject' (sub) es el ID del usuario — estándar RFC 7519.
    Incluimos el rol en el payload para no tener que consultar la DB
    en cada request protegido solo para saber si es sender o receiver.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_EXPIRATION_MINUTES
    )
    payload = {
        "sub": str(subject),   # subject: ID del usuario
        "role": role,          # claim personalizado: rol del usuario
        "exp": expire,         # expiration: cuándo vence el token
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decodifica y valida un JWT.

    Lanza JWTError si el token es inválido, fue manipulado, o está expirado.
    Los routers capturan esta excepción y devuelven 401.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])