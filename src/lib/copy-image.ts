async function toPngBlob(source: Blob): Promise<Blob> {
  if (source.type === "image/png" && source.size > 0) return source;
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(bitmap.width, 1);
    canvas.height = Math.max(bitmap.height, 1);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this image to copy.");
    context.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => (next ? resolve(next) : reject(new Error("Could not convert this image to copy."))),
        "image/png",
      );
    });
    return png;
  } finally {
    bitmap.close();
  }
}

export async function copyImageFromLoader(load: () => Promise<Blob>) {
  if (!navigator.clipboard?.write) {
    throw new Error("Clipboard is not available in this browser.");
  }
  const pngPromise = load().then(toPngBlob);
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngPromise })]);
  } catch {
    const png = await pngPromise;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
  }
}
