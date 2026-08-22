export type ImageCount = 2 | 3 | 4;
export type GridThemeId =
  | "stack-2"
  | "grid-3x3"
  | "feature-tl"
  | "t-split"
  | "feature-br"
  | "pinwheel";
export type CollageThemeId = GridThemeId;
export type AspectRatioId = "4:5" | "1:1" | "16:9" | "9:16";

export type GridCell = {
  column: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
};

export type GridLayout = {
  id: GridThemeId;
  name: string;
  description: string;
  columns: number;
  rows: number;
  cells: GridCell[];
};

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 100, height: 100 };

export type CollageSlot = {
  id: string;
  imageUrl: string | null;
  crop: CropRect;
};

export type CollageSettings = {
  spacing: number;
  radius: number;
  aspectRatio: AspectRatioId;
  background: string;
};

export type CollageTheme = {
  id: CollageThemeId;
  name: string;
  description: string;
  preview: string | null;
  available: boolean;
};

export const GRID_LAYOUTS: GridLayout[] = [
  {
    id: "stack-2",
    name: "1 Up 1 Down",
    description: "One photo on top, one below",
    columns: 1,
    rows: 2,
    cells: [
      { column: 1, row: 1 },
      { column: 1, row: 2 },
    ],
  },
  {
    id: "grid-3x3",
    name: "3×3 Grid",
    description: "Nine equal squares",
    columns: 3,
    rows: 3,
    cells: Array.from({ length: 9 }, (_, index) => ({
      column: (index % 3) + 1,
      row: Math.floor(index / 3) + 1,
    })),
  },
  {
    id: "feature-tl",
    name: "Hero Left",
    description: "Large photo with a supporting strip",
    columns: 3,
    rows: 3,
    cells: [
      { column: 1, row: 1, colSpan: 2, rowSpan: 2 },
      { column: 3, row: 1 },
      { column: 3, row: 2 },
      { column: 1, row: 3 },
      { column: 2, row: 3 },
      { column: 3, row: 3 },
    ],
  },
  {
    id: "t-split",
    name: "T Split",
    description: "Two portraits over one landscape",
    columns: 2,
    rows: 2,
    cells: [
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 1, row: 2, colSpan: 2 },
    ],
  },
  {
    id: "feature-br",
    name: "Hero Right",
    description: "Three-up top with a large closer",
    columns: 3,
    rows: 3,
    cells: [
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1 },
      { column: 1, row: 2 },
      { column: 1, row: 3 },
      { column: 2, row: 2, colSpan: 2, rowSpan: 2 },
    ],
  },
  {
    id: "pinwheel",
    name: "Pinwheel",
    description: "Staggered seven-frame layout",
    columns: 3,
    rows: 3,
    cells: [
      { column: 1, row: 1 },
      { column: 2, row: 1 },
      { column: 3, row: 1, rowSpan: 2 },
      { column: 1, row: 2, rowSpan: 2 },
      { column: 2, row: 2 },
      { column: 2, row: 3 },
      { column: 3, row: 3 },
    ],
  },
];

export const COLLAGE_THEMES: CollageTheme[] = GRID_LAYOUTS.map((layout) => ({
  id: layout.id,
  name: layout.name,
  description: layout.description,
  preview: null,
  available: true,
}));

export function getGridLayout(theme: CollageThemeId): GridLayout | undefined {
  return GRID_LAYOUTS.find((layout) => layout.id === theme);
}

export function isGridTheme(theme: CollageThemeId): theme is GridThemeId {
  return Boolean(getGridLayout(theme));
}

export function slotCountForTheme(theme: CollageThemeId, count: ImageCount) {
  return getGridLayout(theme)?.cells.length ?? count;
}

export const ASPECT_RATIOS: Record<AspectRatioId, string> = {
  "4:5": "4 / 5",
  "1:1": "1 / 1",
  "16:9": "16 / 9",
  "9:16": "9 / 16",
};

export const COLLAGE_BACKGROUNDS = ["#FFFFFF", "#000000", "#4648d4", "#90CAF9", "gradient"] as const;

