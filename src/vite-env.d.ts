/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_TEXT_REMOVER_URL?: string;
  readonly VITE_N8N_TEXT_EXTRACTOR_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
