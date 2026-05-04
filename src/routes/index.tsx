import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Crown, ShoppingCart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, sc, scBool } from "@/lib/siteContent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PROKIM — ร้านไอเทมเกมพรีเมียม" },
      { name: "description", content: "ซื้อ Robux, Blox Fruits, Brookhaven และไอเทม 99 คืนในป่า ในที่เดียว" },
    ],
  }),
  component: Index,
});

type Category = { id: string; name: string; sort_order: number };
type Product = {
  id: string; category_id: string; name: string; price: number;
  description: string | null; image_url: string | null;
};

function Index() {
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [siteOpen, setSiteOpen] = useState(true);
  const [closedMsg, setClosedMsg] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const productsRef = useRef<HTMLElement | null>(null);
  const { content } = useSiteContent();

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("products").select("*").order("sort_order"),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setCats((c as Category[]) ?? []);
      setProducts(((p as any[]) ?? []).map((x) => ({ ...x, price: Number(x.price) })));
      if (c && c.length > 0) setActive(c[0].id);
      if (s) {
        setSiteOpen(s.is_open);
        setClosedMsg(s.closed_message ?? "");
      }
      const sk = sessionStorage.getItem("vk") || crypto.randomUUID();
      sessionStorage.setItem("vk", sk);
      supabase.from("visits").insert({ session_key: sk });
    })();
  }, []);

  function handleSelectCategory(id: string) {
    if (id !== "__all__") setActive(id);
    setTimeout(() => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleAdd(p: Product) {
    const u = getUser();
    if (!u) return toast.error("กรุณาเข้าสู่ระบบก่อน");
    await addToCart(u.id, { id: p.id, name: p.name, price: p.price });
    toast.success(`เพิ่ม ${p.name} ลงตะกร้า`);
  }

  if (!siteOpen) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Crown className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="font-display text-4xl text-gradient-gold mb-2">ปิดให้บริการชั่วคราว</h1>
          <p className="text-muted-foreground">{closedMsg || "กรุณากลับมาใหม่ภายหลัง"}</p>
        </div>
      </div>
    );
  }

  const visible = products.filter((p) => p.category_id === active);

  return (
    <div className="min-h-screen">
      <SiteHeader onSelectCategory={handleSelectCategory} />

      {/* Hero */}
      {scBool(content, "show_hero", true) && (
      <section className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.55 0.20 18 / 0.6), transparent 40%), radial-gradient(circle at 80% 30%, oklch(0.78 0.13 85 / 0.3), transparent 40%)",
        }} />
        {sc(content, "banner_url") && (
          <img src={sc(content, "banner_url")} alt="banner" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-xs text-gold mb-6">
            <Sparkles className="w-3.5 h-3.5" /> LUXURY GAMING STORE
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold mb-4">
            <span className="text-gradient-gold">{sc(content, "hero_title", "PROKIM")}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto whitespace-pre-wrap">
            {sc(content, "hero_subtitle", "ร้านไอเทมเกมพรีเมียม — Robux, Blox Fruits, Brookhaven, 99 คืนในป่า ราคาดี ส่งไว ปลอดภัย")}
          </p>
        </div>
      </section>
      )}

      {/* Category tabs */}
      <section className="sticky top-16 z-30 glass border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${
                active === c.id
                  ? "bg-gradient-crimson border-primary text-primary-foreground shadow-luxe"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <main ref={productsRef} className="mx-auto max-w-7xl px-4 sm:px-6 py-10 scroll-mt-32">
        <h2 className="font-display text-3xl mb-6">
          {cats.find((c) => c.id === active)?.name ?? ""}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => setDetail(p)}
              className="group relative text-left bg-gradient-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-luxe hover:border-primary/50 transition"
            >
              <div className="aspect-square bg-onyx relative overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Crown className="w-12 h-12 text-primary/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-onyx/90 via-transparent to-transparent" />
              </div>
              <div className="p-3 space-y-2">
                <div className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                {p.description && (
                  <div className="text-[11px] text-muted-foreground line-clamp-2 min-h-[2rem]">{p.description}</div>
                )}
                <div className="text-gold font-bold">
                  {p.price > 0 ? `฿${p.price.toFixed(2)}` : "ติดต่อแอดมิน"}
                </div>
                <Button
                  onClick={(e) => { e.stopPropagation(); handleAdd(p); }}
                  size="sm" variant="luxe" className="w-full"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> เพิ่มลงตะกร้า
                </Button>
              </div>
            </button>
          ))}
        </div>
        {visible.length === 0 && (
          <div className="text-center text-muted-foreground py-20">ยังไม่มีสินค้าในหมวดนี้</div>
        )}
      </main>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl bg-gradient-card border-primary/40">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-gradient-gold pr-6">{detail.name}</DialogTitle>
                <DialogDescription className="text-gold font-bold text-lg">
                  {detail.price > 0 ? `฿${detail.price.toFixed(2)}` : "ติดต่อแอดมิน"}
                </DialogDescription>
              </DialogHeader>
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-onyx">
                {detail.image_url ? (
                  <img src={detail.image_url} alt={detail.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Crown className="w-16 h-16 text-primary/30" /></div>
                )}
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                {detail.description || "ไม่มีคำอธิบายเพิ่มเติม"}
              </div>
              <Button variant="luxe" onClick={() => { handleAdd(detail); setDetail(null); }}>
                <ShoppingCart className="w-4 h-4" /> เพิ่มลงตะกร้า
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-10 py-8 text-center text-xs text-muted-foreground whitespace-pre-wrap">
        {sc(content, "footer_text", `© ${new Date().getFullYear()} PROKIM Luxe Store · Crafted with passion`)}
      </footer>
    </div>
  );
}
