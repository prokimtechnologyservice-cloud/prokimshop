import { useEffect, useState } from "react";
import { Star, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { getUser } from "@/lib/auth";
import {
  deleteMyReview,
  getMyReview,
  getReviewStats,
  listApprovedReviews,
  upsertMyReview,
  type ProductReview,
} from "@/lib/reviews";
import { toast } from "sonner";

function Stars({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? "fill-gold text-gold" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5">
          <Star className={`w-6 h-6 ${i <= value ? "fill-gold text-gold" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const user = getUser();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [myReview, setMyReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rv, st] = await Promise.all([listApprovedReviews(productId), getReviewStats(productId)]);
      setReviews(rv);
      setStats(st);
      if (user) {
        const mine = await getMyReview(productId, user.id);
        setMyReview(mine);
      } else {
        setMyReview(null);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user?.id]);

  function openForm() {
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? "");
    setFormOpen(true);
  }

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertMyReview({ productId, userId: user.id, rating, comment });
      toast.success("บันทึกรีวิวแล้ว");
      setFormOpen(false);
      await load();
    } catch (e: any) {
      toast.error("บันทึกรีวิวไม่สำเร็จ: " + (e?.message ?? "ไม่ทราบสาเหตุ"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!myReview) return;
    try {
      await deleteMyReview(myReview.id);
      toast.success("ลบรีวิวแล้ว");
      await load();
    } catch (e: any) {
      toast.error("ลบรีวิวไม่สำเร็จ: " + (e?.message ?? "ไม่ทราบสาเหตุ"));
    }
  }

  const displayReviews = myReview
    ? [myReview, ...reviews.filter((r) => r.id !== myReview.id)]
    : reviews;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg text-gradient-gold">รีวิวสินค้า</h3>
          <div className="flex items-center gap-2 mt-1">
            <Stars value={stats.average} />
            <span className="text-sm text-muted-foreground">
              {stats.count > 0 ? `${stats.average.toFixed(1)} จาก ${stats.count} รีวิว` : "ยังไม่มีรีวิว"}
            </span>
          </div>
        </div>
        {user ? (
          <Button variant="luxe" size="sm" onClick={openForm}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> {myReview ? "แก้ไขรีวิวของคุณ" : "เขียนรีวิว"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">กรุณาเข้าสู่ระบบเพื่อเขียนรีวิว</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : displayReviews.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรีวิวสำหรับสินค้านี้</div>
      ) : (
        <div className="space-y-3">
          {displayReviews.map((r) => {
            const mine = user && r.user_id === user.id;
            return (
              <div key={r.id} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.username ?? "ผู้ใช้"}</span>
                    {mine && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">คุณ</span>}
                    {!r.approved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">รออนุมัติ</span>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("th-TH")}
                  </span>
                </div>
                <Stars value={r.rating} size="w-3.5 h-3.5" />
                {r.comment && <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{r.comment}</p>}
                {mine && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={openForm}>
                      <Pencil className="w-3 h-3 mr-1" /> แก้ไข
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">
                          <Trash2 className="w-3 h-3 mr-1" /> ลบ
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ลบรีวิว?</AlertDialogTitle>
                          <AlertDialogDescription>ไม่สามารถกู้คืนได้</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction onClick={onDelete}>ยืนยันลบ</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{myReview ? "แก้ไขรีวิวของคุณ" : "เขียนรีวิว"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <StarPicker value={rating} onChange={setRating} />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เล่าประสบการณ์การใช้สินค้านี้..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="luxe" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
