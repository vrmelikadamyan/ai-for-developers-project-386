import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/openapi.yaml',
  output: './frontend/src/api/generated',
  plugins: ['@hey-api/client-fetch', '@hey-api/sdk', '@hey-api/typescript'],
})
