import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 expone el servidor fuera del contenedor.
    // Sin esto, Vite solo es accesible desde dentro del propio contenedor.
    host: '0.0.0.0',
    port: 5173,
    // Necesario para que el hot reload funcione correctamente con volúmenes montados.
    // Docker en Windows/Mac no propaga eventos de filesystem nativos al contenedor,
    // así que forzamos polling para detectar cambios en los archivos.
    watch: {
      usePolling: true,
    },
  },
})