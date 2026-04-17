"""
Punto de entrada de la aplicación FastAPI.

Lifespan: maneja eventos de arranque/apagado de la app.
CORS: permite que el frontend (origen distinto) consuma la API.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, users  

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Eventos de ciclo de vida de la aplicación.
    El bloque antes del yield se ejecuta al arrancar.
    El bloque después del yield se ejecuta al apagar.
    """
    # Al arrancar: aquí podríamos inicializar conexiones, cachés, etc.
    print("🚀 Vantum API arrancando...")
    yield
    # Al apagar: limpieza de recursos
    print("🛑 Vantum API apagándose...")


app = FastAPI(
    title="Vantum Remesas API",
    version="1.0.0",
    description="API para gestión de remesas familiares entre USA y Guatemala",
    lifespan=lifespan,
)

# CORS: permite requests desde el frontend.
# En producción, CORS_ORIGINS debe ser el dominio real del frontend, no *.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers con prefijo global /api/v1
app.include_router(auth.router, prefix="/api/v1")  
app.include_router(users.router, prefix="/api/v1") 

@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    """Verifica que el servicio está vivo. Usado por Docker y monitoreo externo."""
    return {"status": "ok", "service": "vantum-backend"}