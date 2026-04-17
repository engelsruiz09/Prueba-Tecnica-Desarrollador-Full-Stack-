"""
Configuración centralizada de la aplicación usando pydantic-settings.

pydantic-settings lee automáticamente las variables de entorno y las valida
con tipos Python. Si falta una variable obligatoria, la app falla al arrancar
con un mensaje claro — mucho mejor que un KeyError en runtime.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Base de datos ──────────────────────────────────────────────────────
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host:port/db

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60

    # ── CORS ───────────────────────────────────────────────────────────────
    # Viene como string "http://localhost:5173" y lo convertimos a lista
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        """Convierte el string de orígenes separados por coma en lista."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # pydantic-settings busca las variables en el archivo .env automáticamente
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Instancia única (singleton). El resto de la app la importa desde aquí.
# No instanciar Settings() en otros módulos — siempre importar este objeto.
settings = Settings()