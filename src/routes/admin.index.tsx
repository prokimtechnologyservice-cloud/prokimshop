import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getStaff, setStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Crown, LogOut, Plus, Trash2, Edit, Save, X, Upload, Power, ArrowUp, ArrowDown, GripVertical, Copy, Pencil, Combine, FolderInput, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { OverlayManager } from "@/components/admin/OverlayManager";
import { ChatAdmin } from "@/components/admin/ChatAdmin";
import { RETURN_LABEL, resolveReturn, markOrderPaid, cancelOrderItem } from "@/lib/tracking";
import PromotionManager from "@/components/admin/PromotionManager";
import GiftCardManager from "@/components/admin/GiftCardManager";
import { ReviewModerator } from "@/components/admin/ReviewModerator";
import { CountdownManager } from "@/components/admin/CountdownManager";
import { TemplateCustomizer } from "@/components/admin/TemplateCustomizer";
import { StatsDashboard } from "@/components/admin/StatsDashboard";
import { PublicStatsManager } from "@/components/admin/PublicStatsManager";
import { StoreManager } from "@/components/admin/StoreManager";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Cat = { id: string; name: string; sort_order: number; parent_id: string | null; search_keywords: string[]; slug: string | null; display_mode: string | null; image_url: string | null; product_sort_mode: string };
type Prod = { id: string; category_id: string; name: string; price: number; description: string | null; image_url: string | null; sort_order: number; stock: number | null; search_keywords: string[]; product_type: string; is_featured: boolean; is_new: boolean; claim_instructions: string | null; is_preorder: boolean; preorder_note: string | null };
type Ann = { id: string; title: string; content: string };
type UserRow = { id: string; username: string; roblox_name: string | null; balance: number };

