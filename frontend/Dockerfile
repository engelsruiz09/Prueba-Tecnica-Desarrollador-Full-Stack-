# Imagen base con Node. Alpine es más liviana pero ocasionalmente tiene problemas
# con paquetes nativos; node:20-slim es un buen balance.
FROM node:20-slim

WORKDIR /app

# Copiamos manifiestos primero para aprovechar caché de Docker
COPY package*.json ./

# npm ci es más estricto y reproducible que npm install en CI/CD.
# En desarrollo usamos install porque puede haber cambios frecuentes.
RUN npm install

# Copiamos el resto del código (se sobreescribe con el volumen en dev)
COPY . .

EXPOSE 5173

# Vite en modo dev con hot reload
CMD ["npm", "run", "dev"]