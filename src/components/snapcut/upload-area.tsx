import { useRef, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/snapcut/icon";
import { cn } from "@/lib/utils";

type UploadAreaProps = {
  label?: string;
  accept?: string;
  onFile: (file: File) => void;
  className?: string;
};

export function UploadArea({
  label = "Drag and drop an image, or click to upload",
  accept = "image/*",
  onFile,
  className,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "w-full h-full min-h-[280px] rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center gap-4 text-center px-6 hover:border-secondary hover:bg-surface-container-low transition-colors",
        className,
      )}
    >
      <span className="w-12 h-12 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center">
        <Icon name="add_photo_alternate" className="text-outline" />
      </span>
      <div>
        <p className="font-label-md text-label-md text-on-surface">{label}</p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">PNG, JPG, or WEBP</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </button>
  );
}
