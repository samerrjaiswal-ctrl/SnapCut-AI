import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CollageCanvas, GridThemePreview } from "@/components/snapcut/collage-canvas";
import { CropEditor } from "@/components/snapcut/crop-editor";
import { Icon } from "@/components/snapcut/icon";
import { OverlayLoader } from "@/components/snapcut/overlay-loader";
import { ToolActions } from "@/components/snapcut/tool-actions";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { saveCollageResult } from "@/services/history-service";
import {
  COLLAGE_BACKGROUNDS,
  COLLAGE_THEMES,
  demoCollageService,
  FULL_CROP,
  getGridLayout,
  slotCountForTheme,
  type AspectRatioId,
  type CollageSettings,
  type CollageSlot,
  type CollageThemeId,
} from "@/services/demo-collage-service";

export const Route = createFileRoute("/collage-maker")({
  component: CollageMakerPage,
  head: () => ({
    meta: [{ title: "Collage Maker | SnapCut AI" }],
  }),
});

function CollageMakerPage() {
  const { session } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const [theme, setTheme] = useState<CollageThemeId>("stack-2");
  const [slots, setSlots] = useState<CollageSlot[]>(() => demoCollageService.slotsForCount(2));
  const [settings, setSettings] = useState<CollageSettings>(() =>
    demoCollageService.defaultSettings("stack-2"),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [cropAspect, setCropAspect] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    return () => {
      slotsRef.current.forEach((slot) => {
        if (slot.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(slot.imageUrl);
      });
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  function markDirty() {
    setCreated(false);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResultUrl(null);
  }

  function updateSettings(patch: Partial<CollageSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    markDirty();
  }

  function applyTheme(next: CollageThemeId) {
    setTheme(next);
    setSettings(demoCollageService.defaultSettings(next));
    const nextCount = slotCountForTheme(next, 4);
    setSlots((current) => demoCollageService.resizeSlots(current, nextCount));
    setSelectedId(null);
    setCropping(false);
    markDirty();
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
    markDirty();
  }

  function deleteSlot(slotId: string) {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.id !== slotId) return slot;
        if (slot.imageUrl?.startsWith("blob:")) URL.revokeObjectURL(slot.imageUrl);
        return { ...slot, imageUrl: null, crop: { ...FULL_CROP } };
      }),
    );
    if (selectedId === slotId) setSelectedId(null);
    setCropping(false);
    markDirty();
  }

  function resetWorkspace() {
    slots.forEach((slot) => {
      if (slot.imageUrl) URL.revokeObjectURL(slot.imageUrl);
    });
    setSlots(demoCollageService.slotsForCount(slotCountForTheme(theme, 4)));
    setSelectedId(null);
    setCropping(false);
    markDirty();
    toast.message("Started a new collage.");
  }

  async function createCollage() {
    if (!slots.some((slot) => slot.imageUrl)) {
      toast.error("Add at least one photo before creating a collage.");
      return;
    }
    const layout = getGridLayout(theme);
    if (!layout) return;
    setCreating(true);
    try {
      const board = canvasRef.current?.getBoundingClientRect();
      const blob = await demoCollageService.exportPng({
        layout,
        slots,
        settings,
        ...(board && board.width > 0 && board.height > 0
          ? { previewSize: { width: board.width, height: board.height } }
          : {}),
      });
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const nextUrl = URL.createObjectURL(blob);
      resultUrlRef.current = nextUrl;
      setResultUrl(nextUrl);
      setCreated(true);
      if (!session?.userId) {
        toast.success("Collage created. Sign in to save it to History.");
        return;
      }
      try {
        await saveCollageResult({
          userId: session.userId,
          fileName: `collage-${theme}.png`,
          resultBlob: blob,
          metadata: { theme, photos: slots.filter((slot) => slot.imageUrl).length },
        });
        toast.success("Collage saved. Open History to view it.");
      } catch (historyError) {
        if (import.meta.env.DEV) console.error(historyError);
        toast.error(
          historyError instanceof Error
            ? `Collage is ready, but History save failed: ${historyError.message}`
            : "Collage is ready, but it could not be saved to History.",
        );
      }
    } catch {
      toast.error("Could not create the collage. Try again.");
    } finally {
      setCreating(false);
    }
  }

  async function exportCollage() {
    if (!resultUrl) {
      toast.error("Create the collage first, then download it.");
      return;
    }
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "snapcut-collage.png";
    a.click();
    toast.success("Collage downloaded.");
  }

  const filled = useMemo(() => slots.filter((slot) => slot.imageUrl).length, [slots]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center w-full px-container-margin-mobile md:px-container-margin-desktop py-3 sm:h-16 shrink-0 border-b border-outline-variant bg-surface z-30">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Collage Maker
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant hidden md:block">
            Pick a grid theme, drop photos, then create to save it.
          </p>
        </div>
        <ToolActions
          actionLabel="Create"
          actionIcon="dashboard_customize"
          actionDisabled={!slots.some((slot) => slot.imageUrl)}
          downloadDisabled={!created || !resultUrl}
          busy={creating}
          onNew={resetWorkspace}
          onAction={() => void createCollage()}
          onDownload={() => void exportCollage()}
        />
      </header>

      <div className="flex min-h-0 flex-1 w-full p-container-margin-mobile md:p-container-margin-desktop flex-col md:flex-row gap-gutter items-stretch overflow-hidden">
        <aside className="w-full md:w-64 bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col gap-6 shrink-0 max-h-56 md:max-h-none md:h-full min-h-0 overflow-y-auto">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {filled}/{slots.length} photos placed
          </p>

          <div>
            <h3 className="font-label-md text-label-md text-on-surface font-semibold mb-3">
              Templates
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              {COLLAGE_THEMES.map((item) => {
                const active = theme === item.id;
                const layout = getGridLayout(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.name}
                    aria-pressed={active}
                    onClick={() => applyTheme(item.id)}
                    className={cn(
                      "rounded-lg overflow-hidden text-left border transition-colors",
                      active
                        ? "border-2 border-secondary"
                        : "border border-outline-variant hover:border-secondary",
                    )}
                  >
                    <div className="aspect-square bg-[#E5E7EB] relative">
                      {item.preview ? (
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      ) : layout ? (
                        <GridThemePreview layout={layout} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <Icon name="dashboard_customize" />
                        </div>
                      )}
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
          slots={slots}
          settings={settings}
          selectedId={selectedId}
          dragging={dragging}
          onSelect={setSelectedId}
          onUpload={pickFiles}
          onDelete={deleteSlot}
          onCrop={(id, aspect) => {
            setSelectedId(id);
            setCropAspect(aspect);
            setCropping(true);
          }}
          onDropFiles={addFiles}
          onDragState={setDragging}
        />

        <aside className="w-full md:w-72 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col gap-6 shrink-0 max-h-80 md:max-h-none md:h-full min-h-0 overflow-y-auto">
          <h3 className="font-label-md text-label-md text-on-surface font-semibold border-b border-outline-variant pb-2">
            Layout Settings
          </h3>
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
                  onChange={(e) => updateSettings({ spacing: Number(e.target.value) })}
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
                  onChange={(e) => updateSettings({ radius: Number(e.target.value) })}
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
                    updateSettings({ aspectRatio: e.target.value as AspectRatioId })
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
                      onClick={() => updateSettings({ background: color })}
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
      {creating ? (
        <OverlayLoader
          message="Creating your collage…"
          description="Saving the result to your history."
        />
      ) : null}
      {cropping && selected?.imageUrl ? (
        <CropEditor
          key={selected.id}
          imageUrl={selected.imageUrl}
          crop={selected.crop ?? FULL_CROP}
          aspect={cropAspect}
          onCancel={() => setCropping(false)}
          onApply={(crop) => {
            setSlots((current) =>
              current.map((slot) => (slot.id === selected.id ? { ...slot, crop } : slot)),
            );
            setCropping(false);
            markDirty();
            toast.success("Crop applied. Create to save it.");
          }}
        />
      ) : null}
    </div>
  );
}
