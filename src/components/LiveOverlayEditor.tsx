import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getStaff } from "@/lib/auth";
import { pageKeyFromPath, type Overlay } from "@/lib/overlays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil, Save, Plus, Trash2, Type, Image as ImageIcon,
  MousePointerClick, Eye, EyeOff, X, Settings, FileText, Upload,
  Undo2, Redo2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

type SiteContentRow = { key: string; value: string | null; type: string; label: string | null };
type EditorSnapshot = {
  items: Overlay[];
  siteEdits: Record<string, string>;
  dirty: string[];
  siteDirty: string[];
  deletedIds: string[];
};

const DEFAULT_SITE_ROWS: SiteContentRow[] = [
  { key: "site_brand", value: "PROKIM", type: "text", label: "ชื่อโลโก้ด้านบน" },
  { key: "site_tagline", value: "LUXE STORE", type: "text", label: "คำใต้โลโก้ด้านบน" },
  { key: "show_hero", value: "true", type: "boolean", label: "แสดงส่วนหัวหน้าแรก" },
  { key: "hero_badge", value: "LUXURY GAMING STORE", type: "text", label: "ป้ายเล็กเหนือหัวข้อ" },
  { key: "hero_title", value: "PROKIM", type: "text", label: "หัวข้อใหญ่หน้าแรก" },
  { key: "hero_subtitle", value: "ร้านไอเทมเกมพรีเมียม — Robux, Blox Fruits, Brookhaven, 99 คืนในป่า ราคาดี ส่งไว ปลอดภัย", type: "textarea", label: "คำอธิบายหน้าแรก" },
  { key: "banner_url", value: "", type: "image", label: "รูปพื้นหลังหน้าแรก" },
  { key: "footer_text", value: "© 2026 PROKIM Luxe Store · Crafted with passion", type: "textarea", label: "ข้อความท้ายเว็บ" },
];

/**
 * LiveOverlayEditor:
 * - Renders on every public page (not /admin)
 * - Only visible if staff role === "manager"
 * - Shows a floating toggle. When EditMode is ON:
 *   - Reads & shows ALL overlays (including hidden) for current page
 *   - Allows drag/resize/rotate
 *   - Add text/image/button, edit inspector, delete, save
 */
