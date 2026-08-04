import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Trash2, 
  Upload, 
  Package, 
  Star, 
  AlertCircle,
  X,
  Filter
} from "lucide-react";
import { 
  fetchBoxPrizes, 
  BoxPrize, 
  toggleProductMysteryOnly, 
  createExclusiveProduct 
} from "@/lib/mysteryBox";

interface MysteryBoxEditorProps {
  boxId: string;
}

export function MysteryBoxEditor({ boxId }: MysteryBoxEditorProps) {
  const [prizes, setPrizes] = useState<BoxPrize[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [stockOnly, setStockOnly] = useState(false);
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  
  // Exclusive Creator
  const [showCreator, setShowCreator] = useState(false);
  const [newProd, setNewProd] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
    image_url: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [boxId]);

  async function loadData() {
    setLoading(true);
    try {
      const [p, prods, cats] = await Promise.all([
        fetchBoxPrizes(boxId),
        supabase.from("products").select("id, name, image_url, price, stock, product_type, mystery_only, category_id").order("name"),
        supabase.from("categories").select("id, name"),
      ]);
      setPrizes(p);
      setAllProducts(prods.data || []);
      setCategories(cats.data || []);
    } catch (err: any) {
      toast.error("โหลดข้อมูลล้มเหลว: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      if (p.id === boxId) return false; // Don't add the box to itself
      if (p.product_type === "mystery_box") return false;
      
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = catFilter === "all" || p.category_id === catFilter;
      const matchesStock = !stockOnly || (p.stock !== null && p.stock > 0);
      const matchesExclusive = !exclusiveOnly || p.mystery_only;
      
      return matchesSearch && matchesCat && matchesStock && matchesExclusive;
    });
  }, [allProducts, search, catFilter, stockOnly, exclusiveOnly, boxId]);

  async function addPrize(productId: string) {
    const { error } = await supabase.from("mystery_box_items").insert({
      box_product_id: boxId,
      prize_product_id: productId,
      weight: 1,
      stock: 1,
    });
    if (error) return toast.error(error.message);
    toast.success("เพิ่มรางวัลแล้ว");
    loadData();
  }

  async function removePrize(id: string) {
    const { error } = await supabase.from("mystery_box_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ลบรางวัลแล้ว");
    loadData();
  }

  async function updatePrize(id: string, patch: any) {
    const { error } = await supabase.from("mystery_box_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  async function handleToggleMysteryOnly(productId: string, current: boolean) {
    try {
      await toggleProductMysteryOnly(productId, !current);
      toast.success("อัปเดตสถานะ Exclusive แล้ว");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("ต้องเป็นไฟล์รูปภาพ");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setNewProd(prev => ({ ...prev, image_url: data.publicUrl }));
      toast.success("อัปโหลดสำเร็จ");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateExclusive() {
    if (!newProd.name || !newProd.price) return toast.error("กรุณากรอกชื่อและราคา");
    try {
      const productId = await createExclusiveProduct({
        name: newProd.name,
        price: Number(newProd.price),
        stock: newProd.stock ? Number(newProd.stock) : null,
        description: newProd.description || null,
        image_url: newProd.image_url || null,
      });
      
      // Immediately add as prize
      await supabase.from("mystery_box_items").insert({
        box_product_id: boxId,
        prize_product_id: productId,
        weight: 1,
        stock: newProd.stock ? Number(newProd.stock) : 1,
      });
      
      toast.success("สร้างและเพิ่มสินค้า Exclusive แล้ว");
      setShowCreator(false);
      setNewProd({ name: "", price: "", stock: "", description: "", image_url: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading && prizes.length === 0) return <div className="p-8 text-center animate-pulse">กำลังโหลด...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Add Prize UI */}
        <div className="flex-1 space-y-4 border border-border rounded-xl p-4 bg-onyx/20">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-gold" />
              เพิ่มสินค้าลงกล่อง
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCreator(!showCreator)}
              className={showCreator ? "bg-primary/10 border-primary" : ""}
            >
              {showCreator ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {showCreator ? "ยกเลิก" : "สร้าง Exclusive"}
            </Button>
          </div>

          {showCreator ? (
            <div className="space-y-3 p-4 border border-primary/30 rounded-lg bg-primary/5 animate-in fade-in slide-in-from-top-2">
              <div className="font-medium text-sm text-gold">สร้างสินค้า Exclusive ใหม่ (เฉพาะกล่องสุ่มเท่านั้น)</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">ชื่อสินค้า</Label>
                  <Input 
                    value={newProd.name} 
                    onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} 
                    placeholder="ชื่อสินค้า..."
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">ราคา (บาท)</Label>
                  <Input 
                    type="number" 
                    value={newProd.price} 
                    onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} 
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">สต็อกเริ่มต้น (ว่าง = ไม่จำกัด)</Label>
                  <Input 
                    type="number" 
                    value={newProd.stock} 
                    onChange={e => setNewProd(p => ({ ...p, stock: e.target.value }))} 
                    placeholder="ไม่จำกัด"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">รูปภาพ</Label>
                  <div className="flex items-center gap-2">
                    {newProd.image_url && <img src={newProd.image_url} className="w-10 h-10 rounded object-cover" />}
                    <label className="flex-1 flex items-center justify-center h-10 rounded border border-dashed border-border bg-onyx/40 cursor-pointer hover:bg-onyx/60 text-xs">
                      <Upload className="w-4 h-4 mr-2" /> {uploading ? "..." : "อัปโหลด"}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                      }} />
                    </label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">คำอธิบาย (ถ้ามี)</Label>
                  <Textarea 
                    value={newProd.description} 
                    onChange={e => setNewProd(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              <Button className="w-full mt-2" variant="luxe" onClick={handleCreateExclusive}>
                สร้างและเพิ่มลงกล่อง
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="ค้นหาชื่อสินค้า..." 
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="bg-input border border-border rounded-md px-2 py-1 text-sm h-9"
                    value={catFilter}
                    onChange={e => setCatFilter(e.target.value)}
                  >
                    <option value="all">ทุกหมวดหมู่</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex flex-col gap-1 px-1">
                    <label className="flex items-center gap-2 text-[10px] cursor-pointer hover:text-foreground transition">
                      <input type="checkbox" checked={stockOnly} onChange={e => setStockOnly(e.target.checked)} />
                      เฉพาะที่มีสต็อก
                    </label>
                    <label className="flex items-center gap-2 text-[10px] cursor-pointer hover:text-foreground transition text-gold">
                      <input type="checkbox" checked={exclusiveOnly} onChange={e => setExclusiveOnly(e.target.checked)} />
                      เฉพาะสินค้าในกล่อง (Exclusive)
                    </label>
                  </div>
                </div>
              </div>

              {/* Product List */}
              <ScrollArea className="h-[400px] border border-border rounded-md bg-onyx/40">
                <div className="p-2 space-y-1">
                  {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">ไม่พบสินค้า</div>
                  ) : (
                    filteredProducts.map(p => {
                      const isAlreadyPrize = prizes.some(pr => pr.prize_product_id === p.id);
                      return (
                        <div 
                          key={p.id} 
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-onyx/60 transition group border border-transparent hover:border-border"
                        >
                          <div className="w-10 h-10 rounded bg-onyx shrink-0 overflow-hidden border border-border">
                            {p.image_url ? (
                              <img src={p.image_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">ไม่มีรูป</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-2">
                              {p.name}
                              {p.mystery_only && <Badge variant="outline" className="text-[9px] h-4 bg-gold/10 text-gold border-gold/40">Exclusive</Badge>}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex gap-2">
                              <span>฿{p.price}</span>
                              <span>•</span>
                              <span className={p.stock === 0 ? "text-destructive" : ""}>
                                สต็อก: {p.stock === null ? "∞" : p.stock}
                              </span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant={isAlreadyPrize ? "ghost" : "outline"}
                            className="h-8 w-8 p-0"
                            onClick={() => addPrize(p.id)}
                            disabled={isAlreadyPrize}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Right Side: Current Prizes */}
        <div className="flex-1 space-y-4 border border-border rounded-xl p-4 bg-onyx/20">
          <h3 className="font-display text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-gold" />
            ของรางวัลปัจจุบัน ({prizes.length})
          </h3>
          
          <ScrollArea className="h-[520px]">
            <div className="space-y-3 pr-4">
              {prizes.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground bg-onyx/20 rounded-lg border border-dashed border-border">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  ยังไม่มีของรางวัล
                </div>
              ) : (
                prizes.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-border bg-onyx/40 space-y-3 relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-onyx shrink-0 overflow-hidden border border-border">
                        {p.product?.image_url || p.image_url ? (
                          <img src={p.product?.image_url || p.image_url!} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">ไม่มีรูป</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate pr-8">{p.product?.name || p.label || "ไม่มีชื่อ"}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] text-muted-foreground">เรท</Label>
                            <Input 
                              type="number" 
                              className="h-6 w-14 text-[10px] px-1" 
                              value={p.weight} 
                              onChange={e => updatePrize(p.id, { weight: Math.max(0, Number(e.target.value)) })} 
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] text-muted-foreground">คงเหลือ</Label>
                            <Input 
                              type="number" 
                              className="h-6 w-14 text-[10px] px-1" 
                              value={p.stock} 
                              onChange={e => updatePrize(p.id, { stock: Math.max(0, Number(e.target.value)) })} 
                            />
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                        onClick={() => removePrize(p.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {p.product && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <Switch 
                            id={`exclusive-${p.id}`} 
                            checked={p.product.mystery_only} 
                            onCheckedChange={() => handleToggleMysteryOnly(p.product!.id, p.product!.mystery_only)}
                            className="scale-75 origin-left"
                          />
                          <Label htmlFor={`exclusive-${p.id}`} className="text-[10px] cursor-pointer">
                            {p.product.mystery_only ? (
                              <span className="text-gold font-medium">เฉพาะกล่องสุ่ม</span>
                            ) : (
                              <span className="text-muted-foreground">สินค้าปกติ</span>
                            )}
                          </Label>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.product.stock === null ? "สต็อกสินค้าจริง: ∞" : `สต็อกสินค้าจริง: ${p.product.stock}`}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
