import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

export type BlockCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string | null;
  image_url: string | null;
  description?: string | null;
  block_color?: string | null;
  button_color?: string | null;
  banner_url?: string | null;
};

function Banner({ cat }: { cat: BlockCategory }) {
  const src = cat.banner_url || cat.image_url;
  return (
    <div className="aspect-[2/1] w-full overflow-hidden bg-onyx">
      {src ? (
        <img src={src} alt={cat.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-hero">
          <Crown className="w-10 h-10 text-primary/40" />
        </div>
      )}
    </div>
  );
}

function CategoryBlock({
  cat,
  onSelect,
}: {
  cat: BlockCategory;
  onSelect: (c: BlockCategory) => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-border shadow-card bg-gradient-card hover:shadow-luxe hover:border-primary/50 transition cursor-pointer flex flex-col"
      style={cat.block_color ? { background: cat.block_color } : undefined}
      onClick={() => onSelect(cat)}
    >
      <Banner cat={cat} />
      <div className="p-4 flex flex-col items-center text-center gap-2 flex-1">
        <div className="font-display text-lg">{cat.name}</div>
        {cat.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{cat.description}</p>
        )}
        <Button
          variant="luxe"
          className="w-full mt-auto"
          style={cat.button_color ? { background: cat.button_color } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(cat);
          }}
        >
          ดูสินค้าในหมวด
        </Button>
      </div>
    </div>
  );
}

export function CategoryBlocks({
  categories,
  onSelect,
}: {
  categories: BlockCategory[];
  onSelect: (c: BlockCategory) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full">
      {categories.map((c) => (
        <CategoryBlock key={c.id} cat={c} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function SubCategoryBlocks({
  parent,
  categories,
  onSelect,
}: {
  parent: BlockCategory;
  categories: BlockCategory[];
  onSelect: (c: BlockCategory) => void;
}) {
  return (
    <div>
      <div className="mb-8 rounded-xl overflow-hidden border border-border shadow-card">
        <Banner cat={parent} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full">
        {categories.map((c) => (
          <CategoryBlock key={c.id} cat={c} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
