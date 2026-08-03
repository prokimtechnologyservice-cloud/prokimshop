import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Crown, Search as SearchIcon } from "lucide-react";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: ({ match }) => {
    const q = (match.search as { q?: string })?.q ?? "";
    return {
      meta: [
        { title: q ? `ค้นหา "${q}" — PROKIM` : "ค้นหาสินค้า — PROKIM" },
        {
          name: "description",
          content: q
            ? `ผลการค้นหา "${q}" บน PROKIM — Robux, Blox Fruits, Brookhaven, Grow a Garden 2 และไอเทมเกมยอดนิยม`
            : "ค้นหา Robux, Blox Fruits, Grow a Garden 2 (GAG2), Brookhaven และไอเทมเกม Roblox ยอดนิยมที่ PROKIM",
        },
      ],
    };
  },
  component: SearchPage,
});

type Cat = {
  id: string;
  name: string;
  parent_id: string | null;
  search_keywords: string[] | null;
};
type Prod = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  stock: number | null;
  search_keywords: string[] | null;
};

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(q);
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);

  useEffect(() => setTerm(q), [q]);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("categories").select("id, name, parent_id, search_keywords"),
        supabase
          .from("products")
          .select("id, category_id, name, price, description, image_url, stock, search_keywords"),
      ]);
      setCats((c as Cat[]) ?? []);
      setProds(
        ((p as any[]) ?? []).map((x) => ({ ...x, price: Number(x.price) })),
      );
    })();
  }, []);

  const query = q.trim().toLowerCase();
  const matches = (haystacks: (string | null | undefined)[]) =>
    !query ||
    haystacks.some((s) => (s ?? "").toLowerCase().includes(query));

  const foundCats = useMemo(
    () =>
      query
        ? cats.filter((c) =>
            matches([c.name, ...(c.search_keywords ?? [])]),
          )
        : [],
    [cats, query],
  );

  const foundProds = useMemo(
    () =>
      query
        ? prods.filter((p) =>
            matches([p.name, p.description, ...(p.search_keywords ?? [])]),
          )
        : [],
    [prods, query],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { q: term.trim() } });
  }

  function goToProduct(id: string) {
    navigate({ to: "/", search: { p: id } as any });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToCategory(c: Cat) {
    navigate({ to: "/", search: { cat: c.id, q: undefined } as any });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <h1 className="font-display text-3xl text-gradient-gold mb-4">ค้นหาสินค้า</h1>
        <form onSubmit={submit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="เช่น Robux, GAG2, Blox Fruit, Brookhaven"
              className="pl-9"
              autoFocus
            />
          </div>
        </form>

        {!query && (
          <div className="text-muted-foreground text-sm">พิมพ์คำที่ต้องการค้นหาแล้วกด Enter</div>
        )}

        {query && (
          <>
            <section className="mb-8">
              <h2 className="font-display text-lg mb-3">หมวดหมู่ที่ตรง ({foundCats.length})</h2>
              {foundCats.length === 0 ? (
                <div className="text-sm text-muted-foreground">ไม่พบหมวดหมู่</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {foundCats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goToCategory(c)}
                      className="px-3 py-2 rounded-full border border-primary/40 bg-card hover:bg-primary/10 text-sm"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-display text-lg mb-3">สินค้าที่ตรง ({foundProds.length})</h2>
              {foundProds.length === 0 ? (
                <div className="text-sm text-muted-foreground">ไม่พบสินค้า</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {foundProds.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goToProduct(p.id)}
                      className="group text-left bg-gradient-card border border-border rounded-xl overflow-hidden shadow-card hover:shadow-luxe hover:border-primary/50 transition"
                    >
                      <div className="aspect-square bg-onyx relative overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Crown className="w-10 h-10 text-primary/30" />
                          </div>
                        )}
                        {p.stock === 0 && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <span className="text-2xl font-bold text-destructive tracking-widest">หมด</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                        <div className="text-gold font-bold text-sm mt-1">
                          {p.price > 0 ? `฿${p.price.toFixed(2)}` : "ติดต่อแอดมิน"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
