import React from 'react';
import { Card, SectionHead, IconServer, Chip, Btn, IconZap } from './ui';

export const BlueprintTab = ({ serverUp, base }: { serverUp: boolean; base: string }) => (
  <div className="space-y-6">
    <SectionHead n="06" label="Backend" icon={<IconServer />} right={
      <Chip tone={serverUp ? 'text-teal border-teal/30' : 'text-rose border-rose/30'}>
        {serverUp ? 'En ligne' : 'Hors ligne'}
      </Chip>
    } />
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold text-[#e6eef8] flex items-center gap-2">
          <IconZap className="text-[#ffb224]" /> Endpoints API
        </h3>
        <div className="space-y-3">
          <EndpointRow method="GET" path="/health" desc="Santé du serveur" />
          <EndpointRow method="POST" path="/api/transfer" desc="Transfert de style CIE Lab" />
          <EndpointRow method="POST" path="/api/texture" desc="Analyse de texture CLAHE" />
          <EndpointRow method="POST" path="/api/forensic" desc="Forensique DCT 8×8" />
        </div>
      </Card>
      
      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold text-[#e6eef8]">Configuration</h3>
        <div className="space-y-3">
          <ConfigRow label="Base URL" value={base} />
          <ConfigRow label="Timeout" value="30s" />
          <ConfigRow label="Max upload" value="10 MB" />
          <ConfigRow label="CORS" value="*" tone="text-amber" />
        </div>
        
        <div className="pt-4">
          <h4 className="font-mono text-xs text-[#6b7f99] mb-2">Dépendances Python</h4>
          <div className="flex flex-wrap gap-1.5">
            {['fastapi', 'uvicorn', 'numpy', 'scipy', 'opencv-python', 'pot', 'pillow'].map(pkg => (
              <Chip key={pkg} tone="text-text2 border-line bg-panel">{pkg}</Chip>
            ))}
          </div>
        </div>
      </Card>
    </div>
    
    <Card className="p-6">
      <h3 className="font-display text-lg font-semibold text-[#e6eef8] mb-4">Schéma d'architecture</h3>
      <div className="bg-[#0d1421] rounded-lg p-6 overflow-x-auto">
        <pre className="font-mono text-xs text-[#9fb3c8] leading-relaxed">
{`┌─────────────────┐      HTTP/JSON      ┌──────────────────┐
│   Frontend      │ ◄─────────────────► │    Backend       │
│   React + Vite  │                     │   FastAPI        │
│                 │                     │                  │
│  • Canvas API   │                     │  • NumPy/SciPy   │
│  • OT local     │                     │  • OpenCV        │
│  • Histogrammes │                     │  • POT (OT)      │
└─────────────────┘                     └──────────────────┘
         │                                       │
         │                                       ▼
         │                              ┌──────────────────┐
         │                              │  Storage         │
         │                              │  /images         │
         │                              │  /results        │
         │                              └──────────────────┘
         ▼
┌─────────────────┐
│  Démonstrateurs │
│  Unsplash CDN   │
└─────────────────┘`}
        </pre>
      </div>
    </Card>
  </div>
);

const EndpointRow = ({ method, path, desc }: { method: string; path: string; desc: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a2840]">
    <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded ${
      method === 'GET' ? 'bg-[#2ad4c2]/20 text-[#2ad4c2]' : 'bg-[#4da6ff]/20 text-[#4da6ff]'
    }`}>{method}</span>
    <code className="font-mono text-xs text-[#e6eef8] flex-1">{path}</code>
    <span className="text-xs text-[#6b7f99]">{desc}</span>
  </div>
);

const ConfigRow = ({ label, value, tone = 'text-[#e6eef8]' }: { label: string; value: string; tone?: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-[#2e405f] last:border-0">
    <span className="text-sm text-[#9fb3c8]">{label}</span>
    <span className={`font-mono text-sm ${tone}`}>{value}</span>
  </div>
);
