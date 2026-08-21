import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { CollageCanvas } from "@/components/snapcut/collage-canvas";
import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";
import {
  COLLAGE_BACKGROUNDS,
  COLLAGE_THEMES,
  demoCollageService,
  type AspectRatioId,
  type CollageSettings,
  type CollageSlot,
  type CollageThemeId,
  type ImageCount,
} from "@/services/demo-collage-service";

export const Route = createFileRoute("/collage-maker")({
  component: CollageMakerPage,
  head: () => ({
    meta: [{ title: "Collage Maker | SnapCut AI" }],
  }),
});

function CollageMakerPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<string | null>(null);
  const [count, setCount] = useState<ImageCount>(4);
  const [theme, setTheme] = useState<CollageThemeId>("editorial");
  const [slots, setSlots] = useState<CollageSlot[]>(() => demoCollageService.slotsForCount(4));
  const [settings, setSettings] = useState<CollageSettings>(() =>
    demoCollageService.defaultSettings("editorial"),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;

  function applyCount(next: ImageCount) {
    setCount(next);
    setSlots((current) => demoCollageService.resizeSlots(current, next));
    setSelectedId(null);
    setCropping(false);
  }

  function applyTheme(next: CollageThemeId) {
    setTheme(next);
    setSettings(demoCollageService.defaultSettings(next));
  }

  function pickFiles(slotId?: string) {
    pendingSlot.current = slotId ?? null;
    fileInputRef.current?.click();
  }

  function addFiles(files: File[], slotId?: string) {
    if (files.length === 0) return;
    const startIndex = slotId ? slots.findIndex((slot) => slot.id === slotId) : -1;
    setSlots((current) =>
      startIndex >= 0
        ? demoCollageService.fillWithFiles(current, files, startIndex)
        : demoCollageService.fillWithFiles(current, files),
    );
    toast.message(
      files.length === 1 ? "Added 1 photo." : `Added ${files.length} photos to the collage.`,
    );
  }

  function deleteSlot(slotId: string) {
    setSlots((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, imageUrl: null } : slot)),
    );
    if (selectedId === slotId) setSelectedId(null);
    setCropping(false);
  }

  async function exportCollage() {
    if (!canvasRef.current) return;
    try {
      const blob = await demoCollageService.exportPng(canvasRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "snapcut-collage.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Collage exported.");
    } catch {
      toast.error("Export failed. Try using locally uploaded images.");
    }
  }

  const filled = useMemo(() => slots.filter((slot) => slot.imageUrl).length, [slots]);

  return (
    <AppLayout contentClassName="flex flex-col min-h-screen">
      <header className="flex justify-between items-center w-full px-container-margin-mobile md:px-container-margin-desktop h-16 border-b border-outline-variant bg-surface sticky top-0 z-30">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface animate-text-smooth">
            Collage Maker
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant hidden md:block animate-text-smooth delay-2">
            Drop multiple photos to fill a 2, 3, or 4 image layout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => pickFiles()}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant bg-surface font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
          >
            <Icon name="add_photo_alternate" size={18} />
            Add photos
          </button>
          <button
            type="button"
            onClick={exportCollage}
            className="bg-secondary text-on-secondary font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-secondary-container flex items-center gap-2 btn-glow"
          >
            <Icon name="download" size={18} />
            Export Collage
          </button>
        </div>
      </header>

      <div className="flex-1 p-container-margin-mobile md:p-container-margin-desktop overflow-auto flex flex-col md:flex-row gap-gutter">
        <aside className="w-full md:w-64 bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col gap-6 shrink-0">
          <div>
            <h3 className="font-label-md text-label-md text-on-surface font-semibold mb-3">
              Image count
            </h3>
            <div
              className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant/40"
              role="tablist"
              aria-label="Number of images"
            >
              {([2, 3, 4] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={count === value}
                  onClick={() => applyCount(value)}
                  className={cn(
                    "flex-1 py-2 rounded-md font-label-md text-label-md",
                    count === value
                      ? "bg-white text-on-surface border border-outline-variant/50"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
              {filled}/{count} photos placed
            </p>
          </div>

          <div>
            <h3 className="font-label-md text-label-md text-on-surface font-semibold mb-3">
              Templates
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              {COLLAGE_THEMES.map((item) => {
                const active = item.available && theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.available}
                    aria-label={item.name}
                    aria-pressed={active}
                    onClick={() => {
                      if (item.id === "coming-soon" || !item.available) {
                        toast.message("This template is coming soon.");
                        return;
                      }
                      applyTheme(item.id);
                    }}
                    className={cn(
                      "rounded-lg overflow-hidden text-left border transition-colors",
                      item.available
                        ? active
                          ? "border-2 border-secondary"
                          : "border border-outline-variant hover:border-secondary"
                        : "border border-outline-variant opacity-80 cursor-not-allowed",
                    )}
                  >
                    <div className="aspect-[4/5] bg-surface-container relative">
                      {item.preview ? (
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-outline">
                          <Icon name="auto_awesome" />
                          <span className="font-label-sm text-label-sm uppercase tracking-wider">
                            Coming Soon
                          </span>
                        </div>
                      )}
                      {!item.available ? (
                        <span className="absolute inset-x-2 bottom-2 text-center bg-primary-container text-on-primary font-label-sm text-label-sm py-1 rounded-full">
                          Coming Soon
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {item.name}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <CollageCanvas
          canvasRef={canvasRef}
          theme={theme}
          count={count}
          slots={slots}
          settings={settings}
          selectedId={selectedId}
          cropping={cropping}
          dragging={dragging}
          onSelect={setSelectedId}
          onUpload={pickFiles}
          onDelete={deleteSlot}
          onCrop={(id) => {
            setSelectedId(id);
            setCropping(true);
          }}
          onDropFiles={addFiles}
          onDragState={setDragging}
        />

        <aside className="w-full md:w-72 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col gap-6 shrink-0">
          <h3 className="font-label-md text-label-md text-on-surface font-semibold border-b border-outline-variant pb-2">
            Layout Settings
          </h3>
          {theme === "editorial" ? (
            <>
              <label className="flex flex-col gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex justify-between">
                  <span>Spacing</span>
                  <span className="text-on-surface font-medium">{settings.spacing}px</span>
                </span>
                <input
                  className="snapcut-range w-full cursor-pointer accent-secondary"
                  max={32}
                  min={0}
                  type="range"
                  value={settings.spacing}
                  onChange={(e) => setSettings((s) => ({ ...s, spacing: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex justify-between">
                  <span>Corner Radius</span>
                  <span className="text-on-surface font-medium">{settings.radius}px</span>
                </span>
                <input
                  className="snapcut-range w-full cursor-pointer accent-secondary"
                  max={24}
                  min={0}
                  type="range"
                  value={settings.radius}
                  onChange={(e) => setSettings((s) => ({ ...s, radius: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Aspect Ratio
                </span>
                <select
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface focus:border-secondary outline-none"
                  value={settings.aspectRatio}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, aspectRatio: e.target.value as AspectRatioId }))
                  }
                >
                  <option value="4:5">4:5 (Instagram)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Story)</option>
                </select>
              </label>
              <div className="flex flex-col gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Background
                </span>
                <div className="flex gap-2">
                  {COLLAGE_BACKGROUNDS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Background ${color}`}
                      onClick={() => setSettings((s) => ({ ...s, background: color }))}
                      className={cn(
                        "w-8 h-8 rounded-full border border-outline-variant",
                        settings.background === color && "ring-2 ring-offset-2 ring-secondary",
                        color === "gradient" &&
                          "bg-gradient-to-br from-secondary to-primary-fixed-dim",
                      )}
                      style={color === "gradient" ? undefined : { background: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant">
              Scrapbook frames stay in place. Drop photos into the polaroids, or use Add photos to
              fill several slots at once.
            </p>
          )}
          {cropping && selected?.imageUrl ? (
            <div className="flex flex-col gap-3 border-t border-outline-variant pt-4">
              <p className="font-label-sm text-label-sm text-on-surface">Crop position</p>
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Horizontal {selected.objectX}%
                <input
                  className="snapcut-range w-full mt-2"
                  type="range"
                  min={0}
                  max={100}
                  value={selected.objectX}
                  onChange={(e) =>
                    setSlots((current) =>
                      current.map((slot) =>
                        slot.id === selected.id
                          ? { ...slot, objectX: Number(e.target.value) }
                          : slot,
                      ),
                    )
                  }
                />
              </label>
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Vertical {selected.objectY}%
                <input
                  className="snapcut-range w-full mt-2"
                  type="range"
                  min={0}
                  max={100}
                  value={selected.objectY}
                  onChange={(e) =>
                    setSlots((current) =>
                      current.map((slot) =>
                        slot.id === selected.id
                          ? { ...slot, objectY: Number(e.target.value) }
                          : slot,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-secondary font-label-md text-label-md"
                onClick={() => setCropping(false)}
              >
                Done
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          addFiles(files, pendingSlot.current ?? undefined);
          pendingSlot.current = null;
          e.target.value = "";
        }}
      />
    </AppLayout>
  );
}
