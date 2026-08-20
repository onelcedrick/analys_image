/**
 * Banque d'images de démonstration — générée procéduralement en canvas.
 *
 * 100 % hors-ligne : chaque scène est dessinée au chargement du module,
 * l'app démarre avec des images vivantes sans aucun accès réseau.
 */

export type DemoKind = "cible" | "palette" | "texture" | "forensic";

export interface DemoImage {
  id: string;
  label: string;
  kind: DemoKind;
  /** vignette (dataURL) pour la sidebar */
  url: string;
  note: string;
  /** pixels bruts, prêts à traiter — zéro décodage */
  data: ImageData;
}

export const KIND_META: Record<DemoKind, { label: string; cls: string; dot: string }> = {
  cible: { label: "Cible", cls: "text-amber border-amber/40 bg-amber/10", dot: "bg-amber" },
  palette: { label: "Palette", cls: "text-rose border-rose/40 bg-rose/10", dot: "bg-rose" },
  texture: { label: "Texture", cls: "text-teal border-teal/40 bg-teal/10", dot: "bg-teal" },
  forensic: { label: "Forensic", cls: "text-bluec border-bluec/40 bg-bluec/10", dot: "bg-bluec" },
};

/* ------------------- petits outils de peinture ---------------------- */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function scene(w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  paint(ctx, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  return { url: c.toDataURL("image/jpeg", 0.85), data };
}

function vgrad(ctx: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [t, col] of stops) g.addColorStop(t, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------ les cinq scènes --------------------------- */

/** Portrait synthétique : ciel doré + buste au teint détectable (YCbCr). */
function paintPortrait(ctx: CanvasRenderingContext2D, w: number, h: number) {
  vgrad(ctx, w, h, [[0, "#2a2140"], [0.5, "#7a4030"], [0.78, "#d8873c"], [1, "#8a4a28"]]);
  const sun = ctx.createRadialGradient(472, 168, 4, 472, 168, 130);
  sun.addColorStop(0, "rgba(255,226,168,0.95)");
  sun.addColorStop(0.25, "rgba(255,196,120,0.5)");
  sun.addColorStop(1, "rgba(255,196,120,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#241a16";
  ctx.fillRect(0, 318, w, h - 318);
  const r = rng(11);
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.arc(r() * w, r() * 300, 6 + r() * 22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,196,120,${0.05 + r() * 0.12})`;
    ctx.fill();
  }
  // buste : épaules sombres, cou et tête au teint chaud
  ctx.fillStyle = "#3a2a24";
  ctx.beginPath();
  ctx.ellipse(320, 476, 172, 128, 0, Math.PI, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#b57a52";
  ctx.fillRect(298, 286, 44, 46);
  ctx.beginPath();
  ctx.ellipse(320, 214, 63, 66, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2b1d18";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(320, 246, 55, 60, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#c8875e";
  ctx.fill();
  const shade = ctx.createLinearGradient(260, 0, 390, 0);
  shade.addColorStop(0, "rgba(70,38,25,0)");
  shade.addColorStop(1, "rgba(70,38,25,0.42)");
  ctx.beginPath();
  ctx.ellipse(320, 246, 55, 60, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade;
  ctx.fill();
}

/** Palette chaude : dunes ambre sous un soleil bas. */
function paintDunes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  vgrad(ctx, w, h, [[0, "#f7c66b"], [0.55, "#c96a24"], [1, "#5c2413"]]);
  const glow = ctx.createRadialGradient(118, 74, 4, 118, 74, 90);
  glow.addColorStop(0, "rgba(255,238,190,0.95)");
  glow.addColorStop(1, "rgba(255,238,190,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.arc(118, 74, 30, 0, Math.PI * 2);
  ctx.fillStyle = "#ffedb8";
  ctx.fill();
  for (const [y0, amp, col] of [
    [168, 26, "rgba(122,51,18,0.55)"],
    [214, 20, "rgba(84,32,12,0.7)"],
  ] as [number, number, string][]) {
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y0 + Math.sin(x * 0.014 + y0) * amp);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = col;
    ctx.fill();
  }
}

/** Palette froide : fjord brumeux, acier et sarcelle. */
function paintFjord(ctx: CanvasRenderingContext2D, w: number, h: number) {
  vgrad(ctx, w, h, [[0, "#a7bcc4"], [0.45, "#52707c"], [1, "#24343d"]]);
  const wy = h * 0.6;
  const water = ctx.createLinearGradient(0, wy, 0, h);
  water.addColorStop(0, "#31464f");
  water.addColorStop(1, "#18242b");
  ctx.fillStyle = water;
  ctx.fillRect(0, wy, w, h - wy);
  const r = rng(5);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = "rgba(226,238,242,0.10)";
    ctx.fillRect(r() * w * 0.8, wy + r() * (h - wy), 40 + r() * 150, 1.5);
  }
  ctx.fillStyle = "#1b272d";
  ctx.beginPath();
  ctx.moveTo(0, wy);
  ctx.lineTo(0, 118);
  ctx.lineTo(86, wy);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, wy);
  ctx.lineTo(w, 96);
  ctx.lineTo(w - 104, wy);
  ctx.fill();
  for (const y of [92, 128, 162]) {
    ctx.fillStyle = "rgba(214,228,233,0.15)";
    ctx.fillRect(0, y, w, 7);
  }
}

/** Banc d'essai F4 : pierre humide (lisse) contre mousse (texturée). */
function paintMoss(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const r = rng(23);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const edge = w * 0.5 + Math.sin(y * 0.045) * 20;
      if (x < edge) {
        const g = 150 - y * 0.16 + (r() - 0.5) * 9;
        d[i] = g * 0.93;
        d[i + 1] = g;
        d[i + 2] = g * 1.07;
      } else {
        const n = r();
        d[i] = 46 + n * 62;
        d[i + 1] = 88 + n * 100;
        d[i + 2] = 38 + n * 48;
      }
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Scène F5 : lac bruité + ballon lisse rapporté (signature DCT). */
function paintBalloon(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const r = rng(31);
  const wy = h * 0.62;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const base = y < wy ? 62 + t * 90 : 40 + (1 - t) * 30;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (r() - 0.5) * 22;
      d[i] = base * 0.86 + n;
      d[i + 1] = base * 1.02 + n;
      d[i + 2] = base * 1.14 + n;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // objet rapporté : parfaitement lisse, bords nets → diverge en DCT
  ctx.beginPath();
  ctx.ellipse(436, 132, 50, 58, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#d84f35";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(420, 114, 17, 23, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "#f0a03c";
  ctx.fill();
  ctx.strokeStyle = "rgba(25,20,18,0.6)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(420, 186);
  ctx.lineTo(428, 216);
  ctx.moveTo(452, 186);
  ctx.lineTo(444, 216);
  ctx.stroke();
  ctx.fillStyle = "#5c4028";
  ctx.fillRect(424, 214, 24, 16);
}

/* ----------------------------- export ------------------------------- */

function buildDemos(): DemoImage[] {
  const portrait = scene(640, 400, paintPortrait);
  const dunes = scene(480, 300, paintDunes);
  const fjord = scene(480, 300, paintFjord);
  const moss = scene(560, 380, paintMoss);
  const balloon = scene(640, 400, paintBalloon);
  return [
    { id: "portrait", label: "Portrait · heure dorée", kind: "cible", note: "Teint détectable — cible idéale pour le transfert protégé (F2/F3).", ...portrait },
    { id: "dunes", label: "Dunes · ambre", kind: "palette", note: "Palette source chaude — ambre, orange brûlé, sable clair.", ...dunes },
    { id: "fjord", label: "Fjord · brume froide", kind: "palette", note: "Palette source froide — sarcelle, acier, gris-vert.", ...fjord },
    { id: "moss", label: "Pierre & mousse", kind: "texture", note: "Zones lisses vs texturées — banc d'essai F4.", ...moss },
    { id: "balloon", label: "Lac · ballon suspect", kind: "forensic", note: "Objet rapporté lisse sur fond bruité — à scanner en DCT 8×8 (F5).", ...balloon },
  ];
}

export const DEMOS: DemoImage[] = buildDemos();