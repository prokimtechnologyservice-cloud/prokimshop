import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Crown, ShoppingCart, Sparkles, TrendingUp, Flame, Star } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, sc, scBool } from "@/lib/siteContent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PROKIM — ร้านไอเทมเกมพรีเมียม" },
      {
        name: "description",
        content: "ซื้อ Robux, Blox Fruits, Brookhaven และไอเทม 99 คืนในป่า ในที่เดียว",
      },
    ],
  }),
  component: Index,
});

type Category = {
  id: string;
  name: string;
  sort_order: number;
  parent_id: string | null;
};
type Product = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  stock: number | null;
  created_at: string;
};
type ProductRow = Omit<Product, "price" | "stock"> & { price: number | string; stock: number | null };

function Index() {
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeParent, setActiveParent] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [topCatId, setTopCatId] = useState<string | null>(null);
  const [topProductIds, setTopProductIds] = useState<string[]>([]);
  const [siteOpen, setSiteOpen] = useState(true);
  const [closedMsg, setClosedMsg] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const productsRef = useRef<HTMLElement | null>(null);
  const { content } = useSiteContent();

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }, { data: s }, { data: vw }, { data: oi }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("products").select("*").order("sort_order"),
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("category_views").select("category_id"),
        supabase.from("order_items").select("product_id, quantity"),
      ]);
      const catList = ((c as Category[]) ?? []).map((x) => ({ ...x, parent_id: x.parent_id ?? null }));
      setCats(catList);
      setProducts(
        ((p as ProductRow[]) ?? []).map((x) => ({ ...x, price: Number(x.price), stock: x.stock })),
      );
      const firstParent = catList.find((c) => !c.parent_id);
      if (firstParent) {
        setActiveParent(firstParent.id);
        const firstChild = catList.find((c) => c.parent_id === firstParent.id);
        setActiveSub(firstChild?.id ?? null);
      }
      if (s) {
        setSiteOpen(s.is_open);
        setClosedMsg(s.closed_message ?? "");
      }

      // most-viewed category
      const catCounts: Record<string, number> = {};
      ((vw as { category_id: string }[]) ?? []).forEach((v) => {
        catCounts[v.category_id] = (catCounts[v.category_id] ?? 0) + 1;
      });
      const topEntry = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
      if (topEntry) setTopCatId(topEntry[0]);

      // best-sellers
      const prodCounts: Record<string, number> = {};
      ((oi as { product_id: string | null; quantity: number }[]) ?? []).forEach((o) => {
        if (!o.product_id) return;
        prodCounts[o.product_id] = (prodCounts[o.product_id] ?? 0) + o.quantity;
      });
      setTopProductIds(
        Object.entries(prodCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id),
      );

      const sk = sessionStorage.getItem("vk") || crypto.randomUUID();
      sessionStorage.setItem("vk", sk);
      supabase.from("visits").insert({ session_key: sk });
    })();
  }, []);

  // track category view
  useEffect(() => {
    const id = activeSub || activeParent;
    if (!id) return;
    const sk = sessionStorage.getItem("vk") ?? undefined;
    supabase.from("category_views").insert({ category_id: id, session_key: sk });
  }, [activeSub, activeParent]);

  function handleSelectCategory(id: string) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    if (c.parent_id) {
      setActiveParent(c.parent_id);
      setActiveSub(c.id);
    } else {
      setActiveParent(c.id);
      const firstChild = cats.find((x) => x.parent_id === c.id);
      setActiveSub(firstChild?.id ?? null);
    }
    setTimeout(
      () => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  async function handleAdd(p: Product) {
    if (p.stock === 0) return toast.error("สินค้าหมด");
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

  const parents = cats.filter((c) => !c.parent_id);
  const subs = activeParent ? cats.filter((c) => c.parent_id === activeParent) : [];
  const effectiveCatId = subs.length > 0 ? activeSub : activeParent;
  const visible = products.filter((p) => p.category_id === effectiveCatId);

  const topCat = topCatId ? cats.find((c) => c.id === topCatId) : null;
  const topProducts = topProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((x): x is Product => !!x);
  const newestProducts = useMemo(
    () => [...products].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6),
    [products],
  );
  const newestCats = useMemo(
    () => [...parents].slice(-3).reverse(),
    [parents],
  );

  return (
    <div className="min-h-screen">
      <SiteHeader onSelectCategory={handleSelectCategory} />

      {/* Hero */}
      {scBool(content, "show_hero", true) && (
        <section className="relative bg-gradient-hero overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, oklch(0.55 0.20 18 / 0.6), transparent 40%), radial-gradient(circle at 80% 30%, oklch(0.78 0.13 85 / 0.3), transparent 40%)",
            }}
          />
          {sc(content, "banner_url") && (
            <img
              data-site-key="banner_url"
              src={sc(content, "banner_url")}
              alt="banner"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 text-center">
            <div
              data-site-key="hero_badge"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-xs text-gold mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />{" "}
              {sc(content, "hero_badge", "LUXURY GAMING STORE")}
            </div>
            <h1
              data-site-key="hero_title"
              className="font-display text-5xl sm:text-7xl font-bold mb-4"
            >
              <span className="text-gradient-gold">{sc(content, "hero_title", "PROKIM")}</span>
            </h1>
            <p
              data-site-key="hero_subtitle"
              className="text-lg text-muted-foreground max-w-xl mx-auto whitespace-pre-wrap"
            >
              {sc(
                content,
                "hero_subtitle",
                "ร้านไอเทมเกมพรีเมียม — Robux, Blox Fruits, Brookhaven, 99 คืนในป่า ราคาดี ส่งไว ปลอดภัย",
              )}
            </p>
          </div>
        </section>
      )}

      {/* Highlights */}
      {(topCat || topProducts.length > 0 || newestCats.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
          {(topCat || newestCats.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topCat && (
                <button
                  onClick={() => handleSelectCategory(topCat.id)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-card border border-gold/40 shadow-luxe hover:shadow-xl transition text-left"
                >
                  <TrendingUp className="w-8 h-8 text-gold shrink-0" />
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-gold">หมวดยอดนิยม</div>
                    <div className="font-display text-lg">{topCat.name}</div>
                  </div>
                </button>
              )}
              {newestCats.length > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-card border border-primary/40">
                  <Star className="w-6 h-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-widest text-primary">หมวดใหม่</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {newestCats.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCategory(c.id)}
                          className="text-xs px-2 py-1 rounded-full border border-primary/40 hover:bg-primary/10"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {topProducts.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" /> ขายดี · มาแรง
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {topProducts.map((p) => (
                  <ProductCard key={p.id} p={p} onOpen={() => setDetail(p)} onAdd={() => handleAdd(p)} compact />
                ))}
              </div>
            </div>
          )}

          {newestProducts.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" /> สินค้ามาใหม่
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {newestProducts.map((p) => (
                  <ProductCard key={p.id} p={p} onOpen={() => setDetail(p)} onAdd={() => handleAdd(p)} compact />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Category tabs */}
      <section className="sticky top-16 z-30 glass border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
          {parents.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${
                activeParent === c.id
                  ? "bg-gradient-crimson border-primary text-primary-foreground shadow-luxe"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        {subs.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
            {subs.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveSub(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition ${
                  activeSub === c.id
                    ? "bg-gold text-onyx border-gold font-medium"
                    : "border-border bg-card hover:border-gold/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Product grid */}
      <main ref={productsRef} className="mx-auto max-w-7xl px-4 sm:px-6 py-10 scroll-mt-32">
        <h2 className="font-display text-3xl mb-6">
          {cats.find((c) => c.id === effectiveCatId)?.name ?? ""}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={() => setDetail(p)} onAdd={() => handleAdd(p)} />
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
                <DialogTitle className="font-display text-2xl text-gradient-gold pr-6">
                  {detail.name}
                </DialogTitle>
                <DialogDescription className="text-gold font-bold text-lg">
                  {detail.price > 0 ? `฿${detail.price.toFixed(2)}` : "ติดต่อแอดมิน"}
                </DialogDescription>
              </DialogHeader>
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-onyx relative">
                {detail.image_url ? (
                  <img
                    src={detail.image_url}
                    alt={detail.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Crown className="w-16 h-16 text-primary/30" />
                  </div>
                )}
                {detail.stock === 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-4xl font-bold text-destructive tracking-widest">หมด</span>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                {detail.description || "ไม่มีคำอธิบายเพิ่มเติม"}
              </div>
              {detail.stock != null && detail.stock > 0 && (
                <div className="text-sm text-gold">คงเหลือ {detail.stock} ชิ้น</div>
              )}
              <Button
                variant="luxe"
                disabled={detail.stock === 0}
                onClick={() => {
                  handleAdd(detail);
                  setDetail(null);
                }}
              >
                <ShoppingCart className="w-4 h-4" /> {detail.stock === 0 ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer
        data-site-key="footer_text"
        className="border-t border-border mt-10 py-8 text-center text-xs text-muted-foreground whitespace-pre-wrap"
      >
        {sc(
          content,
          "footer_text",
          `© ${new Date().getFullYear()} PROKIM Luxe Store · Crafted with passion`,
        )}
      </footer>
    </div>
  );
}

function ProductCard({
  p,
  onOpen,
  onAdd,
  compact,
}: {
  p: Product;
  onOpen: () => void;
  onAdd: () => void;
  compact?: boolean;
}) {
  const sold = p.stock === 0;
  return (
    <button
      onClick={onOpen}
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
        {sold && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-bold text-destructive tracking-widest drop-shadow-lg">
              หมด
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 space-y-2 ${compact ? "text-xs" : ""}`}>
        <div className={`font-medium ${compact ? "text-xs" : "text-sm"} line-clamp-2 min-h-[2.5rem]`}>
          {p.name}
        </div>
        {!compact && p.description && (
          <div className="text-[11px] text-muted-foreground line-clamp-2 min-h-[2rem]">
            {p.description}
          </div>
        )}
        <div className="text-gold font-bold">
          {p.price > 0 ? `฿${p.price.toFixed(2)}` : "ติดต่อแอดมิน"}
        </div>
        {p.stock != null && p.stock > 0 && (
          <div className="text-[11px] text-muted-foreground">คงเหลือ {p.stock} ชิ้น</div>
        )}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          size="sm"
          variant="luxe"
          disabled={sold}
          className="w-full"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> {sold ? "หมด" : "เพิ่มลงตะกร้า"}
        </Button>
      </div>
    </button>
  );
}
