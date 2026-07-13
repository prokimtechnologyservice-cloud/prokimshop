import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `หมวด ${params.slug} — PROKIM` },
      { name: "description", content: `เลือกซื้อไอเทมในหมวด ${params.slug} ที่ PROKIM` },
      { property: "og:title", content: `หมวด ${params.slug} — PROKIM` },
      { property: "og:description", content: `เลือกซื้อไอเทมในหมวด ${params.slug} ที่ PROKIM` },
    ],
  }),
  component: RedirectToHome,
});

function RedirectToHome() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/", search: { cat: slug } as any, replace: true });
  }, [slug]);
  return null;
}
