/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_ION_TOKEN: string;
  readonly VITE_IS_CIVIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}