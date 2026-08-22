import { type CSSProperties, type DragEvent, type RefObject } from "react";
import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";
import { croppedImageStyle } from "@/components/snapcut/crop-editor";
import {
  ASPECT_RATIOS,
  FULL_CROP,
  getGridLayout,
  type CollageSettings,
  type CollageSlot,
  type CollageThemeId,
  type GridLayout,
} from "@/services/demo-collage-service";

type CollageCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  theme: CollageThemeId;
  slots: CollageSlot[];
  settings: CollageSettings;
  selectedId: string | null;
  dragging: boolean;
  onSelect: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  onCrop: (id: string, aspect: number) => void;
  onDropFiles: (files: File[], slotId?: string) => void;
  onDragState: (dragging: boolean) => void;
};

export function CollageCanvas({
  canvasRef,
  theme,
  slots,
  settings,
  selectedId,
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

  const layout = getGridLayout(theme);
  const fill = collageFill(settings.background);

  return (
    <div
      className={cn(
        "flex-1 h-full min-h-[16rem] min-w-0 rounded-xl border border-outline-variant p-4 md:p-8 relative overflow-hidden",
        dragging && "ring-2 ring-secondary",
      )}
      style={{
        containerType: "size",
        display: "grid",
        placeItems: "center",
        background: fill,
      }}
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

      {layout ? (
        <GridBoard
          canvasRef={canvasRef}
          layout={layout}
          slots={slots}
          settings={settings}
          selectedId={selectedId}
          onSelect={onSelect}
          onUpload={onUpload}
          onDelete={onDelete}
          onCrop={onCrop}
          onDrop={handleDrop}
        />
      ) : null}
    </div>
  );
}

function aspectToNumber(aspect: string) {
  const [width, height] = aspect.split("/").map((part) => Number(part.trim()));
  if (!width || !height) return 1;
  return width / height;
}

function collageFill(background: string) {
  if (background === "gradient") {
    return "linear-gradient(135deg, #4648d4, #90CAF9)";
  }
  return background;
}

function fitBoardStyle(aspect: string): CSSProperties {
  const ratio = aspectToNumber(aspect);
  return {
    aspectRatio: String(ratio),
    width: `min(100%, 36rem, calc(100cqh * ${ratio}))`,
    maxWidth: "100%",
    maxHeight: "100%",
    height: "auto",
  };
}

function GridBoard({
  canvasRef,
  layout,
  slots,
  settings,
  selectedId,
  onSelect,
  onUpload,
  onDelete,
  onCrop,
  onDrop,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  layout: GridLayout;
  slots: CollageSlot[];
  settings: CollageSettings;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  onCrop: (id: string, aspect: number) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, slotId?: string) => void;
}) {
  return (
    <div
      ref={canvasRef}
      className="grid overflow-hidden box-border"
      style={{
        ...fitBoardStyle(ASPECT_RATIOS[settings.aspectRatio]),
        gap: `${settings.spacing}px`,
        padding: `${Math.max(settings.spacing, 8)}px`,
        background: collageFill(settings.background),
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        placeItems: "stretch",
      }}
    >
      {layout.cells.map((cell, index) => {
        const slot = slots[index];
        if (!slot) return null;
        return (
          <SlotView
            key={slot.id}
            slot={slot}
            selected={selectedId === slot.id}
            radius={settings.radius}
            style={{
              gridColumn: `${cell.column} / span ${cell.colSpan ?? 1}`,
              gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
            }}
            onSelect={() => onSelect(slot.id)}
            onUpload={() => onUpload(slot.id)}
            onDelete={() => onDelete(slot.id)}
            onCrop={(aspect) => onCrop(slot.id, aspect)}
            onDrop={(event) => onDrop(event, slot.id)}
          />
        );
      })}
    </div>
  );
}

export function GridThemePreview({ layout }: { layout: GridLayout }) {
  return (
    <div
      className="h-full w-full grid bg-white p-[6%]"
      style={{
        gap: "6%",
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
      }}
    >
      {layout.cells.map((cell, index) => (
        <span
          key={`${layout.id}-${index}`}
          className="block rounded-[2px] bg-[#6B7280]"
          style={{
            gridColumn: `${cell.column} / span ${cell.colSpan ?? 1}`,
            gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
          }}
        />
      ))}
    </div>
  );
}

function SlotView({
  slot,
  selected,
  radius,
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
  style?: CSSProperties;
  onSelect: () => void;
  onUpload: () => void;
  onDelete: () => void;
  onCrop: (aspect: number) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden group h-full w-full min-h-0 min-w-0 bg-[#6B7280]",
        selected && "ring-2 ring-secondary",
      )}
      style={{ borderRadius: `${radius}px`, ...style }}
      onClick={onSelect}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {slot.imageUrl ? (
        <>
          <img
            src={slot.imageUrl}
            alt=""
            draggable={false}
            data-collage-slot="true"
            className="pointer-events-none select-none"
            style={croppedImageStyle(slot.crop ?? FULL_CROP)}
          />
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              type="button"
              className="bg-[#90CAF9] text-on-surface p-2 rounded-full shadow-md hover:bg-[#64B5F6]"
              aria-label="Crop"
              onClick={(event) => {
                event.stopPropagation();
                const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                onCrop(rect && rect.height ? rect.width / rect.height : 1);
              }}
            >
              <Icon name="crop" size={18} />
            </button>
            <button
              type="button"
              className="bg-surface-container-lowest text-error p-2 rounded-full shadow-md hover:bg-error-container"
              aria-label="Delete"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Icon name="delete" size={18} />
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpload();
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center text-outline hover:bg-primary/5"
        >
          <Icon name="add_photo_alternate" size={20} />
          <span className="font-label-md text-label-md leading-tight text-[10px] text-white/90">
            Upload
          </span>
        </button>
      )}
    </div>
  );
}
