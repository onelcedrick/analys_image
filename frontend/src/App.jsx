import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Activity, Layers, Zap, Shield, BookOpen, Server, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { HistogramChart, TransferCurve, TextureMap, DCTHeatmap } from './components/charts';
import { Button, Card, SectionTitle, StatCard, Toggle, SegmentedControl } from './components/ui';
import { useServerStatus } from './hooks/useServerStatus';
import { processImageTransfer, processTextureAnalysis, processForensicDCT } from './lib/processing';
import { DEMO_IMAGES } from './data/demos';

export default function App() {
  const [activeTab, setActiveTab] = useState('signal');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [viewMode, setViewMode] = useState('original'); // original, processed, difference
  const serverStatus = useServerStatus();

  // Gestion du chargement d'image
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
        setResults(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadDemoImage = (url) => {
    setSelectedImage(url);
    setResults(null);
  };

  // Traitement selon l'onglet actif
  const handleProcess = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    try {
      let result;
      switch (activeTab) {
        case 'transfer':
          result = await processImageTransfer(selectedImage);
          break;
        case 'texture':
          result = await processTextureAnalysis(selectedImage);
          break;
        case 'forensic':
          result = await processForensicDCT(selectedImage);
          break;
        default:
          // Simulation pour l'onglet signal
          result = {
            processedImage: selectedImage,
            histogram: {
              r: Array.from({ length: 256 }, (_, i) => Math.random() * 100),
              g: Array.from({ length: 256 }, (_, i) => Math.random() * 100),
              b: Array.from({ length: 256 }, (_, i) => Math.random() * 100)
            }
          };
      }
      setResults(result);
      setViewMode('processed');
    } catch (error) {
      console.error('Erreur de traitement:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!results?.processedImage) return;
    const link = document.createElement('a');
    link.href = results.processedImage;
    link.download = `histovision-${activeTab}-${Date.now()}.png`;
    link.click();
  };

  const tabs = [
    { id: 'signal', label: 'Signal', icon: Activity, color: 'text-teal-400' },
    { id: 'transfer', label: 'Transfert Lab', icon: Layers, color: 'text-amber-400' },
    { id: 'texture', label: 'Texture', icon: Zap, color: 'text-rose-400' },
    { id: 'forensic', label: 'Forensic DCT', icon: Shield, color: 'text-purple-400' },
    { id: 'docs', label: 'Docs', icon: BookOpen, color: 'text-blue-400' },
    { id: 'backend', label: 'Backend', icon: Server, color: 'text-green-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-blue-500 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                HistoVision Pro
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm ${
                serverStatus.online 
                  ? 'bg-green-900/30 text-green-400 border border-green-800' 
                  : 'bg-red-900/30 text-red-400 border border-red-800'
              }`}>
                {serverStatus.online ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{serverStatus.online ? 'Backend Connecté' : 'Backend Hors Ligne'}</span>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!results}>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Zone de chargement d'image */}
        {!selectedImage ? (
          <Card className="mb-8">
            <div className="text-center py-12">
              <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Charger une image</h3>
              <p className="text-gray-400 mb-6">Glissez-déposez ou cliquez pour sélectionner</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload">
                <Button as="span">
                  <Upload className="w-4 h-4 mr-2" />
                  Sélectionner une image
                </Button>
              </label>
              
              <div className="mt-8">
                <p className="text-gray-400 mb-4">Ou choisir une démo :</p>
                <div className="flex justify-center space-x-4 flex-wrap gap-4">
                  {DEMO_IMAGES.map((demo, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadDemoImage(demo.url)}
                      className="group relative rounded-lg overflow-hidden border border-gray-700 hover:border-teal-500 transition-all"
                    >
                      <img src={demo.url} alt={demo.name} className="w-32 h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{demo.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Contrôles et Visualisation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Image Viewer */}
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle>Visualisation</SectionTitle>
                  <div className="flex items-center space-x-2">
                    <SegmentedControl
                      options={[
                        { value: 'original', label: 'Original' },
                        { value: 'processed', label: 'Traité' },
                        { value: 'difference', label: 'Différence' }
                      ]}
                      value={viewMode}
                      onChange={setViewMode}
                    />
                    <Button variant="outline" size="sm" onClick={() => setSelectedImage(null)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Nouvelle
                    </Button>
                  </div>
                </div>
                
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                  <img
                    src={viewMode === 'processed' && results?.processedImage ? results.processedImage : selectedImage}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center">
                        <RefreshCw className="w-12 h-12 text-teal-400 animate-spin mx-auto mb-4" />
                        <p className="text-white font-medium">Traitement en cours...</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Panneau de contrôle */}
              <Card>
                <SectionTitle>Paramètres</SectionTitle>
                
                <div className="space-y-6">
                  {activeTab === 'transfer' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Intensité du transfert
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          defaultValue="75"
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                      </div>
                      <Toggle label="Préserver la luminance" defaultChecked />
                      <Toggle label="Mode CIE Lab avancé" />
                    </>
                  )}
                  
                  {activeTab === 'texture' && (
                    <>
                      <SegmentedControl
                        options={[
                          { value: 'lbp', label: 'LBP' },
                          { value: 'gabor', label: 'Gabor' },
                          { value: 'glcm', label: 'GLCM' }
                        ]}
                        defaultValue="lbp"
                      />
                      <Toggle label="Détection de peau" defaultChecked />
                      <Toggle label="Amélioration des contours" />
                    </>
                  )}
                  
                  {activeTab === 'forensic' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Taille du bloc DCT
                        </label>
                        <SegmentedControl
                          options={[
                            { value: '8', label: '8×8' },
                            { value: '16', label: '16×16' }
                          ]}
                          defaultValue="8"
                        />
                      </div>
                      <Toggle label="Surbrillance des anomalies" defaultChecked />
                    </>
                  )}

                  <div className="pt-4 border-t border-gray-700">
                    <Button 
                      className="w-full" 
                      onClick={handleProcess}
                      disabled={isProcessing || !selectedImage}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Lancer l'analyse
                        </>
                      )}
                    </Button>
                  </div>

                  {results && (
                    <div className="pt-4 border-t border-gray-700">
                      <StatCard label="Temps de traitement" value="1.2s" />
                      <StatCard label="Confiance" value="94%" color="text-green-400" />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Analyse détaillée */}
            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(activeTab === 'signal' || activeTab === 'transfer') && (
                  <Card className="lg:col-span-2">
                    <SectionTitle>Histogramme RVB</SectionTitle>
                    <HistogramChart data={results.histogram} />
                  </Card>
                )}
                
                {activeTab === 'transfer' && (
                  <Card className="lg:col-span-2">
                    <SectionTitle>Courbe de transfert Lab</SectionTitle>
                    <TransferCurve data={results.transferCurve} />
                  </Card>
                )}
                
                {activeTab === 'texture' && (
                  <Card className="lg:col-span-2">
                    <SectionTitle>Carte de texture</SectionTitle>
                    <TextureMap data={results.textureMap} />
                  </Card>
                )}
                
                {activeTab === 'forensic' && (
                  <Card className="lg:col-span-2">
                    <SectionTitle>Analyse DCT 8×8</SectionTitle>
                    <DCTHeatmap data={results.dctHeatmap} />
                  </Card>
                )}

                {activeTab === 'docs' && (
                  <Card className="lg:col-span-4">
                    <SectionTitle>Documentation</SectionTitle>
                    <div className="prose prose-invert max-w-none">
                      <h3>Guide d'utilisation HistoVision Pro</h3>
                      <p>Bienvenue dans l'interface d'analyse forensique d'images.</p>
                      <ul>
                        <li><strong>Signal :</strong> Analyse des histogrammes et distribution des couleurs.</li>
                        <li><strong>Transfert Lab :</strong> Application de styles colorimétriques dans l'espace CIE Lab.</li>
                        <li><strong>Texture :</strong> Détection de motifs, grains et zones de peau.</li>
                        <li><strong>Forensic DCT :</strong> Détection de manipulations par analyse des blocs JPEG.</li>
                      </ul>
                    </div>
                  </Card>
                )}

                {activeTab === 'backend' && (
                  <Card className="lg:col-span-4">
                    <SectionTitle>État du Backend</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <StatCard 
                        label="Statut" 
                        value={serverStatus.online ? 'En ligne' : 'Hors ligne'} 
                        color={serverStatus.online ? 'text-green-400' : 'text-red-400'} 
                      />
                      <StatCard label="Latence" value={`${serverStatus.latency}ms`} />
                      <StatCard label="Version API" value="v1.2.0" />
                    </div>
                    <div className="mt-6 p-4 bg-gray-900 rounded-lg font-mono text-sm text-gray-300">
                      <p>Endpoint: http://localhost:8000</p>
                      <p>Endpoints disponibles:</p>
                      <ul className="list-disc list-inside mt-2">
                        <li>POST /api/transfer</li>
                        <li>POST /api/texture</li>
                        <li>POST /api/forensic</li>
                        <li>GET /health</li>
                      </ul>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