function AdminDashboard() {
  const nav = useNavigate();
  const staff = getStaff();
  const isManager = staff?.role === "manager";

  useEffect(() => {
    if (!staff) nav({ to: "/admin/login" });
  }, []);

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-onyx">
      <header className="border-b border-border bg-gradient-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <div>
              <div className="font-display text-lg text-gradient-gold leading-none">PROKIM ADMIN</div>
              <div className="text-[10px] text-muted-foreground">{staff.name} · {isManager ? "ผู้จัดการ" : "แอดมิน"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm hover:text-gold">ดูหน้าร้าน</Link>
            <Button size="sm" variant="ghost" onClick={() => { setStaff(null); nav({ to: "/admin/login" }); }}>
              <LogOut className="w-4 h-4" /> ออก
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <Tabs defaultValue="catalog">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="catalog">หมวด/สินค้า</TabsTrigger>
            <TabsTrigger value="ann">ประกาศ</TabsTrigger>
            <TabsTrigger value="tracking">ติดตามคำสั่งซื้อ</TabsTrigger>
            <TabsTrigger value="store">หน้าร้าน</TabsTrigger>
            <TabsTrigger value="orders">ใบเสร็จ / IP</TabsTrigger>
            <TabsTrigger value="chat">แชทลูกค้า</TabsTrigger>
            <TabsTrigger value="users">ยอดเงินผู้ใช้</TabsTrigger>
            <TabsTrigger value="promos">โปรโมชั่น/ส่วนลด</TabsTrigger>
            <TabsTrigger value="gift">บัตรของขวัญ</TabsTrigger>
            <TabsTrigger value="reviews">รีวิว/คอมเมนต์</TabsTrigger>
            <TabsTrigger value="countdown">นับถอยหลัง</TabsTrigger>
            <TabsTrigger value="template">ตกแต่งบล็อก</TabsTrigger>
            <TabsTrigger value="stats">สถิติหลังบ้าน</TabsTrigger>
            <TabsTrigger value="publicstats">สถิติหน้าแรก</TabsTrigger>

            {isManager && <TabsTrigger value="editor">แก้ไขข้อความ/รูป</TabsTrigger>}
            {isManager && <TabsTrigger value="overlay">วางวัตถุ (ลาก/หมุน)</TabsTrigger>}
            {isManager && <TabsTrigger value="staff">สิทธิ์พนักงาน</TabsTrigger>}
            {isManager && <TabsTrigger value="site">เปิด/ปิดเว็บ</TabsTrigger>}
          </TabsList>

          <TabsContent value="catalog"><CatalogManager /></TabsContent>
          <TabsContent value="ann"><AnnouncementManager /></TabsContent>
          <TabsContent value="tracking"><TrackingManager /></TabsContent>
          <TabsContent value="store"><StoreManager /></TabsContent>
          <TabsContent value="orders"><OrdersManager /></TabsContent>
          <TabsContent value="chat"><ChatAdmin /></TabsContent>
          <TabsContent value="users"><UsersManager /></TabsContent>
          <TabsContent value="promos"><PromotionManager /></TabsContent>
          <TabsContent value="gift"><GiftCardManager /></TabsContent>
          <TabsContent value="reviews"><ReviewModerator /></TabsContent>
          <TabsContent value="countdown"><CountdownManager /></TabsContent>
          <TabsContent value="template"><TemplateCustomizer /></TabsContent>
          <TabsContent value="stats"><StatsDashboard /></TabsContent>
          <TabsContent value="publicstats"><PublicStatsManager /></TabsContent>
          {isManager && <TabsContent value="editor"><SiteEditor /></TabsContent>}
          {isManager && <TabsContent value="overlay"><OverlayManager /></TabsContent>}
          {isManager && <TabsContent value="staff"><StaffManager /></TabsContent>}
          {isManager && <TabsContent value="site"><SiteToggle /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

// ============ CATALOG ============
function CatalogManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [newCatParent, setNewCatParent] = useState<string>("");
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [editingProd, setEditingProd] = useState<Prod | null>(null);
  const [showNewProd, setShowNewProd] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [mergeSrc, setMergeSrc] = useState<Cat | null>(null);
  const [nestSrc, setNestSrc] = useState<Cat | null>(null);

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order").order("created_at"),
      supabase.from("products").select("*").order("sort_order").order("created_at"),
    ]);
    const catList = ((c as any[]) ?? []).map((x) => ({
      ...x,
      parent_id: x.parent_id ?? null,
      search_keywords: x.search_keywords ?? [],
      slug: x.slug ?? null,
      display_mode: x.display_mode ?? "text",
      image_url: x.image_url ?? null,
      product_sort_mode: x.product_sort_mode ?? "manual",
    })) as Cat[];
    setCats(catList);
    setProds(((p as any[]) ?? []).map((x) => ({
      ...x,
      price: Number(x.price),
      stock: x.stock ?? null,
      search_keywords: x.search_keywords ?? [],
      product_type: x.product_type ?? "normal",
      is_featured: !!x.is_featured,
      is_new: !!x.is_new,
      is_preorder: !!x.is_preorder,
      preorder_note: x.preorder_note ?? null,
      claim_instructions: x.claim_instructions ?? null,
    })));
    if (!active && catList[0]) setActive(catList[0].id);
  }
  useEffect(() => { load(); }, []);

  function makeSlug(name: string) {
    return name.trim().toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f]+/g, "-").replace(/(^-+|-+$)/g, "") || "cat";
  }
  async function addCat() {
    if (!newCat.trim()) return;
    const maxOrder = cats.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);
    let base = makeSlug(newCat);
    let slug = base;
    let i = 1;
    while (cats.some((c) => c.slug === slug)) slug = `${base}-${++i}`;
    await supabase.from("categories").insert({
      name: newCat.trim(),
      sort_order: maxOrder + 10,
      parent_id: newCatParent || null,
      slug,
    });
    setNewCat(""); setNewCatParent("");
    toast.success("เพิ่มหมวดหมู่แล้ว");
    load();
  }

  async function delCat(id: string) {
    if (!confirm("ลบหมวดและสินค้าทั้งหมดในหมวดนี้?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast.success("ลบแล้ว"); load();
  }

  async function duplicateCat(c: Cat) {
    const maxOrder = cats.reduce((m, x) => Math.max(m, x.sort_order ?? 0), 0);
    const { data: newCat, error } = await supabase.from("categories").insert({
      name: c.name + " (สำเนา)",
      sort_order: maxOrder + 10,
      parent_id: c.parent_id,
      search_keywords: c.search_keywords,
    }).select("id").single();
    if (error || !newCat) return toast.error(error?.message ?? "ผิดพลาด");
    const catProds = prods.filter((p) => p.category_id === c.id);
    if (catProds.length) {
      await supabase.from("products").insert(catProds.map((p) => ({
        category_id: newCat.id,
        name: p.name,
        price: p.price,
        description: p.description,
        image_url: p.image_url,
        sort_order: p.sort_order,
        stock: p.stock,
        search_keywords: p.search_keywords,
      })));
    }
    toast.success(`คัดลอกหมวด + ${catProds.length} สินค้า`);
    load();
  }

  async function saveEditCat() {
    if (!editingCat) return;
    await supabase.from("categories").update({
      name: editingCat.name,
      parent_id: editingCat.parent_id || null,
      search_keywords: editingCat.search_keywords,
      slug: editingCat.slug || makeSlug(editingCat.name),
      display_mode: editingCat.display_mode ?? "text",
      image_url: editingCat.image_url,
      product_sort_mode: editingCat.product_sort_mode ?? "manual",
    }).eq("id", editingCat.id);
    setEditingCat(null); toast.success("บันทึกแล้ว"); load();
  }

  async function uploadCatImage(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) { toast.error("ต้องเป็นรูปภาพ"); return null; }
    const ext = file.name.split(".").pop();
    const path = `cat-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  async function mergeInto(src: Cat, targetId: string) {
    if (!targetId || targetId === src.id) return;
    const { error: e1 } = await supabase.from("products").update({ category_id: targetId }).eq("category_id", src.id);
    if (e1) return toast.error(e1.message);
    // reassign any subcategories of src to target as well
    await supabase.from("categories").update({ parent_id: targetId }).eq("parent_id", src.id);
    const { error: e2 } = await supabase.from("categories").delete().eq("id", src.id);
    if (e2) return toast.error(e2.message);
    toast.success("รวมหมวดสำเร็จ");
    setMergeSrc(null);
    if (active === src.id) setActive(targetId);
    load();
  }

  async function nestUnder(src: Cat, parentId: string) {
    if (!parentId || parentId === src.id) return;
    const { error } = await supabase.from("categories").update({ parent_id: parentId }).eq("id", src.id);
    if (error) return toast.error(error.message);
    toast.success("ย้ายเป็นหมวดย่อยแล้ว");
    setNestSrc(null);
    load();
  }


  async function delProd(id: string) {
    if (!confirm("ลบสินค้านี้?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("ลบแล้ว"); load();
  }

  async function duplicateProd(p: Prod) {
    const maxOrder = prods.filter((x) => x.category_id === p.category_id)
      .reduce((m, x) => Math.max(m, x.sort_order ?? 0), 0);
    await supabase.from("products").insert({
      category_id: p.category_id,
      name: p.name + " (สำเนา)",
      price: p.price,
      description: p.description,
      image_url: p.image_url,
      sort_order: maxOrder + 10,
      stock: p.stock,
      search_keywords: p.search_keywords,
    });
    toast.success("คัดลอกแล้ว"); load();
  }

  async function swapOrder(table: "categories" | "products", a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
    await supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id);
    load();
  }

  function moveCat(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= cats.length) return;
    swapOrder("categories", cats[idx], cats[j]);
  }

  function moveProd(prodId: string, dir: -1 | 1) {
    const list = visible;
    const idx = list.findIndex((p) => p.id === prodId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= list.length) return;
    const a = prods.find((p) => p.id === list[idx].id)!;
    const b = prods.find((p) => p.id === list[j].id)!;
    if ((a as any).sort_order === undefined || (b as any).sort_order === undefined || (a as any).sort_order === (b as any).sort_order) {
      Promise.all(list.map((p, i) =>
        supabase.from("products").update({ sort_order: (i + 1) * 10 }).eq("id", p.id),
      )).then(() => load());
      return;
    }
    swapOrder("products", a as any, b as any);
  }

  // ===== Drag & drop reorder =====
  async function reorderCats(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const next = [...cats];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCats(next);
    await Promise.all(next.map((c, i) =>
      supabase.from("categories").update({ sort_order: (i + 1) * 10 }).eq("id", c.id),
    ));
    load();
  }

  async function reorderProds(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const list = [...visible];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    await Promise.all(list.map((p, i) =>
      supabase.from("products").update({ sort_order: (i + 1) * 10 }).eq("id", p.id),
    ));
    load();
  }


  const visible = prods.filter((p) => p.category_id === active);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mt-4">
      <aside className="bg-card border border-border rounded-lg p-3 space-y-2">
        <h3 className="font-display text-lg mb-2">หมวดหมู่</h3>
        <div className="space-y-2">
          <Input placeholder="ชื่อหมวดใหม่" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <div className="flex gap-2">
            <select
              value={newCatParent}
              onChange={(e) => setNewCatParent(e.target.value)}
              className="flex-1 bg-input border border-border rounded px-2 text-xs h-9"
            >
              <option value="">— หมวดหลัก —</option>
              {cats.filter((c) => !c.parent_id).map((c) => (
                <option key={c.id} value={c.id}>ย่อยของ: {c.name}</option>
              ))}
            </select>
            <Button size="icon" variant="luxe" onClick={addCat}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">ลากที่ ⋮⋮ เพื่อจัดลำดับ · หมวดย่อยจะเยื้องเข้ามา</p>
        <div className="space-y-1 mt-2">
          {cats.map((c, i) => (
            <div key={c.id} className={c.parent_id ? "ml-4" : ""}>
              <div
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (!isNaN(from)) reorderCats(from, i);
                }}
                className={`flex items-center gap-1 p-2 rounded text-sm ${active === c.id ? "bg-secondary" : ""}`}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab shrink-0" />
                <button className="flex-1 text-left truncate" onClick={() => setActive(c.id)}>
                  {c.parent_id ? "↳ " : ""}{c.name}
                </button>
                <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => moveCat(i, -1)}><ArrowUp className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" disabled={i === cats.length - 1} onClick={() => moveCat(i, 1)}><ArrowDown className="w-3 h-3" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={(e) => e.stopPropagation()} title="ตัวเลือก"><MoreVertical className="w-3 h-3" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 bg-popover">
                    <DropdownMenuItem onClick={() => setEditingCat(c)}><Edit className="w-3 h-3 mr-2" />แก้ไข</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setNestSrc(c); setMergeSrc(null); }}><FolderInput className="w-3 h-3 mr-2 text-primary" />ย้ายเป็นหมวดย่อยของ...</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setMergeSrc(c); setNestSrc(null); }}><Combine className="w-3 h-3 mr-2 text-gold" />รวมเข้ากับหมวดอื่น</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateCat(c)}><Copy className="w-3 h-3 mr-2 text-gold" />คัดลอกหมวด + สินค้า</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => delCat(c.id)} className="text-destructive"><Trash2 className="w-3 h-3 mr-2" />ลบ</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {nestSrc?.id === c.id && (
                <CategoryPicker
                  title="ย้าย"
                  action="ย้ายเป็นหมวดย่อยของ"
                  source={c}
                  cats={cats}
                  onCancel={() => setNestSrc(null)}
                  onPick={(id) => nestUnder(c, id)}
                  allowTopLevelOnly
                />
              )}
              {mergeSrc?.id === c.id && (
                <CategoryPicker
                  title="รวมหมวด"
                  action="ย้ายสินค้าทั้งหมดไปที่ (แล้วลบหมวดนี้)"
                  source={c}
                  cats={cats}
                  onCancel={() => setMergeSrc(null)}
                  onPick={(id) => mergeInto(c, id)}
                />
              )}
              {editingCat?.id === c.id && (
                <div className="p-2 border border-primary/40 rounded my-1 bg-gradient-card space-y-2">
                  <div>
                    <Label className="text-xs">ชื่อ</Label>
                    <Input className="h-8" value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">หมวดพ่อ</Label>
                    <select
                      value={editingCat.parent_id ?? ""}
                      onChange={(e) => setEditingCat({ ...editingCat, parent_id: e.target.value || null })}
                      className="w-full bg-input border border-border rounded px-2 text-xs h-8"
                    >
                      <option value="">— ไม่มี (หมวดหลัก) —</option>
                      {cats.filter((x) => !x.parent_id && x.id !== c.id).map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">คำค้นหา alias (คั่นด้วย ,)</Label>
                    <Input
                      className="h-8"
                      placeholder="เช่น GAG2, ผลไม้, blox"
                      value={(editingCat.search_keywords ?? []).join(", ")}
                      onChange={(e) => setEditingCat({
                        ...editingCat,
                        search_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Slug (ลิงก์แชร์: /category/&lt;slug&gt;)</Label>
                    <Input
                      className="h-8 font-mono text-xs"
                      value={editingCat.slug ?? ""}
                      onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">รูปแบบการแสดงในหน้าแรก</Label>
                    <select
                      value={editingCat.display_mode ?? "text"}
                      onChange={(e) => setEditingCat({ ...editingCat, display_mode: e.target.value })}
                      className="w-full bg-input border border-border rounded px-2 text-xs h-8"
                    >
                      <option value="text">ข้อความ (ชื่อหมวด)</option>
                      <option value="image">รูปภาพ 16:9 (ซ่อนชื่อ)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">โหมดเรียงสินค้าในหมวดนี้ (ที่ผู้ใช้เห็น)</Label>
                    <select
                      value={editingCat.product_sort_mode ?? "manual"}
                      onChange={(e) => setEditingCat({ ...editingCat, product_sort_mode: e.target.value })}
                      className="w-full bg-input border border-border rounded px-2 text-xs h-8"
                    >
                      <option value="manual">เรียงเอง (ตามลำดับที่ลาก)</option>
                      <option value="newest">ใหม่สุดก่อน</option>
                      <option value="price_asc">ราคาน้อย → มาก</option>
                      <option value="price_desc">ราคามาก → น้อย</option>
                      <option value="bestseller">ขายดีที่สุดก่อน</option>
                    </select>
                  </div>
                  {editingCat.display_mode === "image" && (
                    <div>
                      <Label className="text-xs">รูปภาพหมวด (16:9)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {editingCat.image_url && (
                          <img src={editingCat.image_url} className="w-24 aspect-video object-cover rounded border border-border" />
                        )}
                        <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-secondary cursor-pointer hover:bg-accent text-xs">
                          <Upload className="w-3 h-3" /> เลือกไฟล์
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const url = await uploadCatImage(f);
                            if (url) setEditingCat({ ...editingCat, image_url: url });
                          }} />
                        </label>
                        {editingCat.image_url && (
                          <Button size="sm" variant="ghost" onClick={() => setEditingCat({ ...editingCat, image_url: null })}>ลบรูป</Button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}><X className="w-3 h-3" /> ยกเลิก</Button>
                    <Button size="sm" variant="luxe" onClick={saveEditCat}><Save className="w-3 h-3" /> บันทึก</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h3 className="font-display text-lg">สินค้า ({visible.length})</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} disabled={!active || visible.length === 0}>
              <Pencil className="w-4 h-4" /> แก้พร้อมกัน
            </Button>
            <Button variant="luxe" size="sm" onClick={() => setShowNewProd(true)} disabled={!active}>
              <Plus className="w-4 h-4" /> เพิ่มสินค้า
            </Button>
          </div>
        </div>

        {bulkOpen && active && (
          <BulkEditProducts
            products={visible}
            onClose={() => setBulkOpen(false)}
            onSaved={() => { setBulkOpen(false); load(); }}
          />
        )}

        {showNewProd && active && (
          <ProductForm
            categoryId={active}
            onClose={() => setShowNewProd(false)}
            onSaved={() => { setShowNewProd(false); load(); }}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map((p, i) =>
            editingProd?.id === p.id ? (
              <ProductForm
                key={p.id}
                product={p}
                categoryId={p.category_id}
                onClose={() => setEditingProd(null)}
                onSaved={() => { setEditingProd(null); load(); }}
              />
            ) : (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (!isNaN(from)) reorderProds(from, i);
                }}
                className="flex items-center gap-2 p-3 border border-border rounded-lg bg-onyx/40"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <div className="w-12 h-12 rounded bg-onyx flex items-center justify-center overflow-hidden">
                  {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Crown className="w-5 h-5 text-primary/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gold">฿{p.price.toFixed(2)}</div>
                </div>
                <div className="flex flex-col">
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => moveProd(p.id, -1)}><ArrowUp className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === visible.length - 1} onClick={() => moveProd(p.id, 1)}><ArrowDown className="w-3 h-3" /></Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" title="ตัวเลือก"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 bg-popover">
                    <DropdownMenuItem onClick={() => setEditingProd(p)}><Edit className="w-3 h-3 mr-2" />แก้ไข</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateProd(p)}><Copy className="w-3 h-3 mr-2 text-gold" />คัดลอก</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => delProd(p.id)} className="text-destructive"><Trash2 className="w-3 h-3 mr-2" />ลบ</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function ProductForm({
  product, categoryId, onClose, onSaved,
}: {
  product?: Prod;
  categoryId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? 0));
  const [desc, setDesc] = useState(product?.description ?? "");
  const [imgUrl, setImgUrl] = useState(product?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [stockMode, setStockMode] = useState<"none" | "in" | "out">(
    product?.stock == null ? "none" : product.stock === 0 ? "out" : "in",
  );
  const [stockQty, setStockQty] = useState(String(product?.stock ?? ""));
  const [keywords, setKeywords] = useState((product?.search_keywords ?? []).join(", "));
  const [productType, setProductType] = useState<string>(product?.product_type ?? "normal");
  const [isFeatured, setIsFeatured] = useState<boolean>(!!product?.is_featured);
  const [isNew, setIsNew] = useState<boolean>(!!product?.is_new);
  const [claim, setClaim] = useState<string>(product?.claim_instructions ?? "");
  const [isPreorder, setIsPreorder] = useState<boolean>(!!product?.is_preorder);
  const [preorderNote, setPreorderNote] = useState<string>(product?.preorder_note ?? "");
  const [accounts, setAccounts] = useState<{ id: string; payload: string; status: string }[]>([]);
  const [newAccounts, setNewAccounts] = useState("");
  const [boxSpinPrice, setBoxSpinPrice] = useState<string>(String((product as any)?.box_spin_price ?? 0));
  const [boxBorder, setBoxBorder] = useState<string>((product as any)?.box_border_color ?? "default");
  const [boxBg, setBoxBg] = useState<string>((product as any)?.box_bg_color ?? "default");
  const [boxPrizes, setBoxPrizes] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [prizePick, setPrizePick] = useState("");
  const [prizeWeight, setPrizeWeight] = useState("1");
  const [prizeStock, setPrizeStock] = useState("1");
  const [aucStart, setAucStart] = useState<string>(String((product as any)?.auction_start_price ?? 100));
  const [aucStep, setAucStep] = useState<string>(String((product as any)?.auction_step ?? 5));
  const [aucEnds, setAucEnds] = useState<string>(
    (product as any)?.auction_ends_at
      ? new Date((product as any).auction_ends_at).toISOString().slice(0, 16)
      : "",
  );
  const [aucStatus, setAucStatus] = useState<string>((product as any)?.auction_status ?? "open");


  useEffect(() => {
    if (!product) return;
    supabase
      .from("product_account_stock")
      .select("id, payload, status")
      .eq("product_id", product.id)
      .order("created_at")
      .then(({ data }) => setAccounts((data as any[]) ?? []));
  }, [product?.id]);

  async function addAccounts() {
    if (!product || !newAccounts.trim()) return;
    const lines = newAccounts.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;
    const { error } = await supabase.from("product_account_stock").insert(
      lines.map((payload) => ({ product_id: product.id, payload })),
    );
    if (error) return toast.error(error.message);
    setNewAccounts("");
    toast.success(`เพิ่ม ${lines.length} บัญชี`);
    const { data } = await supabase.from("product_account_stock").select("id, payload, status").eq("product_id", product.id).order("created_at");
    setAccounts((data as any[]) ?? []);
  }

  async function delAccount(id: string) {
    await supabase.from("product_account_stock").delete().eq("id", id);
    setAccounts((a) => a.filter((x) => x.id !== id));
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("ต้องเป็นไฟล์รูปภาพ");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImgUrl(data.publicUrl);
      toast.success("อัปโหลดสำเร็จ");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (productType !== "mystery_box") return;
    supabase.from("products").select("id, name, image_url, product_type").order("name")
      .then(({ data }) => setAllProducts((data as any[]) ?? []));
    if (product) {
      (supabase as any).from("mystery_box_items")
        .select("id, prize_product_id, weight, stock, products:prize_product_id(id, name, image_url)")
        .eq("box_product_id", product.id).order("created_at")
        .then(({ data }: any) => setBoxPrizes((data as any[]) ?? []));
    }
  }, [productType, product?.id]);

  async function addPrize() {
    if (!product || !prizePick) return;
    const { error } = await (supabase as any).from("mystery_box_items").insert({
      box_product_id: product.id,
      prize_product_id: prizePick,
      weight: Math.max(1, Number(prizeWeight) || 1),
      stock: Math.max(0, Number(prizeStock) || 0),
    });
    if (error) return toast.error(error.message);
    setPrizePick(""); setPrizeWeight("1"); setPrizeStock("1");
    const { data } = await (supabase as any).from("mystery_box_items")
      .select("id, prize_product_id, weight, stock, products:prize_product_id(id, name, image_url)")
      .eq("box_product_id", product.id).order("created_at");
    setBoxPrizes((data as any[]) ?? []);
    toast.success("เพิ่มรางวัลแล้ว");
  }
  async function delPrize(id: string) {
    await (supabase as any).from("mystery_box_items").delete().eq("id", id);
    setBoxPrizes((p) => p.filter((x) => x.id !== id));
  }
  async function updatePrize(id: string, patch: any) {
    await (supabase as any).from("mystery_box_items").update(patch).eq("id", id);
    setBoxPrizes((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function save() {
    const stockVal =
      stockMode === "none" ? null : stockMode === "out" ? 0 : Math.max(0, Number(stockQty) || 0);
    const payload: any = {
      name: name.trim(),
      price: Number(price) || 0,
      description: desc || null,
      image_url: imgUrl || null,
      category_id: categoryId,
      stock: stockVal,
      search_keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
      product_type: productType,
      is_featured: isFeatured,
      is_new: isNew,
      claim_instructions: claim || null,
      is_preorder: isPreorder,
      preorder_note: isPreorder ? preorderNote || null : null,
      box_spin_price: productType === "mystery_box" ? Number(boxSpinPrice) || 0 : 0,
      box_border_color: productType === "mystery_box" ? boxBorder : null,
      box_bg_color: productType === "mystery_box" ? boxBg : null,
      auction_start_price: productType === "auction" ? Number(aucStart) || 0 : 0,
      auction_step: productType === "auction" ? Math.max(1, Number(aucStep) || 1) : 5,
      auction_ends_at: productType === "auction" && aucEnds ? new Date(aucEnds).toISOString() : null,
      auction_status: productType === "auction" ? aucStatus : "open",
    };

    if (product) {
      await supabase.from("products").update(payload).eq("id", product.id);
    } else {
      const { data: sib } = await supabase.from("products").select("sort_order").eq("category_id", categoryId);
      const maxOrder = (sib ?? []).reduce((m: number, x: any) => Math.max(m, x.sort_order ?? 0), 0);
      await supabase.from("products").insert({ ...payload, sort_order: maxOrder + 10 });
    }
    toast.success("บันทึกแล้ว");
    onSaved();
  }

  return (
    <div className="col-span-full p-4 border border-primary/40 rounded-lg bg-gradient-card space-y-3 mb-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>ชื่อสินค้า</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>ราคา (บาท) — ใส่ 0 = "ติดต่อแอดมิน"</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>รายละเอียด</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>สต็อกสินค้า</Label>
          <select
            className="w-full bg-input border border-border rounded px-2 h-9 text-sm"
            value={stockMode}
            onChange={(e) => setStockMode(e.target.value as any)}
          >
            <option value="none">ไม่แสดงสต็อก</option>
            <option value="in">มีสินค้า (ระบุจำนวน)</option>
            <option value="out">สินค้าหมด</option>
          </select>
        </div>
        {stockMode === "in" && (
          <div>
            <Label>จำนวนคงเหลือ</Label>
            <Input type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3 rounded-lg border border-sky-500/40 bg-sky-500/5">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isPreorder}
            onChange={(e) => setIsPreorder(e.target.checked)}
          />
          สินค้าพรีออเดอร์ (สั่งจองได้แม้ของหมด)
        </label>
        {isPreorder && (
          <div>
            <Label className="text-xs">ข้อความแจ้งลูกค้า (เวลารอ / เงื่อนไข)</Label>
            <Textarea
              rows={2}
              value={preorderNote}
              onChange={(e) => setPreorderNote(e.target.value)}
              placeholder="เช่น รอของ 1-3 วัน จัดส่งตามรอบ"
            />
          </div>
        )}
      </div>
      <div>
        <Label>คำค้นหา alias (คั่นด้วย ,)</Label>
        <Input
          placeholder="เช่น GAG2, ขายผลไม้, blox fruit"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
      </div>
      <div>
        <Label>รูปภาพสินค้า</Label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          onPaste={(e) => {
            const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
            const file = item?.getAsFile();
            if (file) uploadFile(file);
          }}
          className={`mt-1 flex items-center gap-3 p-3 rounded-md border-2 border-dashed transition ${
            dragOver ? "border-primary bg-primary/10" : "border-border bg-onyx/30"
          }`}
        >
          {imgUrl && <img src={imgUrl} className="w-16 h-16 rounded object-cover border border-border shrink-0" />}
          <div className="flex-1 text-xs text-muted-foreground">
            ลากรูปมาวางที่นี่ หรือวาง (Ctrl+V) หรือ
            <label className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-secondary cursor-pointer hover:bg-accent">
              <Upload className="w-3 h-3" />
              {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 pt-1 border-t border-border/60">
        <div className="flex items-center gap-2">
          <Label className="text-xs">ประเภท:</Label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="bg-input border border-border rounded px-2 h-8 text-xs"
          >
            <option value="normal">สินค้าปกติ</option>
            <option value="account">ไก่ตัน (บัญชี)</option>
            <option value="mystery_box">กล่องสุ่ม</option>
            <option value="auction">ประมูลสินค้า</option>
            <option value="farm">บริการฟาร์ม (ต้องกรอกไอดี/รหัส)</option>


          </select>
        </div>
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> ⭐ สินค้าแนะนำ
        </label>
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} /> ✨ สินค้ามาใหม่
        </label>
      </div>

      {productType === "account" && (
        <div className="space-y-2 border border-gold/40 rounded p-3 bg-onyx/30">
          <Label className="text-xs text-gold">คลังบัญชี (ไก่ตัน) — 1 บรรทัด = 1 บัญชี</Label>
          {product ? (
            <>
              <div className="text-[11px] text-muted-foreground">
                คงเหลือ {accounts.filter((a) => a.status === "available").length} · ขายแล้ว {accounts.filter((a) => a.status === "sold").length}
              </div>
              <Textarea
                rows={3}
                placeholder="user1:pass1&#10;user2:pass2"
                value={newAccounts}
                onChange={(e) => setNewAccounts(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={addAccounts}>เพิ่มบัญชี</Button>
              <div className="max-h-40 overflow-auto space-y-1 mt-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded ${a.status === "sold" ? "bg-emerald-500/20 text-emerald-400" : "bg-gold/20 text-gold"}`}>
                      {a.status === "sold" ? "ขายแล้ว" : "ว่าง"}
                    </span>
                    <span className="font-mono truncate flex-1">{a.payload}</span>
                    {a.status !== "sold" && (
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => delAccount(a.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground">บันทึกสินค้าก่อน แล้วเปิดแก้ไขเพื่อเพิ่มบัญชี</div>
          )}
          <div>
            <Label className="text-xs">คำแนะนำหลังซื้อ (แสดงให้ลูกค้าใน /orders)</Label>
            <Textarea rows={3} value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="เช่น ต้องเปลี่ยนรหัสทันที..." />
          </div>
        </div>
      )}

      {productType === "auction" && (
        <div className="space-y-2 border border-gold/40 rounded p-3 bg-onyx/30">
          <Label className="text-xs text-gold">ตั้งค่าการประมูล</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">ราคาเริ่มต้น (บาท)</Label>
              <Input type="number" min={0} value={aucStart} onChange={(e) => setAucStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px]">เพิ่มขั้นละ (บาท)</Label>
              <Input type="number" min={1} value={aucStep} onChange={(e) => setAucStep(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px]">เวลาปิดประมูล</Label>
              <Input type="datetime-local" value={aucEnds} onChange={(e) => setAucEnds(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px]">สถานะ</Label>
              <select
                className="w-full bg-input border border-border rounded px-2 h-9 text-xs"
                value={aucStatus}
                onChange={(e) => setAucStatus(e.target.value)}
              >
                <option value="open">เปิดประมูล</option>
                <option value="closed">ปิดประมูล</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ผู้ใช้ต้องมียอดเงินในเว็บพอกับราคาที่เสนอ แต่เงินจะถูกหักเมื่อประมูลจบและเป็นผู้เสนอราคาสูงสุด
            แล้วรายการจะไปโผล่ในติดตามคำสั่งซื้ออัตโนมัติ
          </p>
        </div>
      )}

      {productType === "mystery_box" && (

        <div className="space-y-2 border border-primary/40 rounded p-3 bg-onyx/30">
          <Label className="text-xs text-primary">ตั้งค่ากล่องสุ่ม</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">ราคา/สุ่ม (บาท)</Label>
              <Input type="number" min={0} value={boxSpinPrice} onChange={(e) => setBoxSpinPrice(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px]">สีขอบ</Label>
              <select className="w-full bg-input border border-border rounded px-2 h-9 text-xs" value={boxBorder} onChange={(e) => setBoxBorder(e.target.value)}>
                {["default","green","blue","white","red","black","purple","pink","orange","yellow","navy"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px]">สีพื้นหลัง</Label>
              <select className="w-full bg-input border border-border rounded px-2 h-9 text-xs" value={boxBg} onChange={(e) => setBoxBg(e.target.value)}>
                {["default","green","blue","white","red","black","purple","pink","orange","yellow","navy"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {product ? (
            <>
              <Label className="text-xs mt-2 block">รางวัลในกล่อง</Label>
              <div className="flex gap-1 flex-wrap items-end">
                <select className="flex-1 min-w-[160px] bg-input border border-border rounded px-2 h-8 text-xs" value={prizePick} onChange={(e) => setPrizePick(e.target.value)}>
                  <option value="">— เลือกสินค้า —</option>
                  {allProducts.filter((x) => x.id !== product.id && x.product_type !== "mystery_box").map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
                <Input className="w-20 h-8" type="number" min={1} value={prizeWeight} onChange={(e) => setPrizeWeight(e.target.value)} placeholder="weight" title="น้ำหนักการสุ่ม" />
                <Input className="w-20 h-8" type="number" min={0} value={prizeStock} onChange={(e) => setPrizeStock(e.target.value)} placeholder="stock" title="สต็อกในกล่อง" />
                <Button size="sm" variant="outline" onClick={addPrize}>เพิ่ม</Button>
              </div>
              <div className="max-h-56 overflow-auto space-y-1 mt-2">
                {boxPrizes.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs p-1 rounded border border-border">
                    <div className="w-8 h-8 rounded overflow-hidden bg-onyx shrink-0">
                      {p.products?.image_url && <img src={p.products.image_url} className="w-full h-full object-cover" />}
                    </div>
                    <span className="flex-1 truncate">{p.products?.name}</span>
                    <label className="text-[10px]">w:<Input className="w-14 h-6 inline-block ml-1" type="number" defaultValue={p.weight} onBlur={(e) => updatePrize(p.id, { weight: Math.max(1, Number(e.target.value)||1) })} /></label>
                    <label className="text-[10px]">stock:<Input className="w-14 h-6 inline-block ml-1" type="number" defaultValue={p.stock} onBlur={(e) => updatePrize(p.id, { stock: Math.max(0, Number(e.target.value)||0) })} /></label>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => delPrize(p.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
                {boxPrizes.length === 0 && <div className="text-[10px] text-muted-foreground">ยังไม่มีรางวัล</div>}
              </div>
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground">บันทึกกล่องก่อน แล้วเปิดแก้ไขเพื่อเพิ่มรางวัล</div>
          )}
        </div>
      )}



      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button variant="luxe" onClick={save}>บันทึก</Button>
      </div>
    </div>
  );
}

// ============ BULK EDIT ============
type BulkRow = {
  id: string;
  name: string;
  description: string;
  stockMode: "none" | "in" | "out";
  stockQty: string;
};

function BulkEditProducts({
  products, onClose, onSaved,
}: {
  products: Prod[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<BulkRow[]>(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      stockMode: p.stock == null ? "none" : p.stock === 0 ? "out" : "in",
      stockQty: p.stock && p.stock > 0 ? String(p.stock) : "",
    })),
  );
  const [saving, setSaving] = useState(false);

  // apply-to-all controls
  const [applyDesc, setApplyDesc] = useState("");
  const [applyStockMode, setApplyStockMode] = useState<"none" | "in" | "out">("in");
  const [applyStockQty, setApplyStockQty] = useState("");

  function applyDescToAll() {
    setRows((rs) => rs.map((r) => ({ ...r, description: applyDesc })));
  }
  function applyStockToAll() {
    setRows((rs) => rs.map((r) => ({
      ...r,
      stockMode: applyStockMode,
      stockQty: applyStockMode === "in" ? applyStockQty : "",
    })));
  }

  async function saveAll() {
    setSaving(true);
    try {
      await Promise.all(rows.map((r) => {
        const stockVal =
          r.stockMode === "none" ? null : r.stockMode === "out" ? 0 : Math.max(0, Number(r.stockQty) || 0);
        return supabase.from("products").update({
          description: r.description || null,
          stock: stockVal,
        }).eq("id", r.id);
      }));
      toast.success(`บันทึก ${rows.length} รายการแล้ว`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 p-4 border border-primary/40 rounded-lg bg-gradient-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-display text-base text-gradient-gold">แก้พร้อมกัน ({rows.length} รายการ)</div>
        <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded border border-border bg-onyx/40">
        <div className="space-y-1">
          <Label className="text-xs">ตั้งคำอธิบายให้ทุกชิ้น</Label>
          <div className="flex gap-2">
            <Input className="h-8" placeholder="คำอธิบายเดียวกัน" value={applyDesc} onChange={(e) => setApplyDesc(e.target.value)} />
            <Button size="sm" variant="outline" onClick={applyDescToAll}>ใช้ทั้งหมด</Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ตั้งสต็อกให้ทุกชิ้น</Label>
          <div className="flex gap-2">
            <select
              className="bg-input border border-border rounded px-2 text-xs h-8"
              value={applyStockMode}
              onChange={(e) => setApplyStockMode(e.target.value as any)}
            >
              <option value="none">ไม่แสดง</option>
              <option value="in">มี</option>
              <option value="out">หมด</option>
            </select>
            {applyStockMode === "in" && (
              <Input className="h-8 w-20" type="number" placeholder="จำนวน" value={applyStockQty} onChange={(e) => setApplyStockQty(e.target.value)} />
            )}
            <Button size="sm" variant="outline" onClick={applyStockToAll}>ใช้ทั้งหมด</Button>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {rows.map((r, idx) => (
          <div key={r.id} className="p-2 border border-border rounded bg-onyx/30 grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-2 items-center">
            <div className="text-sm truncate font-medium">{r.name}</div>
            <Textarea
              rows={1}
              className="text-xs"
              placeholder="คำอธิบาย"
              value={r.description}
              onChange={(e) => setRows(rows.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
            />
            <select
              className="bg-input border border-border rounded px-2 text-xs h-8"
              value={r.stockMode}
              onChange={(e) => setRows(rows.map((x, i) => i === idx ? { ...x, stockMode: e.target.value as any } : x))}
            >
              <option value="none">ไม่แสดง</option>
              <option value="in">มี</option>
              <option value="out">หมด</option>
            </select>
            <Input
              className="h-8 w-20"
              type="number"
              disabled={r.stockMode !== "in"}
              placeholder="จำนวน"
              value={r.stockQty}
              onChange={(e) => setRows(rows.map((x, i) => i === idx ? { ...x, stockQty: e.target.value } : x))}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button variant="luxe" onClick={saveAll} disabled={saving}>
          <Save className="w-4 h-4" /> บันทึกทั้งหมด
        </Button>
      </div>
    </div>
  );
}



// ============ ANNOUNCEMENTS ============
function AnnouncementManager() {
  const [list, setList] = useState<Ann[]>([]);
  const [editing, setEditing] = useState<Ann | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setList((data as Ann[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm("ลบประกาศ?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    toast.success("ลบแล้ว"); load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg">ประกาศ</h3>
        <Button variant="luxe" size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> เพิ่มประกาศ</Button>
      </div>

      {showNew && (
        <AnnForm onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />
      )}

      {list.map((a) =>
        editing?.id === a.id ? (
          <AnnForm key={a.id} ann={a} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        ) : (
          <div key={a.id} className="p-3 border border-border rounded-lg bg-onyx/40">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{a.content}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(a)}><Edit className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function AnnForm({ ann, onClose, onSaved }: { ann?: Ann; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(ann?.title ?? "");
  const [content, setContent] = useState(ann?.content ?? "");
  async function save() {
    if (!title.trim() || !content.trim()) return toast.error("กรอกให้ครบ");
    if (ann) await supabase.from("announcements").update({ title, content }).eq("id", ann.id);
    else await supabase.from("announcements").insert({ title, content });
    toast.success("บันทึกแล้ว"); onSaved();
  }
  return (
    <div className="p-4 border border-primary/40 rounded-lg bg-gradient-card space-y-2">
      <Input placeholder="หัวข้อ" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="เนื้อหา" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button variant="luxe" onClick={save}>บันทึก</Button>
      </div>
    </div>
  );
}

// ============ USERS BALANCE ============
function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("profiles").select("id, username, roblox_name, balance").order("created_at", { ascending: false });
    setUsers(((data as any[]) ?? []).map((u) => ({ ...u, balance: Number(u.balance) })));
  }
  useEffect(() => { load(); }, []);

  async function setBal(id: string, val: number) {
    await supabase.from("profiles").update({ balance: val }).eq("id", id);
    toast.success("อัปเดตยอดเงินแล้ว"); load();
  }

  const filtered = users.filter((u) => !q || u.username.toLowerCase().includes(q.toLowerCase()) || (u.roblox_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-lg">ผู้ใช้ ({users.length})</h3>
        <Input className="max-w-xs" placeholder="ค้นหา…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map((u) => (
          <UserRowEdit key={u.id} u={u} onSave={(v) => setBal(u.id, v)} />
        ))}
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-8">ไม่มีผู้ใช้</div>}
      </div>
    </div>
  );
}

function UserRowEdit({ u, onSave }: { u: UserRow; onSave: (v: number) => void }) {
  const [val, setVal] = useState(String(u.balance));
  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-onyx/40">
      <div className="flex-1 min-w-0">
        <div className="font-medium">{u.username}</div>
        <div className="text-xs text-muted-foreground">Roblox: {u.roblox_name ?? "—"}</div>
      </div>
      <div className="flex items-center gap-2">
        <Input className="w-28 h-8" type="number" value={val} onChange={(e) => setVal(e.target.value)} />
        <Button size="sm" variant="luxe" onClick={() => onSave(Number(val) || 0)}>บันทึก</Button>
      </div>
    </div>
  );
}

// ============ STAFF (manager only) ============
function StaffManager() {
  const [list, setList] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [pwd, setPwd] = useState(""); const [role, setRole] = useState<"admin" | "manager">("admin");

  async function load() {
    const { data } = await supabase.from("staff").select("*").order("created_at");
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addStaff() {
    if (!name || !code || !pwd) return toast.error("กรอกให้ครบ");
    await supabase.from("staff").insert({ name, staff_code: code, password: pwd, role });
    setName(""); setCode(""); setPwd(""); setShowNew(false);
    toast.success("เพิ่มพนักงานแล้ว"); load();
  }

  async function changeRole(id: string, role: "admin" | "manager") {
    await supabase.from("staff").update({ role }).eq("id", id);
    toast.success("อัปเดตสิทธิ์แล้ว"); load();
  }

  async function del(id: string) {
    if (!confirm("ลบพนักงานนี้?")) return;
    await supabase.from("staff").delete().eq("id", id);
    toast.success("ลบแล้ว"); load();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display text-lg">พนักงาน</h3>
        <Button variant="luxe" size="sm" onClick={() => setShowNew(!showNew)}><Plus className="w-4 h-4" /> เพิ่มพนักงาน</Button>
      </div>
      {showNew && (
        <div className="p-3 border border-primary/40 rounded mb-3 space-y-2 bg-gradient-card">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input placeholder="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="รหัสประจำตัว" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="รหัสผ่าน" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <select className="bg-input border border-border rounded px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="admin">แอดมิน</option>
              <option value="manager">ผู้จัดการ</option>
            </select>
          </div>
          <div className="text-right"><Button variant="luxe" size="sm" onClick={addStaff}>บันทึก</Button></div>
        </div>
      )}
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-onyx/40">
            <div className="flex-1">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.staff_code}</div>
            </div>
            <select value={s.role} onChange={(e) => changeRole(s.id, e.target.value as "admin" | "manager")} className="bg-input border border-border rounded px-2 text-sm">
              <option value="admin">แอดมิน</option>
              <option value="manager">ผู้จัดการ</option>
            </select>
            <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SITE TOGGLE ============
function SiteToggle() {
  const [open, setOpen] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) { setOpen(data.is_open); setMsg(data.closed_message ?? ""); }
    });
  }, []);

  async function save() {
    await supabase.from("site_settings").update({ is_open: open, closed_message: msg }).eq("id", 1);
    toast.success("บันทึกแล้ว");
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mt-4 max-w-lg space-y-4">
      <h3 className="font-display text-lg flex items-center gap-2"><Power className="w-5 h-5 text-gold" /> เปิด/ปิดเว็บไซต์</h3>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
        เปิดเว็บไซต์ให้ผู้ใช้เข้าถึงได้
      </label>
      <div>
        <Label>ข้อความเมื่อปิด</Label>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} />
      </div>
      <Button variant="luxe" onClick={save}>บันทึก</Button>
    </div>
  );
}

// ============ STATS ============
function StatsPanel() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const [orders, items, visits] = await Promise.all([
        supabase.from("orders").select("id, total, created_at"),
        supabase.from("order_items").select("product_name, quantity, unit_price"),
        supabase.from("visits").select("visited_at"),
      ]);
      setData({ orders: orders.data ?? [], items: items.data ?? [], visits: visits.data ?? [] });
    })();
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const v = data.visits;
    const visitsToday = v.filter((x: any) => new Date(x.visited_at) >= today).length;
    const visitsMonth = v.filter((x: any) => new Date(x.visited_at) >= monthStart).length;
    const visitsYear = v.filter((x: any) => new Date(x.visited_at) >= yearStart).length;

    const totalRevenue = data.orders.reduce((s: number, o: any) => s + Number(o.total), 0);

    const counts: Record<string, number> = {};
    data.items.forEach((i: any) => { counts[i.product_name] = (counts[i.product_name] ?? 0) + i.quantity; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const priceBuckets: Record<string, number> = {};
    data.orders.forEach((o: any) => {
      const t = Number(o.total);
      const b = t < 50 ? "<50" : t < 200 ? "50-200" : t < 500 ? "200-500" : "500+";
      priceBuckets[b] = (priceBuckets[b] ?? 0) + 1;
    });

    return { visitsToday, visitsMonth, visitsYear, totalRevenue, top, priceBuckets, orderCount: data.orders.length };
  }, [data]);

  if (!stats) return <div className="p-6 mt-4">กำลังโหลด...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <Stat label="ผู้เข้าชมวันนี้" value={stats.visitsToday} />
      <Stat label="ผู้เข้าชมเดือนนี้" value={stats.visitsMonth} />
      <Stat label="ผู้เข้าชมปีนี้" value={stats.visitsYear} />
      <Stat label="คำสั่งซื้อทั้งหมด" value={stats.orderCount} />
      <Stat label="รายได้รวม" value={`฿${stats.totalRevenue.toFixed(2)}`} />

      <div className="md:col-span-3 bg-card border border-border rounded-lg p-4">
        <h4 className="font-display text-base mb-2">สินค้ายอดนิยม</h4>
        {stats.top.length === 0 && <div className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</div>}
        <ol className="space-y-1 text-sm">
          {stats.top.map(([name, qty], i) => (
            <li key={name} className="flex justify-between border-b border-border py-1">
              <span>{i + 1}. {name}</span><span className="text-gold">{qty} ชิ้น</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="md:col-span-3 bg-card border border-border rounded-lg p-4">
        <h4 className="font-display text-base mb-2">ช่วงราคาที่ลูกค้าซื้อบ่อย</h4>
        {Object.entries(stats.priceBuckets).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm border-b border-border py-1">
            <span>{k} บาท</span><span className="text-gold">{v as number} ครั้ง</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gradient-card border border-border rounded-lg p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl text-gradient-gold mt-1">{value}</div>
    </div>
  );
}

function CategoryPicker({
  title, action, source, cats, onCancel, onPick, allowTopLevelOnly,
}: {
  title: string;
  action: string;
  source: Cat;
  cats: Cat[];
  onCancel: () => void;
  onPick: (id: string) => void;
  allowTopLevelOnly?: boolean;
}) {
  const [target, setTarget] = useState("");
  const options = cats.filter((x) => x.id !== source.id && (!allowTopLevelOnly || !x.parent_id));
  return (
    <div className="p-2 border border-gold/50 rounded my-1 bg-gradient-card space-y-2">
      <div className="text-xs font-medium text-gold">{title}: {source.name}</div>
      <div>
        <Label className="text-xs">{action}</Label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full bg-input border border-border rounded px-2 text-xs h-8"
        >
          <option value="">— เลือกหมวด —</option>
          {options.map((x) => (
            <option key={x.id} value={x.id}>{x.parent_id ? "↳ " : ""}{x.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-3 h-3" /> ยกเลิก</Button>
        <Button size="sm" variant="luxe" disabled={!target} onClick={() => onPick(target)}>
          <Save className="w-3 h-3" /> ยืนยัน
        </Button>
      </div>
    </div>
  );
}

// ============ ORDERS / IP ============
type AdminOrder = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  receipt_code: string | null;
  ip_address: string | null;
  paid_from_balance: boolean;
  payment_status: string;
  user_id: string;
  profiles: { username: string; roblox_name: string | null } | null;
  order_items: { product_name: string; unit_price: number; quantity: number }[];
};

function OrdersManager() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(
        "id, total, status, created_at, receipt_code, ip_address, paid_from_balance, payment_status, user_id, profiles(username, roblox_name), order_items(product_name, unit_price, quantity)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setOrders(((data as any[]) ?? []).map((o) => ({ ...o, total: Number(o.total) })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (
      (o.receipt_code ?? "").toLowerCase().includes(s) ||
      (o.ip_address ?? "").toLowerCase().includes(s) ||
      (o.profiles?.username ?? "").toLowerCase().includes(s) ||
      (o.profiles?.roblox_name ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="ค้นหา: รหัสใบเสร็จ / IP / ชื่อผู้ใช้"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <Button size="sm" variant="outline" onClick={load}>รีเฟรช</Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} / {orders.length} รายการ
        </span>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-6 text-center">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground text-sm py-6 text-center">ไม่พบรายการ</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left">
              <tr>
                <th className="p-2">เวลา</th>
                <th className="p-2">รหัสใบเสร็จ</th>
                <th className="p-2">ผู้ใช้</th>
                <th className="p-2">IP</th>
                <th className="p-2">รายการ</th>
                <th className="p-2 text-right">ยอด</th>
                <th className="p-2">การชำระ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="p-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("th-TH")}
                  </td>
                  <td className="p-2 font-mono text-xs text-gold whitespace-nowrap">
                    <button
                      className="hover:underline"
                      onClick={() => {
                        navigator.clipboard.writeText(o.receipt_code ?? o.id);
                        toast.success("คัดลอกรหัสแล้ว");
                      }}
                    >
                      {o.receipt_code ?? o.id.slice(0, 8)}
                    </button>
                  </td>
                  <td className="p-2 text-xs">
                    <div className="font-medium">{o.profiles?.username ?? "—"}</div>
                    <div className="text-muted-foreground">
                      {o.profiles?.roblox_name ?? ""}
                    </div>
                  </td>
                  <td className="p-2 font-mono text-xs">
                    <button
                      className="hover:underline text-emerald-400"
                      onClick={() => {
                        if (!o.ip_address) return;
                        navigator.clipboard.writeText(o.ip_address);
                        toast.success("คัดลอก IP แล้ว");
                      }}
                    >
                      {o.ip_address ?? "—"}
                    </button>
                  </td>
                  <td className="p-2 text-xs max-w-xs">
                    {o.order_items.map((i, idx) => (
                      <div key={idx}>
                        {i.product_name} × {i.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="p-2 text-right font-bold text-gold whitespace-nowrap">
                    ฿{o.total.toFixed(2)}
                  </td>
                  <td className="p-2 text-xs">
                    {o.paid_from_balance ? (
                      <span className="text-emerald-400">✓ ยอดในเว็บ</span>
                    ) : (
                      <span className="text-amber-400">ชำระกับแอดมิน</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ TRACKING (per-item admin fulfillment) ============
const STATUS_FLOW = ["pending", "acknowledged", "finding", "shipping", "delivered"] as const;
type FStatus = (typeof STATUS_FLOW)[number];
const STATUS_LABEL: Record<FStatus, string> = {
  pending: "รอแอดมินรับ",
  acknowledged: "แอดมินรับแล้ว",
  finding: "กำลังหาของ",
  shipping: "กำลังจัดส่ง",
  delivered: "จัดส่งสำเร็จ",
};
const STATUS_COLOR: Record<FStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  acknowledged: "bg-sky-500/15 text-sky-300",
  finding: "bg-violet-500/15 text-violet-300",
  shipping: "bg-blue-500/15 text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-400",
};

function TrackingManager() {
  const staff = getStaff();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, product_image, unit_price, quantity, created_at, acknowledged, acknowledged_at, fulfillment_status, return_status, return_reason, roblox_name, farm_account_name, farm_account_password, products(image_url, product_type), orders!inner(user_id, ip_address, receipt_code, payment_status, profiles(username, roblox_name))",
      )
      .order("created_at", { ascending: true })
      .limit(500);
    setItems((data as any[]) ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-tracking")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function updateStatus(it: any, status: FStatus) {
    const patch = {
      fulfillment_status: status,
      acknowledged: status !== "pending",
      acknowledged_at: status === "pending" ? null : new Date().toISOString(),
      acknowledged_by: status === "pending" ? null : staff?.id ?? null,
    };
    const { error } = await supabase.from("order_items").update(patch).eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success(`อัปเดตเป็น "${STATUS_LABEL[status]}"`);
    load();
  }

  async function deleteItem(it: any) {
    if (!confirm(`ลบรายการ "${it.product_name}" ออกจากระบบติดตาม?`)) return;
    const { error } = await supabase.from("order_items").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    // remove the parent order too when it has no items left
    const { count } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", it.order_id);
    if (!count) await supabase.from("orders").delete().eq("id", it.order_id);
    toast.success("ลบรายการแล้ว");
    load();
  }

  async function markPaid(it: any) {
    if (!confirm("ยืนยันว่าลูกค้าชำระเงินรายการนี้แล้ว?")) return;
    try {
      await markOrderPaid(it.order_id);
      toast.success("บันทึกการชำระเงินแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    }
  }

  async function cancelUnpaid(it: any) {
    if (!confirm(`ยกเลิกคำสั่งซื้อ "${it.product_name}" (ยังไม่ชำระเงิน — ไม่มีการคืนเงิน)?`)) return;
    try {
      await cancelOrderItem({ id: it.id, product_id: it.product_id, quantity: Number(it.quantity) });
      toast.success("ยกเลิกคำสั่งแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "ยกเลิกไม่สำเร็จ");
    }
  }

  async function refundItem(it: any) {
    const amount = Number(it.unit_price) * Number(it.quantity);
    const uid = it.orders?.user_id;
    if (!uid) return toast.error("ไม่พบผู้ใช้ของรายการนี้");
    if (it.orders?.payment_status !== "paid") return toast.error("รายการนี้ยังไม่ชำระเงิน ใช้ปุ่มยกเลิกคำสั่งแทน");
    if (!confirm(`คืนเงิน ฿${amount.toFixed(2)} เข้ายอดในเว็บของลูกค้า?`)) return;

    const { error } = await (supabase as any).rpc("refund_to_user", {
      _user_id: uid,
      _amount: amount,
      _note: `refund:${it.order_id}`,
    });
    if (error) return toast.error(error.message);
    await supabase
      .from("order_items")
      .update({ return_status: "approved", returned_at: new Date().toISOString() })
      .eq("id", it.id);
    if (it.product_id) {
      await (supabase as any).rpc("adjust_product_stock", {
        _product_id: it.product_id,
        _delta: Number(it.quantity),
      });
    }
    toast.success("คืนเงินเข้ายอดในเว็บแล้ว");
    load();
  }

  async function handleReturn(it: any, approve: boolean) {

    try {
      await resolveReturn({ id: it.id, product_id: it.product_id, quantity: Number(it.quantity) }, approve);
      toast.success(approve ? "อนุมัติคืนสินค้าแล้ว (คืนสต็อก)" : "ปฏิเสธคำขอคืนแล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "ผิดพลาด");
    }
  }

  async function advance(it: any) {
    const cur = (it.fulfillment_status ?? "pending") as FStatus;
    const idx = STATUS_FLOW.indexOf(cur);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    if (next === cur) return;
    return updateStatus(it, next);
  }

  const active = items.filter((i) => (i.fulfillment_status ?? "pending") !== "delivered");
  const done = items.filter((i) => i.fulfillment_status === "delivered").reverse();
  const pendingList = active.filter((i) => (i.fulfillment_status ?? "pending") === "pending");
  const visible = showDone ? [...active, ...done] : active;

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm">
          <span className="text-amber-300 font-bold">{pendingList.length}</span> รอรับ ·{" "}
          <span className="text-sky-300 font-bold">{active.length - pendingList.length}</span> กำลังดำเนินการ ·{" "}
          <span className="text-emerald-400 font-bold">{done.length}</span> สำเร็จ
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowDone((v) => !v)}>
          {showDone ? "ซ่อนที่จัดส่งแล้ว" : "แสดงที่จัดส่งแล้ว"}
        </Button>
        <Button size="sm" variant="outline" onClick={load}>รีเฟรช</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-6 text-center">กำลังโหลด...</div>
      ) : visible.length === 0 ? (
        <div className="text-muted-foreground text-sm py-6 text-center">ไม่มีรายการ</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((it) => {
            const status = (it.fulfillment_status ?? "pending") as FStatus;
            const pendingIdx = pendingList.findIndex((p) => p.id === it.id);
            const queuePos = pendingIdx >= 0 ? pendingIdx + 1 : null;
            const total = Number(it.unit_price) * it.quantity;
            const profile = it.orders?.profiles;
            const img = it.product_image ?? it.products?.image_url ?? null;
            const canAdvance = status !== "delivered";
            const isPaid = it.orders?.payment_status === "paid";

            return (
              <div
                key={it.id}
                className={`rounded-lg border p-3 bg-gradient-card ${
                  status === "delivered"
                    ? "border-emerald-500/30 opacity-70"
                    : status === "pending"
                      ? "border-gold/40"
                      : "border-sky-500/40"
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-secondary/40 flex items-center justify-center">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xs text-muted-foreground">no img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      จำนวน {it.quantity} × ฿{Number(it.unit_price).toFixed(2)} = <span className="text-gold font-bold">฿{total.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(it.created_at).toLocaleString("th-TH")}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      <span className="text-muted-foreground">ลูกค้า:</span>{" "}
                      <span className="font-medium">{profile?.username ?? "—"}</span>
                      {profile?.roblox_name && <span className="text-muted-foreground"> · บัญชี: {profile.roblox_name}</span>}
                    </div>
                    <div className="text-[11px]">
                      <span className="text-muted-foreground">ชื่อที่ลูกค้ากรอก:</span>{" "}
                      <span className="text-gold font-medium">{it.roblox_name || "—"}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      IP: <span className="font-mono">{it.orders?.ip_address ?? "—"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        isPaid ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {isPaid ? "ชำระแล้ว" : "รอชำระ"}
                    </span>
                    {queuePos && (
                      <span className="text-[11px] text-muted-foreground">คิว #{queuePos}</span>
                    )}
                  </div>
                </div>

                {(it.farm_account_name || it.products?.product_type === "farm") && (
                  <div className="mt-2 rounded border border-destructive/40 bg-destructive/5 px-2 py-1.5 text-[11px] space-y-0.5">
                    <div className="font-medium text-destructive">ข้อมูลบัญชีสำหรับงานฟาร์ม (ข้อมูลลับ)</div>
                    <div>
                      ไอดี: <span className="font-mono text-gold">{it.farm_account_name || "—"}</span>
                    </div>
                    <div>
                      รหัสผ่าน: <span className="font-mono text-gold">{it.farm_account_password || "—"}</span>
                    </div>
                  </div>
                )}


                <div className="mt-3 flex flex-wrap gap-1.5">
                  {canAdvance && (
                    <Button size="sm" variant="luxe" onClick={() => advance(it)}>
                      → {STATUS_LABEL[STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1] as FStatus]}
                    </Button>
                  )}
                  <select
                    value={status}
                    onChange={(e) => updateStatus(it, e.target.value as FStatus)}
                    className="text-xs bg-secondary border border-border rounded px-2 py-1"
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  {it.return_status === "requested" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleReturn(it, true)}>
                        อนุมัติคืนสินค้า (คืนสต็อก)
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReturn(it, false)}>
                        ปฏิเสธ
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => refundItem(it)}>
                    คืนเงินเข้ายอดลูกค้า
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteItem(it)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบรายการ
                  </Button>

                </div>
                {it.return_status && it.return_status !== "none" && (
                  <div className="mt-2 text-[11px] rounded border border-border bg-secondary/30 px-2 py-1">
                    <span className="text-destructive font-medium">{RETURN_LABEL[it.return_status]}</span>
                    {it.return_reason && <span className="text-muted-foreground"> — {it.return_reason}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

