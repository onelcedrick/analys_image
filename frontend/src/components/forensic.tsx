import React from 'react';
import { Btn, Card, SectionHead, Stat } from './ui';
import * as api from '../lib/serverBridge';

export function ForensicPanel() {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [resultImage, setResultImage] = React.useState<ImageData | null>(null);
  const [metrics, setMetrics] = React.useState<Record<string, any> | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  React.useEffect(() => {
    if (!resultImage || !canvasRef.current) return;
    const c = canvasRef.current;
    c.width = resultImage.width;
    c.height = resultImage.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(resultImage, 0, 0);
  }, [resultImage]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
  };

  const runForensic = async () => {
    if (!file) return;
    setRunning(true);
    setResultImage(null);
    setMetrics(null);
    try {
      const { result, metrics } = await api.processWithBackend('forensic', file);
      setResultImage(result);
      setMetrics(metrics);
    } catch (err: any) {
      alert(err?.message ?? String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <SectionHead k="F5" title="Analyse Forensique (DCT 8×8)" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-text2">Image</span>
                <input type="file" accept="image/*" onChange={handleFile} className="mt-2" />
              </label>

              <div className="flex gap-2">
                <Btn onClick={runForensic} className="" disabled={!file || running}>
                  {running ? 'Analyse en cours…' : 'Lancer l\u2019analyse'}
                </Btn>
                <Btn onClick={() => { setFile(null); setPreview(null); setResultImage(null); }} className="">
                  Réinitialiser
                </Btn>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <div className="text-sm text-text2">Statistiques</div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Blocs suspects" value={metrics ? Number(metrics.flaggedPct ?? 0) : 0} />
                <Stat label="Score moyen" value={metrics ? Number(metrics.meanScore ?? 0) : 0} />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="min-h-[360px] flex items-center justify-center">
              {preview && !resultImage && <img src={preview} alt="preview" className="max-h-[520px] object-contain" />}
              {!preview && <div className="text-text2">Aucune image chargée</div>}
              <canvas ref={canvasRef} style={{ display: resultImage ? 'block' : 'none', maxWidth: '100%' }} />
            </div>
          </Card>

          <Card>
            <div className="text-sm text-text2">Détails</div>
            <pre className="mt-2 max-h-48 overflow-auto text-xs text-text2">{metrics ? JSON.stringify(metrics, null, 2) : '—'}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ForensicPanel;
