const REQUEST_TIMEOUT_MS = 90_000;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function forwardImageToN8n(request: Request, webhookUrl: string): Promise<Response> {
  if (!webhookUrl) {
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

  const outbound = new FormData();
  const filename = file instanceof File && file.name ? file.name : "image.png";
  outbound.append("data", file, filename);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(encodeURI(webhookUrl), {
      method: "POST",
      body: outbound,
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    if (isAbortError(error)) {
      return Response.json({ success: false }, { status: 504 });
    }
    console.error("[SnapCut] n8n forward failed:", error);
    return Response.json({ success: false }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
