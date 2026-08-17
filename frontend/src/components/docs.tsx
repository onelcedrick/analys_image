import React from 'react';
import { Card, SectionHead, IconFile } from './ui';

export const DocsTab = () => (
  <div className="space-y-6">
    <SectionHead n="05" label="Cahier des charges" icon={<IconFile />} />
    
    <Card className="p-6 space-y-4">
      <h3 className="font-display text-lg font-semibold text-[#e6eef8]">1. Objectifs du projet</h3>
      <p className="text-sm text-[#9fb3c8] leading-relaxed">
        HistoVision Pro est un dashboard d'analyse histogrammique destiné aux professionnels de l'image. 
        Il permet d'appliquer des techniques avancées de traitement d'images : transport optimal en CIE Lab, 
        protection sémantique des tons peau, analyse de texture par CLAHE/bilatéral, et forensique DCT 8×8.
      </p>
      
      <h3 className="font-display text-lg font-semibold text-[#e6eef8] pt-4">2. Fonctionnalités principales</h3>
      <ul className="text-sm text-[#9fb3c8] space-y-2 list-disc list-inside">
        <li><strong className="text-[#2ad4c2]">Signal :</strong> Analyse statistique complète (moyenne, écart-type, entropie, percentiles)</li>
        <li><strong className="text-[#ffb224]">Transfert Lab :</strong> Transport optimal 1D sur la luminance avec protection des peaux</li>
        <li><strong className="text-[#f45b8b]">Texture :</strong> Amélioration locale par CLAHE et filtrage bilatéral</li>
        <li><strong className="text-[#4da6ff]">Forensic DCT :</strong> Détection de blocs 8×8 pour l'analyse forensique</li>
      </ul>
      
      <h3 className="font-display text-lg font-semibold text-[#e6eef8] pt-4">3. Architecture technique</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#1a2840] rounded-lg p-4">
          <h4 className="font-mono text-xs text-[#2ad4c2] mb-2">Frontend</h4>
          <ul className="text-xs text-[#9fb3c8] space-y-1">
            <li>• React 19 + TypeScript</li>
            <li>• Vite 7 pour le build</li>
            <li>• Canvas API pour le rendu</li>
            <li>• TailwindCSS pour le style</li>
          </ul>
        </div>
        <div className="bg-[#1a2840] rounded-lg p-4">
          <h4 className="font-mono text-xs text-[#ffb224] mb-2">Backend</h4>
          <ul className="text-xs text-[#9fb3c8] space-y-1">
            <li>• Python FastAPI</li>
            <li>• NumPy/SciPy pour le calcul</li>
            <li>• OpenCV pour l'imagerie</li>
            <li>• OT/POT pour le transport optimal</li>
          </ul>
        </div>
      </div>
      
      <h3 className="font-display text-lg font-semibold text-[#e6eef8] pt-4">4. Espace colorimétrique</h3>
      <p className="text-sm text-[#9fb3c8] leading-relaxed">
        Le projet utilise l'espace <strong className="text-[#2ad4c2]">CIE Lab D65</strong> pour garantir une perception uniforme des couleurs. 
        La luminance L* est traitée séparément des composantes chrominance a* et b* via un transport optimal 1D 
        qui minimise la distance de Wasserstein W₂ entre les histogrammes source et cible.
      </p>
      
      <h3 className="font-display text-lg font-semibold text-[#e6eef8] pt-4">5. Protection sémantique</h3>
      <p className="text-sm text-[#9fb3c8] leading-relaxed">
        Un masque de détection de peau (basé sur YCbCr) permet de réduire l'application du transfert sur les zones cutanées, 
        préservant ainsi le naturel des portraits. Le paramètre <code className="font-mono text-[#f45b8b] bg-[#f45b8b]/10 px-1.5 py-0.5 rounded">skinProtect</code> 
        module cette protection de 0% à 70%.
      </p>
    </Card>
  </div>
);
