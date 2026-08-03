import { useEffect, useRef, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { getUser, refreshUser } from "@/lib/auth";
import { normalizeCode, isCompleteCode, redeemGiftCard, type RedeemResult } from "@/lib/giftcard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Camera, Gift, PartyPopper, ScanLine, Wallet, Tag, Package } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  code: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/givecard")({
  component: GiveCardPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "ใช้บัตรของขวัญ - PROKIM" },
      { name: "description", content: "กรอกหรือสแกนรหัสบัตรของขวัญ PROKIM เพื่อรับเครดิตและของรางวัล" },
      { property: "og:title", content: "ใช้บัตรของขวัญ - PROKIM" },
      { property: "og:description", content: "กรอกหรือสแกนรหัสบัตรของขวัญ PROKIM เพื่อรับเครดิตและของรางวัล" },
    ],
  }),
});

function GiveCardPage() {
  const search = useSearch({ from: "/givecard" }) as { code: string };
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [promoName, setPromoName] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    if (search.code) setCode(normalizeCode(search.code));
  }, [search.code]);

  async function doRedeem(rawCode: string) {
    const user = getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนใช้บัตรของขวัญ");
      return;
    }
    const normalized = normalizeCode(rawCode);
    if (!isCompleteCode(normalized)) {
      toast.error("รูปแบบรหัสไม่ถูกต้อง");
      return;
    }
    setLoading(true);
    try {
      const res = await redeemGiftCard(normalized, user.id);
      await refreshUser();
      setResult(res);
      if (res.promotion_id) {
        const { data } = await (supabase as any)
          .from("promotions")
          .select("name")
          .eq("id", res.promotion_id)
          .maybeSingle();
        setPromoName(data?.name ?? null);
      } else {
        setPromoName(null);
      }
      if (res.product_ids && res.product_ids.length > 0) {
        const { data } = await supabase
          .from("products")
          .select("name")
          .in("id", res.product_ids as string[]);
        setProductNames((data ?? []).map((p: any) => p.name));
      } else {
        setProductNames([]);
      }
      toast.success("ใช้บัตรของขวัญสำเร็จ!");
    } catch (e: any) {
      toast.error(e.message || "ไม่สามารถใช้บัตรของขวัญได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="text-primary" />
            <h1 className="text-xl font-bold">ใช้บัตรของขวัญ</h1>
          </div>
          <Tabs defaultValue="enter">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="enter">กรอกรหัส</TabsTrigger>
              <TabsTrigger value="scan">ยืนยันบัตร</TabsTrigger>
            </TabsList>

            <TabsContent value="enter" className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 18))}
                  maxLength={18}
                  placeholder="PS-XXXX-XXXX-XXXX-XXXX"
                  className="font-mono text-lg tracking-wider"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setPhotoOpen(true)}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full"
                disabled={loading || !isCompleteCode(code)}
                onClick={() => doRedeem(code)}
              >
                {loading ? "กำลังใช้บัตร..." : "ใช้บัตรของขวัญ"}
              </Button>
            </TabsContent>

            <TabsContent value="scan" className="mt-4">
              <ScanTab onDetected={(c) => doRedeem(c)} loading={loading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} onCodeFound={(c) => setCode(normalizeCode(c))} />

      <RewardDialog
        result={result}
        promoName={promoName}
        productNames={productNames}
        onClose={() => setResult(null)}
      />
    </div>
  );
}

