import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'NODE_', 'CHAIN_', 'ROUTER_', 'WCSPR_', 'ECTO_'],
  server: {
    proxy: {
      '/rpc': {
        target: 'http://127.0.0.1:11101',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    target: 'esnext' // Important for BigInt support
  }
})
