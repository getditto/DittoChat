/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_DITTO_DATABASE_ID: string
  readonly VITE_APP_DITTO_SERVER_URL: string
  readonly VITE_APP_DITTO_APP_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
