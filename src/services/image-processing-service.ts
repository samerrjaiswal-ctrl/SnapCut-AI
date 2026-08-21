const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ImageProcessingError) return error.message;
  return fallback;
}

export function validateImageFile(file: File | null | undefined): asserts file is File {
  if (!file) {
    throw new ImageProcessingError("Please select an image first.");
  }

  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const hasAllowedMime = Boolean(mime) && ALLOWED_MIME_TYPES.has(mime);
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!hasAllowedMime && !hasAllowedExtension) {
    throw new ImageProcessingError("Please upload a JPEG, PNG, or WebP image.");
  }

  if (file.size <= 0) {
    throw new ImageProcessingError("That file appears to be empty. Please choose another image.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageProcessingError("Image is too large. Please use a file under 10 MB.");
  }
}

function toUserFacingFetchError(error: unknown, fallback: string): ImageProcessingError {
  if (error instanceof ImageProcessingError) return error;

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ImageProcessingError("The request timed out. Please try again.");
  }

  if (error instanceof TypeError) {
    return new ImageProcessingError(
      "Unable to reach the processing service. Please check your connection and try again.",
    );
  }

  if (import.meta.env.DEV) {
    console.error("[SnapCut] Image processing failed:", error);
  }

  return new ImageProcessingError(fallback);
}

async function postImage(path: string, file: File): Promise<Response> {
  const formData = new FormData();
  formData.append("data", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(path, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function throwForHttpStatus(status: number, fallback: string): never {
  if (status === 404 || status === 503) {
    throw new ImageProcessingError(
      "The processing service isn’t available yet. Activate the n8n workflow and try again.",
    );
  }
  if (status === 504) {
    throw new ImageProcessingError("The request timed out. Please try again.");
  }
  if (status === 502) {
    throw new ImageProcessingError(
      "Unable to reach the processing service. Please check your connection and try again.",
    );
  }
  throw new ImageProcessingError(fallback);
}

export async function removeTextFromImage(file: File): Promise<Blob> {
  validateImageFile(file);

  try {
    const response = await postImage("/api/remove-text", file);

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error("[SnapCut] Text remover HTTP error:", response.status, response.statusText);
      }
      throwForHttpStatus(response.status, "Unable to process this image right now. Please try again.");
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new ImageProcessingError(
        "No image was returned. Check that the n8n workflow responds with the processed file.",
      );
    }

    const contentType = (blob.type || response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      if (import.meta.env.DEV) {
        console.error("[SnapCut] Text remover returned JSON instead of an image.");
      }
      throw new ImageProcessingError(
        "No image was returned. Check that the n8n workflow responds with the processed file.",
      );
    }

    if (contentType.startsWith("image/")) return blob;
    return new Blob([blob], { type: "image/png" });
  } catch (error) {
    throw toUserFacingFetchError(error, "Unable to process this image right now. Please try again.");
  }
}

type ExtractTextResponse = {
  success?: unknown;
  text?: unknown;
};

export async function extractTextFromImage(file: File): Promise<string> {
  validateImageFile(file);

  try {
    const response = await postImage("/api/extract-text", file);

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.error("[SnapCut] Text extractor HTTP error:", response.status, response.statusText);
      }
      throwForHttpStatus(response.status, "Unable to process this image right now. Please try again.");
    }

    let payload: ExtractTextResponse;
    try {
      payload = (await response.json()) as ExtractTextResponse;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[SnapCut] Text extractor returned invalid JSON:", error);
      }
      throw new ImageProcessingError("We received an unexpected response. Please try again.");
    }

    if (payload.success !== true) {
      throw new ImageProcessingError(
        "We couldn't extract text from that image. Please try another one.",
      );
    }

    if (typeof payload.text !== "string") {
      throw new ImageProcessingError("We received an unexpected response. Please try again.");
    }

    return payload.text;
  } catch (error) {
    throw toUserFacingFetchError(error, "Unable to process this image right now. Please try again.");
  }
}
