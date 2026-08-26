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
    const onClientAbort = () => controller.abort();
    request.signal.addEventListener("abort", onClientAbort, { once: true });

    try {
      if (request.signal.aborted) {
        return Response.json({ success: false, cancelled: true }, { status: 499 });
      }
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
        if (request.signal.aborted) {
          return Response.json({ success: false, cancelled: true }, { status: 499 });
        }
        return Response.json({ success: false }, { status: 504 });
      }
      console.error("[SnapCut] Snapy n8n forward failed");
      lastResponse = Response.json({ success: false }, { status: 502 });
    } finally {
      request.signal.removeEventListener("abort", onClientAbort);
      clearTimeout(timeoutId);
    }
  }

  return lastResponse ?? Response.json({ success: false }, { status: 502 });
}

export async function forwardPdfToN8n(
  request: Request,
  webhookUrl: string | string[],
): Promise<Response> {
  if (!(await isAuthenticatedRequest(request))) {
    return Response.json({ success: false, error: "Sign in to convert PDFs." }, { status: 401 });
  }

  const urls = webhookCandidates(webhookUrl);
  if (!urls.length) {
    return Response.json({ success: false, error: "No webhook URL configured" }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let filename = "document.pdf";
  let fileBuffer: ArrayBuffer | null = null;
  let cleanupPath: string | null = null;
  const token = bearerToken(request);

  try {
    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as { path?: unknown; filename?: unknown };
      const path = typeof payload.path === "string" ? payload.path.trim() : "";
      if (!path) {
        return Response.json({ success: false, error: "No PDF path provided" }, { status: 400 });
      }
      if (!isSafeUserStoragePath(path, await userIdFromToken(token))) {
        return Response.json({ success: false, error: "Invalid PDF path" }, { status: 403 });
      }
      const downloaded = await downloadStoragePdf(path, token);
      fileBuffer = downloaded.buffer;
      filename =
        typeof payload.filename === "string" && payload.filename.trim()
          ? payload.filename.trim()
          : downloaded.filename;
      cleanupPath = path;
    } else {
      let incoming: FormData;
      try {
        incoming = await request.formData();
      } catch {
        return Response.json({ success: false, error: "Invalid form data" }, { status: 400 });
      }
      const file = incoming.get("file") ?? incoming.get("data");
      if (!(file instanceof Blob) || file.size <= 0) {
        return Response.json({ success: false, error: "No PDF file provided" }, { status: 400 });
      }
      filename = file instanceof File && file.name ? file.name : "document.pdf";
      fileBuffer = await file.arrayBuffer();
    }
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Could not read PDF." },
      { status: 400 },
    );
  }

  if (!fileBuffer || fileBuffer.byteLength <= 0) {
    return Response.json({ success: false, error: "No PDF file provided" }, { status: 400 });
  }

  let lastResponse: Response | null = null;

  for (const url of urls) {
    const outbound = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: "application/pdf" });
    // Keep both field names for n8n workflows that expect either `file` or `data`.
    outbound.append("file", blob, filename);
    outbound.append("data", blob, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      if (import.meta.env.DEV) {
        console.info(`[SnapCut] Forwarding PDF (${filename}, ${fileBuffer.byteLength} bytes) to n8n`);
      }

      const upstream = await fetch(encodeURI(url), {
        method: "POST",
        body: outbound,
        signal: controller.signal,
      });

      const upstreamType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const body = await upstream.arrayBuffer();

      lastResponse = new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: { "content-type": upstreamType },
      });

      if (upstream.ok || ![404, 405, 502, 503, 504].includes(upstream.status)) {
        if (cleanupPath) void removeStoragePaths([cleanupPath], token);
        return lastResponse;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return Response.json({ success: false, error: "Request timed out" }, { status: 504 });
      }
      console.error("[SnapCut] n8n PDF forward failed:", error);
      lastResponse = Response.json({ success: false, error: "Upstream error" }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (cleanupPath) void removeStoragePaths([cleanupPath], token);
  return lastResponse ?? Response.json({ success: false, error: "Conversion failed" }, { status: 502 });
}

