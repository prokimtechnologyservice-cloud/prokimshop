import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Dice5, Trophy, Share2, KeyRound, Copy, X, Frown, Ban } from "lucide-react";
import {
  fetchBoxPrizes,
  spinBox,
  boxColor,
  boxTemplate,
  effectiveChances,
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
  box_template?: string | null;
  box_mode?: string | null;
  box_bg_image?: string | null;
  box_stock?: number | null;
};

const TILE_W = 112; // px, matches w-28
const TILE_GAP = 8; // px, matches gap-2
const EXTRA_LOOPS = 6;

function prizeDisplayName(p: BoxPrize) {
  if (p.is_nothing) return p.label || "ไม่ได้ของ";
  return p.product?.name ?? p.label ?? "รางวัล";
}
function prizeDisplayImage(p: BoxPrize) {
  return p.is_nothing ? p.image_url : p.product?.image_url ?? p.image_url;
}
function prizeOut(p: BoxPrize) {
  return !p.is_nothing && (p.stock ?? 0) <= 0;
}

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
    nothing: boolean;
  } | null>(null);
  const [askRoblox, setAskRoblox] = useState(false);
  const [reelStyle, setReelStyle] = useState<{ transform: string; transition: string }>({
    transform: "translateX(0px)",
    transition: "none",
  });
  const [wheelStyle, setWheelStyle] = useState<{ transform: string; transition: string }>({
    transform: "rotate(0deg)",
    transition: "none",
  });
  const [dropStyle, setDropStyle] = useState<{ transform: string; transition: string }>({
    transform: "translateY(0px)",
    transition: "none",
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const tpl = boxTemplate(box?.box_template);
  const border = BORDER_CLASS[boxColor(box?.box_border_color)];
  const bg = BG_CLASS[boxColor(box?.box_bg_color)];
  const ring = RING_CLASS[boxColor(box?.box_border_color)];
  const mode = (box?.box_mode as "slide" | "wheel" | "drop") || "slide";

  useEffect(() => {
    if (!open || !box) return;
    setResult(null);
    setLoading(true);
    setReelStyle({ transform: "translateX(0px)", transition: "none" });
    setWheelStyle({ transform: "rotate(0deg)", transition: "none" });
    setDropStyle({ transform: "translateY(0px)", transition: "none" });
    fetchBoxPrizes(box.id).then((p) => {
      setPrizes(p);
      setLoading(false);
    });
  }, [open, box?.id]);

  const chances = useMemo(() => effectiveChances(prizes), [prizes]);
  const totalStock = prizes.reduce((s, p) => s + (p.is_nothing ? 1 : p.stock), 0);
  const anyNormalPrize = useMemo(
    () => prizes.some((p) => !p.is_nothing && p.product?.product_type === "normal"),
    [prizes],
  );
  const availablePrizes = useMemo(() => prizes.filter((p) => !prizeOut(p)), [prizes]);

  async function startSpin() {
    const u = getUser();
    if (!u || !box) return;
    if (availablePrizes.length === 0) return toast.error("กล่องนี้ของหมด");
    if (box.box_stock != null && Number(box.box_stock) <= 0) return toast.error("กล่องสุ่มนี้หมดแล้ว");
    if (Number(u.balance) < Number(box.box_spin_price)) {
      return toast.error("ยอดเงินไม่พอ กรุณาเติมเงิน");
    }
    if (anyNormalPrize) {
      setAskRoblox(true);
    } else {
      doSpin(null);
    }
  }

  function animateToIndex(prizeIndex: number) {
    const n = prizes.length;
    if (n === 0) return;
    const easing = "transform 5s cubic-bezier(0.12, 0.8, 0.12, 1)";
    if (mode === "slide") {
      const viewportW = viewportRef.current?.clientWidth ?? 320;
      const tileFull = TILE_W + TILE_GAP;
      const finalIndex = EXTRA_LOOPS * n + prizeIndex;
      const targetX = finalIndex * tileFull + tileFull / 2 - viewportW / 2;
      // start at 0 with no transition, then next frame animate
      setReelStyle({ transform: "translateX(0px)", transition: "none" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setReelStyle({ transform: `translateX(-${targetX}px)`, transition: easing });
        });
      });
    } else if (mode === "wheel") {
      const segAngle = 360 / n;
      const targetAngle = 360 * EXTRA_LOOPS + (360 - (prizeIndex * segAngle + segAngle / 2));
      setWheelStyle({ transform: "rotate(0deg)", transition: "none" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWheelStyle({ transform: `rotate(${targetAngle}deg)`, transition: easing });
        });
      });
    } else {
      const viewportH = 260;
      const tileFull = TILE_W + TILE_GAP;
      const finalIndex = EXTRA_LOOPS * n + prizeIndex;
      const targetY = finalIndex * tileFull + tileFull / 2 - viewportH / 2;
      setDropStyle({ transform: "translateY(0px)", transition: "none" });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDropStyle({ transform: `translateY(-${targetY}px)`, transition: easing });
        });
      });
    }
  }

  async function doSpin(robloxName: string | null) {
    if (!box) return;
    const u = getUser();
    if (!u) return;
    setSpinning(true);
    setResult(null);
    try {
      const r = await spinBox(u.id, box.id, robloxName);
      animateToIndex(r.prize_index);
      await new Promise((res) => setTimeout(res, 5200));
      setResult({
        name: r.prize.name,
        image_url: r.prize.image_url,
        payload: r.delivered_payload,
        nothing: !!r.nothing,
      });
      if (r.nothing) {
        toast.error("เสียใจด้วย ไม่ได้รับของ");
      } else {
        toast.success(`ได้รับ: ${r.prize.name}`);
      }
      await refreshUser();
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

  // Build a long repeated strip for slide/drop reels
  const stripPrizes = useMemo(() => {
    if (prizes.length === 0) return [] as BoxPrize[];
    return Array.from({ length: EXTRA_LOOPS + 2 }, () => prizes).flat();
  }, [prizes]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-y-auto ${tpl.frameClass} ${bg} ${ring ? "ring-4 " + ring : ""} shadow-luxe`}
          style={
            box?.box_bg_image
              ? { backgroundImage: `url(${box.box_bg_image})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
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
                  {box.box_stock != null && (
                    <>
                      {" · "}สุ่มได้อีก <span className="text-gold font-bold">{box.box_stock}</span> ครั้ง
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              {box.description && (
                <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {box.description}
                </div>
              )}

              {/* Reel / Wheel / Drop */}
              <div ref={viewportRef} className="relative rounded-lg border border-border overflow-hidden bg-black/50">
                {mode === "wheel" ? (
                  <div className="h-56 flex items-center justify-center relative">
                    {prizes.length > 0 ? (
                      <div
                        className="relative w-48 h-48 rounded-full border-4 border-gold/60 overflow-hidden"
                        style={{
                          background: `conic-gradient(${prizes
                            .map((p, i) => {
                              const start = chances.slice(0, i).reduce((s, v) => s + v, 0);
                              const end = start + (chances[i] || 0);
                              const hue = (i * 360) / Math.max(1, prizes.length);
                              return `hsl(${hue} 70% 45%) ${start}% ${end}%`;
                            })
                            .join(", ")})`,
                          ...wheelStyle,
                        }}
                      >
                        {prizes.map((p, i) => {
                          const start = chances.slice(0, i).reduce((s, v) => s + v, 0);
                          const mid = start + (chances[i] || 0) / 2;
                          const angle = (mid / 100) * 360;
                          return (
                            <div
                              key={p.id}
                              className="absolute inset-0 flex items-start justify-center"
                              style={{ transform: `rotate(${angle}deg)` }}
                            >
                              <span className="text-[9px] mt-2 text-foreground/90 bg-onyx/60 px-1 rounded max-w-[50px] truncate">
                                {prizeDisplayName(p)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">แอดมินยังไม่ได้เพิ่มรางวัลในกล่องนี้</div>
                    )}
                    <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-[14px] border-l-transparent border-r-transparent border-t-gold" />
                  </div>
                ) : mode === "drop" ? (
                  <div className="h-64 overflow-hidden relative">
                    {stripPrizes.length > 0 ? (
                      <div
                        className="flex flex-col gap-2 p-2"
                        style={{ ...dropStyle, width: "100%" }}
                      >
                        {stripPrizes.map((p, i) => (
                          <PrizeTile key={i} p={p} />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        แอดมินยังไม่ได้เพิ่มรางวัลในกล่องนี้
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gold/70 shadow-[0_0_18px_rgba(255,215,0,0.9)]" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/80 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />
                  </div>
                ) : (
                  <div className="h-32 sm:h-36 overflow-hidden relative">
                    {stripPrizes.length > 0 ? (
                      <div className="flex gap-2 p-2" style={{ width: "max-content", ...reelStyle }}>
                        {stripPrizes.map((p, i) => (
                          <PrizeTile key={i} p={p} />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        แอดมินยังไม่ได้เพิ่มรางวัลในกล่องนี้
                      </div>
                    )}
                    <div className={`pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 ${tpl.pointerClass}`} />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/80 to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/80 to-transparent" />
                  </div>
                )}
              </div>

              {/* Result card */}
              {result && (
                <div
                  className={`rounded-lg border-2 p-4 flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
                    result.nothing ? "border-destructive/60 bg-destructive/10" : "border-gold/60 bg-onyx/70"
                  }`}
                >
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-onyx shrink-0 flex items-center justify-center">
                    {result.nothing ? (
                      <Frown className="w-8 h-8 text-destructive" />
                    ) : result.image_url ? (
                      <img src={result.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-gold m-auto" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] uppercase tracking-widest ${result.nothing ? "text-destructive" : "text-gold"}`}>
                      {result.nothing ? "เสียใจด้วย ไม่ได้รับของ" : "คุณได้รับรางวัล"}
                    </div>
                    <div className={`font-display text-lg truncate ${result.nothing ? "text-destructive" : "text-gradient-gold"}`}>
                      {result.name}
                    </div>
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
                    {!result.nothing && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        ไปที่ "ติดตามคำสั่งซื้อ" เพื่อดูรายละเอียด
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className={`flex-1 ${tpl.buttonClass}`}
                  disabled={spinning || loading || availablePrizes.length === 0 || prizes.length === 0}
                  onClick={startSpin}
                >
                  <Dice5 className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
                  {spinning
                    ? "กำลังสุ่ม..."
                    : availablePrizes.length === 0
                      ? "ของหมด"
                      : `สุ่ม ฿${Number(box.box_spin_price).toFixed(2)}`}
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
                <details className="text-xs" open>
                  <summary className="cursor-pointer text-muted-foreground hover:text-gold">
                    รางวัลทั้งหมดในกล่อง ({prizes.length})
                  </summary>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {prizes.map((p, i) => {
                      const out = prizeOut(p);
                      return (
                        <div
                          key={p.id}
                          className={`relative flex items-center gap-2 p-1.5 rounded border ${
                            out ? "border-destructive/40 opacity-60 grayscale" : "border-border"
                          }`}
                        >
                          <div className="w-10 h-10 rounded overflow-hidden bg-onyx shrink-0 flex items-center justify-center">
                            {p.is_nothing ? (
                              <Ban className="w-4 h-4 text-muted-foreground" />
                            ) : prizeDisplayImage(p) ? (
                              <img src={prizeDisplayImage(p)!} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate flex items-center gap-1">
                              {prizeDisplayName(p)}
                              {p.is_nothing && (
                                <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground shrink-0">ไม่ได้ของ</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              โอกาส {chances[i]?.toFixed(1) ?? "0.0"}%
                            </div>
                          </div>
                          {out && (
                            <span className="absolute top-1 right-1 text-[9px] px-1 rounded bg-destructive text-destructive-foreground">
                              หมด
                            </span>
                          )}
                        </div>
                      );
                    })}
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

function PrizeTile({ p }: { p: BoxPrize }) {
  const out = prizeOut(p);
  const img = prizeDisplayImage(p);
  return (
    <div
      className={`w-28 h-28 sm:w-32 sm:h-32 rounded-md overflow-hidden border border-border bg-onyx shrink-0 flex items-center justify-center relative ${
        out ? "grayscale opacity-60" : ""
      }`}
    >
      {p.is_nothing ? (
        <Ban className="w-8 h-8 text-muted-foreground" />
      ) : img ? (
        <img src={img} alt={prizeDisplayName(p)} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[10px] text-center px-1">{prizeDisplayName(p)}</span>
      )}
      {out && (
        <span className="absolute bottom-0 inset-x-0 text-[9px] text-center bg-destructive/80 text-destructive-foreground">
          หมด
        </span>
      )}
    </div>
  );
}
