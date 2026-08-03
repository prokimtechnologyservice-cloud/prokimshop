import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { supabase } from "@/integrations/supabase/client";
import {
  listGiftCards,
  createGiftCard,
  deleteGiftCard,
  setGiftCardActive,
  randomCode,
  normalizeCode,
  type GiftCard,
} from "@/lib/giftcard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dices, Trash2, Upload, Download, Gift } from "lucide-react";
import { toast } from "sonner";

type ProductLite = { id: string; name: string; image_url: string | null; category_id: string | null };
type CategoryLite = { id: string; name: string };
type PromotionLite = { id: string; name: string };

export default function GiftCardManager() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [promotions, setPromotions] = useState<PromotionLite[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // form state
  const [code, setCode] = useState(randomCode());
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [rewardBalance, setRewardBalance] = useState("0");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [promotionId, setPromotionId] = useState<string>("");
  const [lastCreated, setLastCreated] = useState<GiftCard | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [cardsData, prodRes, catRes, promoRes] = await Promise.all([
        listGiftCards(),
        supabase.from("products").select("id, name, image_url, category_id"),
        supabase.from("categories").select("id, name"),
        (supabase as any).from("promotions").select("id, name").eq("active", true),
      ]);
      setCards(cardsData);
      setProducts((prodRes.data as ProductLite[]) ?? []);
      setCategories((catRes.data as CategoryLite[]) ?? []);
      setPromotions((promoRes.data as PromotionLite[]) ?? []);

      const userIds = Array.from(new Set(cardsData.map((c) => c.used_by).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, username").in("id", userIds);
        const map: Record<string, string> = {};
        (data ?? []).forEach((p: any) => (map[p.id] = p.username));
        setUsernames(map);
      }
    } catch (e: any) {
      toast.error(e.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const path = `giftcard/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    const normalized = normalizeCode(code);
    if (!/^PS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
      toast.error("รหัสบัตรไม่ถูกต้อง");
      return;
    }
    try {
      const created = await createGiftCard({
        code: normalized,
        label: label || null,
        description: description || null,
        image_url: imageUrl || null,
        reward_balance: Number(rewardBalance) || 0,
        reward_product_ids: selectedProducts.length > 0 ? selectedProducts : null,
        reward_promotion_id: promotionId || null,
        active: true,
      } as any);
      toast.success("สร้างบัตรของขวัญสำเร็จ");
      setLastCreated(created);
      setCode(randomCode());
      setLabel("");
      setDescription("");
      setImageUrl("");
      setRewardBalance("0");
      setSelectedProducts([]);
      setPromotionId("");
      loadAll();
    } catch (e: any) {
      toast.error(e.message || "สร้างบัตรไม่สำเร็จ");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบบัตรของขวัญนี้?")) return;
    try {
      await deleteGiftCard(id);
      setCards((arr) => arr.filter((c) => c.id !== id));
    } catch (e: any) {
      toast.error(e.message || "ลบไม่สำเร็จ");
    }
  }

  async function handleToggleActive(c: GiftCard) {
    try {
      await setGiftCardActive(c.id, !c.active);
      setCards((arr) => arr.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    } catch (e: any) {
      toast.error(e.message || "อัปเดตไม่สำเร็จ");
    }
  }

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "-";
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  function toggleProduct(id: string) {
    setSelectedProducts((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  }

  function rewardSummary(c: GiftCard) {
    const parts: string[] = [];
    if (c.reward_balance) parts.push(`฿${Number(c.reward_balance).toLocaleString()}`);
    if (c.reward_product_ids && c.reward_product_ids.length > 0) parts.push(`สินค้า x${c.reward_product_ids.length}`);
    if (c.reward_promotion_id) parts.push("โปรโมชั่น");
    return parts.length > 0 ? parts.join(" + ") : "-";
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4" /> สร้างบัตรใหม่
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>รหัสบัตร</Label>
            <div className="flex items-center gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 18))}
                className="font-mono"
                maxLength={18}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setCode(randomCode())}>
                <Dices className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>ชื่อบัตร (label)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น บัตรของขวัญปีใหม่" />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>คำอธิบาย</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1">
            <Label>รูปปก</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
                disabled={uploading}
              />
            </div>
            {imageUrl && <img src={imageUrl} alt="cover" className="h-16 mt-2 rounded border" />}
          </div>

          <div className="space-y-1">
            <Label>เครดิตเงินในกระเป๋า (บาท)</Label>
            <Input type="number" value={rewardBalance} onChange={(e) => setRewardBalance(e.target.value)} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>โปรโมชั่นที่จะแถม</Label>
            <Select value={promotionId || "none"} onValueChange={(v) => setPromotionId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="ไม่มี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่มี</SelectItem>
                {promotions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>สินค้าฟรีที่จะแถม</Label>
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="mb-2"
            />
            <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
              {filteredProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />}
                  <span className="text-sm flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{catName(p.category_id)}</span>
                </label>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">ไม่พบสินค้า</p>
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleCreate}>สร้างบัตรของขวัญ</Button>

        {lastCreated && <CreatedCardPreview card={lastCreated} />}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold mb-3">บัตรของขวัญทั้งหมด</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>รางวัล</TableHead>
                <TableHead>ใช้โดย</TableHead>
                <TableHead>วันที่ใช้</TableHead>
                <TableHead>เปิดใช้งาน</TableHead>
                <TableHead>โหลด</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.label ?? "-"}</TableCell>
                  <TableCell>{rewardSummary(c)}</TableCell>
                  <TableCell>{c.used_by ? usernames[c.used_by] ?? c.used_by : "-"}</TableCell>
                  <TableCell>{c.used_at ? new Date(c.used_at).toLocaleString("th-TH") : "-"}</TableCell>
                  <TableCell>
                    <Switch checked={c.active} onCheckedChange={() => handleToggleActive(c)} />
                  </TableCell>
                  <TableCell>
                    <DownloadButtons code={c.code} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {cards.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    ยังไม่มีบัตรของขวัญ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function CreatedCardPreview({ card }: { card: GiftCard }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const url = `${window.location.origin}/givecard?code=${encodeURIComponent(card.code)}`;
    if (qrRef.current) QRCode.toCanvas(qrRef.current, url, { width: 180 });
    if (barRef.current) {
      try {
        JsBarcode(barRef.current, card.code, { format: "CODE128", displayValue: true, width: 2, height: 60 });
      } catch {
        // ignore invalid chars for barcode
      }
    }
  }, [card.code]);

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
      <p className="font-mono text-lg">{card.code}</p>
      <div className="flex flex-wrap gap-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">QR Code</p>
          <canvas ref={qrRef} draggable />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">บาร์โค้ด</p>
          <canvas ref={barRef} draggable />
        </div>
      </div>
    </div>
  );
}

function DownloadButtons({ code }: { code: string }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const url = `${window.location.origin}/givecard?code=${encodeURIComponent(code)}`;
    if (qrRef.current) QRCode.toCanvas(qrRef.current, url, { width: 120 });
    if (barRef.current) {
      try {
        JsBarcode(barRef.current, code, { format: "CODE128", displayValue: false, width: 1.5, height: 40 });
      } catch {
        // ignore
      }
    }
  }, [code]);

  function downloadCanvas(ref: React.RefObject<HTMLCanvasElement>, name: string) {
    const canvas = ref.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = name;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex items-center gap-1">
      <canvas ref={qrRef} className="hidden" />
      <canvas ref={barRef} className="hidden" />
      <Button variant="ghost" size="icon" onClick={() => downloadCanvas(qrRef, `${code}-qr.png`)} title="ดาวน์โหลด QR">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => downloadCanvas(barRef, `${code}-barcode.png`)} title="ดาวน์โหลดบาร์โค้ด">
        <Upload className="h-4 w-4 rotate-180" />
      </Button>
    </div>
  );
}
