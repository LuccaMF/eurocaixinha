/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Política de segurança (CSP) só no build final: o modo dev do Vite precisa de scripts inline.
// connect-src 'none' impede o site de enviar dados para qualquer servidor, mesmo que uma
// dependência seja comprometida. O SINGLEFILE mete tudo inline, por isso aí não se aplica.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join('; ')

const csp = (): Plugin => ({
  name: 'csp',
  apply: 'build',
  transformIndexHtml: html =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

// SINGLEFILE=1 gera um único index.html (útil para pré-visualizar o site sem servidor).
export default defineConfig({
  base: './',
  plugins: process.env.SINGLEFILE ? [react(), viteSingleFile()] : [react(), csp()],
  test: { environment: 'node' },
})
