import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { getUser, refreshUser } from "@/lib/auth";
import { normalizeCode, isCompleteCode, redeemGiftCard, type RedeemResult } from "@/lib/giftcard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CodeScanner } from "@/components/CodeScanner";
import { ProductInfoDialog } from "@/components/ProductInfoDialog";
import { Gift, PartyPopper, ScanLine, Wallet, Tag, Package, Barcode } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  code: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/givecard")({
  component: GiveCardPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "ใช้บัตรของขวัญ - PROKIM" },
      { name: "description", content: "กรอกหรือสแกนรหัสบัตรของขวัญ PROKIM เพื่อรับเครดิตและของรางวัล" },
      { property: "og:title", content: "ใช้บัตรของขวัญ - PROKIM" },
      { property: "og:description", content: "กรอกหรือสแกนรหัสบัตรของขวัญ PROKIM เพื่อรับเครดิตและของรางวัล" },
    ],
  }),
});

/** Extract a gift-card code from raw scanned text (URL or raw code). */
function extractCode(text: string): string {
  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get("code");
    if (fromQuery) return fromQuery;
  } catch {
    // not a URL, fall through
  }
  return text;
}

function GiveCardPage() {
  const search = useSearch({ from: "/givecard" }) as { code: string };
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [promoName, setPromoName] = useState<string | null>(null);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [productScannerOpen, setProductScannerOpen] = useState(false);
  const [scannedProductValue, setScannedProductValue] = useState<string | null>(null);
  const [autoPrompted, setAutoPrompted] = useState(false);

  useEffect(() => {
    if (search.code) {
      const normalized = normalizeCode(search.code);
      setCode(normalized);
      if (!autoPrompted && isCompleteCode(normalized)) {
        setAutoPrompted(true);
        doRedeem(normalized);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.code]);

  async function doRedeem(rawCode: string) {
    const user = getUser();
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนใช้บัตรของขวัญ");
      return;
    }
    const normalized = normalizeCode(rawCode);
    if (!isCompleteCode(normalized)) {
      toast.error("รูปแบบรหัสไม่ถูกต้อง");
      return;
    }
    setLoading(true);
    try {
      const res = await redeemGiftCard(normalized, user.id);
      await refreshUser();
      setResult(res);
      if (res.promotion_id) {
        const { data } = await (supabase as any)
          .from("promotions")
          .select("name")
          .eq("id", res.promotion_id)
          .maybeSingle();
        setPromoName(data?.name ?? null);
      } else {
        setPromoName(null);
      }
      if (res.product_ids && res.product_ids.length > 0) {
        const { data } = await supabase
          .from("products")
          .select("name")
          .in("id", res.product_ids as string[]);
        setProductNames((data ?? []).map((p: any) => p.name));
      } else {
        setProductNames([]);
      }
      toast.success("ใช้บัตรของขวัญสำเร็จ!");
    } catch (e: any) {
      toast.error(e.message || "ไม่สามารถใช้บัตรของขวัญได้");
    } finally {
      setLoading(false);
    }
  }

  function handleScanResult(text: string) {
    const found = extractCode(text);
    const normalized = normalizeCode(found);
    setCode(normalized);
    if (isCompleteCode(normalized)) {
      doRedeem(normalized);
    } else {
      toast.error("ตรวจไม่พบรหัสที่ถูกต้อง กรุณากรอกด้วยตนเอง");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="text-primary" />
            <h1 className="text-xl font-bold">ใช้บัตรของขวัญ</h1>
          </div>
          <Tabs defaultValue="enter">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="enter">กรอกรหัส</TabsTrigger>
              <TabsTrigger value="scan">สแกนโค้ด</TabsTrigger>
            </TabsList>

            <TabsContent value="enter" className="mt-4 space-y-4">
              <Input
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 18))}
                maxLength={18}
                placeholder="PS-XXXX-XXXX-XXXX-XXXX"
                className="font-mono text-lg tracking-wider"
              />
              <Button
                className="w-full"
                disabled={loading || !isCompleteCode(code)}
                onClick={() => doRedeem(code)}
              >
                {loading ? "กำลังใช้บัตร..." : "ใช้บัตรของขวัญ"}
              </Button>
            </TabsContent>

            <TabsContent value="scan" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                สแกน QR หรือบาร์โค้ดของบัตรของขวัญด้วยกล้อง หรือเลือกจากรูปภาพ
              </p>
              <Button className="w-full" disabled={loading} onClick={() => setScannerOpen(true)}>
                <ScanLine className="h-4 w-4 mr-2" />
                เปิดตัวสแกน
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="text-primary" />
            <h2 className="font-semibold">ตรวจสอบสินค้า</h2>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setProductScannerOpen(true)}
          >
            <Barcode className="h-4 w-4 mr-2" />
            สแกนบาร์โค้ดสินค้า
          </Button>
        </div>
      </div>

      <CodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onResult={handleScanResult}
        title="สแกนบัตรของขวัญ"
        description="จ่อกล้องไปที่ QR หรือบาร์โค้ดบนบัตรของขวัญ หรือเลือกรูปภาพ"
      />

      <CodeScanner
        open={productScannerOpen}
        onOpenChange={setProductScannerOpen}
        onResult={(text) => setScannedProductValue(text)}
        title="สแกนบาร์โค้ดสินค้า"
        description="จ่อกล้องไปที่บาร์โค้ดหรือ QR ของสินค้า"
      />

      <ProductInfoDialog
        value={scannedProductValue}
        onOpenChange={(v) => !v && setScannedProductValue(null)}
      />

      <RewardDialog
        result={result}
        promoName={promoName}
        productNames={productNames}
        onClose={() => setResult(null)}
      />
    </div>
  );
}

function RewardDialog({
  result,
  promoName,
  productNames,
  onClose,
}: {
  result: RedeemResult | null;
  promoName: string | null;
  productNames: string[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!result} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="text-primary" />
            ใช้บัตรของขวัญสำเร็จ!
          </DialogTitle>
          <DialogDescription>{result?.label ?? "คุณได้รับรางวัลดังนี้"}</DialogDescription>
        </DialogHeader>
        {result && (
          <div className="space-y-3">
            {result.image_url && (
              <img src={result.image_url} alt={result.label ?? "gift card"} className="w-full rounded-md border" />
            )}
            {result.description && <p className="text-sm text-muted-foreground">{result.description}</p>}
            <div className="rounded-lg border p-3 space-y-2">
              {result.balance > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>ได้รับเครดิต +฿{result.balance.toLocaleString()}</span>
                </div>
              )}
              {promoName && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-primary" />
                  <span>ได้รับโปรโมชั่น: {promoName}</span>
                </div>
              )}
              {productNames.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary mt-0.5" />
                  <span>ได้รับสินค้าฟรี: {productNames.join(", ")}</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={onClose}>
              ปิด
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
