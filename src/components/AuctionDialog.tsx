import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Gavel, Timer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getUser, refreshUser } from "@/lib/auth";
import {
  auctionCountdown,
  fetchAuction,
  placeBid,
  settleAuctions,
  topBidsByUser,
  type AuctionInfo,
} from "@/lib/auction";

export type AuctionProduct = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  auction_start_price: number;
  auction_step: number;
  auction_ends_at: string | null;
  auction_status: string;
  auction_final_price: number | null;
  auction_winner_id: string | null;
};

export function AuctionDialog({
  open,
  product,
  onOpenChange,
  onSettled,
}: {
  open: boolean;
  product: AuctionProduct | null;
  onOpenChange: (v: boolean) => void;
  onSettled?: () => void;
}) {
  const [info, setInfo] = useState<AuctionInfo | null>(null);
  const [bid, setBid] = useState("");
  const [robloxName, setRobloxName] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const user = getUser();

  const ended =
    !!product?.auction_ends_at && new Date(product.auction_ends_at) <= new Date();
  const closed = product?.auction_status === "closed" || ended;

  async function load() {
    if (!product) return;
    const data = await fetchAuction(product);
    setInfo(data);
    setBid(String(data.minNext));
  }

  useEffect(() => {
    if (!open || !product) {
      if (!open) {
        // Reset state when closed
        setBid("");
        setBusy(false);
        setInfo(null);
      }
      return;
    }
    setRobloxName(user?.roblox_name ?? "");
    load();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    const poll = setInterval(load, 6000);
    return () => {
      clearInterval(t);
      clearInterval(poll);
    };
  }, [open, product?.id]);

  useEffect(() => {
    if (!open || !ended || product?.auction_status === "closed") return;
    (async () => {
      await settleAuctions();
      onSettled?.();
    })();
  }, [open, ended]);

  const countdown = useMemo(
    () => auctionCountdown(product?.auction_ends_at),
    [product?.auction_ends_at, tick],
  );

  const leaderboard = useMemo(() => {
    if (!info?.bids) return [];
    return topBidsByUser(info.bids);
  }, [info?.bids]);

  async function submit() {
    if (!product || busy) return;
    const u = getUser();
    if (!u) return toast.error("กรุณาเข้าสู่ระบบก่อน");
    if (!robloxName.trim()) return toast.error("กรุณากรอกชื่อผู้ใช้ Roblox");
    const amount = Number(bid);
    if (!amount || amount <= 0) return toast.error("กรอกจำนวนเงินให้ถูกต้อง");
    setBusy(true);
    try {
      const r = await placeBid(product.id, u.id, amount, robloxName.trim());
      toast.success(`เสนอราคา ฿${r.amount.toFixed(2)} สำเร็จ`);
      setBid(String(r.next_min));
      await refreshUser();
      load();
    } catch (e: any) {
      toast.error(e.message ?? "เสนอราคาไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const balance = Number(user?.balance ?? 0);
  const myTop = info?.bids.find((b) => b.user_id === user?.id);
  const leading = info?.bids[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto bg-gradient-card border-gold/40 p-4 sm:p-6">
        {product && (
          <div className="space-y-4">
            <DialogHeader className="min-w-0 space-y-1">
              <DialogTitle className="font-display text-xl sm:text-2xl text-gradient-gold pr-6 flex items-center gap-2 min-w-0">
                <Gavel className="w-5 h-5 text-gold shrink-0" /> 
                <span className="truncate flex-1">{product.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40 font-normal shrink-0">
                  ประมูล
                </span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-gold text-xs sm:text-sm truncate">
                <Timer className="w-4 h-4 shrink-0" />
                {closed ? "ปิดประมูลแล้ว" : `เหลือเวลา ${countdown}`}
              </DialogDescription>
            </DialogHeader>

            <div className="relative z-0 aspect-video w-full rounded-lg overflow-hidden bg-onyx border border-white/5">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover select-none" 
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Crown className="w-16 h-16 text-primary/30" />
                </div>
              )}
            </div>

            {product.description && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto bg-black/20 p-2 rounded border border-white/5">
                {product.description}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-2 bg-black/20">
                <div className="text-[11px] text-muted-foreground">ราคาปัจจุบัน</div>
                <div className="font-bold text-gold text-lg truncate">
                  ฿{(info?.top ?? Number(product.auction_start_price)).toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-border p-2 bg-black/20">
                <div className="text-[11px] text-muted-foreground">เพิ่มขั้นละ</div>
                <div className="font-bold text-lg truncate">฿{Number(product.auction_step).toFixed(2)}</div>
              </div>
            </div>

            {leading && (
              <div className="text-xs text-muted-foreground min-w-0 truncate px-1">
                ผู้นำขณะนี้: <span className="text-foreground font-medium">{leading.username ?? "ผู้ใช้"}</span>
                {myTop && leading.user_id === user?.id && (
                  <span className="text-emerald-400"> (คุณกำลังนำ)</span>
                )}
              </div>
            )}

            {closed ? (
              <div className="rounded-lg border border-gold/40 bg-onyx/40 p-3 text-sm text-center">
                {product.auction_final_price
                  ? `ปิดประมูลที่ ฿${Number(product.auction_final_price).toFixed(2)} — ผู้ชนะจะเห็นรายการในหน้า "ติดตามคำสั่งซื้อ"`
                  : "การประมูลปิดแล้ว"}
              </div>
            ) : (
              <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> ยอดในเว็บของคุณ
                  </span>
                  <span className={balance >= Number(bid) ? "text-emerald-400 font-medium" : "text-destructive font-medium"}>
                    ฿{balance.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs opacity-70">ชื่อผู้ใช้ Roblox (สำหรับรับของ)</Label>
                  <Input 
                    value={robloxName} 
                    onChange={(e) => setRobloxName(e.target.value)} 
                    placeholder="ชื่อในเกม"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs opacity-70">
                      ราคาที่เสนอ (ขั้นต่ำ ฿{(info?.minNext ?? Number(product.auction_start_price)).toFixed(2)})
                    </Label>
                    <Input 
                      type="number" 
                      value={bid} 
                      onChange={(e) => setBid(e.target.value)} 
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button variant="luxe" disabled={busy} onClick={submit} className="h-9 px-4 shrink-0">
                    {busy ? "รอ..." : "ประมูล"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight italic">
                  * เงินจะยังไม่ถูกหักจนกว่าการประมูลจะจบและคุณเป็นผู้ชนะ แต่ต้องมียอดเพียงพอขณะเสนอราคา
                </p>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gold uppercase tracking-wider px-1">อันดับผู้ประมูล</div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-black/10">
                  {leaderboard.map((b, i) => (
                    <div
                      key={b.id}
                      className="flex justify-between items-center text-xs px-3 py-2 border-b border-border/60 last:border-0 hover:bg-white/5 transition-colors"
                    >
                      <span className="truncate mr-2">
                        <span className="opacity-50 inline-block w-4">{i + 1}.</span> 
                        <span className="font-medium">{b.username ?? "ผู้ใช้"}</span>
                        {b.user_id === user?.id && <span className="text-gold ml-1">(คุณ)</span>}
                      </span>
                      <span className="text-gold font-bold shrink-0">฿{b.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
