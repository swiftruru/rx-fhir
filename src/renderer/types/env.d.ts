/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TW CAT conference OAuth defaults, injected from .env.local (gitignored). */
  readonly RENDERER_VITE_TWCAT_TOKEN_URL?: string
  readonly RENDERER_VITE_TWCAT_CLIENT_ID?: string
  readonly RENDERER_VITE_TWCAT_CLIENT_SECRET?: string
  readonly RENDERER_VITE_TWCAT_PARTICIPANT_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
