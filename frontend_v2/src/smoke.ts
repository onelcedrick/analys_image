/* src/smoke.ts — vérification console du moteur F2 (à supprimer ensuite) */
import { imageToLab } from "./lib/color";
import { runTransfer } from "./lib/processing";

function flat(v: number, w = 64, h = 48): ImageData {
  const d = new ImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  return d;
}

const dark = flat(30);
const bright = flat(210);
const noSkin = { strength: 1, skinProtect: false, feather: 14 };

// 1. Le transfert éclaircit bien la cible
const res = runTransfer(dark, imageToLab(dark), imageToLab(bright), noSkin);
const mean = res.result.data.reduce((s, v, i) => (i % 4 === 0 ? s + v : s), 0) / (64 * 48);
console.log("[smoke] moyenne résultat =", mean.toFixed(1), mean > 150 ? "OK" : "KO (attendu > 150)");

// 2. LUT monotone → zéro artefact de bloc (critère F2 §7)
const mono = Array.from(res.luts.L).every((v, i, a) => i === 0 || v >= a[i - 1] - 1e-3);
console.log("[smoke] LUT L* monotone :", mono ? "OK" : "KO");

// 3. Auto-transfert = identité (théorème de Brenier)
const auto = runTransfer(dark, imageToLab(dark), imageToLab(dark), noSkin);
console.log("[smoke] W₂ identité =", auto.w2.L.toFixed(4), Math.abs(auto.w2.L) < 0.01 ? "OK" : "KO (attendu ≈ 0)");

// 4. W₂ sombre↔clair ≈ écart de luminance
console.log("[smoke] W₂ L* =", res.w2.L.toFixed(1), "(écart sombre→clair)");