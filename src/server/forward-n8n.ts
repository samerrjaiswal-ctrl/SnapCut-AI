import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase";

const REQUEST_TIMEOUT_MS = 90_000;
const SNAPY_TIMEOUT_MS = 120_000;

async function isAuthenticatedRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;

  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey) return false;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return Boolean(data.user) && !error;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function webhookCandidates(webhookUrl: string | string[]) {
  return [...new Set((Array.isArray(webhookUrl) ? webhookUrl : [webhookUrl]).map((url) => url.trim()).filter(Boolean))];
}

export async function forwardImageToN8n(
  request: Request,
  webhookUrl: string | string[],
): Promise<Response> {
  if (!(await isAuthenticatedRequest(request))) {
    return Response.json({ success: false }, { status: 401 });
  }

  const urls = webhookCandidates(webhookUrl);
  if (!urls.length) {
    return Response.json({ success: false }, { status: 503 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ success: false }, { status: 400 });
  }

  const file = incoming.get("data");
  if (!(file instanceof Blob) || file.size <= 0) {
    return Response.json({ success: false }, { status: 400 });
  }

  const filename = file instanceof File && file.name ? file.name : "image.png";
  const fileBuffer = await file.arrayBuffer();
  let lastResponse: Response | null = null;

  for (const url of urls) {
    const outbound = new FormData();
    outbound.append("data", new Blob([fileBuffer], { type: file.type || "image/png" }), filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const upstream = await fetch(encodeURI(url), {
        method: "POST",
        body: outbound,
        signal: controller.signal,
      });

      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const body = await upstream.arrayBuffer();
      lastResponse = new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: { "content-type": contentType },
      });

      if (upstream.ok || ![404, 405, 502, 503, 504].includes(upstream.status)) {
        return lastResponse;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return Response.json({ success: false }, { status: 504 });
      }
      console.error("[SnapCut] n8n forward failed");
      lastResponse = Response.json({ success: false }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return lastResponse ?? Response.json({ success: false }, { status: 502 });
}

export async function forwardSnapyEditToN8n(
  request: Request,
  webhookUrl: string | string[],
): Promise<Response> {
  if (!(await isAuthenticatedRequest(request))) {
    if (import.meta.env.DEV) console.info("[SnapCut] Snapy proxy blocked: no session");
    return Response.json({ success: false }, { status: 401 });
  }

  const urls = webhookCandidates(webhookUrl);
  if (!urls.length) {
    return Response.json({ success: false }, { status: 503 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return Response.json({ success: false }, { status: 400 });
  }

  const voice = incoming.get("voice_message") ?? incoming.get("voice");
  const fromForm = String(incoming.get("prompt") ?? "").trim();
  const fromQuery = new URL(request.url).searchParams.get("prompt")?.trim() ?? "";
  const fromHeader = request.headers.get("x-snapy-prompt")?.trim() ?? "";
  const prompt = fromForm || fromQuery || fromHeader;
  let voiceBuffer: ArrayBuffer | null = null;
  let voiceName = "voice.webm";
  let voiceType = "audio/webm";
  if (voice instanceof Blob && voice.size > 0) {
    voiceBuffer = await voice.arrayBuffer();
    voiceType = voice.type || "audio/webm";
    voiceName =
      voice instanceof File && voice.name
        ? voice.name
        : voiceType.includes("mp4")
          ? "voice.mp4"
          : voiceType.includes("ogg")
            ? "voice.ogg"
            : "voice.webm";
  }

  if (!prompt && !voiceBuffer) {
    return Response.json({ success: false }, { status: 400 });
  }

  let lastResponse: Response | null = null;

  for (const url of urls) {
    const outbound = new FormData();
    if (prompt) outbound.append("prompt", prompt);
    if (voiceBuffer) {
      outbound.append("voice_message", new Blob([voiceBuffer], { type: voiceType }), voiceName);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SNAPY_TIMEOUT_MS);

    try {
      const n8nUrl = new URL(url);
      if (prompt) n8nUrl.searchParams.set("prompt", prompt);
      const upstream = await fetch(n8nUrl, {
        method: "POST",
        body: outbound,
        signal: controller.signal,
      });
      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const body = await upstream.arrayBuffer();
      if (import.meta.env.DEV) {
        console.info("[SnapCut] Snapy n8n", n8nUrl.pathname, upstream.status, "promptChars", prompt.length);
      }
      lastResponse = new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: { "content-type": contentType },
      });
      if (upstream.ok || ![404, 405, 502, 503, 504].includes(upstream.status)) {
        return lastResponse;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return Response.json({ success: false }, { status: 504 });
      }
      console.error("[SnapCut] Snapy n8n forward failed");
      lastResponse = Response.json({ success: false }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return lastResponse ?? Response.json({ success: false }, { status: 502 });
}
