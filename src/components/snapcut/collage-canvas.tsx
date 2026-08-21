import { type CSSProperties, type DragEvent, type RefObject } from "react";
import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";
import {
  ASPECT_RATIOS,
  SCRAPBOOK_FRAMES,
  type CollageSettings,
  type CollageSlot,
  type CollageThemeId,
  type ImageCount,
} from "@/services/demo-collage-service";

type CollageCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  theme: CollageThemeId;
  count: ImageCount;
  slots: CollageSlot[];
  settings: CollageSettings;
  selectedId: string | null;
  cropping: boolean;
  dragging: boolean;
  onSelect: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  onCrop: (id: string) => void;
  onDropFiles: (files: File[], slotId?: string) => void;
  onDragState: (dragging: boolean) => void;
};

export function CollageCanvas({
  canvasRef,
  theme,
  count,
  slots,
  settings,
  selectedId,
  cropping,
  dragging,
  onSelect,
  onUpload,
  onDelete,
  onCrop,
  onDropFiles,
  onDragState,
}: CollageCanvasProps) {
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    onDragState(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, slotId?: string) {
    event.preventDefault();
    event.stopPropagation();
    onDragState(false);
    const files = Array.from(event.dataTransfer.files);
    onDropFiles(files, slotId);
  }

  const aspect = theme === "scrapbook" ? "4 / 5" : ASPECT_RATIOS[settings.aspectRatio];

  return (
    <div
      className={cn(
        "flex-1 rounded-xl border border-outline-variant p-4 md:p-8 flex items-center justify-center overflow-auto relative",
        theme === "scrapbook" ? "bg-[#d7c4a3]" : "bg-surface-container-low",
        dragging && "ring-2 ring-secondary",
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => onDragState(false)}
      onDrop={(event) => handleDrop(event)}
    >
      {dragging ? (
        <div className="absolute inset-4 z-20 rounded-xl border-2 border-dashed border-secondary bg-secondary/10 flex items-center justify-center pointer-events-none">
          <p className="font-label-md text-label-md text-secondary">
            Drop images to fill this collage
          </p>
        </div>
      ) : null}

      {theme === "scrapbook" ? (
        <ScrapbookBoard
          canvasRef={canvasRef}
          count={count}
          slots={slots}
          selectedId={selectedId}
          cropping={cropping}
          onSelect={onSelect}
          onUpload={onUpload}
          onDelete={onDelete}
          onCrop={onCrop}
          onDrop={handleDrop}
        />
      ) : (
        <div
          ref={canvasRef}
          className="w-full max-w-lg grid"
          style={{
            aspectRatio: aspect,
            gap: `${settings.spacing}px`,
            padding: `${settings.spacing}px`,
            borderRadius: `${Math.max(settings.radius, 12)}px`,
            background:
              settings.background === "gradient"
                ? "linear-gradient(135deg, #4648d4, #bec6e0)"
                : settings.background,
            gridTemplateColumns: count === 2 ? "1fr" : "1.15fr 1fr",
            gridTemplateRows: count === 2 ? "1fr 1fr" : count === 3 ? "1fr 1fr" : "1.2fr 1fr 1fr",
          }}
        >
          {slots.map((slot, index) => (
            <SlotView
              key={slot.id}
              slot={slot}
              selected={selectedId === slot.id}
              radius={settings.radius}
              cropping={cropping && selectedId === slot.id}
              style={editorialSlotStyle(count, index)}
              onSelect={() => onSelect(slot.id)}
              onUpload={() => onUpload(slot.id)}
              onDelete={() => onDelete(slot.id)}
              onCrop={() => onCrop(slot.id)}
              onDrop={(event) => handleDrop(event, slot.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function editorialSlotStyle(count: ImageCount, index: number): CSSProperties {
  if (count === 2) return { gridColumn: "1", gridRow: String(index + 1) };
  if (count === 3) {
    if (index === 0) return { gridColumn: "1", gridRow: "1 / -1" };
    if (index === 1) return { gridColumn: "2", gridRow: "1" };
    return { gridColumn: "2", gridRow: "2" };
  }
  if (index === 0) return { gridColumn: "1 / -1", gridRow: "1" };
  if (index === 1) return { gridColumn: "1", gridRow: "2 / -1" };
  if (index === 2) return { gridColumn: "2", gridRow: "2" };
  return { gridColumn: "2", gridRow: "3" };
}

function ScrapbookBoard({
  canvasRef,
  count,
  slots,
  selectedId,
  cropping,
  onSelect,
  onUpload,
  onDelete,
  onCrop,
  onDrop,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  count: ImageCount;
  slots: CollageSlot[];
  selectedId: string | null;
  cropping: boolean;
  onSelect: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  onCrop: (id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, slotId?: string) => void;
}) {
  const frames = SCRAPBOOK_FRAMES[count];

  return (
    <div
      ref={canvasRef}
      className="relative w-full max-w-lg overflow-hidden shadow-sm"
      style={{
        aspectRatio: "4 / 5",
        background:
          "linear-gradient(90deg, #6b4f32 0 18px, transparent 18px), linear-gradient(180deg, #efe2c4 0%, #e7d3a8 48%, #d9c7a1 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-40 pointer-events-none scrapbook-script" />
      <div className="absolute top-4 right-6 flex gap-1 pointer-events-none">
        {["#E8C9A2", "#F3D7B5", "#E7B98A", "#F6E0B8", "#D9A066"].map((color) => (
          <span
            key={color}
            className="w-5 h-6"
            style={{
              background: color,
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)",
            }}
          />
        ))}
      </div>
      <div className="absolute top-6 left-8 text-[#c4b4e0] text-2xl pointer-events-none">✦</div>
      <div className="absolute top-10 left-14 text-[#f0c3d2] text-xl pointer-events-none">✦</div>
      <div className="absolute top-[18%] right-6 bg-[#e8d5b0] px-2 py-1 text-[11px] tracking-widest font-mono rotate-2 shadow-sm">
        December 30
      </div>
      <div className="absolute right-[28%] top-[46%] text-red-500 text-lg pointer-events-none">
        ♥
      </div>
      <div className="absolute right-[22%] top-[49%] text-rose-400 text-sm pointer-events-none">
        ♥
      </div>
      <div className="absolute left-6 bottom-16 bg-[#efe3c6] px-2 py-1 text-[12px] font-mono -rotate-2 shadow-sm">
        Happy
      </div>
      <div className="absolute left-8 bottom-10 bg-[#efe3c6] px-2 py-1 text-[12px] font-mono rotate-1 shadow-sm">
        Birthday!
      </div>
      <div
        className="absolute left-10 bottom-3 text-3xl text-[#5c3d24] italic pointer-events-none"
        style={{ fontFamily: "Georgia, 'Palatino Linotype', serif" }}
      >
        Olivia
      </div>
      <div className="absolute left-[42%] bottom-8 w-8 h-8 rounded-sm bg-[#5fa38a] border-2 border-[#c45c5c] pointer-events-none" />

      {slots.map((slot, index) => {
        const frame = frames[index];
        if (!frame) return null;
        return (
          <div
            key={slot.id}
            className="absolute"
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
              transform: `rotate(${frame.rotate})`,
            }}
          >
            <SlotView
              slot={slot}
              selected={selectedId === slot.id}
              radius={2}
              cropping={cropping && selectedId === slot.id}
              rotate={Number.parseFloat(frame.rotate)}
              framed
              onSelect={() => onSelect(slot.id)}
              onUpload={() => onUpload(slot.id)}
              onDelete={() => onDelete(slot.id)}
              onCrop={() => onCrop(slot.id)}
              onDrop={(event) => onDrop(event, slot.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function SlotView({
  slot,
  selected,
  radius,
  cropping,
  rotate = 0,
  framed = false,
  style,
  onSelect,
  onUpload,
  onDelete,
  onCrop,
  onDrop,
}: {
  slot: CollageSlot;
  selected: boolean;
  radius: number;
  cropping: boolean;
  rotate?: number;
  framed?: boolean;
  style?: CSSProperties;
  onSelect: () => void;
  onUpload: () => void;
  onDelete: () => void;
  onCrop: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden group min-h-[88px] h-full w-full",
        framed
          ? "bg-white p-1.5 shadow-md"
          : "border border-dashed border-outline-variant bg-surface-container",
        selected && "ring-2 ring-secondary",
      )}
      style={{ borderRadius: framed ? 2 : `${radius}px`, ...style }}
      onClick={onSelect}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {slot.imageUrl ? (
        <>
          <img
            src={slot.imageUrl}
            alt=""
            data-collage-slot="true"
            data-rotate={String(rotate)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${slot.objectX}% ${slot.objectY}%`,
              inset: framed ? "6px" : 0,
              width: framed ? "calc(100% - 12px)" : "100%",
              height: framed ? "calc(100% - 12px)" : "100%",
              left: framed ? 6 : 0,
              top: framed ? 6 : 0,
            }}
          />
          <div className="absolute inset-0 bg-primary/20 hidden group-hover:flex items-center justify-center gap-2">
            <button
              type="button"
              className="bg-surface-container-lowest text-on-surface p-2 rounded-full hover:bg-surface"
              aria-label="Crop"
              onClick={(e) => {
                e.stopPropagation();
                onCrop();
              }}
            >
              <Icon name="crop" size={18} />
            </button>
            <button
              type="button"
              className="bg-surface-container-lowest text-error p-2 rounded-full hover:bg-error-container"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Icon name="delete" size={18} />
            </button>
          </div>
          {cropping ? (
            <div className="absolute inset-2 border-2 border-dashed border-secondary pointer-events-none" />
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpload();
          }}
          className="absolute inset-0 flex items-center justify-center text-outline hover:bg-primary/5"
        >
          <span className="flex flex-col items-center gap-2">
            <Icon name="add_photo_alternate" size={28} />
            <span className="font-label-md text-label-md text-primary bg-surface-container-lowest px-3 py-1 rounded-full">
              Drop or upload
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