function PhotoDialog({
  open,
  onOpenChange,
  onCodeFound,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCodeFound: (code: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  function reset() {
    setPreview(null);
    setNotFoundMsg(null);
    setTyped("");
  }

  function handleFile(file: File) {
    setNotFoundMsg(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 300 || img.naturalHeight < 300) {
        toast.error("ภาพเล็กเกินไป กรุณาถ่ายใหม่");
        URL.revokeObjectURL(url);
        return;
      }
      setPreview(url);
      // best-effort: try to find a code-like pattern in the filename
      const guess = file.name.toUpperCase().match(/PS[-A-Z0-9]{10,}/);
      if (guess) {
        onCodeFound(guess[0]);
      } else {
        setNotFoundMsg("ตรวจไม่พบรหัสในภาพ กรุณากรอกรหัสด้านล่าง");
      }
    };
    img.src = url;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ถ่ายรูปบัตรของขวัญ</DialogTitle>
          <DialogDescription>วางรหัสบัตรให้อยู่ในกรอบ แล้วพิมพ์รหัสที่เห็น</DialogDescription>
        </DialogHeader>

        {!preview && (
          <div className="relative rounded-lg overflow-hidden bg-muted aspect-[3/1] flex items-center justify-center">
            <div className="absolute inset-2 border-2 border-dashed border-primary rounded-md pointer-events-none flex items-center justify-center">
              <span className="text-xs text-muted-foreground bg-background/70 px-2 py-1 rounded">
                วางรหัสบัตรให้อยู่ในกรอบ
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="opacity-0 absolute inset-0 cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <img src={preview} alt="ภาพบัตรของขวัญ" className="w-full rounded-md border" />
            {notFoundMsg && <p className="text-sm text-destructive">{notFoundMsg}</p>}
            <Input
              value={typed}
              onChange={(e) => setTyped(normalizeCode(e.target.value).slice(0, 18))}
              placeholder="PS-XXXX-XXXX-XXXX-XXXX"
              className="font-mono"
              maxLength={18}
            />
            <Button
              className="w-full"
              disabled={!isCompleteCode(typed)}
              onClick={() => {
                onCodeFound(typed);
                onOpenChange(false);
              }}
            >
              ใช้รหัสนี้
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScanTab({ onDetected, loading }: { onDetected: (code: string) => void; loading: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
    return () => stop();
    // eslint-disable-next-line
  }, []);

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  async function start() {
    doneRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13"] });
      const tick = async () => {
        if (doneRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue as string;
            doneRef.current = true;
            stop();
            onDetected(normalizeCode(raw));
            return;
          }
        } catch {
          // ignore per-frame errors
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      toast.error("ไม่สามารถเข้าถึงกล้องได้");
    }
  }

  if (supported === false) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground text-center space-y-2">
        <ScanLine className="mx-auto h-8 w-8" />
        <p>อุปกรณ์นี้ไม่รองรับการสแกนบาร์โค้ด/คิวอาร์อัตโนมัติ</p>
        <p>กรุณาใช้แท็บ "กรอกรหัส" แทน</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/80">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-8 border-2 border-primary rounded-md pointer-events-none" />
      </div>
      {!scanning ? (
        <Button className="w-full" onClick={start} disabled={loading}>
          <ScanLine className="h-4 w-4 mr-2" />
          เปิดกล้องสแกน
        </Button>
      ) : (
        <Button className="w-full" variant="outline" onClick={stop}>
          หยุดสแกน
        </Button>
      )}
    </div>
  );
}

function RewardDialog({
  result,
  promoName,
  productNames,
  onClose,
}: {
  result: RedeemResult | null;
  promoName: string | null;
  productNames: string[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!result} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="text-primary" />
            ใช้บัตรของขวัญสำเร็จ!
          </DialogTitle>
          <DialogDescription>{result?.label ?? "คุณได้รับรางวัลดังนี้"}</DialogDescription>
        </DialogHeader>
        {result && (
          <div className="space-y-3">
            {result.image_url && (
              <img src={result.image_url} alt={result.label ?? "gift card"} className="w-full rounded-md border" />
            )}
            {result.description && <p className="text-sm text-muted-foreground">{result.description}</p>}
            <div className="rounded-lg border p-3 space-y-2">
              {result.balance > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>ได้รับเครดิต +฿{result.balance.toLocaleString()}</span>
                </div>
              )}
              {promoName && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-primary" />
                  <span>ได้รับโปรโมชั่น: {promoName}</span>
                </div>
              )}
              {productNames.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary mt-0.5" />
                  <span>ได้รับสินค้าฟรี: {productNames.join(", ")}</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={onClose}>
              ปิด
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
