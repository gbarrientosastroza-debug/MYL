import React, { useState, useRef } from 'react';
import { CardData } from '../types/card';
import {
  scanCardWithAi,
  resolveCardInfoFromFilename,
  fileToBase64,
} from '../services/cardScanner';
import { optimizeCardImage } from '../utils/cardImageStorage';
import { soundFx } from '../utils/soundFx';
import { MythosCard } from './MythosCard';

interface ImageDropzoneProps {
  onImagesLoaded: (imageMap: Record<number, string>, newCards?: CardData[]) => void;
  onCardsRecognized?: (cards: CardData[]) => void;
  onEditCard?: (card: CardData) => void;
  displayMode: 'full-art' | 'frame';
  onToggleDisplayMode: (mode: 'full-art' | 'frame') => void;
  loadedCount: number;
  availableCards?: CardData[];
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onImagesLoaded,
  onCardsRecognized,
  onEditCard,
  displayMode,
  onToggleDisplayMode,
  loadedCount,
  availableCards = [],
}) => {
  const [managerMode, setManagerMode] = useState<'scan-full' | 'assign-backgrounds'>('assign-backgrounds');
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; currentName?: string }>({
    current: 0,
    total: 0,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recognizedCards, setRecognizedCards] = useState<CardData[]>([]);
  const [recentlyAssigned, setRecentlyAssigned] = useState<
    { number: number; name: string; imageUrl: string; isNew?: boolean }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode 1: Fast Bulk Background & Artwork Mapper (NO CARD LIMIT - 1 to 999 or custom)
  const processBackgroundsOnly = async (files: File[]) => {
    soundFx.playCardFlick();
    setIsScanning(true);
    setScanProgress({ current: 0, total: files.length });

    const newImageMap: Record<number, string> = {};
    const synthesizedCards: CardData[] = [];
    const assignedList: { number: number; name: string; imageUrl: string; isNew?: boolean }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setScanProgress({ current: i + 1, total: files.length, currentName: file.name });

      try {
        const rawBase64 = await fileToBase64(file);
        // Optimize to max 1000px, quality 0.88 webp/jpeg (super crisp, only ~80KB per card)
        const optimized = await optimizeCardImage(rawBase64, 1000);

        const info = resolveCardInfoFromFilename(file.name, availableCards);
        const cardNum = info.cardNumber;
        const cardName = info.cardName;

        newImageMap[cardNum] = optimized;

        if (!info.matchedCard) {
          // If this card number is not in the canonical set, create a synthesized card so it appears in catalog!
          const newCard: CardData = {
            id: `bg-custom-${cardNum}-${Date.now()}`,
            number: cardNum,
            totalInSet: 236,
            edition: 'Espada Sagrada',
            name: cardName,
            type: 'Aliado',
            race: 'Caballero',
            strength: 2,
            cost: 2,
            flavorText: 'Ilustración y fondo personalizado incorporado.',
            ability: 'Habilidad de carta en juego.',
            illustrator: 'Archivo Mitos y Leyendas',
            rarity: 'Real',
            foil: 'none',
            imageUrl: optimized,
            isCustom: true,
          };
          synthesizedCards.push(newCard);
        }

        assignedList.push({
          number: cardNum,
          name: cardName,
          imageUrl: optimized,
          isNew: !info.matchedCard,
        });
      } catch (err) {
        console.error(`Error procesando archivo ${file.name}:`, err);
      }
    }

    setIsScanning(false);
    setScanProgress({ current: 0, total: 0 });

    const totalCount = Object.keys(newImageMap).length;
    if (totalCount > 0) {
      onImagesLoaded(newImageMap, synthesizedCards);
      setRecentlyAssigned(assignedList);
      soundFx.playVictory();
      setStatusMessage(
        `¡${totalCount} fondo(s) de carta asignado(s) y guardados permanentemente en el servidor y memoria!`
      );
      setTimeout(() => setStatusMessage(null), 7000);
    } else {
      setStatusMessage('No se pudo procesar las imágenes seleccionadas.');
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Mode 2: Multimodal AI Full Card Scanner (Abilities, Strength, Cost, Race, etc.)
  const processWithAiScan = async (files: File[]) => {
    setIsScanning(true);
    soundFx.playSummon();
    setScanProgress({ current: 0, total: files.length });

    const scannedList: CardData[] = [];
    const imageMap: Record<number, string> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setScanProgress({ current: i + 1, total: files.length, currentName: file.name });

      try {
        const result = await scanCardWithAi(file);
        scannedList.push(result.card);
        if (result.card.number && result.card.imageUrl) {
          imageMap[result.card.number] = result.card.imageUrl;
        }
      } catch (err) {
        console.error(`Error escaneando ${file.name}:`, err);
      }
    }

    setIsScanning(false);
    setScanProgress({ current: 0, total: 0 });

    if (scannedList.length > 0) {
      soundFx.playVictory();
      setRecognizedCards((prev) => [...scannedList, ...prev]);
      // Update image map and persist scanned cards
      onImagesLoaded(imageMap, scannedList);
      setStatusMessage(
        `¡${scannedList.length} carta(s) analizada(s) con IA! Fuerza, habilidades y atributos reconocidos y guardados.`
      );
      setTimeout(() => setStatusMessage(null), 6000);
    } else {
      setStatusMessage('No se pudo reconocer información de las imágenes seleccionadas.');
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (managerMode === 'scan-full') {
      processWithAiScan(files);
    } else {
      processBackgroundsOnly(files);
    }
  };

  const handleSaveCardToCatalog = (card: CardData) => {
    soundFx.playSummon();
    if (onCardsRecognized) {
      onCardsRecognized([card]);
    }
    setRecognizedCards((prev) => prev.filter((c) => c.id !== card.id));
    setStatusMessage(`Carta "${card.name}" guardada y lista en tu colección.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSaveAllRecognized = () => {
    if (recognizedCards.length === 0) return;
    soundFx.playVictory();
    if (onCardsRecognized) {
      onCardsRecognized(recognizedCards);
    }
    const count = recognizedCards.length;
    setRecognizedCards([]);
    setStatusMessage(`¡${count} cartas reconocidas guardadas permanentemente en tu catálogo de juego!`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="w-full mb-8 p-4 md:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl space-y-5">
      {/* Header and Mode Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-cinzel text-amber-500 font-bold uppercase tracking-wider">
            <span>Gestor & Reconocedor de Cartas</span>
            <span>·</span>
            <span className="text-emerald-400">Sin Límite de Cartas (1 a 999+)</span>
          </div>
          <h2 className="text-xl md:text-2xl font-cinzel font-bold text-amber-100 mt-0.5">
            Gestor de Imágenes de Fondos, Ilustraciones & Escáner IA
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Sube fondos e ilustraciones de cartas sin límite. Se optimizan automáticamente y se guardan de forma permanente en el servidor y memoria persistente, visibles de inmediato en el catálogo.
          </p>
        </div>

        {/* Display Mode Toggle */}
        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 self-start md:self-auto shrink-0">
          <span className="text-[11px] font-cinzel text-neutral-400 px-2 font-medium">Modo Vista:</span>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onToggleDisplayMode('full-art');
            }}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              displayMode === 'full-art'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Muestra la imagen completa de la carta sin marco superpuesto"
          >
            🖼️ Carta Original HD
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onToggleDisplayMode('frame');
            }}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              displayMode === 'frame'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Muestra el marco oficial con escudo de fuerza, moneda de oro y caja de texto sobre el fondo"
          >
            ⚔️ Marco Clásico
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          <button
            onClick={() => {
              soundFx.playCardFlick();
              setManagerMode('assign-backgrounds');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-cinzel font-semibold transition-all flex items-center gap-2 ${
              managerMode === 'assign-backgrounds'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>⚡</span> Asignar Fondos & Ilustraciones (Sin Límite)
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              setManagerMode('scan-full');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-cinzel font-semibold transition-all flex items-center gap-2 ${
              managerMode === 'scan-full'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>🧠</span> Reconocimiento Total IA (Fuerza + Habilidad)
          </button>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fondos HD guardados:</span>
            <strong className="font-mono text-amber-400 font-bold">{loadedCount}</strong>
          </span>
        </div>
      </div>

      {/* Dropzone Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`relative w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-amber-400 bg-amber-950/30 scale-[1.008]'
            : isScanning
            ? 'border-amber-600/50 bg-neutral-950/80 animate-pulse'
            : 'border-neutral-700 hover:border-amber-600/70 bg-neutral-950/60'
        }`}
        onClick={() => !isScanning && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
            }
          }}
        />

        {isScanning ? (
          <div className="space-y-3 py-3 w-full max-w-md mx-auto">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <h3 className="font-cinzel font-bold text-amber-200 text-sm">
              Procesando imagen {scanProgress.current} de {scanProgress.total}...
            </h3>
            {scanProgress.currentName && (
              <p className="text-[11px] font-mono text-neutral-400 truncate">
                {scanProgress.currentName}
              </p>
            )}
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{
                  width: `${(scanProgress.current / scanProgress.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              {managerMode === 'scan-full'
                ? 'Extrayendo nombre, coste, fuerza, raza y caja de habilidad con visión IA...'
                : 'Optimizando imagen y vinculando al catálogo de cartas...'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="w-12 h-12 rounded-full bg-neutral-800/80 border border-neutral-700 flex items-center justify-center mx-auto text-xl text-amber-400">
              {managerMode === 'scan-full' ? '👁️' : '📁'}
            </div>
            <div>
              <p className="text-sm font-cinzel font-bold text-amber-100">
                {managerMode === 'scan-full'
                  ? 'Arrastra imágenes de cartas para escanearlas por completo con IA'
                  : 'Arrastra imágenes de fondos (001.png, 045.jpg, persival.png, 236.webp...)'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                o haz clic para explorar tus archivos desde tu dispositivo (soporta JPG, PNG, WebP)
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-amber-300 font-medium">
              <span>✨</span>
              <span>
                {managerMode === 'scan-full'
                  ? 'Reconoce: Nombre, Coste 🪙, Fuerza 🛡️, Tipo, Raza y Habilidad'
                  : 'Sin límite: Aplica fondos a toda la colección (1 a 999) con persistencia permanente'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-200 text-xs font-medium flex items-center justify-between shadow-lg animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-amber-400 hover:text-white px-2 py-0.5 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Preview of Recently Assigned Backgrounds */}
      {recentlyAssigned.length > 0 && (
        <div className="p-4 rounded-xl bg-neutral-950 border border-amber-600/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div>
              <span className="text-[10px] font-cinzel text-amber-400 font-bold uppercase tracking-wider">
                Vista Previa Inmediata
              </span>
              <h3 className="text-sm font-cinzel font-bold text-amber-100">
                Fondos Asignados Recientemente ({recentlyAssigned.length})
              </h3>
            </div>
            <button
              onClick={() => setRecentlyAssigned([])}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cerrar vista previa
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[220px] overflow-y-auto pr-1">
            {recentlyAssigned.map((item, idx) => (
              <div
                key={`${item.number}-${idx}`}
                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 flex flex-col items-center gap-1 text-center"
              >
                <div className="w-14 h-20 rounded-[4px] overflow-hidden bg-black relative border border-neutral-700">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono font-bold text-amber-400">
                    #{item.number}
                  </span>
                </div>
                <span className="text-[10px] font-cinzel font-semibold text-neutral-200 truncate w-full">
                  {item.name}
                </span>
                <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">
                  {item.isNew ? 'Nueva Carta' : 'Fondo HD'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recognized Cards Live Review Panel (AI Scanner) */}
      {recognizedCards.length > 0 && (
        <div className="p-4 rounded-xl bg-neutral-950 border border-amber-600/40 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <span className="text-[10px] font-cinzel text-amber-400 font-bold uppercase tracking-wider">
                Cartas Escaneadas con Visión IA ({recognizedCards.length})
              </span>
              <h3 className="text-base font-cinzel font-bold text-amber-100">
                Revisión de Cartas Reconocidas
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAllRecognized}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-cinzel font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950"
              >
                <span>💾</span> Guardar Todas ({recognizedCards.length})
              </button>
              <button
                onClick={() => setRecognizedCards([])}
                className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
              >
                Descartar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
            {recognizedCards.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex gap-4 items-start hover:border-amber-500/40 transition-colors"
              >
                <div className="shrink-0 w-24">
                  <MythosCard card={c} size="sm" interactive={false} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch text-left">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-cinzel text-amber-400 font-bold truncate">
                        N° {c.number} · {c.edition}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-600/40 text-[9px] font-cinzel text-amber-300 font-bold">
                        {c.type}
                      </span>
                    </div>

                    <h4 className="text-sm font-cinzel font-bold text-amber-100 truncate mt-0.5">
                      {c.name}
                    </h4>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-neutral-300 my-1 font-mono">
                      <span>🪙 Coste: <strong className="text-amber-400">{c.cost}</strong></span>
                      {c.type === 'Aliado' && (
                        <span>🛡️ Fuerza: <strong className="text-red-400">{c.strength}</strong></span>
                      )}
                      {c.race !== 'Sin Raza' && (
                        <span className="font-sans text-[11px] text-neutral-400">· {c.race}</span>
                      )}
                    </div>

                    {/* Ability */}
                    <p className="text-[11px] text-neutral-300 line-clamp-2 leading-snug italic mt-1">
                      "{c.ability || 'Sin habilidad'}"
                    </p>
                  </div>

                  {/* Card Action buttons */}
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-neutral-800">
                    <button
                      onClick={() => handleSaveCardToCatalog(c)}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>✅</span> Guardar
                    </button>
                    {onEditCard && (
                      <button
                        onClick={() => onEditCard(c)}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium"
                      >
                        <span>✏️</span> Ajustar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