export async function forwardPdfMergeToN8n(
  request: Request,
  webhookUrl: string | string[],
): Promise<Response> {
  if (!(await isAuthenticatedRequest(request))) {
    return Response.json({ success: false, error: "Sign in to merge PDFs." }, { status: 401 });
  }

  const urls = webhookCandidates(webhookUrl);
  if (!urls.length) {
    return Response.json({ success: false, error: "No webhook URL configured" }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const token = bearerToken(request);
  const allFiles: Array<{ blob: Blob; name: string }> = [];
  let cleanupPaths: string[] = [];

  try {
    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as { paths?: unknown };
      const paths = Array.isArray(payload.paths)
        ? payload.paths.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
        : [];
      if (!paths.length) {
        return Response.json({ success: false, error: "No PDF paths provided" }, { status: 400 });
      }
      const uid = await userIdFromToken(token);
      for (const path of paths) {
        if (!isSafeUserStoragePath(path, uid)) {
          return Response.json({ success: false, error: "Invalid PDF path" }, { status: 403 });
        }
        const downloaded = await downloadStoragePdf(path, token);
        allFiles.push({
          blob: new Blob([downloaded.buffer], { type: "application/pdf" }),
          name: downloaded.filename,
        });
      }
      cleanupPaths = paths;
    } else {
      let incoming: FormData;
      try {
        incoming = await request.formData();
      } catch {
        return Response.json({ success: false, error: "Invalid form data" }, { status: 400 });
      }
      for (const [key, value] of incoming.entries()) {
        if (value instanceof Blob && value.size > 0) {
          const filename = value instanceof File && value.name ? value.name : `${key}.pdf`;
          allFiles.push({ blob: value, name: filename });
        }
      }
    }
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Could not read PDFs." },
      { status: 400 },
    );
  }

  if (allFiles.length === 0) {
    return Response.json({ success: false, error: "No PDF files provided" }, { status: 400 });
  }

  let lastResponse: Response | null = null;

  for (const url of urls) {
    const outbound = new FormData();
    // Send each PDF once. Dual field names (`files` + `file_N`) made n8n
    // merge every file twice (e.g. 2+3+1 pages became 12 instead of 6).
    allFiles.forEach((fileItem, idx) => {
      outbound.append(`file_${idx + 1}`, fileItem.blob, fileItem.name);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      if (import.meta.env.DEV) {
        console.info(`[SnapCut] Forwarding ${allFiles.length} PDFs to n8n merge webhook`);
      }

      const upstream = await fetch(encodeURI(url), {
        method: "POST",
        body: outbound,
        signal: controller.signal,
      });

      const upstreamType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const body = await upstream.arrayBuffer();

      lastResponse = new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: { "content-type": upstreamType },
      });

      if (upstream.ok || ![404, 405, 502, 503, 504].includes(upstream.status)) {
        if (cleanupPaths.length) void removeStoragePaths(cleanupPaths, token);
        return lastResponse;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return Response.json({ success: false, error: "Request timed out" }, { status: 504 });
      }
      console.error("[SnapCut] n8n PDF merge forward failed:", error);
      lastResponse = Response.json({ success: false, error: "Upstream error" }, { status: 502 });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (cleanupPaths.length) void removeStoragePaths(cleanupPaths, token);
  return lastResponse ?? Response.json({ success: false, error: "Merge failed" }, { status: 502 });
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

async function userIdFromToken(token: string) {
  if (!token) return null;
  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

function isSafeUserStoragePath(path: string, userId: string | null) {
  if (!userId) return false;
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) return false;
  return path.startsWith(`${userId}/pdf-jobs/`);
}

async function downloadStoragePdf(path: string, token: string) {
  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey || !token) throw new Error("Storage is not configured.");
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.storage.from("snapcut-history").download(path);
  if (error || !data) throw new Error(error?.message || "Could not load uploaded PDF.");
  const buffer = await data.arrayBuffer();
  const filename = path.split("/").pop() || "document.pdf";
  return { buffer, filename: filename.replace(/^[0-9a-f-]{36}-/i, "") || "document.pdf" };
}

async function removeStoragePaths(paths: string[], token: string) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length || !token) return;
  const { url, anonKey } = getSupabasePublicConfig();
  if (!url || !anonKey) return;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.storage.from("snapcut-history").remove(unique);
}


