import { supabase } from "@/integrations/supabase/client";

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
  username?: string | null;
};

export type ReviewWithProduct = ProductReview & {
  product_name?: string | null;
};

const sb = supabase as any;

export async function listApprovedReviews(productId: string): Promise<ProductReview[]> {
  const { data, error } = await sb
    .from("product_reviews")
    .select("*, profiles:user_id(username)")
    .eq("product_id", productId)
    .eq("approved", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, username: r.profiles?.username ?? null }));
}

export async function getReviewStats(productId: string): Promise<{ average: number; count: number }> {
  const { data, error } = await sb
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("approved", true);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return { average: 0, count: 0 };
  const sum = rows.reduce((s: number, r: any) => s + (r.rating ?? 0), 0);
  return { average: sum / rows.length, count: rows.length };
}

export async function getMyReview(productId: string, userId: string): Promise<ProductReview | null> {
  const { data, error } = await sb
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertMyReview(params: {
  productId: string;
  userId: string;
  rating: number;
  comment: string;
}): Promise<ProductReview> {
  const { productId, userId, rating, comment } = params;
  const { data, error } = await sb
    .from("product_reviews")
    .upsert(
      {
        product_id: productId,
        user_id: userId,
        rating,
        comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,user_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMyReview(reviewId: string): Promise<void> {
  const { error } = await sb.from("product_reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

// ===== Admin =====
export async function listAllReviews(): Promise<ReviewWithProduct[]> {
  const { data, error } = await sb
    .from("product_reviews")
    .select("*, profiles:user_id(username), products:product_id(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    username: r.profiles?.username ?? null,
    product_name: r.products?.name ?? null,
  }));
}

export async function setReviewApproved(reviewId: string, approved: boolean): Promise<void> {
  const { error } = await sb.from("product_reviews").update({ approved }).eq("id", reviewId);
  if (error) throw error;
}

export async function adminDeleteReview(reviewId: string): Promise<void> {
  const { error } = await sb.from("product_reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
