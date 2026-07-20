import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
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
import { Crown, ShoppingCart, Sparkles, TrendingUp, Flame, Star, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, sc, scBool } from "@/lib/siteContent";
import { RobloxIdDialog } from "@/components/RobloxIdDialog";
import { MysteryBoxDialog } from "@/components/MysteryBoxDialog";
import { boxColor, BORDER_CLASS, RING_CLASS } from "@/lib/mysteryBox";

const searchSchema = z.object({
  cat: fallback(z.string(), "").default(""),
  p: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Prokim shop — ร้านไอเทมเกมพรีเมียม" },
      {
        name: "description",
        content: "ซื้อ Robux, Blox Fruits, Brookhaven , Grow a garden 2 , และอื่นของ roblox ในที่เดียว",
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
  slug: string | null;
  display_mode: string | null;
  image_url: string | null;
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
  product_type: string;
  is_featured: boolean;
  is_new: boolean;
  account_available?: number;
  box_spin_price?: number;
  box_border_color?: string | null;
  box_bg_color?: string | null;
};

function Index() {
  const { cat: deepCat, p: deepProd } = Route.useSearch();
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeParent, setActiveParent] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [topCatId, setTopCatId] = useState<string | null>(null);
  const [siteOpen, setSiteOpen] = useState(true);
  const [closedMsg, setClosedMsg] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const [boxDetail, setBoxDetail] = useState<Product | null>(null);
  const [pending, setPending] = useState<Product | null>(null);
  const productsRef = useRef<HTMLElement | null>(null);
  const { content } = useSiteContent();
  const user = getUser();

  async function load() {
    const [{ data: c }, { data: p }, { data: s }, { data: vw }, { data: acct }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order").order("created_at"),
      supabase.from("products").select("*").order("sort_order").order("created_at"),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("category_views").select("category_id"),
      supabase.from("product_account_stock").select("product_id, status").eq("status", "available"),
    ]);
    const catList = ((c as any[]) ?? []).map((x) => ({
      ...x,
      parent_id: x.parent_id ?? null,
      slug: x.slug ?? null,
      display_mode: x.display_mode ?? "text",
      image_url: x.image_url ?? null,
    })) as Category[];
    setCats(catList);

    // count available accounts per product
    const acctCount: Record<string, number> = {};
    ((acct as any[]) ?? []).forEach((r) => {
      acctCount[r.product_id] = (acctCount[r.product_id] ?? 0) + 1;
    });

    const prodList = ((p as any[]) ?? []).map((x) => {
      const type = x.product_type ?? "normal";
      const avail = acctCount[x.id] ?? 0;
      return {
        ...x,
        price: Number(x.price),
        stock: type === "account" ? avail : x.stock,
        product_type: type,
        is_featured: !!x.is_featured,
        is_new: !!x.is_new,
        account_available: type === "account" ? avail : undefined,
      };
    }) as Product[];
    setProducts(prodList);

    if (s) {
      setSiteOpen(s.is_open);
      setClosedMsg(s.closed_message ?? "");
    }
    const catCounts: Record<string, number> = {};
    ((vw as { category_id: string }[]) ?? []).forEach((v) => {
      catCounts[v.category_id] = (catCounts[v.category_id] ?? 0) + 1;
    });
    const topEntry = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    if (topEntry) setTopCatId(topEntry[0]);

    return { catList, prodList };
  }

  useEffect(() => {
    (async () => {
      const { catList, prodList } = await load();

      // deep-link handling
      if (deepProd) {
        const found = prodList.find((x) => x.id === deepProd);
        if (found) openDetail(found);
      }
      if (deepCat) {
        const target = catList.find((c) => c.slug === deepCat);
        if (target) {
          if (target.parent_id) {
            setActiveParent(target.parent_id);
            setActiveSub(target.id);
          } else {
            setActiveParent(target.id);
            const firstChild = catList.find((c) => c.parent_id === target.id);
            setActiveSub(firstChild?.id ?? null);
          }
          setTimeout(
            () => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
            300,
          );
          return;
        }
      }
      const firstParent = catList.find((c) => !c.parent_id);
      if (firstParent && !activeParent) {
        setActiveParent(firstParent.id);
        const firstChild = catList.find((c) => c.parent_id === firstParent.id);
        setActiveSub(firstChild?.id ?? null);
      }

      const sk = sessionStorage.getItem("vk") || crypto.randomUUID();
      sessionStorage.setItem("vk", sk);
      supabase.from("visits").insert({ session_key: sk });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openDetail(p: Product) {
    if (p.product_type === "mystery_box") setBoxDetail(p);
    else setDetail(p);
  }

  async function requestAdd(p: Product) {
    if (p.product_type === "mystery_box") {
      setBoxDetail(p);
      return;
    }
    if ((p.stock ?? null) === 0) return toast.error("สินค้าหมด");
    const u = getUser();
    if (!u) return toast.error("กรุณาเข้าสู่ระบบก่อน");
    // account (ไก่ตัน) products don't need roblox id (delivered as account payload)
    if (p.product_type === "account") {
      await addToCart(u.id, { id: p.id, name: p.name, price: p.price }, null);
      toast.success(`เพิ่ม ${p.name} ลงตะกร้า`);
      return;
    }
    setPending(p);
  }

  async function confirmAdd(robloxName: string) {
    if (!pending) return;
    const u = getUser();
    if (!u) return;
    await addToCart(u.id, { id: pending.id, name: pending.name, price: pending.price }, robloxName);
    toast.success(`เพิ่ม ${pending.name} ลงตะกร้า (ID: ${robloxName})`);
    setPending(null);
  }

  function shareProduct(p: Product) {
    const url = `${window.location.origin}/product/${p.id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("คัดลอกลิงก์แล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
  }
  function shareCategory(c: Category) {
    if (!c.slug) return toast.error("หมวดนี้ยังไม่มีลิงก์แชร์");
    const url = `${window.location.origin}/category/${c.slug}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("คัดลอกลิงก์หมวดแล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
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

  const featured = useMemo(
    () => products.filter((p) => p.is_featured).slice(0, 6),
    [products],
  );
  const newest = useMemo(
    () => products.filter((p) => p.is_new).slice(0, 6),
    [products],
  );
  const newestCats = useMemo(() => [...parents].slice(-3).reverse(), [parents]);

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
      {(topCat || featured.length > 0 || newestCats.length > 0) && (
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

          {featured.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" /> สินค้าแนะนำ
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {featured.map((p) => (
                  <ProductCard key={p.id} p={p} onOpen={() => openDetail(p)} onAdd={() => requestAdd(p)} compact />
                ))}
              </div>
            </div>
          )}

          {newest.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" /> สินค้ามาใหม่
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {newest.map((p) => (
                  <ProductCard key={p.id} p={p} onOpen={() => openDetail(p)} onAdd={() => requestAdd(p)} compact />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Category tabs */}
      <section className="sticky top-16 z-30 glass border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
          {parents.map((c) => {
            const isImg = c.display_mode === "image" && c.image_url;
            const active = activeParent === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCategory(c.id)}
                className={`shrink-0 rounded-xl overflow-hidden border transition ${
                  isImg ? "w-40 aspect-video" : "px-4 py-2 text-sm whitespace-nowrap"
                } ${
                  active
                    ? "border-primary shadow-luxe ring-2 ring-primary/40"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {isImg ? (
                  <img src={c.image_url!} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  c.name
                )}
              </button>
            );
          })}
        </div>
        {subs.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto">
            {subs.map((c) => {
              const isImg = c.display_mode === "image" && c.image_url;
              const active = activeSub === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveSub(c.id)}
                  className={`shrink-0 rounded-lg overflow-hidden border transition ${
                    isImg ? "w-32 aspect-video" : "px-3 py-1.5 text-xs whitespace-nowrap"
                  } ${
                    active
                      ? "border-gold ring-2 ring-gold/40"
                      : "border-border bg-card hover:border-gold/50"
                  }`}
                >
                  {isImg ? (
                    <img src={c.image_url!} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    c.name
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Product grid */}
      <main ref={productsRef} className="mx-auto max-w-7xl px-4 sm:px-6 py-10 scroll-mt-32">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h2 className="font-display text-3xl">
            {cats.find((c) => c.id === effectiveCatId)?.name ?? ""}
          </h2>
          {effectiveCatId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const c = cats.find((x) => x.id === effectiveCatId);
                if (c) shareCategory(c);
              }}
            >
              <Share2 className="w-4 h-4 mr-1" /> แชร์หมวดนี้
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={() => openDetail(p)} onAdd={() => requestAdd(p)} />
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
                <DialogTitle className="font-display text-2xl text-gradient-gold pr-6 flex items-center gap-2">
                  {detail.name}
                  {detail.product_type === "account" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40 font-normal">
                      ไก่ตัน
                    </span>
                  )}
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
              <div className="flex gap-2">
                <Button
                  variant="luxe"
                  disabled={detail.stock === 0}
                  className="flex-1"
                  onClick={() => {
                    requestAdd(detail);
                    setDetail(null);
                  }}
                >
                  <ShoppingCart className="w-4 h-4" /> {detail.stock === 0 ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
                </Button>
                <Button variant="outline" onClick={() => shareProduct(detail)}>
                  <Share2 className="w-4 h-4" /> แชร์
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RobloxIdDialog
        open={!!pending}
        productName={pending?.name ?? ""}
        defaultName={user?.roblox_name}
        onConfirm={confirmAdd}
        onOpenChange={(v) => !v && setPending(null)}
      />

      <MysteryBoxDialog
        open={!!boxDetail}
        box={boxDetail ? {
          id: boxDetail.id,
          name: boxDetail.name,
          description: boxDetail.description,
          image_url: boxDetail.image_url,
          box_spin_price: Number(boxDetail.box_spin_price ?? 0),
          box_border_color: boxDetail.box_border_color ?? null,
          box_bg_color: boxDetail.box_bg_color ?? null,
        } : null}
        onOpenChange={(v) => !v && setBoxDetail(null)}
      />

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
        {p.product_type === "account" && (
          <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-gold/90 text-onyx font-bold">
            ไก่ตัน
          </span>
        )}
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
