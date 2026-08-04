import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Promotion,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  grantPromotion,
  createPromotionLink,
  audienceAllUsers,
  audienceNewUsers,
  audienceTopupOver,
  audienceSpendOver,
  audienceOrderCountOver,
} from "@/lib/promotions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, ImageIcon, Link as LinkIcon } from "lucide-react";

type Category = { id: string; name: string; parent_id: string | null };
type Product = { id: string; name: string; description: string | null; image_url: string | null; category_id: string | null };

type AppliesToValue = {
  applies_to: "all" | "products" | "categories";
  product_ids: string[];
  category_ids: string[];
};

const emptyForm = (kind: "discount" | "promotion"): Partial<Promotion> => ({
  kind,
  name: "",
  code: "",
  image_url: "",
  description: "",
  discount_type: "amount",
  discount_value: 0,
  buy_qty: 1,
  get_qty: 1,
  applies_to: "all",
  product_ids: [],
  category_ids: [],
  min_subtotal: null,
  max_subtotal: null,
  apply_on: "receipt",
  apply_after_discounts: false,
  require_distinct_products: 0,
  valid_days: 30,
  starts_at: null,
  ends_at: null,
  grant_rule: "manual",
  grant_value: 0,
  active: true,
});

export default function PromotionManager() {
  return (
    <Tabs defaultValue="discount">
      <TabsList>
        <TabsTrigger value="discount">ส่วนลด</TabsTrigger>
        <TabsTrigger value="promotion">โปรโมชั่น</TabsTrigger>
      </TabsList>
      <TabsContent value="discount"><PromoList kind="discount" /></TabsContent>
      <TabsContent value="promotion"><PromoList kind="promotion" /></TabsContent>
    </Tabs>
  );
}

function typeLabel(p: Promotion) {
  if (p.discount_type === "percent") return `ลด ${p.discount_value}%`;
  if (p.discount_type === "amount") return `ลด ฿${p.discount_value}`;
  if (p.discount_type === "bogo") return `ซื้อ ${p.buy_qty} แถม ${p.get_qty}`;
  return "-";
}

