export const DEMOS = [
  {
    id: "portrait",
    label: "Portrait · heure dorée",
    kind: "cible",
    url: "https://image.qwenlm.ai/generated-images/2deccc71-dee5-4e4f-a99d-388d581d4d62/_result.png",
    note: "Peau + bokeh : cible idéale pour le transfert chromatique protégé."
  },
  {
    id: "dunes",
    label: "Dunes · ambre",
    kind: "palette",
    url: "https://image.qwenlm.ai/generated-images/ba551913-9dcb-4f6e-8f3b-ddca3772d94e/_result.png",
    note: "Palette source chaude — ambre, orange brûlé, sable clair."
  },
  {
    id: "fjord",
    label: "Fjord · brume froide",
    kind: "palette",
    url: "https://image.qwenlm.ai/generated-images/accd9b5b-2138-4c0c-8b1f-b0bb53c4a51c/_result.png",
    note: "Palette source froide — sarcelle, acier, gris-vert."
  },
  {
    id: "moss",
    label: "Pierre & mousse",
    kind: "texture",
    url: "https://image.qwenlm.ai/generated-images/b0aad8ca-bba3-4554-8ce2-f1b5e2046e3e/_result.png",
    note: "Zones lisses (pierre humide) vs texturées (mousse)."
  },
  {
    id: "balloon",
    label: "Lac · ballon suspect",
    kind: "forensic",
    url: "https://image.qwenlm.ai/generated-images/4eedad53-bb46-4fc2-bf32-54aea6ccf64c/_result.png",
    note: "Composite supposé (objet rapporté) — à scanner en DCT 8×8."
  }
];

export const KIND_META = {
  cible: { label: "Cible", cls: "text-amber border-amber/40 bg-amber/10", dot: "bg-amber" },
  palette: { label: "Palette", cls: "text-rose border-rose/40 bg-rose/10", dot: "bg-rose" },
  texture: { label: "Texture", cls: "text-teal border-teal/40 bg-teal/10", dot: "bg-teal" },
  forensic: { label: "Forensic", cls: "text-bluec border-bluec/40 bg-bluec/10", dot: "bg-bluec" }
};
