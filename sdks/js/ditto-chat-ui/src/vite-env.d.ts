/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_DITTO_APP_ID: string
  readonly VITE_APP_DITTO_APP_TOKEN: string
  readonly VITE_APP_DITTO_AUTH_URL: string
  readonly VITE_APP_DITTO_WEB_SOCKET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
