import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { FULL_CROP, type CropRect } from "@/services/demo-collage-service";

type CropEditorProps = {
  imageUrl: string;
  crop: CropRect;
  aspect: number;
  onApply: (crop: CropRect) => void;
  onCancel: () => void;
};

type Handle = "move" | "nw" | "ne" | "sw" | "se";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fittedCrop(slotAspect: number, imageAspect: number): CropRect {
  const ratio = slotAspect / Math.max(imageAspect, 0.01);
  let width = 100;
  let height = width / ratio;
  if (height > 100) {
    height = 100;
    width = height * ratio;
  }
  return {
    x: (100 - width) / 2,
    y: (100 - height) / 2,
    width,
    height,
  };
}

function isFullCrop(crop: CropRect) {
  return crop.x === 0 && crop.y === 0 && crop.width === 100 && crop.height === 100;
}

export function CropEditor({ imageUrl, crop, aspect, onApply, onCancel }: CropEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ left: 0, top: 0, width: 1, height: 1 });
  const [imageAspect, setImageAspect] = useState(1);
  const [draft, setDraft] = useState<CropRect>(crop);
  const drag = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    crop: CropRect;
  } | null>(null);

  useEffect(() => {
    const image = new Image();
    const measure = () => {
      const stage = stageRef.current;
      if (!stage || !image.naturalWidth) return;
      const rect = stage.getBoundingClientRect();
      const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const width = Math.max(1, image.naturalWidth * scale);
      const height = Math.max(1, image.naturalHeight * scale);
      const nextAspect = image.naturalWidth / image.naturalHeight;
      setImageAspect(nextAspect);
      setFrame({
        left: (rect.width - width) / 2,
        top: (rect.height - height) / 2,
        width,
        height,
      });
      setDraft((current) => (isFullCrop(current) ? fittedCrop(aspect, nextAspect) : current));
    };
    image.onload = measure;
    image.src = imageUrl;
    const observer = new ResizeObserver(measure);
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [aspect, imageUrl]);

  function startDrag(handle: Handle, event: PointerEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      crop: draft,
    };
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = ((event.clientX - drag.current.startX) / frame.width) * 100;
    const dy = ((event.clientY - drag.current.startY) / frame.height) * 100;
    const start = drag.current.crop;
    const ratio = aspect / Math.max(imageAspect, 0.01);

    if (drag.current.handle === "move") {
      setDraft({
        ...start,
        x: clamp(start.x + dx, 0, 100 - start.width),
        y: clamp(start.y + dy, 0, 100 - start.height),
      });
      return;
    }

    const growX = drag.current.handle.includes("e") ? dx : -dx;
    const nextWidth = clamp(start.width + growX, 12, 100);
    const nextHeight = nextWidth / ratio;
    let width = nextWidth;
    let height = nextHeight;
    if (height > 100) {
      height = 100;
      width = height * ratio;
    }

    const next = { ...start, width, height };
    if (drag.current.handle.includes("w")) {
      next.x = start.x + start.width - width;
    }
    if (drag.current.handle.includes("n")) {
      next.y = start.y + start.height - height;
    }
    next.x = clamp(next.x, 0, 100 - next.width);
    next.y = clamp(next.y, 0, 100 - next.height);
    next.width = clamp(next.width, 12, 100 - next.x);
    next.height = clamp(next.height, 12, 100 - next.y);
    setDraft(next);
  }

  function endDrag() {
    drag.current = null;
  }

  const box = {
    left: frame.left + (draft.x / 100) * frame.width,
    top: frame.top + (draft.y / 100) * frame.height,
    width: (draft.width / 100) * frame.width,
    height: (draft.height / 100) * frame.height,
  };

  function applyCrop() {
    onApply(draft);
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[120] flex h-[100dvh] max-h-[100dvh] flex-col bg-black touch-none"
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 touch-auto">
        <button
          type="button"
          className="shrink-0 min-h-11 px-3 rounded-lg font-label-md text-label-md text-white"
          onClick={onCancel}
        >
          Cancel
        </button>
        <p className="min-w-0 truncate text-center font-label-md text-label-md text-white/80">
          Drag to crop
        </p>
        <button
          type="button"
          className="hidden sm:inline-flex shrink-0 min-h-11 px-4 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md"
          onClick={applyCrop}
        >
          Apply
        </button>
      </div>

      <div ref={stageRef} className="relative z-0 min-h-0 flex-1 overflow-hidden mx-3">
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={{
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
          }}
        />
        <div
          className="absolute border-2 border-white cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
          }}
          onPointerDown={(event) => startDrag("move", event)}
        >
          {(["nw", "ne", "sw", "se"] as const).map((handle) => (
            <button
              key={handle}
              type="button"
              aria-label={`Resize ${handle}`}
              className="absolute h-8 w-8 sm:h-4 sm:w-4 bg-white rounded-sm"
              style={{
                top: handle.startsWith("n") ? -10 : undefined,
                bottom: handle.startsWith("s") ? -10 : undefined,
                left: handle.endsWith("w") ? -10 : undefined,
                right: handle.endsWith("e") ? -10 : undefined,
                cursor: `${handle}-resize`,
              }}
              onPointerDown={(event) => startDrag(handle, event)}
            />
          ))}
        </div>
      </div>

      <div className="relative z-20 shrink-0 bg-black px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] touch-auto">
        <button
          type="button"
          className="flex w-full min-h-12 items-center justify-center rounded-xl bg-secondary text-on-secondary font-label-md text-label-md"
          onClick={applyCrop}
        >
          Apply
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}

export function croppedImageStyle(crop: CropRect = FULL_CROP) {
  const width = Math.max(crop.width, 1);
  const height = Math.max(crop.height, 1);
  return {
    position: "absolute" as const,
    width: `${10000 / width}%`,
    height: `${10000 / height}%`,
    left: `${(-crop.x / width) * 100}%`,
    top: `${(-crop.y / height) * 100}%`,
    maxWidth: "none" as const,
    objectFit: "fill" as const,
  };
}
