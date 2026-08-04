import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, ScanLine } from "lucide-react";
import { toast } from "sonner";

export type CodeScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string) => void;
  title?: string;
  description?: string;
};

/**
 * Reusable code scanner (QR / Barcode) built on @zxing/browser.
 * Supports live camera scanning and scanning from an uploaded image.
 */
export function CodeScanner({
  open,
  onOpenChange,
  onResult,
  title = "สแกนโค้ด",
  description = "จ่อกล้องไปที่ QR โค้ดหรือบาร์โค้ด หรือเลือกรูปภาพ",
}: CodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    doneRef.current = false;
    setError(null);
    readerRef.current = new BrowserMultiFormatReader();
    startCamera();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stop() {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera() {
    if (!readerRef.current || !videoRef.current) return;
    try {
      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (doneRef.current) return;
          if (result) {
            doneRef.current = true;
            handleResult(result.getText());
          }
        }
      );
      controlsRef.current = controls;
    } catch (e: any) {
      setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาใช้การเลือกรูปภาพแทน");
    }
  }

  function handleResult(text: string) {
    stop();
    onResult(text);
    onOpenChange(false);
  }

  async function handleFile(file: File) {
    if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
    const url = URL.createObjectURL(file);
    try {
      const result = await readerRef.current.decodeFromImageUrl(url);
      handleResult(result.getText());
    } catch (e) {
      toast.error("ไม่พบโค้ดในภาพที่เลือก");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) stop();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/80">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-8 border-2 border-primary rounded-md pointer-events-none" />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            เลือกรูปภาพ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CodeScanner;