function PromoList({ kind }: { kind: "discount" | "promotion" }) {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | null | "new">(null);
  const [grantFor, setGrantFor] = useState<Promotion | null>(null);

  async function load() {
    setLoading(true);
    try {
      // never re-sort A-Z: keep server order (created_at desc)
      setItems(await listPromotions(kind));
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [kind]);

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    try {
      await deletePromotion(id);
      toast.success("ลบแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleCreateLink(p: Promotion) {
    try {
      const token = await createPromotionLink(p.id);
      const url = `${window.location.origin}/promo/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("คัดลอกลิงก์โปรโมชั่นแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <Button onClick={() => setEditing("new")} variant="luxe">
        <Plus className="w-4 h-4 mr-1" /> เพิ่ม{kind === "discount" ? "ส่วนลด" : "โปรโมชั่น"}
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีรายการ</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {p.active ? "เปิดใช้งาน" : "ปิด"}
                  </span>
                </div>
                <p className="text-xs text-gold">{typeLabel(p)}</p>
                {p.code && <p className="text-xs text-gold font-mono">โค้ด: {p.code}</p>}
                <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                {p.link_enabled && p.link_token && (
                  <p className="text-[10px] text-muted-foreground truncate">/promo/{p.link_token}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Pencil className="w-3 h-3 mr-1" /> แก้ไข
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setGrantFor(p)}>
                    <Users className="w-3 h-3 mr-1" /> แจก
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCreateLink(p)}>
                    <LinkIcon className="w-3 h-3 mr-1" /> สร้างลิงก์โปรโมชั่น
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <PromoEditDialog
          kind={kind}
          promo={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {grantFor && <GrantDialog promo={grantFor} onClose={() => setGrantFor(null)} />}
    </div>
  );
}

function PromoEditDialog({
  kind,
  promo,
  onClose,
  onSaved,
}: {
  kind: "discount" | "promotion";
  promo: Promotion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Promotion>>(promo ?? emptyForm(kind));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Promotion>(key: K, value: Promotion[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `promo/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set("image_url", data.publicUrl as any);
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, kind };
      if (promo) {
        await updatePromotion(promo.id, payload);
      } else {
        await createPromotion(payload);
      }
      toast.success("บันทึกแล้ว");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  }

  const appliesValue: AppliesToValue = {
    applies_to: (form.applies_to as any) ?? "all",
    product_ids: (form.product_ids as any) ?? [],
    category_ids: (form.category_ids as any) ?? [],
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{promo ? "แก้ไข" : "เพิ่ม"}{kind === "discount" ? "ส่วนลด" : "โปรโมชั่น"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>ชื่อ</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value as any)} />
          </div>
          <div>
            <Label>โค้ด (ถ้ามี)</Label>
            <Input value={form.code ?? ""} onChange={(e) => set("code", e.target.value as any)} />
          </div>
          <div>
            <Label>คำอธิบาย</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value as any)} />
          </div>
          <div>
            <Label>รูปปก</Label>
            <div className="flex items-center gap-3">
              {form.image_url && <img src={form.image_url} className="w-16 h-16 object-cover rounded" />}
              <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ประเภทส่วนลด</Label>
              <Select value={form.discount_type ?? "amount"} onValueChange={(v) => set("discount_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">ลดเป็นจำนวนเงิน</SelectItem>
                  <SelectItem value="percent">ลดเป็นเปอร์เซ็นต์</SelectItem>
                  <SelectItem value="bogo">ซื้อ X แถม Y</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.discount_type !== "bogo" ? (
              <div>
                <Label>{form.discount_type === "percent" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงิน (฿)"}</Label>
                <Input type="number" value={form.discount_value ?? 0} onChange={(e) => set("discount_value", Number(e.target.value) as any)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>ซื้อ (ชิ้น)</Label>
                  <Input type="number" value={form.buy_qty ?? 1} onChange={(e) => set("buy_qty", Number(e.target.value) as any)} />
                </div>
                <div>
                  <Label>แถม (ชิ้น)</Label>
                  <Input type="number" value={form.get_qty ?? 1} onChange={(e) => set("get_qty", Number(e.target.value) as any)} />
                </div>
              </div>
            )}
          </div>
          {form.discount_type === "bogo" && (
            <p className="text-xs text-muted-foreground -mt-2">
              ตัวอย่าง: 1 แถม 1, 2 แถม 1, 1 แถม 2, 3 แถม 5 — ใส่จำนวนได้อิสระ
            </p>
          )}

          <div>
            <Label>ใช้ได้กับ</Label>
            <AppliesToPicker
              value={appliesValue}
              onChange={(v) => setForm((f) => ({ ...f, applies_to: v.applies_to, product_ids: v.product_ids, category_ids: v.category_ids }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ยอดขั้นต่ำ (฿)</Label>
              <Input type="number" value={form.min_subtotal ?? ""} onChange={(e) => set("min_subtotal", (e.target.value ? Number(e.target.value) : null) as any)} />
            </div>
            <div>
              <Label>ยอดสูงสุด (฿)</Label>
              <Input type="number" value={form.max_subtotal ?? ""} onChange={(e) => set("max_subtotal", (e.target.value ? Number(e.target.value) : null) as any)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>คิดยอดจาก</Label>
              <Select value={form.apply_on ?? "receipt"} onValueChange={(v) => set("apply_on", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">ยอดรวมทั้งบิล</SelectItem>
                  <SelectItem value="items">เฉพาะสินค้าที่เข้าเงื่อนไข</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ต้องมีสินค้าต่างชนิดอย่างน้อย (ชิ้น, 0=ไม่บังคับ)</Label>
              <Input type="number" value={form.require_distinct_products ?? 0} onChange={(e) => set("require_distinct_products", Number(e.target.value) as any)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={!!form.apply_after_discounts} onCheckedChange={(v) => set("apply_after_discounts", v as any)} />
            <Label>คำนวณยอดขั้นต่ำ/สูงสุดหลังหักส่วนลดอื่นแล้ว (apply after discounts)</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>วันที่เริ่ม</Label>
              <Input type="datetime-local" value={form.starts_at ? form.starts_at.slice(0, 16) : ""} onChange={(e) => set("starts_at", (e.target.value ? new Date(e.target.value).toISOString() : null) as any)} />
            </div>
            <div>
              <Label>วันที่สิ้นสุด</Label>
              <Input type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ""} onChange={(e) => set("ends_at", (e.target.value ? new Date(e.target.value).toISOString() : null) as any)} />
            </div>
          </div>

          <div>
            <Label>อายุสิทธิ์เมื่อได้รับแจก (วัน)</Label>
            <Input type="number" value={form.valid_days ?? 30} onChange={(e) => set("valid_days", Number(e.target.value) as any)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>เกณฑ์การแจก</Label>
              <Select value={form.grant_rule ?? "manual"} onValueChange={(v) => set("grant_rule", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">แจกเอง</SelectItem>
                  <SelectItem value="all">ทุกคน (ใช้ได้อัตโนมัติ)</SelectItem>
                  <SelectItem value="new_user">สมาชิกใหม่ (7 วัน)</SelectItem>
                  <SelectItem value="topup_over">เติมเงินสะสมเกิน</SelectItem>
                  <SelectItem value="spend_over">ซื้อสะสมเกิน</SelectItem>
                  <SelectItem value="order_count">สั่งซื้อครบ (ครั้ง)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ค่าเงื่อนไข</Label>
              <Input type="number" value={form.grant_value ?? 0} onChange={(e) => set("grant_value", Number(e.target.value) as any)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={!!form.active} onCheckedChange={(v) => set("active", v as any)} />
            <Label>เปิดใช้งาน</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button variant="luxe" onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppliesToPicker({
  value,
  onChange,
}: {
  value: AppliesToValue;
  onChange: (v: AppliesToValue) => void;
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

function GrantDialog({ promo, onClose }: { promo: Promotion; onClose: () => void }) {
  const [audience, setAudience] = useState<"all" | "new_user" | "topup_over" | "spend_over" | "order_count" | "manual">("all");
  const [value, setValue] = useState(0);
  const [users, setUsers] = useState<{ id: string; username: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (audience === "manual") {
      supabase.from("profiles").select("id, username").order("username").then(({ data }) => setUsers((data ?? []) as any));
    }
  }, [audience]);

  async function handleGrant() {
    setBusy(true);
    try {
      let userIds: string[] = [];
      if (audience === "all") userIds = await audienceAllUsers();
      else if (audience === "new_user") userIds = await audienceNewUsers();
      else if (audience === "topup_over") userIds = await audienceTopupOver(value);
      else if (audience === "spend_over") userIds = await audienceSpendOver(value);
      else if (audience === "order_count") userIds = await audienceOrderCountOver(value);
      else userIds = Array.from(selected);

      if (userIds.length === 0) {
        toast.error("ไม่พบผู้ใช้ที่ตรงเงื่อนไข");
        setBusy(false);
        return;
      }
      await grantPromotion(promo.id, userIds, promo.valid_days);
      toast.success(`แจกให้ ${userIds.length} คนแล้ว`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>แจกให้ผู้ใช้: {promo.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกคน</SelectItem>
              <SelectItem value="new_user">สมาชิกใหม่ (7 วันล่าสุด)</SelectItem>
              <SelectItem value="topup_over">เติมเงินสะสมเกิน (฿)</SelectItem>
              <SelectItem value="spend_over">ซื้อสะสมเกิน (฿)</SelectItem>
              <SelectItem value="order_count">สั่งซื้อครบ (ครั้ง)</SelectItem>
              <SelectItem value="manual">เลือกรายคน</SelectItem>
            </SelectContent>
          </Select>

          {(audience === "topup_over" || audience === "spend_over" || audience === "order_count") && (
            <Input type="number" placeholder="ค่าเงื่อนไข" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          )}

          {audience === "manual" && (
            <div className="max-h-64 overflow-auto space-y-1 border border-border rounded p-2">
              {users.map((u) => (
                <Label key={u.id} className="flex items-center gap-2 p-1">
                  <Checkbox
                    checked={selected.has(u.id)}
                    onCheckedChange={(v) => {
                      const s = new Set(selected);
                      v ? s.add(u.id) : s.delete(u.id);
                      setSelected(s);
                    }}
                  />
                  {u.username ?? u.id}
                </Label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button variant="luxe" onClick={handleGrant} disabled={busy}>{busy ? "กำลังแจก..." : "แจกสิทธิ์"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
