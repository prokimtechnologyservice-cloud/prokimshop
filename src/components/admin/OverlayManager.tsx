import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Eye, EyeOff, Type, Image as ImageIcon, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import type { Overlay } from "@/lib/overlays";

const PAGES = [
  { key: "home", label: "หน้าหลัก /" },
  { key: "history", label: "ประวัติ /history" },
  { key: "admin", label: "แอดมิน (ไม่แสดง)" },
];

const CANVAS_W = 720;
const CANVAS_H = 1280;

export function OverlayManager() {
  const [page, setPage] = useState("home");
  const [items, setItems] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase.from("site_overlays").select("*").eq("page", page).order("z_index");
    setItems((data as Overlay[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);

  const selected = items.find((i) => i.id === selectedId) || null;

  function patchLocal(id: string, patch: Partial<Overlay>) {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function saveItem(id: string) {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    const { error } = await supabase.from("site_overlays").update({
      label: it.label, kind: it.kind, content: it.content, image_url: it.image_url, href: it.href,
      x: it.x, y: it.y, w: it.w, h: it.h, rotate: it.rotate, font_size: it.font_size,
      color: it.color, bg: it.bg, z_index: it.z_index, visible: it.visible,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("บันทึกแล้ว");
  }

  async function saveAll() {
    for (const it of items) await saveItem(it.id);
  }

  async function addItem(kind: "text" | "image" | "button") {
    const def: any = {
      page, kind,
      label: kind === "text" ? "ข้อความใหม่" : kind === "image" ? "รูปใหม่" : "ปุ่มใหม่",
      content: kind === "text" ? "ข้อความใหม่" : kind === "button" ? "คลิกที่นี่" : null,
      x: 40, y: 40, w: kind === "image" ? 200 : 200, h: kind === "image" ? 150 : 50,
      rotate: 0, font_size: 18, z_index: 10, visible: true,
      bg: kind === "button" ? "#dc2626" : null,
      color: kind === "button" ? "#ffffff" : null,
    };
    const { data, error } = await supabase.from("site_overlays").insert(def).select().single();
    if (error) return toast.error(error.message);
    setItems((arr) => [...arr, data as Overlay]);
    setSelectedId((data as Overlay).id);
  }

  async function removeItem(id: string) {
    if (!confirm("ลบ object นี้?")) return;
    await supabase.from("site_overlays").delete().eq("id", id);
    setItems((arr) => arr.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function uploadImage(id: string, file: File) {
    const path = `overlays/${id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    patchLocal(id, { image_url: data.publicUrl });
    toast.success("อัปโหลดแล้ว — กดบันทึก");
  }

  // Drag / resize / rotate
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl text-gradient-gold">Overlay Editor — แก้หน้าเว็บ</h2>
          <p className="text-xs text-muted-foreground">ลาก/หมุน/ปรับขนาดได้ · กดบันทึกแล้วผู้ใช้ refresh จะเห็น</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={page} onChange={(e) => { setPage(e.target.value); setSelectedId(null); }}
            className="bg-input border border-border rounded px-2 py-1 text-sm">
            {PAGES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Button size="sm" variant="luxe" onClick={saveAll}><Save className="w-4 h-4" /> บันทึกทั้งหมด</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => addItem("text")}><Type className="w-4 h-4" /> + ข้อความ</Button>
        <Button size="sm" onClick={() => addItem("image")}><ImageIcon className="w-4 h-4" /> + รูป</Button>
        <Button size="sm" onClick={() => addItem("button")}><MousePointerClick className="w-4 h-4" /> + ปุ่ม</Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Canvas */}
        <div className="overflow-auto border border-border rounded-lg bg-onyx p-2">
          <div
            ref={canvasRef}
            className="relative bg-gradient-card border border-dashed border-border mx-auto"
            style={{ width: CANVAS_W, height: CANVAS_H, minWidth: CANVAS_W }}
            onPointerDown={() => setSelectedId(null)}
          >
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground pointer-events-none">
              พื้นที่หน้า {page} (กว้าง {CANVAS_W}px) — เทียบโดยประมาณ
            </div>
            {items.map((o) => {
              const sel = o.id === selectedId;
              return (
                <div
                  key={o.id}
                  onPointerDown={(e) => startDrag(e, o.id, "move")}
                  className={`absolute cursor-move select-none ${sel ? "outline outline-2 outline-gold" : "outline outline-1 outline-border/60"}`}
                  style={{
                    left: o.x, top: o.y, width: o.w, height: o.h,
                    transform: `rotate(${o.rotate}deg)`,
                    fontSize: o.font_size,
                    color: o.color || "inherit",
                    background: o.kind === "image" ? "transparent" : (o.bg || "rgba(255,255,255,0.04)"),
                    zIndex: o.z_index,
                    opacity: o.visible ? 1 : 0.4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", borderRadius: 8,
                  }}
                >
                  {o.kind === "image" && o.image_url
                    ? <img src={o.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
                    : <span className="px-2 text-center break-words leading-tight w-full pointer-events-none">{o.content || "(ว่าง)"}</span>}
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
        </div>

        {/* Inspector */}
        <div className="space-y-3">
          {!selected ? (
            <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
              เลือก object บน canvas เพื่อแก้ไข หรือเพิ่มอันใหม่ด้านบน
            </div>
          ) : (
            <div className="bg-gradient-card border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-muted-foreground">{selected.kind} · {selected.id.slice(0, 6)}</div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => patchLocal(selected.id, { visible: !selected.visible })}>
                    {selected.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(selected.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">ชื่อ (ใช้จำ)</Label>
                <Input value={selected.label || ""} onChange={(e) => patchLocal(selected.id, { label: e.target.value })} />
              </div>

              {selected.kind !== "image" && (
                <div>
                  <Label className="text-xs">ข้อความ</Label>
                  <Textarea rows={2} value={selected.content || ""} onChange={(e) => patchLocal(selected.id, { content: e.target.value })} />
                </div>
              )}

              {selected.kind === "image" && (
                <div className="space-y-1">
                  <Label className="text-xs">รูป (URL หรืออัปโหลด)</Label>
                  <Input value={selected.image_url || ""} onChange={(e) => patchLocal(selected.id, { image_url: e.target.value })} />
                  <label className="text-xs text-gold cursor-pointer hover:underline inline-flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> อัปโหลด
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) uploadImage(selected.id, f);
                    }} />
                  </label>
                </div>
              )}

              <div>
                <Label className="text-xs">ลิงก์ (กดแล้วไป — ไม่จำเป็น)</Label>
                <Input value={selected.href || ""} placeholder="https://..." onChange={(e) => patchLocal(selected.id, { href: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">X</Label><Input type="number" value={selected.x} onChange={(e) => patchLocal(selected.id, { x: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Y</Label><Input type="number" value={selected.y} onChange={(e) => patchLocal(selected.id, { y: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">กว้าง</Label><Input type="number" value={selected.w} onChange={(e) => patchLocal(selected.id, { w: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">สูง</Label><Input type="number" value={selected.h} onChange={(e) => patchLocal(selected.id, { h: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">หมุน (°)</Label><Input type="number" value={selected.rotate} onChange={(e) => patchLocal(selected.id, { rotate: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">ขนาดตัวอักษร</Label><Input type="number" value={selected.font_size} onChange={(e) => patchLocal(selected.id, { font_size: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">ลำดับชั้น</Label><Input type="number" value={selected.z_index} onChange={(e) => patchLocal(selected.id, { z_index: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">สีตัวอักษร</Label><Input type="color" value={selected.color || "#ffffff"} onChange={(e) => patchLocal(selected.id, { color: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">สีพื้นหลัง</Label><Input type="color" value={selected.bg || "#000000"} onChange={(e) => patchLocal(selected.id, { bg: e.target.value })} /></div>
              </div>

              <Button size="sm" variant="luxe" className="w-full" onClick={() => saveItem(selected.id)}>
                <Save className="w-4 h-4" /> บันทึก object นี้
              </Button>
            </div>
          )}

          <div className="bg-gradient-card border border-border rounded-lg p-3 space-y-1 max-h-[400px] overflow-auto">
            <div className="text-xs font-medium mb-1">รายการทั้งหมด ({items.length})</div>
            {items.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`w-full text-left text-xs px-2 py-1 rounded hover:bg-primary/10 ${o.id === selectedId ? "bg-primary/20" : ""}`}
              >
                {o.visible ? "👁" : "🚫"} [{o.kind}] {o.label || o.content?.slice(0, 20) || "(ไม่มีชื่อ)"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
