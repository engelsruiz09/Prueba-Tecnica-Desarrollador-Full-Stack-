"""
Servicio de autenticación: contiene toda la lógica de negocio de registro y login.

El servicio orquesta el repositorio, el hashing y la generación de tokens.
Los routers solo llaman métodos de este servicio — no conocen SQLAlchemy ni jose.
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(self, data: UserCreate) -> TokenResponse:
        """
        Registra un nuevo usuario y devuelve un token listo para usar.

        Flujo:
        1. Verificar que el email no esté tomado.
        2. Hashear la contraseña.
        3. Crear el usuario.
        4. Si se proveyó linked_email, buscar al familiar y crear vínculo bidireccional.
        5. Generar y devolver JWT.
        """
        # 1. Email único
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta con este correo electrónico",
            )

        # 2. Preparar datos sin exponer la contraseña en texto plano
        user_data = {
            "email": data.email,
            "password_hash": hash_password(data.password),
            "full_name": data.full_name,
            "role": data.role,
        }

        # 3. Crear usuario
        user = await self.repo.create(user_data)

        # 4. Vincular con familiar si se proporcionó su email
        if data.linked_email:
            linked = await self.repo.get_by_email(str(data.linked_email))
            if linked:
                # Vínculo bidireccional: A→B y B→A
                await self.repo.update_linked_user(user, linked.id)
                if linked.linked_user_id is None:
                    await self.repo.update_linked_user(linked, user.id)

        token = create_access_token(subject=user.id, role=user.role.value)
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def login(self, data: LoginRequest) -> TokenResponse:
        """
        Autentica un usuario existente.

        Usamos el mismo mensaje de error para email inválido y contraseña incorrecta
        — no queremos revelar si el email existe o no (enumeración de usuarios).
        """
        INVALID_CREDENTIALS = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

        user = await self.repo.get_by_email(data.email)
        if not user:
            raise INVALID_CREDENTIALS

        if not verify_password(data.password, user.password_hash):
            raise INVALID_CREDENTIALS

        token = create_access_token(subject=user.id, role=user.role.value)
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )