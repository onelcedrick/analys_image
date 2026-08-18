import { useEffect, useState } from "react";
import {
  Btn, BusyBar, Card, Chip, IconDownload, IconPlay, IconReset, IconZap,
  SectionHead, Segmented, Slider, Stat, Toggle,
} from "./components/ui";
import { useToast } from "./components/toast";

export function Showroom() {
  const { notify } = useToast();
  const [clip, setClip] = useState(2.6);
  const [smooth, setSmooth] = useState(26);
  const [blend, setBlend] = useState(85);
  const [protect, setProtect] = useState(true);
  const [view, setView] = useState<"result" | "mask">("result");
  const [busy, setBusy] = useState<string | null>(null);
  const [ms, setMs] = useState(143);

  // la barre de charge « respire » quand un calcul tourne
  useEffect(() => {
    if (!busy) return;
    const id = setTimeout(() => {
      setBusy(null);
      setMs(Math.round(80 + Math.random() * 220));
      notify(`Calcul terminé en ${ms} ms`);
    }, 1400);
    return () => clearTimeout(id);
  }, [busy, notify, ms]);

  return (
    <div className="animate-fade-up space-y-4">
      <SectionHead
        k="DESIGN SYSTEM · ÉTAPE 5"
        title="Banc d'essai des primitives"
        desc="Tout ce que les onglets 01→06 consommeront : cartes, curseurs, bascules, segments, boutons, chips et télémétrie. Cliquez partout — chaque élément répond."
      />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="space-y-4 p-4">
          <Slider label="Clip limit — CLAHE" value={clip} min={0.5} max={6} step={0.1} color="var(--color-amber)" onChange={setClip} />
          <Slider label="σ couleur — bilatéral" value={smooth} min={8} max={60} onChange={setSmooth} />
          <Slider label="Intensité globale" value={blend} min={0} max={100} unit="%" color="var(--color-rose)" onChange={setBlend} />
          <Toggle label="Protection sémantique (peau)" hint="Le transfert s'applique partout sauf sur la peau." checked={protect} onChange={setProtect} />
          <Segmented
            value={view}
            onChange={setView}
            options={[{ id: "result", label: "Résultat" }, { id: "mask", label: "Masque" }]}
          />
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => setBusy("Transport optimal en CIE Lab…")}>
              <IconPlay /> Lancer
            </Btn>
            <Btn variant="teal" onClick={() => notify("PNG exporté — histovision-transfert.png")}>
              <IconDownload /> Exporter
            </Btn>
            <Btn onClick={() => { setClip(2.6); setSmooth(26); setBlend(85); setProtect(true); }}>
              <IconReset /> Réinitialiser
            </Btn>
          </div>
          <BusyBar label={busy} />
        </Card>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <Stat label="Distance W₂ · L*" value={(clip * 4.7).toFixed(2)} sub="unités canal" tone="text-amber" />
          <Stat label="Dernier calcul" value={`${ms} ms`} sub={busy ?? "pipeline idle"} tone="text-teal" />
          <Stat label="Peau protégée" value={protect ? `${(blend * 0.4).toFixed(1)} %` : "—"} sub="masque > 0.5" tone="text-rose" />
          <Stat label="Dynamique p1–p99" value={`${smooth}–${255 - smooth}`} sub="niveaux utiles" />
          <Card className="p-4 sm:col-span-2">
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Chips de télémétrie</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone="text-teal border-teal/30"><IconZap /> CIE Lab D65</Chip>
              <Chip tone="text-amber border-amber/30">OT 1D · W₂</Chip>
              <Chip tone="text-rose border-rose/30">Skin mask</Chip>
              <Chip tone="text-bluec border-bluec/30">DCT 8×8</Chip>
              <Chip>41 bins · KL</Chip>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-sub">
              Grammaire couleur : <span className="text-amber">ambre</span> = action,
              <span className="text-teal"> sarcelle</span> = données,
              <span className="text-rose"> rose</span> = alerte & peau,
              <span className="text-bluec"> bleu</span> = forensique.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}