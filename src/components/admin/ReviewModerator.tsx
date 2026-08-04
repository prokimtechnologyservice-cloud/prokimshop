import { useEffect, useMemo, useState } from "react";
import { Loader2, Star, Check, X, Trash2, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminDeleteReview, listAllReviews, setReviewApproved, type ReviewWithProduct } from "@/lib/reviews";
import { toast } from "sonner";

type Filter = "all" | "pending" | "approved";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= value ? "fill-gold text-gold" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

export function ReviewModerator() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    setLoading(true);
    try {
      const data = await listAllReviews();
      setReviews(data);
    } catch (e: any) {
      toast.error("โหลดรีวิวไม่สำเร็จ: " + (e?.message ?? "ไม่ทราบสาเหตุ"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "pending") return reviews.filter((r) => !r.approved);
    if (filter === "approved") return reviews.filter((r) => r.approved);
    return reviews;
  }, [reviews, filter]);

  async function toggleApprove(r: ReviewWithProduct) {
    try {
      await setReviewApproved(r.id, !r.approved);
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, approved: !r.approved } : x)));
    } catch (e: any) {
      toast.error("อัปเดตไม่สำเร็จ: " + (e?.message ?? "ไม่ทราบสาเหตุ"));
    }
  }

  async function onDelete(id: string) {
    try {
      await adminDeleteReview(id);
      setReviews((prev) => prev.filter((x) => x.id !== id));
      toast.success("ลบรีวิวแล้ว");
    } catch (e: any) {
      toast.error("ลบไม่สำเร็จ: " + (e?.message ?? "ไม่ทราบสาเหตุ"));
    }
  }

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <MessageSquareText className="w-5 h-5 text-gold" />
        <h3 className="font-display text-lg">จัดการรีวิวสินค้า</h3>
        <div className="flex items-center gap-1 ml-auto">
          {([
            ["all", "ทั้งหมด"],
            ["pending", "รออนุมัติ"],
            ["approved", "อนุมัติแล้ว"],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                filter === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">ไม่มีรีวิวในหมวดนี้</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card/60 p-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.product_name ?? "สินค้า"}</span>
                    <span className="text-xs text-muted-foreground">โดย {r.username ?? "ผู้ใช้"}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        r.approved ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.approved ? "อนุมัติแล้ว" : "รออนุมัติ"}
                    </span>
                  </div>
                  <Stars value={r.rating} />
                  {r.comment && <p className="text-sm mt-1 whitespace-pre-wrap break-words">{r.comment}</p>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleString("th-TH")}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant={r.approved ? "outline" : "luxe"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleApprove(r)}
                  >
                    {r.approved ? (
                      <>
                        <X className="w-3 h-3 mr-1" /> ยกเลิกอนุมัติ
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" /> อนุมัติ
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ลบรีวิวนี้?</AlertDialogTitle>
                        <AlertDialogDescription>ไม่สามารถกู้คืนได้</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(r.id)}>ยืนยันลบ</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewModerator;
