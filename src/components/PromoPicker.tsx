import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag, CheckCircle2, XCircle, Ticket } from "lucide-react";
import type { AutoPromoCandidate, Promotion } from "@/lib/promotions";

function typeLabel(p: Promotion) {
  if (p.discount_type === "percent") return `ลด ${p.discount_value}%`;
  if (p.discount_type === "amount") return `ลด ฿${p.discount_value}`;
  if (p.discount_type === "bogo") return `ซื้อ ${p.buy_qty} แถม ${p.get_qty}`;
  return p.kind === "discount" ? "ส่วนลด" : "โปรโมชั่น";
}

export function PromoPicker({
  open,
  onOpenChange,
  eligible,
  ineligible,
  selectedId,
  onSelect,
  onClear,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eligible: AutoPromoCandidate[];
  ineligible: { promotion: Promotion; reason: string }[];
  selectedId: string | null;
  onSelect: (c: AutoPromoCandidate) => void;
  onClear: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gold" /> เลือกส่วนลด / โปรโมชั่น
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {selectedId && (
            <Button variant="outline" size="sm" onClick={onClear} className="w-full">
              ไม่ใช้ส่วนลด
            </Button>
          )}

          {eligible.length === 0 && ineligible.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีส่วนลด/โปรโมชั่นสำหรับตะกร้านี้</p>
          )}

          {eligible.map((c) => {
            const isSelected = selectedId === c.promotion.id;
            return (
              <button
                key={c.promotion.id}
                onClick={() => onSelect(c)}
                className={`w-full flex items-stretch gap-3 rounded-lg border overflow-hidden text-left transition ${
                  isSelected ? "border-gold bg-gold/10" : "border-border bg-card hover:border-gold/50"
                }`}
              >
                <div className="w-20 flex-shrink-0 bg-muted flex items-center justify-center">
                  {c.promotion.image_url ? (
                    <img src={c.promotion.image_url} className="w-full h-full object-cover" />
                  ) : (
                    <Tag className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-2 pr-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{c.promotion.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold whitespace-nowrap">
                      {typeLabel(c.promotion)}
                    </span>
                  </div>
                  {c.promotion.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.promotion.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ใช้ได้ • ประหยัด ฿{c.discount.toFixed(2)}
                    </span>
                    {isSelected && <span className="text-gold">กำลังใช้งาน</span>}
                  </div>
                </div>
              </button>
            );
          })}

          {ineligible.map(({ promotion, reason }) => (
            <div
              key={promotion.id}
              className="w-full flex items-stretch gap-3 rounded-lg border border-border/60 bg-muted/30 opacity-70 overflow-hidden"
            >
              <div className="w-20 flex-shrink-0 bg-muted flex items-center justify-center">
                {promotion.image_url ? (
                  <img src={promotion.image_url} className="w-full h-full object-cover grayscale" />
                ) : (
                  <Tag className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 py-2 pr-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{promotion.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                    {typeLabel(promotion)}
                  </span>
                </div>
                {promotion.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{promotion.description}</p>
                )}
                <div className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> ใช้ไม่ได้: {reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
