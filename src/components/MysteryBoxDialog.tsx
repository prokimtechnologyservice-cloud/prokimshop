import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Dice5, Trophy, Share2, KeyRound, Copy, X } from "lucide-react";
import {
  fetchBoxPrizes,
  spinBox,
  boxColor,
  BG_CLASS,
  BORDER_CLASS,
  RING_CLASS,
  type BoxPrize,
} from "@/lib/mysteryBox";
import { getUser, refreshUser } from "@/lib/auth";
import { toast } from "sonner";
import { RobloxIdDialog } from "@/components/RobloxIdDialog";

export type BoxProduct = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  box_spin_price: number;
  box_border_color: string | null;
  box_bg_color: string | null;
};

export function MysteryBoxDialog({
  box,
  open,
  onOpenChange,
}: {
  box: BoxProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [prizes, setPrizes] = useState<BoxPrize[]>([]);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    image_url: string | null;
    payload: string | null;
  } | null>(null);
  const [askRoblox, setAskRoblox] = useState(false);
  const reelRef = useRef<HTMLDivElement | null>(null);

  const border = BORDER_CLASS[boxColor(box?.box_border_color)];
  const bg = BG_CLASS[boxColor(box?.box_bg_color)];
  const ring = RING_CLASS[boxColor(box?.box_border_color)];

  useEffect(() => {
    if (!open || !box) return;
    setResult(null);
    setLoading(true);
    fetchBoxPrizes(box.id).then((p) => {
      setPrizes(p);
      setLoading(false);
    });
  }, [open, box?.id]);

  const totalStock = prizes.reduce((s, p) => s + p.stock, 0);
  const anyNormalPrize = useMemo(
    () => prizes.some((p) => p.product?.product_type === "normal"),
    [prizes],
  );

  // Marquee reel: duplicate images for infinite scroll
  const reelImages = useMemo(() => {
    const withImg = prizes.filter((p) => p.product?.image_url);
    if (withImg.length === 0) return [] as BoxPrize[];
    const reps = Math.max(1, Math.ceil(20 / withImg.length));
    return Array.from({ length: reps }, () => withImg).flat();
  }, [prizes]);

  async function startSpin() {
    const u = getUser();
    if (!u || !box) return;
    if (totalStock === 0) return toast.error("กล่องนี้ของหมด");
    if (Number(u.balance) < Number(box.box_spin_price)) {
      return toast.error("ยอดเงินไม่พอ กรุณาเติมเงิน");
    }
    if (anyNormalPrize) {
      setAskRoblox(true);
    } else {
      doSpin(null);
    }
  }

  async function doSpin(robloxName: string | null) {
    if (!box) return;
    const u = getUser();
    if (!u) return;
    setSpinning(true);
    setResult(null);
    // Animate reel fast then slow (CSS handles the marquee; we hold spinning ~2.4s for suspense)
    if (reelRef.current) {
      reelRef.current.style.animationDuration = "0.35s";
    }
    try {
      const [r] = await Promise.all([
        spinBox(u.id, box.id, robloxName),
        new Promise((res) => setTimeout(res, 2200)),
      ]);
      if (reelRef.current) reelRef.current.style.animationDuration = "";
      setResult({ name: r.prize.name, image_url: r.prize.image_url, payload: r.delivered_payload });
      toast.success(`ได้รับ: ${r.prize.name}`);
      await refreshUser();
      // refresh prizes so stock updates
      const p = await fetchBoxPrizes(box.id);
      setPrizes(p);
    } catch (e: any) {
      toast.error(e.message ?? "สุ่มไม่สำเร็จ");
    } finally {
      setSpinning(false);
    }
  }

  function share() {
    if (!box) return;
    const url = `${window.location.origin}/product/${box.id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("คัดลอกลิงก์กล่องสุ่มแล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`max-w-2xl border-2 ${border} ${bg} ring-4 ${ring} shadow-luxe`}
        >
          {box && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-2 pr-6">
                  <Trophy className="w-5 h-5 text-gold" />
                  <span className="text-gradient-gold">{box.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/25 border border-primary/40 font-normal">
                    กล่องสุ่ม
                  </span>
                </DialogTitle>
                <DialogDescription>
                  ราคา/สุ่ม <span className="text-gold font-bold">฿{Number(box.box_spin_price).toFixed(2)}</span>
                  {" · "}ของในกล่องเหลือ <span className="text-gold font-bold">{totalStock}</span> ชิ้น
                </DialogDescription>
              </DialogHeader>

              {box.description && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {box.description}
                </div>
              )}

              {/* Reel */}
              <div className="relative rounded-lg border border-border overflow-hidden bg-black/50">
                <div className="h-32 sm:h-36 overflow-hidden relative">
                  {reelImages.length > 0 ? (
                    <div
                      ref={reelRef}
                      className="flex gap-2 p-2 animate-[reel_18s_linear_infinite]"
                      style={{ width: "max-content" }}
                    >
                      {reelImages.map((p, i) => (
                        <div
                          key={i}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-md overflow-hidden border border-border bg-onyx shrink-0"
                        >
                          <img
                            src={p.product?.image_url!}
                            alt={p.product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      แอดมินยังไม่ได้เพิ่มรางวัลในกล่องนี้
                    </div>
                  )}
                  {/* center indicator */}
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gold/70 shadow-[0_0_18px_rgba(255,215,0,0.9)]" />
                  {/* edge fades */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/80 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/80 to-transparent" />
                </div>
              </div>

              {/* Result card */}
              {result && (
                <div className="rounded-lg border-2 border-gold/60 bg-onyx/70 p-4 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-onyx shrink-0">
                    {result.image_url ? (
                      <img src={result.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-gold m-auto" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-widest text-gold">คุณได้รับรางวัล</div>
                    <div className="font-display text-lg text-gradient-gold truncate">{result.name}</div>
                    {result.payload && (
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <KeyRound className="w-3 h-3 text-gold" />
                        <span className="font-mono truncate text-gold">{result.payload}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={() => {
                            navigator.clipboard?.writeText(result.payload!);
                            toast.success("คัดลอกแล้ว");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1">
                      ไปที่ "ติดตามคำสั่งซื้อ" เพื่อดูรายละเอียด
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="luxe"
                  className="flex-1"
                  disabled={spinning || loading || totalStock === 0 || prizes.length === 0}
                  onClick={startSpin}
                >
                  <Dice5 className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
                  {spinning ? "กำลังสุ่ม..." : totalStock === 0 ? "ของหมด" : `สุ่ม ฿${Number(box.box_spin_price).toFixed(2)}`}
                </Button>
                <Button variant="outline" onClick={share}>
                  <Share2 className="w-4 h-4" /> แชร์
                </Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Prize list preview */}
              {prizes.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-gold">
                    รางวัลทั้งหมดในกล่อง ({prizes.length})
                  </summary>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {prizes.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 p-1.5 rounded border ${
                          p.stock > 0 ? "border-border" : "border-destructive/40 opacity-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden bg-onyx shrink-0">
                          {p.product?.image_url && (
                            <img src={p.product?.image_url} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{p.product?.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            เหลือ {p.stock} · น้ำหนัก {p.weight}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <RobloxIdDialog
        open={askRoblox}
        productName={box?.name ?? ""}
        defaultName={getUser()?.roblox_name}
        onConfirm={(name) => {
          setAskRoblox(false);
          doSpin(name);
        }}
        onOpenChange={(v) => {
          if (!v) setAskRoblox(false);
        }}
      />
    </>
  );
}
