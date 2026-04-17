"""
Tests del módulo de autenticación.

Cubre: registro, login, protección de rutas, manejo de errores.
Cada test es independiente y no depende del orden de ejecución.
"""
import pytest
from httpx import AsyncClient


# ── Fixtures reutilizables ─────────────────────────────────────────────────

@pytest.fixture
async def registered_sender(client: AsyncClient) -> dict:
    """Crea y retorna un usuario sender registrado con su token."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "carlos@test.com",
        "password": "test1234",
        "full_name": "Carlos García",
        "role": "sender",
    })
    assert response.status_code == 201
    return response.json()


@pytest.fixture
async def registered_receiver(client: AsyncClient) -> dict:
    """Crea y retorna un usuario receiver registrado con su token."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "donAlex@test.com",
        "password": "test1234",
        "full_name": "Don Alex",
        "role": "receiver",
    })
    assert response.status_code == 201
    return response.json()


# ── Tests de registro ──────────────────────────────────────────────────────

class TestRegister:
    async def test_register_sender_success(self, client: AsyncClient):
        """Registro exitoso devuelve 201 con token y datos del usuario."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "nuevo@test.com",
            "password": "test1234",
            "full_name": "Nuevo Usuario",
            "role": "sender",
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "nuevo@test.com"
        assert data["user"]["role"] == "sender"
        # Nunca debe exponerse el hash de contraseña
        assert "password_hash" not in data["user"]

    async def test_register_duplicate_email_returns_409(self, client: AsyncClient, registered_sender: dict):
        """Registrar el mismo email dos veces debe devolver 409 Conflict."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "carlos@test.com",  # ya existe por el fixture
            "password": "test1234",
            "full_name": "Otro Carlos",
            "role": "sender",
        })
        assert response.status_code == 409

    async def test_register_weak_password_returns_422(self, client: AsyncClient):
        """Contraseña sin números debe ser rechazada por Pydantic."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "test@test.com",
            "password": "sinNumeros",   # no tiene número
            "full_name": "Test User",
            "role": "sender",
        })
        assert response.status_code == 422

    async def test_register_invalid_email_returns_422(self, client: AsyncClient):
        """Email malformado debe ser rechazado."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "no-es-un-email",
            "password": "test1234",
            "full_name": "Test",
            "role": "sender",
        })
        assert response.status_code == 422

    async def test_register_links_users_when_emails_match(
        self, client: AsyncClient, registered_sender: dict
    ):
        """Al registrar con linked_email, debe vincular ambas cuentas."""
        response = await client.post("/api/v1/auth/register", json={
            "email": "donAlex@test.com",
            "password": "test1234",
            "full_name": "Don Alex",
            "role": "receiver",
            "linked_email": "carlos@test.com",  # vincula con el sender
        })
        assert response.status_code == 201
        data = response.json()
        # El receiver debe tener linked_user_id apuntando al sender
        assert data["user"]["linked_user_id"] == registered_sender["user"]["id"]


# ── Tests de login ─────────────────────────────────────────────────────────

class TestLogin:
    async def test_login_success_returns_token(
        self, client: AsyncClient, registered_sender: dict
    ):
        """Login con credenciales válidas devuelve token."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "carlos@test.com",
            "password": "test1234",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password_returns_401(
        self, client: AsyncClient, registered_sender: dict
    ):
        """Contraseña incorrecta devuelve 401 con mensaje genérico."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "carlos@test.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401
        # El mensaje NO debe revelar si el email existe o no
        assert "credenciales" in response.json()["detail"].lower()

    async def test_login_nonexistent_email_returns_401(self, client: AsyncClient):
        """Email inexistente devuelve el mismo 401 que contraseña incorrecta."""
        response = await client.post("/api/v1/auth/login", json={
            "email": "noexiste@test.com",
            "password": "test1234",
        })
        assert response.status_code == 401


# ── Tests de rutas protegidas ──────────────────────────────────────────────

class TestProtectedRoutes:
    async def test_get_me_with_valid_token(
        self, client: AsyncClient, registered_sender: dict
    ):
        """GET /users/me con token válido devuelve el perfil."""
        token = registered_sender["access_token"]
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == "carlos@test.com"

    async def test_get_me_without_token_returns_403(self, client: AsyncClient):
        """GET /users/me sin token devuelve 403."""
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 403

    async def test_get_me_with_invalid_token_returns_403(self, client: AsyncClient):
        """Token manipulado devuelve 403."""
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer token.falso.manipulado"},
        )
        assert response.status_code == 403