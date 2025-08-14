/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_ION_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}