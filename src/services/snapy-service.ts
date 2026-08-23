import { supabase } from "@/lib/supabase";
import { getUserFacingErrorMessage, ImageProcessingError } from "@/services/image-processing-service";

const REQUEST_TIMEOUT_MS = 120_000;
const GENERATE_ERROR = "Snapy couldn't generate that image. Please try again.";

export type SnapyGenerateInput = {
  voice?: Blob | null;
  prompt?: string;
  signal?: AbortSignal;
};

export class SnapyCancelledError extends ImageProcessingError {
  constructor() {
    super("Generation stopped.");
    this.name = "SnapyCancelledError";
  }
}

export function isSnapyCancelled(error: unknown) {
  return (
    error instanceof SnapyCancelledError ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export async function sendSnapyGenerate({ voice, prompt, signal }: SnapyGenerateInput): Promise<Blob> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const text = prompt?.trim() ?? "";
  if (!text && !(voice && voice.size > 0)) {
    throw new ImageProcessingError("Describe the image you want, or record a voice prompt.");
  }

  const formData = new FormData();
  if (text) formData.append("prompt", text);
  // Voice-as-text: if we already have words, send only the prompt. Browser WebM
  // often fails n8n transcription and comes back with no image.
  if (!text && voice && voice.size > 0) {
    const voiceType = voice.type || "audio/webm";
    const voiceName =
      voice instanceof File && voice.name
        ? voice.name
        : voiceType.includes("mp4")
          ? "voice.mp4"
          : voiceType.includes("ogg")
            ? "voice.ogg"
            : "voice.webm";
    const voiceFile = voice instanceof File ? voice : new File([voice], voiceName, { type: voiceType });
    formData.append("voice_message", voiceFile);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    if (signal?.aborted) throw new SnapyCancelledError();
    const apiUrl = text
      ? `/api/snapy-edit?prompt=${encodeURIComponent(text)}`
      : "/api/snapy-edit";
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(text ? { "x-snapy-prompt": text } : {}),
      },
    });
    if (import.meta.env.DEV) {
      console.info("[SnapCut] Snapy /api/snapy-edit", response.status, response.headers.get("content-type"));
    }

    if (!response.ok) {
      if (response.status === 499) throw new SnapyCancelledError();
      if (response.status === 404 || response.status === 503) {
        throw new ImageProcessingError(
          "Snapy isn’t available yet. Activate the n8n workflow and try again.",
        );
      }
      if (response.status === 504) {
        throw new ImageProcessingError("Snapy timed out. Please try again.");
      }
      throw new ImageProcessingError(GENERATE_ERROR);
    }

    const blob = await response.blob();
    const contentType = (blob.type || response.headers.get("content-type") || "").toLowerCase();
    if (!blob.size || contentType.includes("application/json") || contentType.includes("text/")) {
      throw new ImageProcessingError(GENERATE_ERROR);
    }
    const rawType = (contentType.split(";")[0] ?? "").trim();
    const imageType =
      rawType === "image/jpg" ? "image/jpeg" : rawType.startsWith("image/") ? rawType : "image/png";
    return new Blob([blob], { type: imageType });
  } catch (error) {
    if (signal?.aborted || isSnapyCancelled(error)) throw new SnapyCancelledError();
    throw new ImageProcessingError(getUserFacingErrorMessage(error, GENERATE_ERROR));
  } finally {
    signal?.removeEventListener("abort", onAbort);
    clearTimeout(timeoutId);
  }
}
