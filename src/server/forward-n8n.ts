import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase";

const REQUEST_TIMEOUT_MS = 90_000;

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
