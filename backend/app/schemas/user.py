"""
Schemas Pydantic para usuarios.

Separamos los schemas de entrada (request) y salida (response) deliberadamente:
- UserCreate: lo que el cliente envía al registrarse (incluye password en texto plano)
- UserResponse: lo que el servidor devuelve (NUNCA incluye password_hash)
- TokenResponse: respuesta del endpoint de login

Esta separación es una práctica de seguridad fundamental: Pydantic
actúa como firewall de datos, garantizando que campos sensibles
nunca salgan accidentalmente en las respuestas.
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Mínimo 8 caracteres")
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole
    # Email del familiar para vincular las cuentas automáticamente al registrarse
    linked_email: EmailStr | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Valida que la contraseña tenga al menos una letra y un número."""
        if not any(c.isalpha() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    linked_user_id: int | None
    created_at: datetime

    # from_attributes=True permite crear el schema desde un objeto SQLAlchemy
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str