function createSlots(count: number): CollageSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `slot-${index + 1}`,
    imageUrl: null,
    crop: { ...FULL_CROP },
  }));
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export const demoCollageService = {
  slotsForCount(count: number): CollageSlot[] {
    return createSlots(count);
  },

  resizeSlots(current: CollageSlot[], count: number): CollageSlot[] {
    current.slice(count).forEach((slot) => revokeBlobUrl(slot.imageUrl));
    const next = createSlots(count);
    return next.map((slot, index) => ({
      ...slot,
      imageUrl: current[index]?.imageUrl ?? null,
      crop: current[index]?.crop ?? { ...FULL_CROP },
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
        if (slot && url) {
          revokeBlobUrl(slot.imageUrl);
          next[index] = { ...slot, imageUrl: url, crop: { ...FULL_CROP } };
        }
      }
      urls.slice(next.length).forEach(revokeBlobUrl);
      return next;
    }

    let cursor = 0;
    for (const slot of next) {
      if (!slot.imageUrl && cursor < urls.length) {
        slot.imageUrl = urls[cursor] ?? null;
        slot.crop = { ...FULL_CROP };
        cursor += 1;
      }
    }

    for (let index = 0; index < next.length && cursor < urls.length; index += 1) {
      const slot = next[index];
      const url = urls[cursor];
      if (slot && url) {
        revokeBlobUrl(slot.imageUrl);
        next[index] = { ...slot, imageUrl: url, crop: { ...FULL_CROP } };
        cursor += 1;
      }
    }

    urls.slice(cursor).forEach(revokeBlobUrl);
    return next;
  },

  defaultSettings(_theme: CollageThemeId): CollageSettings {
    return {
      spacing: 10,
      radius: 0,
      aspectRatio: "1:1",
      background: "#FFFFFF",
    };
  },

  async exportPng(input: {
    layout: GridLayout;
    slots: CollageSlot[];
    settings: CollageSettings;
    previewSize?: { width: number; height: number };
  }): Promise<Blob> {
    const [aw, ah] = input.settings.aspectRatio.split(":").map(Number);
    const ratioW = aw || 1;
    const ratioH = ah || 1;
    const longSide = 1800;
    const width = Math.max(1, ratioW >= ratioH ? longSide : Math.round((longSide * ratioW) / ratioH));
    const height = Math.max(1, ratioH >= ratioW ? longSide : Math.round((longSide * ratioH) / ratioW));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");

    paintCollageBackground(ctx, input.settings.background, width, height);

    const previewMin = Math.min(
      input.previewSize?.width || 640,
      input.previewSize?.height || 640,
    );
    const unit = Math.min(width, height) / Math.max(previewMin, 1);
    const gap = input.settings.spacing * unit;
    const padding = Math.max(input.settings.spacing, 8) * unit;
    const radius = input.settings.radius * unit;
    const { columns, rows, cells } = input.layout;
    const colSize = (width - padding * 2 - gap * Math.max(columns - 1, 0)) / columns;
    const rowSize = (height - padding * 2 - gap * Math.max(rows - 1, 0)) / rows;

    const images = await Promise.all(
      input.slots.map((slot) =>
        slot.imageUrl
          ? loadCollageImage(slot.imageUrl).catch(() => null)
          : Promise.resolve(null),
      ),
    );

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const slot = input.slots[index];
      if (!cell || !slot) continue;
      const colSpan = cell.colSpan ?? 1;
      const rowSpan = cell.rowSpan ?? 1;
      const x = padding + (cell.column - 1) * (colSize + gap);
      const y = padding + (cell.row - 1) * (rowSize + gap);
      const cellW = colSize * colSpan + gap * (colSpan - 1);
      const cellH = rowSize * rowSpan + gap * (rowSpan - 1);

      ctx.save();
      roundedRectPath(ctx, x, y, cellW, cellH, radius);
      ctx.clip();
      ctx.fillStyle = "#6B7280";
      ctx.fillRect(x, y, cellW, cellH);
      const image = images[index];
      if (image) {
        drawCroppedImage(ctx, image, x, y, cellW, cellH, slot.crop);
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

function paintCollageBackground(
  ctx: CanvasRenderingContext2D,
  background: string,
  width: number,
  height: number,
) {
  if (background === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#4648d4");
    gradient.addColorStop(1, "#90CAF9");
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = background || "#FFFFFF";
  }
  ctx.fillRect(0, 0, width, height);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  crop: CropRect | undefined,
) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih || !dw || !dh) return;
  const box = crop ?? FULL_CROP;
  const sx = (box.x / 100) * iw;
  const sy = (box.y / 100) * ih;
  const sw = Math.max(1, (box.width / 100) * iw);
  const sh = Math.max(1, (box.height / 100) * ih);
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

function loadCollageImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read a collage photo."));
    image.src = url;
  });
}
