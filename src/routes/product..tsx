import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductReviews } from "@/components/ProductReviews";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `สินค้า — PROKIM` },
      { name: "description", content: `รายละเอียดสินค้า ${params.id} — PROKIM` },
      { property: "og:title", content: `สินค้า PROKIM` },
      { property: "og:description", content: "ไอเทมเกมพรีเมียม Robux, Blox Fruits และอื่นๆ" },
    ],
  }),
  component: ProductDetailPage,
});

type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  stock: number | null;
  product_type: string;
};

function ProductDetailPage() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      if (!data) {
        setNotFound(true);
      } else {
        setProduct(data as Product);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <SiteHeader />
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าแรก
          </Button>
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notFound || !product ? (
          <div className="text-center text-muted-foreground py-20">ไม่พบสินค้านี้</div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-xl overflow-hidden border border-border bg-secondary/30">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div>
                <h1 className="font-display text-2xl text-gradient-gold mb-2">{product.name}</h1>
                <div className="text-xl font-semibold text-gold mb-3">
                  {product.price?.toLocaleString("th-TH")} บาท
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {product.description}
                  </p>
                )}
              </div>
            </div>

            <ProductReviews productId={product.id} />
          </>
        )}
      </div>
    </div>
  );
}
