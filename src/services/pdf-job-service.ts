import { supabase } from "@/lib/supabase";
import { HISTORY_BUCKET } from "@/services/history-service";

const PDF_MAX_BYTES = 40 * 1024 * 1024;

function newFileId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function validatePdfFile(file: File) {
  const okType =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!okType) throw new Error("Please upload a PDF file.");
  if (file.size <= 0) throw new Error("That PDF appears to be empty.");
  if (file.size > PDF_MAX_BYTES) {
    throw new Error("PDF is too large. Please use a file under 40 MB.");
  }
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) throw new Error("You need to be signed in to process PDFs.");
  return { userId, accessToken: data.session!.access_token };
}

export async function uploadPdfJobFile(file: File): Promise<{ path: string; accessToken: string }> {
  validatePdfFile(file);
  const { userId, accessToken } = await requireUserId();
  const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 80) || "document.pdf";
  const path = `${userId}/pdf-jobs/${newFileId()}-${safeName}`;
  const { error } = await supabase.storage.from(HISTORY_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: "application/pdf",
  });
  if (error) throw new Error(error.message || "Could not upload this PDF. Please try again.");
  return { path, accessToken };
}

export async function uploadPdfJobFiles(files: File[]): Promise<{ paths: string[]; accessToken: string }> {
  if (!files.length) throw new Error("Please add PDF files first.");
  let accessToken = "";
  const paths: string[] = [];
  for (const file of files) {
    const uploaded = await uploadPdfJobFile(file);
    accessToken = uploaded.accessToken;
    paths.push(uploaded.path);
  }
  return { paths, accessToken };
}

export async function cleanupPdfJobPaths(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  try {
    await supabase.storage.from(HISTORY_BUCKET).remove(unique);
  } catch {
    // Best-effort cleanup; conversion result still matters more.
  }
}
