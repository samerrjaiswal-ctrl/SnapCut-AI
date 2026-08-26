/** n8n production webhook URLs — used only by the same-origin server proxy. */

const FALLBACK_TEXT_REMOVER_URL = "https://sameerjaiswal.app.n8n.cloud/webhook/snapcut/remove-text";
const FALLBACK_SNAPY_PROMPT_IMAGE_URL =
  "https://sameerjaiswal.app.n8n.cloud/webhook/snapy-prompt-to-image";
const FALLBACK_SNAPY_PROMPT_IMAGE_TEST_URL =
  "https://sameerjaiswal.app.n8n.cloud/webhook-test/snapy-prompt-to-image";
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

const FALLBACK_PDF_TO_WORD_URL = "https://sameerjaiswal.app.n8n.cloud/webhook/pdf-to-word";
const FALLBACK_PDF_TO_WORD_TEST_URL =
  "https://sameerjaiswal.app.n8n.cloud/webhook-test/pdf-to-word";
const FALLBACK_PDF_TO_PPTX_URL = "https://sameerjaiswal.app.n8n.cloud/webhook/pdf-to-pptx";
const FALLBACK_PDF_TO_PPTX_TEST_URL =
  "https://sameerjaiswal.app.n8n.cloud/webhook-test/pdf-to-pptx";
const FALLBACK_PDF_MERGE_URL = "https://sameerjaiswal.app.n8n.cloud/webhook/pdf-merge";
const FALLBACK_PDF_MERGE_TEST_URL =
  "https://sameerjaiswal.app.n8n.cloud/webhook-test/pdf-merge";

export const n8nConfig = {
  textRemoverUrl: readWebhookUrl(
    import.meta.env.VITE_N8N_TEXT_REMOVER_URL,
    "VITE_N8N_TEXT_REMOVER_URL",
    FALLBACK_TEXT_REMOVER_URL,
  ),
  snapyPromptToImageUrl: uniqueUrls(
    FALLBACK_SNAPY_PROMPT_IMAGE_URL,
    import.meta.env.DEV ? FALLBACK_SNAPY_PROMPT_IMAGE_TEST_URL : undefined,
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
  pdfToWordUrls: uniqueUrls(
    readWebhookUrl(
      import.meta.env.VITE_N8N_PDF_TO_WORD_URL,
      "VITE_N8N_PDF_TO_WORD_URL",
      FALLBACK_PDF_TO_WORD_URL,
    ),
    FALLBACK_PDF_TO_WORD_URL,
    import.meta.env.DEV ? FALLBACK_PDF_TO_WORD_TEST_URL : undefined,
  ),
  pdfToPptxUrls: uniqueUrls(
    readWebhookUrl(
      import.meta.env.VITE_N8N_PDF_TO_PPTX_URL,
      "VITE_N8N_PDF_TO_PPTX_URL",
      FALLBACK_PDF_TO_PPTX_URL,
    ),
    FALLBACK_PDF_TO_PPTX_URL,
    import.meta.env.DEV ? FALLBACK_PDF_TO_PPTX_TEST_URL : undefined,
  ),
  pdfMergeUrls: uniqueUrls(
    readWebhookUrl(
      import.meta.env.VITE_N8N_PDF_MERGE_URL,
      "VITE_N8N_PDF_MERGE_URL",
      FALLBACK_PDF_MERGE_URL,
    ),
    FALLBACK_PDF_MERGE_URL,
    import.meta.env.DEV ? FALLBACK_PDF_MERGE_TEST_URL : undefined,
  ),
} as const;
