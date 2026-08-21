import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { HistoryCategory } from "@/data/mock-history";

export const HISTORY_BUCKET = "snapcut-history";
const SIGNED_URL_TTL_SECONDS = 600;
const HISTORY_LIMIT = 50;

export type ProcessingHistoryRow = {
  id: string;
  user_id: string;
  operation_type: "remove_text" | "extract_text";
  original_file_name: string;
  original_file_path: string | null;
  result_file_path: string | null;
  extracted_text: string | null;
  status: "processing" | "completed" | "failed";
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type HistoryRecord = {
  id: string;
  name: string;
  date: string;
  createdAt: string;
  category: HistoryCategory;
  thumbnail: string;
  description: string;
  status: string;
  extractedText: string | null;
  originalPath: string | null;
  resultPath: string | null;
  originalUrl: string | null;
  resultUrl: string | null;
};

export type HistoryStats = {
  total: number;
  removeText: number;
  extractText: number;
};

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function buildUserFilePath(userId: string, folder: "remove-text" | "extract-text", file: File) {
  return `${userId}/${folder}/${crypto.randomUUID()}.${extensionFromFile(file)}`;
}

export async function uploadUserFile(path: string, file: Blob, contentType?: string) {
  const { error } = await supabase.storage.from(HISTORY_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: contentType || (file instanceof File ? file.type : "image/png"),
  });
  if (error) throw error;
  return path;
}

export async function getSignedFileUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(HISTORY_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    if (import.meta.env.DEV) console.error("[SnapCut] Signed URL failed:", error);
    return null;
  }
  return data.signedUrl;
}

async function mapRow(row: ProcessingHistoryRow): Promise<HistoryRecord> {
  const previewPath = row.operation_type === "remove_text" ? row.result_file_path : row.original_file_path;
  const thumbnail = await getSignedFileUrl(previewPath ?? row.original_file_path);

  return {
    id: row.id,
    name: row.original_file_name,
    date: format(new Date(row.created_at), "MMM d, yyyy"),
    createdAt: row.created_at,
    category: row.operation_type === "remove_text" ? "remove-text" : "image-to-text",
    thumbnail: thumbnail ?? "",
    description:
      row.operation_type === "extract_text"
        ? row.extracted_text?.trim()
          ? row.extracted_text.trim().slice(0, 80)
          : "Extracted text"
        : "Removed text from image",
    status: row.status,
    extractedText: row.extracted_text,
    originalPath: row.original_file_path,
    resultPath: row.result_file_path,
    originalUrl: null,
    resultUrl: null,
  };
}

export async function listHistory(userId: string, category: HistoryCategory | "all" = "all"): Promise<HistoryRecord[]> {
  let query = supabase
    .from("processing_history")
    .select(
      "id, user_id, operation_type, original_file_name, original_file_path, result_file_path, extracted_text, status, created_at, metadata",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (category === "remove-text") query = query.eq("operation_type", "remove_text");
  if (category === "image-to-text") query = query.eq("operation_type", "extract_text");
  if (category === "collage") return [];

  const { data, error } = await query;
  if (error) throw error;
  return Promise.all(((data ?? []) as ProcessingHistoryRow[]).map(mapRow));
}

export async function getHistoryStats(userId: string): Promise<HistoryStats> {
  const { data, error } = await supabase
    .from("processing_history")
    .select("operation_type")
    .eq("user_id", userId);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ operation_type: string }>;
  return {
    total: rows.length,
    removeText: rows.filter((row) => row.operation_type === "remove_text").length,
    extractText: rows.filter((row) => row.operation_type === "extract_text").length,
  };
}

export async function createHistoryRecord(input: {
  userId: string;
  operationType: "remove_text" | "extract_text";
  originalFileName: string;
  originalFilePath?: string | null;
  resultFilePath?: string | null;
  extractedText?: string | null;
  status?: "processing" | "completed" | "failed";
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("processing_history")
    .insert({
      user_id: input.userId,
      operation_type: input.operationType,
      original_file_name: input.originalFileName,
      original_file_path: input.originalFilePath ?? null,
      result_file_path: input.resultFilePath ?? null,
      extracted_text: input.extractedText ?? null,
      status: input.status ?? "completed",
      metadata: input.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHistoryItem(userId: string, item: HistoryRecord) {
  const { error } = await supabase.from("processing_history").delete().eq("id", item.id).eq("user_id", userId);
  if (error) throw error;

  const paths = [item.originalPath, item.resultPath].filter((path): path is string => Boolean(path));
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(HISTORY_BUCKET).remove(paths);
    if (storageError && import.meta.env.DEV) {
      console.error("[SnapCut] Storage cleanup failed:", storageError);
    }
  }
}

export async function saveCompletedOperation(input: {
  userId: string;
  operationType: "remove_text" | "extract_text";
  originalFile: File;
  resultBlob?: Blob | null;
  extractedText?: string | null;
}) {
  const folder = input.operationType === "remove_text" ? "remove-text" : "extract-text";
  const originalPath = buildUserFilePath(input.userId, folder, input.originalFile);
  await uploadUserFile(originalPath, input.originalFile, input.originalFile.type);

  let resultPath: string | null = null;
  if (input.resultBlob) {
    resultPath = `${input.userId}/${folder}/${crypto.randomUUID()}.png`;
    await uploadUserFile(resultPath, input.resultBlob, "image/png");
  }

  await createHistoryRecord({
    userId: input.userId,
    operationType: input.operationType,
    originalFileName: input.originalFile.name,
    originalFilePath: originalPath,
    resultFilePath: resultPath,
    extractedText: input.extractedText ?? null,
    status: "completed",
  });
}
