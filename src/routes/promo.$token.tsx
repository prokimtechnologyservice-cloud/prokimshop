import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { getPromotionByToken, claimPromotionLink, type Promotion } from "@/lib/promotions";
import { toast } from "sonner";
import { Tag, Gift } from "lucide-react";

export const Route = createFileRoute("/promo/$token")({
  component: PromoLinkPage,
  head: () => ({
    meta: [
      { title: "รับสิทธิ์โปรโมชั่น - PROKIM" },
      { name: "description", content: "รับสิทธิ์ส่วนลดและโปรโมชั่นพิเศษจาก PROKIM ผ่านลิงก์นี้" },
      { property: "og:title", content: "รับสิทธิ์โปรโมชั่น - PROKIM" },
      { property: "og:description", content: "รับสิทธิ์ส่วนลดและโปรโมชั่นพิเศษจาก PROKIM ผ่านลิงก์นี้" },
    ],
  }),
});

function typeLabel(p: Promotion) {
  if (p.discount_type === "percent") return `ลด ${p.discount_value}%`;
  if (p.discount_type === "amount") return `ลด ฿${p.discount_value}`;
  if (p.discount_type === "bogo") return `ซื้อ ${p.buy_qty} แถม ${p.get_qty}`;
  return "-";
}

function PromoLinkPage() {
  const { token } = useParams({ from: "/promo/$token" });
  const [promo, setPromo] = useState<Promotion | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const user = getUser();

  useEffect(() => {
    getPromotionByToken(token)
      .then(setPromo)
      .catch(() => setPromo(null));
  }, [token]);

  async function handleClaim() {
    if (!user || !promo) return;
    setBusy(true);
    try {
      const res = await claimPromotionLink(promo.id, user.id, promo.valid_days);
      if (res.alreadyClaimed) toast("คุณได้รับสิทธิ์นี้แล้ว");
      else toast.success("รับสิทธิ์สำเร็จ!");
      setClaimed(true);
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-md mx-auto px-4 py-10">
        {promo === undefined ? (
          <p className="text-center text-muted-foreground">กำลังโหลด...</p>
        ) : promo === null ? (
          <p className="text-center text-muted-foreground">ไม่พบโปรโมชั่นนี้ หรือลิงก์ถูกปิดใช้งานแล้ว</p>
        ) : (
          <div className="border border-gold/40 rounded-xl overflow-hidden bg-gradient-card">
            <div className="aspect-video bg-muted flex items-center justify-center">
              {promo.image_url ? (
                <img src={promo.image_url} className="w-full h-full object-cover" />
              ) : (
                <Tag className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-xl text-gradient-gold">{promo.name}</h1>
                <span className="text-xs px-2 py-1 rounded-full bg-gold/20 text-gold">{typeLabel(promo)}</span>
              </div>
              {promo.description && <p className="text-sm text-muted-foreground">{promo.description}</p>}

              {!user ? (
                <div className="text-sm text-center text-muted-foreground py-4">
                  กรุณาเข้าสู่ระบบเพื่อรับสิทธิ์โปรโมชั่นนี้
                </div>
              ) : claimed ? (
                <div className="text-sm text-center text-emerald-400 py-2">✓ รับสิทธิ์แล้ว ไปเลือกซื้อสินค้าได้เลย!</div>
              ) : (
                <Button onClick={handleClaim} disabled={busy} variant="luxe" className="w-full">
                  <Gift className="w-4 h-4 mr-1" /> {busy ? "กำลังดำเนินการ..." : "รับสิทธิ์"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
