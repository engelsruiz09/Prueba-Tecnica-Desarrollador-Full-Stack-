# Imagen base ligera de Python. Usamos slim para reducir tamaño sin sacrificar compatibilidad.
FROM python:3.12-slim

# Evita que Python escriba archivos .pyc y fuerza stdout sin buffer (logs en tiempo real)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Dependencias del sistema necesarias para compilar algunos paquetes Python (ej. bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python primero (aprovecha caché de Docker si requirements no cambia)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código. En desarrollo esto se sobreescribe con el volumen del compose.
COPY . .

# Puerto que expone el contenedor (documentativo, el mapeo real está en compose)
EXPOSE 8000

# Comando por defecto: uvicorn con --reload para hot reload en desarrollo
# --host 0.0.0.0 es OBLIGATORIO dentro de Docker; 127.0.0.1 solo escucharía dentro del contenedor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]