import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string; parent_id: string | null };
type Product = { id: string; name: string; description: string | null; image_url: string | null; category_id: string | null };

export type PromoPickerValue = {
  applies_to: "all" | "products" | "categories";
  product_ids: string[];
  category_ids: string[];
};

export function PromoPicker({
  value,
  onChange,
}: {
  value: PromoPickerValue;
  onChange: (v: PromoPickerValue) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("id, name, parent_id").order("sort_order" as any),
        supabase.from("products").select("id, name, description, image_url, category_id").order("sort_order" as any),
      ]);
      setCategories((cats ?? []) as any);
      setProducts((prods ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const mainCats = categories.filter((c) => !c.parent_id);
  const subCatsOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const search_l = search.trim().toLowerCase();

  const productsOf = (catId: string) =>
    products.filter(
      (p) =>
        p.category_id === catId &&
        (!search_l || p.name.toLowerCase().includes(search_l) || (p.description ?? "").toLowerCase().includes(search_l)),
    );

  function setMode(mode: "products" | "categories" | "all") {
    onChange({ applies_to: mode, product_ids: [], category_ids: [] });
  }

  function toggleProduct(id: string) {
    const set = new Set(value.product_ids);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange({ ...value, product_ids: Array.from(set) });
  }

  function toggleCategory(id: string) {
    const set = new Set(value.category_ids);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange({ ...value, category_ids: Array.from(set) });
  }

  function selectAllInGroup(catId: string) {
    const prods = productsOf(catId).map((p) => p.id);
    const set = new Set(value.product_ids);
    const allSelected = prods.every((id) => set.has(id));
    prods.forEach((id) => (allSelected ? set.delete(id) : set.add(id)));
    onChange({ ...value, product_ids: Array.from(set) });
  }

  const groups = useMemo(() => {
    return mainCats
      .map((mc) => ({
        cat: mc,
        subs: subCatsOf(mc.id).map((sc) => ({ cat: sc, products: productsOf(sc.id) })).filter((s) => s.products.length > 0 || !search_l),
        directProducts: productsOf(mc.id),
      }))
      .filter(
        (g) =>
          g.directProducts.length > 0 ||
          g.subs.some((s) => s.products.length > 0) ||
          !search_l,
      );
  }, [mainCats, categories, products, search_l]);

  return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-card/50">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={value.applies_to === "all" ? "luxe" : "outline"} onClick={() => setMode("all")}>
          ทุกสินค้า
        </Button>
        <Button type="button" size="sm" variant={value.applies_to === "categories" ? "luxe" : "outline"} onClick={() => setMode("categories")}>
          เลือกทั้งหมวดหมู่
        </Button>
        <Button type="button" size="sm" variant={value.applies_to === "products" ? "luxe" : "outline"} onClick={() => setMode("products")}>
          เลือกรายสินค้า
        </Button>
      </div>

      {value.applies_to !== "all" && (
        <>
          <Input placeholder="ค้นหาสินค้า..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : (
            <div className="max-h-80 overflow-auto space-y-4 pr-1">
              {groups.map((g) => (
                <div key={g.cat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {value.applies_to === "categories" && (
                        <Checkbox
                          checked={value.category_ids.includes(g.cat.id)}
                          onCheckedChange={() => toggleCategory(g.cat.id)}
                        />
                      )}
                      <span className="font-semibold text-gold">{g.cat.name}</span>
                    </div>
                    {value.applies_to === "products" && g.directProducts.length > 0 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => selectAllInGroup(g.cat.id)}>
                        เลือกทั้งหมดในหมวด
                      </Button>
                    )}
                  </div>

                  {value.applies_to === "products" &&
                    g.directProducts.map((p) => (
                      <ProductRow key={p.id} p={p} checked={value.product_ids.includes(p.id)} onToggle={() => toggleProduct(p.id)} />
                    ))}

                  {g.subs.map((s) => (
                    <div key={s.cat.id} className="pl-4 space-y-1 border-l border-border ml-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {value.applies_to === "categories" && (
                            <Checkbox
                              checked={value.category_ids.includes(s.cat.id)}
                              onCheckedChange={() => toggleCategory(s.cat.id)}
                            />
                          )}
                          <span className="text-sm font-medium text-muted-foreground">{s.cat.name}</span>
                        </div>
                        {value.applies_to === "products" && s.products.length > 0 && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => selectAllInGroup(s.cat.id)}>
                            เลือกทั้งหมดในหมวด
                          </Button>
                        )}
                      </div>
                      {value.applies_to === "products" &&
                        s.products.map((p) => (
                          <ProductRow key={p.id} p={p} checked={value.product_ids.includes(p.id)} onToggle={() => toggleProduct(p.id)} />
                        ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductRow({ p, checked, onToggle }: { p: Product; checked: boolean; onToggle: () => void }) {
  return (
    <Label className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
        {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{p.name}</div>
        {p.description && <div className="text-xs text-muted-foreground truncate">{p.description}</div>}
      </div>
    </Label>
  );
}
