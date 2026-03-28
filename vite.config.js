import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const enableVercelInspectGuard = process.env.VERCEL === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __ENABLE_VERCEL_INSPECT_GUARD__: JSON.stringify(enableVercelInspectGuard),
  },
  resolve: {
    preserveSymlinks: true,
  },
})
