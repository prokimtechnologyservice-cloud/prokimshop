import { useLocation } from "@tanstack/react-router";
import { useOverlays, pageKeyFromPath, type Overlay } from "@/lib/overlays";

function OverlayItem({ o }: { o: Overlay }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: o.x,
    top: o.y,
    width: o.w,
    height: o.h,
    transform: `rotate(${o.rotate}deg)`,
    fontSize: o.font_size,
    color: o.color || undefined,
    background: o.bg || undefined,
    zIndex: o.z_index,
    pointerEvents: o.href || o.kind === "button" ? "auto" : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 8,
  };

  const inner = (() => {
    if (o.kind === "image" && o.image_url) {
      return <img src={o.image_url} alt="" className="w-full h-full object-cover" style={{ borderRadius: 8 }} />;
    }
    if (o.kind === "button") {
      return (
        <span className="px-3 py-1 font-medium text-center w-full" style={{ background: o.bg || "hsl(var(--primary))", color: o.color || "white", borderRadius: 8 }}>
          {o.content || "Button"}
        </span>
      );
    }
    return <span className="text-center px-2 break-words leading-tight w-full">{o.content}</span>;
  })();

  if (o.href) {
    return <a href={o.href} target="_blank" rel="noreferrer" style={style}>{inner}</a>;
  }
  return <div style={style}>{inner}</div>;
}

export function OverlayLayer() {
  const loc = useLocation();
  const page = pageKeyFromPath(loc.pathname);
  const { items } = useOverlays(page);
  if (loc.pathname.startsWith("/admin")) return null;
  if (items.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 }}>
      {items.map((o) => <OverlayItem key={o.id} o={o} />)}
    </div>
  );
}
