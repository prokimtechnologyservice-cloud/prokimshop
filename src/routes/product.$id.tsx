import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `สินค้า — PROKIM` },
      { name: "description", content: `รายละเอียดสินค้า ${params.id} — PROKIM` },
      { property: "og:title", content: `สินค้า PROKIM` },
      { property: "og:description", content: "ไอเทมเกมพรีเมียม Robux, Blox Fruits และอื่นๆ" },
    ],
  }),
  component: RedirectToHome,
});

function RedirectToHome() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/", search: { p: id } as any, replace: true });
  }, [id]);
  return null;
}
