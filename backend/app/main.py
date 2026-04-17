"""
Punto de entrada de la aplicación FastAPI.
En esta fase solo expone un healthcheck para verificar que el contenedor
se levantó correctamente. Los routers reales se añaden en fases posteriores.
"""
from fastapi import FastAPI

app = FastAPI(
    title="Vantum Remesas API",
    version="0.1.0",
    description="API para gestión de remesas familiares entre USA y Guatemala",
)


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    """
    Endpoint de salud. Usado por Docker y por cualquier verificación externa
    para confirmar que el servicio está vivo.
    """
    return {"status": "ok", "service": "vantum-backend"}