# Prueba-Tecnica-Desarrollador-Full-Stack-

Plataforma para facilitar el envío de remesas desde USA hacia Guatemala, con conversión automática de divisas y trazabilidad del apoyo familiar entre Carlos (hijo emisor) y Don Alex (receptor).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.0 async · Alembic · Pydantic v2 |
| Base de datos | PostgreSQL 16 |
| Frontend | React 18 · TypeScript · Vite · TailwindCSS · TanStack Query · Recharts |
| Auth | JWT (python-jose) · bcrypt (passlib) |
| Infra | Docker · Docker Compose |
| API externa | Frankfurter v2 (tipo de cambio) |

---

## Levantar el entorno

### Requisitos
- Docker Desktop corriendo
- Git

### Pasos

```bash
# 1. Clonar
git clone https://github.com/engelsruiz09/Prueba-Tecnica-Desarrollador-Full-Stack-.git
cd Prueba-Tecnica-Desarrollador-Full-Stack-

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar los tres servicios con un solo comando
docker compose up --build
```

### URLs disponibles

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

### Ejecutar migraciones (primera vez)

```bash
docker compose exec backend alembic upgrade head
```

### Ejecutar tests

```bash
docker compose exec backend pytest tests/ -v
```

---

## Flujo de uso

1. Registrar a Carlos como **sender** en `/login` → Registrarse
2. Registrar a Don Alex como **receiver** con el email de Carlos como `linked_email`
3. Carlos inicia sesión → ve su dashboard con gráfico y formulario de envío
4. Don Alex inicia sesión → solicita montos en GTQ con motivo obligatorio
5. Don Alex confirma la recepción desde su lista de transacciones

---

## Preguntas de Reflexión

### 1. API de tipo de cambio y resiliencia

Se eligió **Frankfurter v2** (`api.frankfurter.dev/v2`) por tres razones concretas: es completamente gratuita sin API key (cero configuración extra en un entorno de 8 horas), soporta consultas históricas por fecha que es un requisito explícito del enunciado, y no tiene rate limits estrictos que interfieran con el desarrollo.

Para manejo de errores se implementaron tres niveles en `ExchangeRateService`:
- **Timeout** (`httpx.TimeoutException`): si Frankfurter no responde en 10 segundos, se lanza un `HTTPException 503` con mensaje claro en lugar de dejar el request colgado indefinidamente.
- **HTTP error** (`httpx.HTTPStatusError`): cualquier respuesta 4xx/5xx se convierte en 503 con mensaje descriptivo.
- **Error de red** (`httpx.RequestError`): DNS fallido, conexión rechazada y similares también devuelven 503.

Un hallazgo importante durante el desarrollo: Docker Desktop en Windows tiene un problema de MTU (Maximum Transmission Unit) con WSL2 que impide el handshake TLS con APIs externas. La solución fue configurar `com.docker.network.driver.mtu: "1400"` en la red del compose — sin esto, los contenedores resuelven DNS pero el handshake HTTPS hace timeout.

### 2. Decisiones técnicas sobre librerías

**SQLAlchemy 2.0 async + asyncpg**: ORM estándar de facto en el ecosistema Python. La API 2.0 con typed `Mapped` columns permite detectar errores de modelo en tiempo de desarrollo, no en producción. `asyncpg` es el driver nativo más rápido para PostgreSQL async.

**Alembic**: versionado de esquema de DB. Permite rollbacks controlados y documentar la evolución del esquema como código (auditado en Git).

**Pydantic v2**: integración nativa con FastAPI para validación declarativa. Los schemas actúan como firewall de datos — campos como `password_hash` nunca pueden salir en una respuesta porque simplemente no existen en el schema de output.

**TanStack Query**: gestiona estados de carga, caché, y refetch automático. Al confirmar una transacción, `invalidateQueries` hace que la lista se refresque sola sin lógica manual de estado. Elimina los loading states manuales que pedía el enunciado.

**React Hook Form + Zod**: validación en el cliente con tipos inferidos desde el schema. El mismo schema que valida en el frontend se puede reutilizar para documentación. Zod con `z.coerce.number()` convierte automáticamente el string de un `<input type="number">` a número sin casting manual.

**Recharts**: librería declarativa de React para gráficos, sin dependencias externas. El tooltip personalizado (`CustomTooltip`) muestra fecha y monto en ambas divisas al hacer hover, y el toggle USD/GTQ cambia el `dataKey` del `<Line>` para alternar entre series sin re-render costoso.

### 3. Arquitectura del backend

Se implementó **arquitectura en capas** (Layered Architecture):

```
Router (HTTP) → Service (lógica de negocio) → Repository (datos) → Model (SQLAlchemy)
```

Cada capa solo conoce la inmediatamente inferior y nunca salta capas. Un router nunca ejecuta queries directamente, un repository nunca valida reglas de negocio.

