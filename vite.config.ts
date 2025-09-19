import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    // Production optimizations
    target: 'es2015',
    minify: 'esbuild', // Use esbuild instead of terser for faster builds
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom'],
          // DnD chunk for drag and drop functionality
          dnd: ['react-dnd', 'react-dnd-html5-backend', 'react-dnd-touch-backend'],
        },
      },
    },
    // Enable source maps for production debugging
    sourcemap: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // Development server configuration
    port: 3000,
    open: true,
    host: true,
  },
  preview: {
    // Preview server configuration
    port: 4173,
    host: true,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dnd',
      'react-dnd-html5-backend',
      'react-dnd-touch-backend',
    ],
  },
})