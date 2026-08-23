import { supabase } from "@/lib/supabase";
import { getUserFacingErrorMessage, ImageProcessingError } from "@/services/image-processing-service";

const REQUEST_TIMEOUT_MS = 120_000;
const GENERATE_ERROR = "Snapy couldn't generate that image. Please try again.";

export type SnapyGenerateInput = {
  voice?: Blob | null;
  prompt?: string;
};

export async function sendSnapyGenerate({ voice, prompt }: SnapyGenerateInput): Promise<Blob> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new ImageProcessingError("Please sign in to use Snapy.");
  }

  const text = prompt?.trim() ?? "";
  if (!text && !(voice && voice.size > 0)) {
    throw new ImageProcessingError("Describe the image you want, or record a voice prompt.");
  }

  const formData = new FormData();
  if (text) formData.append("prompt", text);
  if (voice && voice.size > 0) {
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

  try {
    const apiUrl = text
      ? `/api/snapy-edit?prompt=${encodeURIComponent(text)}`
      : "/api/snapy-edit";
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(text ? { "x-snapy-prompt": text } : {}),
      },
    });
    if (import.meta.env.DEV) {
      console.info("[SnapCut] Snapy /api/snapy-edit", response.status, response.headers.get("content-type"));
    }

    if (!response.ok) {
      if (response.status === 401) throw new ImageProcessingError("Please sign in to use Snapy.");
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

    return await response.blob();
  } catch (error) {
    throw new ImageProcessingError(getUserFacingErrorMessage(error, GENERATE_ERROR));
  } finally {
    clearTimeout(timeoutId);
  }
}