Esto facilita el escalamiento de tres formas: los servicios son independientes entre sí (el servicio de auth no importa nada del servicio de transacciones), los repositorios son sustituibles sin tocar la lógica (cambiar de PostgreSQL a otro motor solo afecta al repo), y los tests pueden mockear cualquier capa individualmente.

El prefijo `/api/v1` en todos los endpoints establece versionado desde el inicio — cuando exista una v2 con breaking changes, la v1 sigue funcionando para clientes que no hayan migrado.

### 4. Inmutabilidad de los montos financieros

La inmutabilidad de `amount_usd`, `amount_gtq`, `exchange_rate` y `rate_date` se garantiza en tres capas independientes:

**Capa 1 — Pydantic**: el schema `TransactionStatusUpdate` solo contiene el campo `status`. Cualquier intento de enviar `amount_usd` en el body de un PATCH es ignorado silenciosamente por Pydantic antes de llegar al servicio.

**Capa 2 — Servicio**: el método `update_status` en `TransactionService` solo llama a `repo.update_status(transaction, data.status)`. No existe ningún método `update_amount` en la capa de servicio ni en el repositorio.

**Capa 3 — Repositorio**: `TransactionRepository.update_status` solo modifica `transaction.status`. Es imposible llamar a este método y modificar otro campo porque no acepta otros parámetros.

El tipo de cambio se consulta exactamente una vez (al crear la transacción) y se almacena como `NUMERIC(12,6)` en la DB. Las consultas de visualización leen ese valor histórico almacenado, nunca recalculan.

### 5. Lo más complicado de implementar

Tres desafíos técnicos concretos, en orden de impacto:

**JWT en dos capas**: entender que el token debe viajar en el header `Authorization: Bearer <token>` y que FastAPI lo extrae via `HTTPBearer`, no via `Cookie` ni query param. El error más común fue confundir la inyección del token (interceptor de Axios en el cliente) con la validación (dependencia `get_current_user` en FastAPI).

**TypeScript en React**: el tipado estricto de los responses de la API (Decimals serializados como strings desde FastAPI, no como números) requirió usar `Number(t.amount_usd)` en toda la UI. Sin ese casting, Recharts recibía strings y las sumas daban `"100.00200.00"` en lugar de `300.00`.

**Conectividad Docker en Windows**: el handshake TLS fallaba silenciosamente con `ReadTimeout` a pesar de que el DNS resolvía correctamente. La causa es un bug de fragmentación de paquetes por MTU incorrecto en la interfaz virtual de WSL2. Configurar `mtu: 1400` en la red del compose resolvió el problema.

### 6. Mejoras de seguridad con una semana extra

Analizando el código actual, la vulnerabilidad más crítica es la **ausencia de rate limiting en los endpoints de autenticación**.

El endpoint `POST /api/v1/auth/login` no tiene ningún límite de intentos. Un atacante puede ejecutar un ataque de fuerza bruta contra cualquier email registrado de forma indefinida y automatizada. bcrypt agrega latencia por diseño (~300ms por verificación) pero no es suficiente si el atacante usa decenas de IPs en paralelo.

Otras mejoras identificadas en el código:

- **Refresh tokens**: el JWT actual expira pero no hay mecanismo de renovación. Un token robado es válido hasta su expiración sin forma de revocarlo. Implementar un refresh token de larga duración almacenado en `HttpOnly cookie` (no localStorage) y un access token de corta duración (15 min) reduce la ventana de exposición.
- **HTTPS forzado**: en producción, toda comunicación debe ir sobre TLS. El compose actual no tiene Nginx con SSL.
- **Límite de montos**: no hay validación de monto máximo por transacción. Un `amount_usd` de `9,999,999,999` es técnicamente válido hoy.
- **Vinculación de cuentas sin consentimiento**: actualmente si Carlos se registra con `linked_email: donAlex@test.com`, queda vinculado aunque Don Alex no haya consentido. Un flujo de invitación con token de confirmación haría esto más seguro.

---

## Estructura del proyecto

```
vantum-remesas-app/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # Routers FastAPI
│   │   ├── core/          # Config, JWT, dependencias
│   │   ├── db/            # Sesión, base declarativa, deps
│   │   ├── models/        # SQLAlchemy (User, Transaction)
│   │   ├── repositories/  # Acceso a datos
│   │   ├── schemas/       # Pydantic (entrada/salida)
│   │   └── services/      # Lógica de negocio
│   ├── tests/
│   └── alembic/
├── frontend/
│   └── src/
│       ├── api/           # Axios + endpoints tipados
│       ├── components/    # UI reutilizable
│       ├── contexts/      # AuthContext
│       ├── hooks/         # useTransactions
│       ├── pages/         # AuthPage, SenderDashboard, ReceiverDashboard
│       ├── routes/        # ProtectedRoute, PublicOnlyRoute
│       └── types/         # Tipos TypeScript globales
└── docker-compose.yml
```