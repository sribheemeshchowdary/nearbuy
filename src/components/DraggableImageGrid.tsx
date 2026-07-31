import { useState, useRef, useCallback } from "react";
import { Trash2, Upload, Loader2, GripVertical } from "lucide-react";
import { X } from "lucide-react";

interface DraggableImageGridProps {
  images: string[];
  onReorder: (images: string[]) => void;
  onRemove: (index: number) => void;
  onUploadClick: () => void;
  uploading: boolean;
  maxImages: number;
}

const DraggableImageGrid = ({
  images,
  onReorder,
  onRemove,
  onUploadClick,
  uploading,
  maxImages,
}: DraggableImageGridProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    dragNode.current = e.currentTarget as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    // Make drag image semi-transparent
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const reordered = [...images];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, moved);
      onReorder(reordered);
    }
    setDragIndex(null);
    setOverIndex(null);
    dragNode.current = null;
  }, [dragIndex, overIndex, images, onReorder]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  }, []);

  const handleTouchStart = useRef<{ index: number; startY: number; startX: number } | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((url, i) => (
        <div
          key={`${i}-${url.slice(-20)}`}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnter={(e) => { e.preventDefault(); setOverIndex(i); }}
          className={`relative aspect-square rounded-xl overflow-hidden border-2 group cursor-grab active:cursor-grabbing transition-all duration-200 ${
            overIndex === i && dragIndex !== null && dragIndex !== i
              ? "border-primary scale-[1.03] shadow-lg"
              : dragIndex === i
              ? "border-primary/50 opacity-40"
              : "border-border hover:border-primary/30"
          }`}
        >
          <img src={url} alt={`Business ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
          
          {/* Drag handle indicator */}
          <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          {/* Position badge */}
          <div className="absolute bottom-1 left-1 min-w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center px-1">
            <span className="text-[10px] font-bold text-foreground">{i + 1}</span>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(i); }}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Upload button */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-[10px]">Upload</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default DraggableImageGrid;
