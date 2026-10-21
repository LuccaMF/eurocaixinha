/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLEFILE=1 gera um único index.html (útil para pré-visualizar o site sem servidor).
export default defineConfig({
  base: './',
  plugins: process.env.SINGLEFILE ? [react(), viteSingleFile()] : [react()],
  test: { environment: 'node' },
})
