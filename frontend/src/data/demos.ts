export const DEMO_IMAGES = [
  { id: 't1', name: 'Portrait Studio', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&q=80' },
  { id: 'p1', name: 'Palette Cinéma', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=700&q=80' },
  { id: 't2', name: 'Paysage Alpin', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1000&q=80' },
  { id: 'p2', name: 'Vintage Kodak', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80' },
  { id: 't3', name: 'Produit E-commerce', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&q=80' },
];

export const DEMOS = DEMO_IMAGES;

export const KIND_META: Record<string, { label: string; tone: string }> = {
  portrait: { label: 'Portrait', tone: 'text-rose border-rose/30' },
  landscape: { label: 'Paysage', tone: 'text-teal border-teal/30' },
  product: { label: 'Produit', tone: 'text-amber border-amber/30' },
  palette: { label: 'Palette', tone: 'text-bluec border-bluec/30' },
};
