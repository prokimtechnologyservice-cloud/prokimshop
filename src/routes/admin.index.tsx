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
import { Crown, LogOut, Plus, Trash2, Edit, Save, X, Upload, Power } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Cat = { id: string; name: string; sort_order: number };
type Prod = { id: string; category_id: string; name: string; price: number; description: string | null; image_url: string | null };
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
            <TabsTrigger value="users">ยอดเงินผู้ใช้</TabsTrigger>
            {isManager && <TabsTrigger value="staff">สิทธิ์พนักงาน</TabsTrigger>}
            {isManager && <TabsTrigger value="site">เปิด/ปิดเว็บ</TabsTrigger>}
            {isManager && <TabsTrigger value="stats">สถิติ</TabsTrigger>}
          </TabsList>

          <TabsContent value="catalog"><CatalogManager /></TabsContent>
          <TabsContent value="ann"><AnnouncementManager /></TabsContent>
          <TabsContent value="users"><UsersManager /></TabsContent>
          {isManager && <TabsContent value="staff"><StaffManager /></TabsContent>}
          {isManager && <TabsContent value="site"><SiteToggle /></TabsContent>}
          {isManager && <TabsContent value="stats"><StatsPanel /></TabsContent>}
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
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [editingProd, setEditingProd] = useState<Prod | null>(null);
  const [showNewProd, setShowNewProd] = useState(false);

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    setCats((c as Cat[]) ?? []);
    setProds(((p as any[]) ?? []).map((x) => ({ ...x, price: Number(x.price) })));
    if (!active && c && c[0]) setActive(c[0].id);
  }
  useEffect(() => { load(); }, []);

  async function addCat() {
    if (!newCat.trim()) return;
    await supabase.from("categories").insert({ name: newCat.trim(), sort_order: cats.length + 1 });
    setNewCat("");
    toast.success("เพิ่มหมวดหมู่แล้ว");
    load();
  }

  async function delCat(id: string) {
    if (!confirm("ลบหมวดและสินค้าทั้งหมดในหมวดนี้?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast.success("ลบแล้ว"); load();
  }

  async function saveEditCat() {
    if (!editingCat) return;
    await supabase.from("categories").update({ name: editingCat.name }).eq("id", editingCat.id);
    setEditingCat(null); toast.success("บันทึกแล้ว"); load();
  }

  async function delProd(id: string) {
    if (!confirm("ลบสินค้านี้?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("ลบแล้ว"); load();
  }

  const visible = prods.filter((p) => p.category_id === active);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 mt-4">
      <aside className="bg-card border border-border rounded-lg p-3 space-y-2">
        <h3 className="font-display text-lg mb-2">หมวดหมู่</h3>
        <div className="flex gap-2">
          <Input placeholder="ชื่อหมวดใหม่" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button size="icon" variant="luxe" onClick={addCat}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-1 mt-2">
          {cats.map((c) => (
            <div key={c.id} className={`flex items-center gap-1 p-2 rounded text-sm ${active === c.id ? "bg-secondary" : ""}`}>
              {editingCat?.id === c.id ? (
                <>
                  <Input value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} className="h-7" />
                  <Button size="icon" variant="ghost" onClick={saveEditCat}><Save className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingCat(null)}><X className="w-3 h-3" /></Button>
                </>
              ) : (
                <>
                  <button className="flex-1 text-left" onClick={() => setActive(c.id)}>{c.name}</button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingCat({ id: c.id, name: c.name })}><Edit className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delCat(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">สินค้า ({visible.length})</h3>
          <Button variant="luxe" size="sm" onClick={() => setShowNewProd(true)} disabled={!active}>
            <Plus className="w-4 h-4" /> เพิ่มสินค้า
          </Button>
        </div>

        {showNewProd && active && (
          <ProductForm
            categoryId={active}
            onClose={() => setShowNewProd(false)}
            onSaved={() => { setShowNewProd(false); load(); }}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map((p) =>
            editingProd?.id === p.id ? (
              <ProductForm
                key={p.id}
                product={p}
                categoryId={p.category_id}
                onClose={() => setEditingProd(null)}
                onSaved={() => { setEditingProd(null); load(); }}
              />
            ) : (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-onyx/40">
                <div className="w-12 h-12 rounded bg-onyx flex items-center justify-center overflow-hidden">
                  {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Crown className="w-5 h-5 text-primary/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gold">฿{p.price.toFixed(2)}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditingProd(p)}><Edit className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => delProd(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

  async function uploadFile(file: File) {
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

  async function save() {
    const payload = {
      name: name.trim(),
      price: Number(price) || 0,
      description: desc || null,
      image_url: imgUrl || null,
      category_id: categoryId,
    };
    if (product) {
      await supabase.from("products").update(payload).eq("id", product.id);
    } else {
      await supabase.from("products").insert(payload);
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
          <Label>ราคา (บาท)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>รายละเอียด</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
      </div>
      <div>
        <Label>รูปภาพสินค้า</Label>
        <div className="flex items-center gap-3 mt-1">
          {imgUrl && <img src={imgUrl} className="w-16 h-16 rounded object-cover border border-border" />}
          <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary cursor-pointer hover:bg-accent text-sm">
            <Upload className="w-4 h-4" />
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button variant="luxe" onClick={save}>บันทึก</Button>
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

  async function changeRole(id: string, role: string) {
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
