import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Row = { key: string; value: string | null; type: string; label: string | null };

export function SiteEditor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // new field
  const [nKey, setNKey] = useState("");
  const [nLabel, setNLabel] = useState("");
  const [nType, setNType] = useState("text");
  const [nValue, setNValue] = useState("");

  async function load() {
    const { data } = await supabase.from("site_content").select("*").order("key");
    const r = (data as Row[]) ?? [];
    setRows(r);
    const m: Record<string, string> = {};
    r.forEach((x) => { m[x.key] = x.value ?? ""; });
    setEdits(m);
  }
  useEffect(() => { load(); }, []);

  async function saveAll() {
    setLoading(true);
    const updates = rows.map((r) => ({
      key: r.key,
      value: edits[r.key] ?? "",
      type: r.type,
      label: r.label,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("site_content").upsert(updates, { onConflict: "key" });
    setLoading(false);
    if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message);
    else toast.success("บันทึกแล้ว — ผู้ใช้ refresh จะเห็นทันที");
  }

  async function addField() {
    if (!nKey.trim()) return toast.error("ใส่ key");
    const { error } = await supabase.from("site_content").insert({
      key: nKey.trim(),
      label: nLabel || nKey,
      type: nType,
      value: nValue,
    });
    if (error) return toast.error(error.message);
    setNKey(""); setNLabel(""); setNValue(""); setNType("text");
    toast.success("เพิ่มแล้ว");
    load();
  }

  async function removeField(key: string) {
    if (!confirm(`ลบ ${key}?`)) return;
    const { error } = await supabase.from("site_content").delete().eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("ลบแล้ว");
    load();
  }

  async function uploadImage(key: string, file: File) {
    const path = `site/${key}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setEdits((e) => ({ ...e, [key]: data.publicUrl }));
    toast.success("อัปโหลดแล้ว — กดบันทึก");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-gradient-gold">แก้ไขหน้าเว็บ</h2>
          <p className="text-xs text-muted-foreground">แก้ข้อความ/รูป/เปิด-ปิด section · กดบันทึกแล้วผู้ใช้ทุกคนเห็น (เมื่อ refresh)</p>
        </div>
        <Button variant="luxe" onClick={saveAll} disabled={loading}>
          <Save className="w-4 h-4" /> บันทึกทั้งหมด
        </Button>
      </div>

      <div className="grid gap-4">
        {rows.map((r) => (
          <div key={r.key} className="bg-gradient-card border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{r.label || r.key}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{r.key} · {r.type}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeField(r.key)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>

            {r.type === "boolean" ? (
              <select
                className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                value={edits[r.key] ?? "true"}
                onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
              >
                <option value="true">เปิด (true)</option>
                <option value="false">ปิด (false)</option>
              </select>
            ) : r.type === "textarea" ? (
              <Textarea
                rows={3}
                value={edits[r.key] ?? ""}
                onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
              />
            ) : r.type === "image" ? (
              <div className="space-y-2">
                <Input
                  placeholder="URL รูป"
                  value={edits[r.key] ?? ""}
                  onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
                />
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer text-gold hover:underline">
                  <ImageIcon className="w-4 h-4" /> อัปโหลดไฟล์
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (f) uploadImage(r.key, f);
                  }} />
                </label>
                {edits[r.key] && <img src={edits[r.key]} alt="" className="max-h-32 rounded border border-border" />}
              </div>
            ) : (
              <Input
                value={edits[r.key] ?? ""}
                onChange={(e) => setEdits({ ...edits, [r.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-gradient-card border border-primary/30 rounded-lg p-4 space-y-3">
        <div className="font-medium text-gold">+ เพิ่มช่องใหม่ (ขั้นสูง)</div>
        <p className="text-xs text-muted-foreground">
          ใส่ key ตามที่บอก AI ในแชท (เช่น <code>promo_text</code>) แล้ว AI จะนำไปแสดงในจุดที่กำหนด
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Key</Label>
            <Input value={nKey} onChange={(e) => setNKey(e.target.value)} placeholder="เช่น promo_text" />
          </div>
          <div>
            <Label className="text-xs">Label (ชื่อแสดง)</Label>
            <Input value={nLabel} onChange={(e) => setNLabel(e.target.value)} placeholder="เช่น ข้อความโปรโมชั่น" />
          </div>
          <div>
            <Label className="text-xs">ประเภท</Label>
            <select value={nType} onChange={(e) => setNType(e.target.value)} className="w-full bg-input border border-border rounded px-3 py-2 text-sm">
              <option value="text">ข้อความสั้น</option>
              <option value="textarea">ข้อความยาว</option>
              <option value="image">รูป (URL)</option>
              <option value="boolean">เปิด/ปิด</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">ค่าเริ่มต้น</Label>
            <Input value={nValue} onChange={(e) => setNValue(e.target.value)} />
          </div>
        </div>
        <Button onClick={addField} variant="luxe" size="sm"><Plus className="w-4 h-4" /> เพิ่ม</Button>
      </div>
    </div>
  );
}
