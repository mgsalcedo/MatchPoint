/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Integration tests hit a live Supabase DB and are excluded from the default
    // unit run; run them explicitly once the DB is seeded (see the runbook).
    exclude: process.env.RUN_INTEGRATION ? ['**/node_modules/**'] : ['**/node_modules/**', '**/*.integration.test.ts'],
  },
})
