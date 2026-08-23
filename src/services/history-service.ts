import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { HistoryCategory } from "@/data/mock-history";

export const HISTORY_BUCKET = "snapcut-history";
const SIGNED_URL_TTL_SECONDS = 3600;
const HISTORY_LIMIT = 50;
const HISTORY_MAX_BYTES = 8 * 1024 * 1024;

function newFileId() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  const version = bytes[6] ?? 0;
  const variant = bytes[8] ?? 0;
  bytes[6] = (version & 0x0f) | 0x40;
  bytes[8] = (variant & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sniffImageType(bytes: Uint8Array): { contentType: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" } {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", ext: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return { contentType: "image/webp", ext: "webp" };
  }
  return { contentType: "image/png", ext: "png" };
}

async function uploadBlob(
  path: string,
  blob: Blob,
  contentType: string,
) {
  const { error } = await supabase.storage.from(HISTORY_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });
  if (error) throw error;
  return path;
}

async function uploadPreparedImage(
  userId: string,
  folder: "remove-text" | "extract-text" | "collage" | "snapy",
  source: Blob,
) {
  const buffer = await source.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const sniffed = sniffImageType(bytes);
  let blob = new Blob([buffer], { type: sniffed.contentType });
  let contentType = sniffed.contentType;
  let ext = sniffed.ext;

  if (blob.size > HISTORY_MAX_BYTES) {
    blob = await toJpegBlob(new Blob([buffer]), 0.72, 1600);
    contentType = "image/jpeg";
    ext = "jpg";
  }

  const path = `${userId}/${folder}/${newFileId()}.${ext}`;
  try {
    return await uploadBlob(path, blob, contentType);
  } catch (error) {
    const jpeg = await toJpegBlob(new Blob([buffer]), 0.8, 1920);
    const fallbackPath = `${userId}/${folder}/${newFileId()}.jpg`;
    try {
      return await uploadBlob(fallbackPath, jpeg, "image/jpeg");
    } catch {
      throw error;
    }
  }
}

async function toJpegBlob(source: Blob, quality: number, maxDim: number) {
  const bitmap = await createImageBitmap(source);
  let { width, height } = bitmap;
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(width, 1);
  canvas.height = Math.max(height, 1);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this image for History.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const jpeg = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not compress this image for History."))),
      "image/jpeg",
      quality,
    );
  });
  return jpeg;
}

async function resolveUserId(fallback?: string) {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id || fallback || null;
}

export type ProcessingHistoryRow = {
  id: string;
  user_id: string;
  operation_type: "remove_text" | "extract_text" | "collage" | "snapy";
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
  collages: number;
  snapy: number;
};

export async function uploadUserFile(path: string, file: Blob, contentType?: string) {
  const buffer = await file.arrayBuffer();
  const sniffed = sniffImageType(new Uint8Array(buffer));
  return uploadBlob(path, new Blob([buffer], { type: sniffed.contentType }), contentType || sniffed.contentType);
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

export async function downloadHistoryFile(path: string) {
  const { data, error } = await supabase.storage.from(HISTORY_BUCKET).download(path);
  if (error) throw error;
  return data;
}

function extensionFromPath(path: string) {
  const name = path.split("/").pop() || "";
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (ext && ["jpg", "png", "webp"].includes(ext)) return ext;
  return "png";
}

export function downloadFileName(itemName: string, path: string | null) {
  const base = itemName.replace(/\.[^.]+$/, "") || "snapcut-file";
  return `${base}.${path ? extensionFromPath(path) : "png"}`;
}

async function signedUrlMap(paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const map = new Map<string, string>();
  if (!unique.length) return map;

  const signed = await Promise.all(unique.map(async (path) => [path, await getSignedFileUrl(path)] as const));
  for (const [path, url] of signed) {
    if (url) map.set(path, url);
  }
  return map;
}

function categoryFromOperation(type: ProcessingHistoryRow["operation_type"]): HistoryCategory {
  if (type === "remove_text") return "remove-text";
  if (type === "extract_text") return "image-to-text";
  if (type === "snapy") return "snapy";
  return "collage";
}

function descriptionFromRow(row: ProcessingHistoryRow) {
  if (row.operation_type === "extract_text") {
    return row.extracted_text?.trim() ? row.extracted_text.trim().slice(0, 80) : "Extracted text";
  }
  if (row.operation_type === "collage") return "Created collage";
  if (row.operation_type === "snapy") return "Generated with Snapy";
  return "Removed text from image";
}

function previewPathForRow(row: ProcessingHistoryRow) {
  if (row.operation_type === "collage" || row.operation_type === "snapy") return row.result_file_path;
  if (row.operation_type === "extract_text") return row.original_file_path ?? row.result_file_path;
  return row.result_file_path ?? row.original_file_path;
}

function mapRow(row: ProcessingHistoryRow, urls: Map<string, string>): HistoryRecord {
  const previewPath = previewPathForRow(row);
  return {
    id: row.id,
    name: row.original_file_name,
    date: format(new Date(row.created_at), "MMM d, yyyy · h:mm a"),
    createdAt: row.created_at,
    category: categoryFromOperation(row.operation_type),
    thumbnail: (previewPath && urls.get(previewPath)) || "",
    description: descriptionFromRow(row),
    status: row.status,
    extractedText: row.extracted_text,
    originalPath: row.original_file_path,
    resultPath: row.result_file_path,
    originalUrl: (row.original_file_path && urls.get(row.original_file_path)) || null,
    resultUrl: (row.result_file_path && urls.get(row.result_file_path)) || null,
  };
}

export async function listHistory(
  userId: string,
  category: HistoryCategory | "all" = "all",
  limit = HISTORY_LIMIT,
): Promise<HistoryRecord[]> {
  const ownerId = await resolveUserId(userId);
  if (!ownerId) throw new Error("You need to be signed in to view History.");

  let query = supabase
    .from("processing_history")
    .select(
      "id, user_id, operation_type, original_file_name, original_file_path, result_file_path, extracted_text, status, created_at, metadata",
    )
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category === "remove-text") query = query.eq("operation_type", "remove_text");
  if (category === "image-to-text") query = query.eq("operation_type", "extract_text");
  if (category === "collage") query = query.eq("operation_type", "collage");
  if (category === "snapy") query = query.eq("operation_type", "snapy");

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as ProcessingHistoryRow[];
  return rows.map((row) => mapRow(row, new Map()));
}