export function LiveOverlayEditor() {
  const loc = useLocation();
  const page = pageKeyFromPath(loc.pathname);
  const isAdminRoute = loc.pathname.startsWith("/admin");

  const [staffOk, setStaffOk] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [items, setItems] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"content" | "overlays">("content");
  const [siteRows, setSiteRows] = useState<SiteContentRow[]>([]);
  const [siteEdits, setSiteEdits] = useState<Record<string, string>>({});
  const [siteDirty, setSiteDirty] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const [loadedSnapshot, setLoadedSnapshot] = useState<EditorSnapshot | null>(null);

  // detect manager
  useEffect(() => {
    function check() {
      const s = getStaff();
      setStaffOk(!!s && s.role === "manager");
    }
    check();
    window.addEventListener("staff-change", check);
    return () => window.removeEventListener("staff-change", check);
  }, []);

  // Load overlays + site_content for current page when edit mode enabled
  useEffect(() => {
    if (!editMode) return;
    (async () => {
      const [{ data: ov }, { data: sc }] = await Promise.all([
        supabase.from("site_overlays").select("*").eq("page", page).order("z_index"),
        supabase.from("site_content").select("*").order("key"),
      ]);
      setItems((ov as Overlay[]) ?? []);
      setSelectedId(null);
      setDirty(new Set());
      setDeletedIds(new Set());
      const rowsByKey = new Map<string, SiteContentRow>();
      DEFAULT_SITE_ROWS.forEach((r) => rowsByKey.set(r.key, r));
      ((sc as SiteContentRow[]) ?? []).forEach((r) => rowsByKey.set(r.key, r));
      const rows = Array.from(rowsByKey.values());
      setSiteRows(rows);
      const m: Record<string, string> = {};
      rows.forEach((r) => { m[r.key] = r.value ?? ""; });
      setSiteEdits(m);
      setSiteDirty(new Set());
      setUndoStack([]);
      setRedoStack([]);
      setLoadedSnapshot({
        items: ((ov as Overlay[]) ?? []).map((i) => ({ ...i })),
        siteEdits: m,
        dirty: [],
        siteDirty: [],
        deletedIds: [],
      });
    })();
  }, [editMode, page]);

  if (isAdminRoute || !staffOk) return null;

  const selected = items.find((i) => i.id === selectedId) || null;

  function snapshot(): EditorSnapshot {
    return {
      items: items.map((i) => ({ ...i })),
      siteEdits: { ...siteEdits },
      dirty: Array.from(dirty),
      siteDirty: Array.from(siteDirty),
      deletedIds: Array.from(deletedIds),
    };
  }

  function restoreSnapshot(s: EditorSnapshot) {
    setItems(s.items.map((i) => ({ ...i })));
    setSiteEdits({ ...s.siteEdits });
    setDirty(new Set(s.dirty));
    setSiteDirty(new Set(s.siteDirty));
    setDeletedIds(new Set(s.deletedIds));
    setSelectedId(null);
  }

  function pushHistory() {
    setUndoStack((stack) => [...stack.slice(-24), snapshot()]);
    setRedoStack([]);
  }

  function undo() {
    const prev = undoStack.at(-1);
    if (!prev) return toast.info("ยังไม่มีย้อนกลับ");
    setRedoStack((stack) => [...stack.slice(-24), snapshot()]);
    setUndoStack((stack) => stack.slice(0, -1));
    restoreSnapshot(prev);
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return toast.info("ยังไม่มีทำซ้ำ");
    setUndoStack((stack) => [...stack.slice(-24), snapshot()]);
    setRedoStack((stack) => stack.slice(0, -1));
    restoreSnapshot(next);
  }

  function discardChanges() {
    if ((dirty.size > 0 || siteDirty.size > 0 || deletedIds.size > 0) && !confirm("ยกเลิกการแก้ไขที่ยังไม่ได้บันทึก?")) return;
    if (loadedSnapshot) restoreSnapshot(loadedSnapshot);
    setUndoStack([]);
    setRedoStack([]);
    setEditMode(false);
  }

  function patchSite(key: string, val: string) {
    pushHistory();
    setSiteEdits((m) => ({ ...m, [key]: val }));
    setSiteDirty((d) => new Set(d).add(key));
  }

  useEffect(() => {
    if (!editMode) return;
    window.dispatchEvent(new CustomEvent("site-content-preview", { detail: siteEdits }));
  }, [editMode, siteEdits]);

  async function saveSite() {
    if (siteDirty.size === 0) { toast.info("ไม่มีการเปลี่ยนแปลง"); return; }
    const updates = Array.from(siteDirty).map((k) => {
      const r = siteRows.find((x) => x.key === k);
      return { key: k, value: siteEdits[k] ?? "", type: r?.type ?? "text", label: r?.label ?? k, updated_at: new Date().toISOString() };
    });
    const { error } = await supabase.from("site_content").upsert(updates, { onConflict: "key" });
    if (error) return toast.error(error.message);
    setSiteDirty(new Set());
    setLoadedSnapshot((s) => s ? { ...s, siteEdits: { ...siteEdits }, siteDirty: [] } : s);
    toast.success(`บันทึก ${updates.length} ช่องแล้ว`);
  }

  async function uploadSiteImage(key: string, file: File) {
    const path = `site/${key}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    patchSite(key, data.publicUrl);
  }

  function patchLocal(id: string, patch: Partial<Overlay>, recordHistory = true) {
    if (recordHistory) pushHistory();
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setDirty((d) => new Set(d).add(id));
  }

  async function addItem(kind: "text" | "image" | "button") {
    pushHistory();
    const def: any = {
      page, kind,
      label: kind === "text" ? "ข้อความใหม่" : kind === "image" ? "รูปใหม่" : "ปุ่มใหม่",
      content: kind === "text" ? "ข้อความใหม่" : kind === "button" ? "คลิกที่นี่" : null,
      x: 40, y: 80,
      w: kind === "image" ? 200 : 200,
      h: kind === "image" ? 150 : 50,
      rotate: 0, font_size: 18, z_index: 10, visible: true,
      bg: kind === "button" ? "#dc2626" : null,
      color: kind === "button" ? "#ffffff" : null,
    };
    const { data, error } = await supabase.from("site_overlays").insert(def).select().single();
    if (error) return toast.error(error.message);
    setItems((arr) => [...arr, data as Overlay]);
    setSelectedId((data as Overlay).id);
    toast.success("เพิ่มแล้ว — ลากย้ายได้เลย");
  }

  async function removeItem(id: string) {
    if (!confirm("ลบ object นี้? กดบันทึกเพื่อยืนยัน หรืดย้อนกลับเพื่อยกเลิก")) return;
    pushHistory();
    setDeletedIds((d) => new Set(d).add(id));
    setItems((arr) => arr.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function uploadImage(id: string, file: File) {
    const path = `overlays/${id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    patchLocal(id, { image_url: data.publicUrl });
  }

  async function saveAll() {
    if (dirty.size === 0 && deletedIds.size === 0) {
      toast.info("ไม่มีการเปลี่ยนแปลง");
      return;
    }
    if (deletedIds.size > 0) {
      const { error } = await supabase.from("site_overlays").delete().in("id", Array.from(deletedIds));
      if (error) return toast.error(error.message);
    }
    const ids = Array.from(dirty);
    for (const id of ids) {
      const it = items.find((i) => i.id === id);
      if (!it) continue;
      await supabase.from("site_overlays").update({
        label: it.label, kind: it.kind, content: it.content, image_url: it.image_url, href: it.href,
        x: it.x, y: it.y, w: it.w, h: it.h, rotate: it.rotate, font_size: it.font_size,
        color: it.color, bg: it.bg, z_index: it.z_index, visible: it.visible,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    }
    setDirty(new Set());
    setDeletedIds(new Set());
    setLoadedSnapshot(snapshot());
    toast.success(`บันทึก ${ids.length + deletedIds.size} รายการแล้ว`);
  }

  // Drag/Resize/Rotate using viewport coordinates
  function startDrag(e: React.PointerEvent, id: string, mode: "move" | "resize" | "rotate") {
    e.stopPropagation();
    e.preventDefault();
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setSelectedId(id);
    const startX = e.clientX, startY = e.clientY;
    const startVals = { x: it.x, y: it.y, w: it.w, h: it.h, rotate: it.rotate };
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const startAngle = Math.atan2(startY - cy, startX - cx);

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (mode === "move") {
        patchLocal(id, { x: Math.max(0, startVals.x + dx), y: Math.max(0, startVals.y + dy) });
      } else if (mode === "resize") {
        patchLocal(id, {
          w: Math.max(20, startVals.w + dx),
          h: Math.max(20, startVals.h + dy),
        });
      } else {
        const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        const deg = ((a - startAngle) * 180) / Math.PI;
        patchLocal(id, { rotate: Math.round(startVals.rotate + deg) });
      }
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Floating toggle button
  if (!editMode) {
    return (
      <button
        onClick={() => setEditMode(true)}
        className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-crimson text-gold border border-gold/40 shadow-luxe text-sm font-medium hover:scale-105 transition"
        title="เปิดโหมดแก้ไขหน้าเว็บ"
      >
        <Pencil className="w-4 h-4" /> Edit Mode
      </button>
    );
  }

  return (
    <>
      {/* Edit overlay layer — covers viewport, captures pointer events */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {items.map((o) => {
          const sel = o.id === selectedId;
          return (
            <div
              key={o.id}
              onPointerDown={(e) => startDrag(e, o.id, "move")}
              className={`absolute cursor-move select-none pointer-events-auto ${
                sel ? "outline outline-2 outline-gold" : "outline outline-1 outline-dashed outline-gold/60"
              }`}
              style={{
                left: o.x, top: o.y, width: o.w, height: o.h,
                transform: `rotate(${o.rotate}deg)`,
                fontSize: o.font_size,
                color: o.color || "inherit",
                background: o.kind === "image"
                  ? "transparent"
                  : (o.bg || "rgba(255,255,255,0.06)"),
                opacity: o.visible ? 1 : 0.4,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", borderRadius: 8,
              }}
            >
              {o.kind === "image" && o.image_url ? (
                <img src={o.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
              ) : (
                <span className="px-2 text-center break-words leading-tight w-full pointer-events-none">
                  {o.content || "(ว่าง)"}
                </span>
              )}
              {sel && (
                <>
                  <div
                    onPointerDown={(e) => startDrag(e, o.id, "resize")}
                    className="absolute -right-1 -bottom-1 w-4 h-4 bg-gold rounded-sm cursor-se-resize"
                    title="ปรับขนาด"
                  />
                  <div
                    onPointerDown={(e) => startDrag(e, o.id, "rotate")}
                    className="absolute left-1/2 -top-6 w-4 h-4 -translate-x-1/2 bg-primary rounded-full cursor-grab"
                    title="หมุน"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1 px-2 py-1.5 rounded-full bg-onyx/95 backdrop-blur border border-gold/40 shadow-luxe">
        <span className="px-2 text-xs text-gold font-medium hidden sm:inline">EDIT · {page}</span>
        <Button size="sm" variant="ghost" onClick={() => addItem("text")} title="เพิ่มข้อความ">
          <Type className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => addItem("image")} title="เพิ่มรูป">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => addItem("button")} title="เพิ่มปุ่ม">
          <MousePointerClick className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button size="sm" variant="ghost" onClick={() => setShowInspector((v) => !v)} title="แผง edit">
          <Settings className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="luxe" onClick={saveAll} title="บันทึก">
          <Save className="w-4 h-4" /> {dirty.size > 0 && <span className="text-xs">({dirty.size})</span>}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} title="ปิด">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Inspector */}
      {showInspector && (
        <div className="fixed bottom-4 right-4 z-[9999] w-80 max-h-[75vh] overflow-auto bg-onyx/95 backdrop-blur border border-gold/40 rounded-lg shadow-luxe p-3 space-y-2 text-foreground">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-2">
            <button
              onClick={() => setTab("content")}
              className={`flex-1 text-xs px-2 py-1 rounded ${tab === "content" ? "bg-gradient-crimson text-gold" : "hover:bg-primary/10"}`}
            >
              <FileText className="w-3 h-3 inline mr-1" /> เนื้อหาเดิม ({siteRows.length})
            </button>
            <button
              onClick={() => setTab("overlays")}
              className={`flex-1 text-xs px-2 py-1 rounded ${tab === "overlays" ? "bg-gradient-crimson text-gold" : "hover:bg-primary/10"}`}
            >
              <Plus className="w-3 h-3 inline mr-1" /> วางใหม่ ({items.length})
            </button>
          </div>

          {tab === "content" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">แก้ของเดิมในหน้านี้ — ข้อความ/รูป/ปุ่มเปิด-ปิด</p>
                <Button size="sm" variant="luxe" onClick={saveSite} disabled={siteDirty.size === 0}>
                  <Save className="w-3 h-3" /> บันทึก{siteDirty.size > 0 ? ` (${siteDirty.size})` : ""}
                </Button>
              </div>
              {siteRows.length === 0 && (
                <div className="text-xs text-muted-foreground py-4 text-center">ยังไม่มีช่องที่แก้ได้ — เปิดในแท็บ "วางใหม่" เพื่อเพิ่มของลอย</div>
              )}
              {siteRows.map((r) => (
                <div key={r.key} className={`p-2 rounded border ${siteDirty.has(r.key) ? "border-gold/60 bg-gold/5" : "border-border bg-onyx/40"}`}>
                  <div className="text-[11px] font-medium mb-1">{r.label || r.key} <span className="text-[9px] text-muted-foreground font-mono">· {r.type}</span></div>
                  {r.type === "boolean" ? (
                    <select className="w-full bg-input border border-border rounded px-2 py-1 text-xs" value={siteEdits[r.key] ?? "true"} onChange={(e) => patchSite(r.key, e.target.value)}>
                      <option value="true">เปิด</option><option value="false">ปิด</option>
                    </select>
                  ) : r.type === "textarea" ? (
                    <Textarea rows={2} className="text-xs" value={siteEdits[r.key] ?? ""} onChange={(e) => patchSite(r.key, e.target.value)} />
                  ) : r.type === "image" ? (
                    <div className="space-y-1">
                      <Input className="h-7 text-xs" placeholder="URL รูป" value={siteEdits[r.key] ?? ""} onChange={(e) => patchSite(r.key, e.target.value)} />
                      <label className="text-[10px] text-gold cursor-pointer hover:underline inline-flex items-center gap-1">
                        <Upload className="w-3 h-3" /> อัปโหลด
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSiteImage(r.key, f); }} />
                      </label>
                      {siteEdits[r.key] && <img src={siteEdits[r.key]} alt="" className="max-h-16 rounded border border-border" />}
                    </div>
                  ) : (
                    <Input className="h-7 text-xs" value={siteEdits[r.key] ?? ""} onChange={(e) => patchSite(r.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "overlays" && !selected && (
            <div className="text-xs text-muted-foreground">
              คลิก object ที่วางไว้ หรือกด + ด้านบนเพื่อเพิ่ม
              <div className="mt-2 max-h-60 overflow-auto space-y-1">
                {items.map((o) => (
                  <button key={o.id} onClick={() => setSelectedId(o.id)} className="w-full text-left text-xs px-2 py-1 rounded hover:bg-primary/10">
                    {o.visible ? "👁" : "🚫"} [{o.kind}] {o.label || o.content?.slice(0, 20) || "(ไม่มีชื่อ)"}
                  </button>
                ))}
                {items.length === 0 && <div className="py-4 text-center">ยังไม่มี — กด T / 🖼 / 🖱 ด้านบน</div>}
              </div>
            </div>
          )}

          {tab === "overlays" && selected && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-muted-foreground">{selected.kind}</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => patchLocal(selected.id, { visible: !selected.visible })}>
                    {selected.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(selected.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {selected.kind !== "image" && (
                <Textarea rows={2} placeholder="ข้อความ" value={selected.content || ""} onChange={(e) => patchLocal(selected.id, { content: e.target.value })} />
              )}
              {selected.kind === "image" && (
                <div className="space-y-1">
                  <Input placeholder="URL รูป" value={selected.image_url || ""} onChange={(e) => patchLocal(selected.id, { image_url: e.target.value })} />
                  <label className="text-xs text-gold cursor-pointer hover:underline inline-flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> อัปโหลด
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(selected.id, f); }} />
                  </label>
                </div>
              )}
              <Input placeholder="ลิงก์ (กดแล้วไป)" value={selected.href || ""} onChange={(e) => patchLocal(selected.id, { href: e.target.value })} />
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <label>X<Input className="h-7" type="number" value={selected.x} onChange={(e) => patchLocal(selected.id, { x: Number(e.target.value) })} /></label>
                <label>Y<Input className="h-7" type="number" value={selected.y} onChange={(e) => patchLocal(selected.id, { y: Number(e.target.value) })} /></label>
                <label>กว้าง<Input className="h-7" type="number" value={selected.w} onChange={(e) => patchLocal(selected.id, { w: Number(e.target.value) })} /></label>
                <label>สูง<Input className="h-7" type="number" value={selected.h} onChange={(e) => patchLocal(selected.id, { h: Number(e.target.value) })} /></label>
                <label>หมุน°<Input className="h-7" type="number" value={selected.rotate} onChange={(e) => patchLocal(selected.id, { rotate: Number(e.target.value) })} /></label>
                <label>ตัวอักษร<Input className="h-7" type="number" value={selected.font_size} onChange={(e) => patchLocal(selected.id, { font_size: Number(e.target.value) })} /></label>
                <label>ชั้น z<Input className="h-7" type="number" value={selected.z_index} onChange={(e) => patchLocal(selected.id, { z_index: Number(e.target.value) })} /></label>
                <label>สีอักษร<Input className="h-7 p-0" type="color" value={selected.color || "#ffffff"} onChange={(e) => patchLocal(selected.id, { color: e.target.value })} /></label>
                <label className="col-span-2">พื้นหลัง<Input className="h-7 p-0" type="color" value={selected.bg || "#000000"} onChange={(e) => patchLocal(selected.id, { bg: e.target.value })} /></label>
              </div>
              <Button size="sm" variant="luxe" className="w-full" onClick={() => { setDirty((d) => new Set(d).add(selected.id)); saveAll(); }}>
                <Save className="w-3 h-3" /> บันทึก
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
