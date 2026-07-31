import { useState, useRef } from "react";
import { processLogoFile } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface LogoUploadProps {
  currentUrl?: string;
  userId: string;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

const LogoUpload = ({ currentUrl, userId, onUploaded, onRemoved }: LogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP)");
      return;
    }

    setUploading(true);
    try {
      const result = await processLogoFile(file);
      if (!result.valid || !result.base64) {
        toast.error(result.error || "Failed to process image. Try a different file.");
        return;
      }
      setPreview(result.base64);
      onUploaded(result.base64);
      toast.success("Logo added");
    } catch (err: any) {
      toast.error(err.message || "Failed to process logo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onRemoved?.();
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border bg-secondary/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : preview ? (
          <img src={preview} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-6 h-6 text-muted-foreground/50" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Business Logo</p>
        <p className="text-xs text-muted-foreground mb-2">JPG, PNG, or WEBP. 64px minimum, 10MB maximum. Auto-resized.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Processing..." : preview ? "Change" : "Upload"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoUpload;
