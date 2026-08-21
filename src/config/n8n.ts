/** n8n production webhook URLs — used only by the same-origin server proxy. */
export const n8nConfig = {
  textRemoverUrl: (import.meta.env.VITE_N8N_TEXT_REMOVER_URL ?? "").trim(),
  textExtractorUrl: (import.meta.env.VITE_N8N_TEXT_EXTRACTOR_URL ?? "").trim(),
} as const;
