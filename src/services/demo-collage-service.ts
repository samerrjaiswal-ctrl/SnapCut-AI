export type ImageCount = 2 | 3 | 4;
export type CollageThemeId = "editorial" | "scrapbook";
export type AspectRatioId = "4:5" | "1:1" | "16:9" | "9:16";

export type CollageSlot = {
  id: string;
  imageUrl: string | null;
  objectX: number;
  objectY: number;
};

export type CollageSettings = {
  spacing: number;
  radius: number;
  aspectRatio: AspectRatioId;
  background: string;
};

export type CollageTheme = {
  id: CollageThemeId | "coming-soon";
  name: string;
  description: string;
  preview: string | null;
  available: boolean;
};

export const COLLAGE_THEMES: CollageTheme[] = [
  {
    id: "editorial",
    name: "Editorial Grid",
    description: "4-frame studio layout",
    preview: "/templates/editorial-grid.png",
    available: true,
  },
  {
    id: "scrapbook",
    name: "Birthday Scrapbook",
    description: "Journal-style photo pages",
    preview: "/templates/scrapbook-birthday.png",
    available: true,
  },
  {
    id: "coming-soon",
    name: "Coming Soon",
    description: "More themed layouts on the way",
    preview: null,
    available: false,
  },
];

export const ASPECT_RATIOS: Record<AspectRatioId, string> = {
  "4:5": "4 / 5",
  "1:1": "1 / 1",
  "16:9": "16 / 9",
  "9:16": "9 / 16",
};

export const COLLAGE_BACKGROUNDS = ["#FFFFFF", "#000000", "#F1F5F9", "gradient"] as const;

export const SCRAPBOOK_FRAMES: Record<
  2 | 3 | 4,
  { top: string; left: string; width: string; height: string; rotate: string }[]
> = {
  2: [
    { top: "10%", left: "10%", width: "78%", height: "38%", rotate: "-3deg" },
    { top: "52%", left: "12%", width: "76%", height: "38%", rotate: "3deg" },
  ],
  3: [
    { top: "7%", left: "8%", width: "54%", height: "36%", rotate: "-5deg" },
    { top: "18%", left: "46%", width: "46%", height: "34%", rotate: "4deg" },
    { top: "54%", left: "14%", width: "70%", height: "36%", rotate: "-2deg" },
  ],
  4: [
    { top: "6%", left: "6%", width: "46%", height: "34%", rotate: "-6deg" },
    { top: "20%", left: "48%", width: "44%", height: "32%", rotate: "5deg" },
    { top: "46%", left: "5%", width: "44%", height: "36%", rotate: "-3deg" },
    { top: "54%", left: "48%", width: "46%", height: "34%", rotate: "2deg" },
  ],
};

function createSlots(count: number): CollageSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `slot-${index + 1}`,
    imageUrl: null,
    objectX: 50,
    objectY: 50,
  }));
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export const demoCollageService = {
  slotsForCount(count: ImageCount): CollageSlot[] {
    return createSlots(count);
  },

  resizeSlots(current: CollageSlot[], count: ImageCount): CollageSlot[] {
    const next = createSlots(count);
    return next.map((slot, index) => ({
      ...slot,
      imageUrl: current[index]?.imageUrl ?? null,
      objectX: current[index]?.objectX ?? 50,
      objectY: current[index]?.objectY ?? 50,
    }));
  },

  fillWithFiles(current: CollageSlot[], files: File[], startIndex?: number): CollageSlot[] {
    const images = files.filter(isImageFile);
    if (images.length === 0) return current;

    const urls = images.map((file) => URL.createObjectURL(file));
    const next = current.map((slot) => ({ ...slot }));

    if (typeof startIndex === "number") {
      for (let offset = 0; offset < urls.length && offset < next.length; offset += 1) {
        const index = (startIndex + offset) % next.length;
        const slot = next[index];
        const url = urls[offset];
        if (slot && url) next[index] = { ...slot, imageUrl: url };
      }
      return next;
    }

    let cursor = 0;
    for (const slot of next) {
      if (!slot.imageUrl && cursor < urls.length) {
        slot.imageUrl = urls[cursor] ?? null;
        cursor += 1;
      }
    }

    for (let index = 0; index < next.length && cursor < urls.length; index += 1) {
      const slot = next[index];
      const url = urls[cursor];
      if (slot && url) {
        next[index] = { ...slot, imageUrl: url };
        cursor += 1;
      }
    }

    return next;
  },

  defaultSettings(theme: CollageThemeId): CollageSettings {
    if (theme === "scrapbook") {
      return {
        spacing: 10,
        radius: 4,
        aspectRatio: "4:5",
        background: "#F4E6C8",
      };
    }
    return {
      spacing: 8,
      radius: 16,
      aspectRatio: "4:5",
      background: "#FFFFFF",
    };
  },

  async exportPng(node: HTMLElement): Promise<Blob> {
    const { width, height } = node.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");

    const bg = window.getComputedStyle(node).backgroundColor || "#ffffff";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const images = Array.from(node.querySelectorAll<HTMLImageElement>("img[data-collage-slot]"));
    for (const img of images) {
      const rect = img.getBoundingClientRect();
      const parent = node.getBoundingClientRect();
      const x = (rect.left - parent.left) * scale;
      const y = (rect.top - parent.top) * scale;
      const w = rect.width * scale;
      const h = rect.height * scale;
      const rotate = Number(img.dataset["rotate"] ?? "0");
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      try {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } catch {
        ctx.fillStyle = "#e5eeff";
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Export failed."));
      }, "image/png");
    });
  },
};