export async function getHistoryStats(userId: string): Promise<HistoryStats> {
  const ownerId = await resolveUserId(userId);
  if (!ownerId) {
    return { total: 0, removeText: 0, extractText: 0, collages: 0, snapy: 0 };
  }
  const { data, error } = await supabase
    .from("processing_history")
    .select("operation_type")
    .eq("user_id", ownerId);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ operation_type: string }>;
  return {
    total: rows.length,
    removeText: rows.filter((row) => row.operation_type === "remove_text").length,
    extractText: rows.filter((row) => row.operation_type === "extract_text").length,
    collages: rows.filter((row) => row.operation_type === "collage").length,
    snapy: rows.filter((row) => row.operation_type === "snapy").length,
  };
}

function previewPathForRecord(item: HistoryRecord) {
  if (item.category === "collage" || item.category === "snapy") return item.resultPath;
  if (item.category === "image-to-text") return item.originalPath ?? item.resultPath;
  return item.resultPath ?? item.originalPath;
}

export async function signHistoryRecords(items: HistoryRecord[]): Promise<HistoryRecord[]> {
  if (!items.length) return items;
  const urls = await signedUrlMap(
    items.flatMap((item) => [item.originalPath, item.resultPath, previewPathForRecord(item)]),
  );
  return items.map((item) => {
    const previewPath = previewPathForRecord(item);
    return {
      ...item,
      thumbnail: (previewPath && urls.get(previewPath)) || item.thumbnail,
      originalUrl: (item.originalPath && urls.get(item.originalPath)) || null,
      resultUrl: (item.resultPath && urls.get(item.resultPath)) || null,
    };
  });
}

export async function createHistoryRecord(input: {
  userId: string;
  operationType: "remove_text" | "extract_text" | "collage" | "snapy";
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
  userId?: string;
  operationType: "remove_text" | "extract_text" | "collage";
  originalFile: File;
  resultBlob?: Blob | null;
  extractedText?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const userId = await resolveUserId(input.userId);
  if (!userId) {
    throw new Error("You need to be signed in to save this to History.");
  }

  const folder =
    input.operationType === "remove_text"
      ? "remove-text"
      : input.operationType === "extract_text"
        ? "extract-text"
        : "collage";

  const errors: string[] = [];
  let originalPath: string | null = null;
  let resultPath: string | null = null;

  if (input.resultBlob && input.resultBlob.size > 0) {
    try {
      resultPath = await uploadPreparedImage(userId, folder, input.resultBlob);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Could not upload the cleaned image.");
      if (import.meta.env.DEV) console.error("[SnapCut] Result history upload failed:", error);
    }
  }

  try {
    originalPath = await uploadPreparedImage(userId, folder, input.originalFile);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Could not upload the original image.");
    if (import.meta.env.DEV) console.error("[SnapCut] Original history upload failed:", error);
  }

  if (input.operationType === "remove_text" && (!originalPath || !resultPath)) {
    throw new Error(errors[0] || "Could not save this result to History.");
  }
  if (input.operationType === "extract_text" && !input.extractedText && !originalPath) {
    throw new Error(errors[0] || "Could not save this result to History.");
  }
  if (input.operationType === "collage" && !resultPath) {
    throw new Error(errors[0] || "Could not save this result to History.");
  }

  await createHistoryRecord({
    userId,
    operationType: input.operationType,
    originalFileName: input.originalFile.name,
    originalFilePath: originalPath,
    resultFilePath: resultPath,
    extractedText: input.extractedText ?? null,
    status: "completed",
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}

export async function saveCollageResult(input: {
  userId?: string;
  fileName: string;
  resultBlob: Blob;
  metadata?: Record<string, unknown>;
}) {
  const userId = await resolveUserId(input.userId);
  if (!userId) {
    throw new Error("You need to be signed in to save this to History.");
  }

  const resultPath = await uploadPreparedImage(userId, "collage", input.resultBlob);
  await createHistoryRecord({
    userId,
    operationType: "collage",
    originalFileName: input.fileName,
    originalFilePath: null,
    resultFilePath: resultPath,
    status: "completed",
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  return resultPath;
}

export async function saveSnapyResult(input: {
  userId?: string;
  prompt?: string;
  resultBlob: Blob;
}) {
  const userId = await resolveUserId(input.userId);
  if (!userId) {
    throw new Error("You need to be signed in to save this to History.");
  }

  const prompt = input.prompt?.trim() || "Snapy image";
  const resultPath = await uploadPreparedImage(userId, "snapy", input.resultBlob);
  await createHistoryRecord({
    userId,
    operationType: "snapy",
    originalFileName: prompt.slice(0, 80),
    originalFilePath: null,
    resultFilePath: resultPath,
    status: "completed",
    metadata: { prompt, source: "snapy" },
  });
  return resultPath;
}
