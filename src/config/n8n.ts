/** n8n production webhook URLs — used only by the same-origin server proxy. */

const FALLBACK_TEXT_REMOVER_URL = "https://sameerjaiswal.app.n8n.cloud/webhook/snapcut/remove-text";
const FALLBACK_TEXT_EXTRACTOR_URLS = [
  "https://sameerjaiswal.app.n8n.cloud/webhook/Path: snapcut/extract-text",
  "https://sameerjaiswal.app.n8n.cloud/webhook/snapcut/extract-text",
] as const;

function stripEnvQuotes(value: string | undefined) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function readWebhookUrl(viteValue: string | undefined, processKey: string, fallback: string) {
  const fromVite = stripEnvQuotes(viteValue);
  if (fromVite) return fromVite;
  const fromProcess =
    typeof process !== "undefined" ? stripEnvQuotes(process.env[processKey]) : "";
  return fromProcess || fallback;
}

function uniqueUrls(...urls: Array<string | undefined>) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const url of urls) {
    const clean = stripEnvQuotes(url);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    next.push(clean);
  }
  return next;
}

export const n8nConfig = {
  textRemoverUrl: readWebhookUrl(
    import.meta.env.VITE_N8N_TEXT_REMOVER_URL,
    "VITE_N8N_TEXT_REMOVER_URL",
    FALLBACK_TEXT_REMOVER_URL,
  ),
  textExtractorUrls: uniqueUrls(
    FALLBACK_TEXT_EXTRACTOR_URLS[0],
    readWebhookUrl(
      import.meta.env.VITE_N8N_TEXT_EXTRACTOR_URL,
      "VITE_N8N_TEXT_EXTRACTOR_URL",
      FALLBACK_TEXT_EXTRACTOR_URLS[0],
    ),
    FALLBACK_TEXT_EXTRACTOR_URLS[1],
  ),
} as const;
