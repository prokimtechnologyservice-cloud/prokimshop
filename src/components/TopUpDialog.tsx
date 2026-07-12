import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { redeemVoucher } from "@/lib/wallet";
import { getUser, refreshUser } from "@/lib/auth";
import { toast } from "sonner";

export function TopUpDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: (newBalance: number) => void;
}) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const u = getUser();
    if (!u) return toast.error("กรุณาเข้าสู่ระบบ");
    if (!link.trim()) return;
    setLoading(true);
    try {
      const r = await redeemVoucher(u.id, link.trim());
      await refreshUser();
      toast.success(`เติมเงินสำเร็จ +฿${r.amount.toFixed(2)}`);
      setLink("");
      onOpenChange(false);
      onDone?.(r.balance);
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-gradient-gold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gold" /> เติมเงินด้วยซอง TrueMoney
          </DialogTitle>
          <DialogDescription>
            วางลิงก์ซองอั่งเปา TrueMoney ระบบจะรับซองและเติมยอดเข้าบัญชีของคุณโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="https://gift.truemoney.com/campaign/?v=..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <Button
            variant="luxe"
            className="w-full"
            disabled={loading || !link.trim()}
            onClick={submit}
          >
            {loading ? "กำลังตรวจสอบ..." : "เติมเงิน"}
          </Button>
          <p className="text-xs text-muted-foreground">
            * ซองที่ถูกใช้แล้ว/หมดอายุจะถูกปฏิเสธ ระบบไม่เก็บลิงก์ซองไว้
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
