import React, { useState } from 'react';
import { CardData } from '../types/card';
import { MythosCard } from './MythosCard';
import { exportCardAsPng, exportCardBackAsPng } from '../utils/cardCanvasExport';
import { soundFx } from '../utils/soundFx';

interface CardModalProps {
  card: CardData | null;
  onClose: () => void;
  onEdit?: (card: CardData) => void;
  onAddToDeck?: (card: CardData) => void;
  onAnalyzeAbility?: (card: CardData) => void;
  onPlayCard?: (card: CardData) => void;
  canPlay?: boolean;
  playLabel?: string;
  cannotPlayReason?: string;
  sourceZone?: string;
  attachedWeapons?: CardData[];
  effectiveStrength?: number;
  onActivateAbility?: (card: CardData) => void;
  canActivate?: boolean;
  activateLabel?: string;
  isExhausted?: boolean;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  onClose,
  onEdit,
  onAddToDeck,
  onAnalyzeAbility,
  onPlayCard,
  canPlay = false,
  playLabel,
  cannotPlayReason,
  sourceZone,
  attachedWeapons,
  effectiveStrength,
  onActivateAbility,
  canActivate = false,
  activateLabel,
  isExhausted = false,
}) => {
  const [currentCard, setCurrentCard] = useState<CardData | null>(card);
  const [parentAlly, setParentAlly] = useState<CardData | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [modalMode, setModalMode] = useState<'full-art' | 'frame'>('full-art');

  React.useEffect(() => {
    setCurrentCard(card);
    setParentAlly(null);
  }, [card]);

  if (!card || !currentCard) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      soundFx.playCardFlick();
      if (isFlipped) {
        await exportCardBackAsPng();
      } else {
        await exportCardAsPng(currentCard, modalMode);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleFlip = () => {
    soundFx.playCardFlick();
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 text-neutral-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors z-30"
          title="Cerrar modal"
        >
          ✕
        </button>

        {/* Left Column: Big 3D Card with Tilt */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <MythosCard
            card={currentCard}
            size="lg"
            displayMode={modalMode}
            isFlipped={isFlipped}
            interactive={true}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleFlip}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-amber-300 transition-colors flex items-center gap-1.5"
            >
              <span>🔄</span> Voltear Reverso
            </button>
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setModalMode(modalMode === 'full-art' ? 'frame' : 'full-art');
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              {modalMode === 'full-art' ? '⚔️ Ver Marco' : '🖼️ Ver Fondo Completo'}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>📥</span> {isExporting ? 'Generando...' : (isFlipped ? 'Descargar Reverso' : 'Descargar')}
            </button>
          </div>
          <span className="text-[11px] text-neutral-400">
            Mueve el cursor sobre la carta para ver el reflejo holográfico 3D
          </span>
        </div>

        {/* Right Column: Card Breakdown & Lore */}
        <div className="flex-1 flex flex-col justify-between self-stretch text-left">
          <div>
            {parentAlly && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/70 flex items-center justify-between gap-3 text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗡️</span>
                  <div>
                    <span className="text-[10px] text-amber-300 font-cinzel font-bold uppercase tracking-wider block">
                      Revisando Arma Equipada
                    </span>
                    <span className="text-neutral-200">
                      Asignada a: <strong className="text-amber-200">{parentAlly.name}</strong>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundFx.playCardFlick();
                    setCurrentCard(parentAlly);
                    setParentAlly(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-cinzel font-bold text-xs border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>←</span> Volver a {parentAlly.name}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-amber-400 mb-1 font-cinzel tracking-wider">
              <span>{currentCard.edition}</span>
              <span>·</span>
              <span>N° {currentCard.number} / {currentCard.totalInSet}</span>
              <span>·</span>
              <span className="capitalize">{currentCard.rarity}</span>
              {sourceZone && (
                <>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-sans text-[11px] font-medium border border-neutral-700">
                    📍 {parentAlly ? `Equipada a ${parentAlly.name}` : sourceZone}
                  </span>
                </>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-cinzel font-bold text-amber-100 mb-3 tracking-wide">
              {currentCard.name}
            </h2>

            {/* Stat Badges as clean unboxed text */}
            <div className="flex items-center gap-4 text-xs font-medium text-neutral-300 py-2 border-y border-neutral-800 mb-4 flex-wrap">
              <div>
                <span className="text-neutral-500 text-[11px]">Tipo: </span>
                <span className="text-white font-semibold">{currentCard.type}</span>
              </div>
              <span>·</span>
              <div>
                <span className="text-neutral-500 text-[11px]">Raza: </span>
                <span className="text-white font-semibold">{currentCard.race}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <span className="text-red-400">🛡️ Fuerza:</span>
                <span className="text-white font-bold text-sm font-cinzel">
                  {!parentAlly && effectiveStrength !== undefined ? effectiveStrength : currentCard.strength}
                </span>
                {!parentAlly && effectiveStrength !== undefined && effectiveStrength > currentCard.strength && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    (+{effectiveStrength - currentCard.strength} por Arma)
                  </span>
                )}
              </div>
              <span>·</span>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">🪙 Coste:</span>
                <span className="text-white font-bold text-sm font-cinzel">{currentCard.cost}</span>
              </div>
            </div>

            {/* Attached Weapons Section (DAR 4.2.2) */}
            {attachedWeapons && attachedWeapons.length > 0 && !parentAlly && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 shadow-inner">
                <div className="flex items-center justify-between text-xs font-cinzel font-bold text-amber-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span>🗡️</span> Armas Asignadas ({attachedWeapons.length})
                  </span>
                  <span className="text-[10px] text-neutral-400">DAR 4.2.2 · Pulsa para revisar</span>
                </div>
                <div className="space-y-1.5">
                  {attachedWeapons.map((wpn, i) => {
                    const text = (wpn.ability || '').toLowerCase();
                    const strengthMatch = text.match(/gana\s*\+?\s*(\d+)\s*a\s*la\s*fuerza/i) || text.match(/gana\s*\+\s*(\d+)/i);
                    const bonusF = strengthMatch ? parseInt(strengthMatch[1], 10) : wpn.strength > 0 ? wpn.strength : 0;
                    return (
                      <div
                        key={`${wpn.id}-${i}`}
                        className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-700/80 hover:border-amber-500/60 flex items-center justify-between text-xs gap-2 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-bold font-cinzel text-sm">{wpn.name}</span>
                          <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-600/50">
                            {bonusF > 0 ? `+${bonusF} Fuerza` : 'Efecto Único'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400 italic max-w-[200px] truncate" title={wpn.ability}>
                            {wpn.ability || 'Arma equipada'}
                          </span>
                          <button
                            onClick={() => {
                              soundFx.playCardFlick();
                              setParentAlly(currentCard);
                              setCurrentCard(wpn);
                            }}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-[10px] shadow-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                            title={`Examinar carta completa de ${wpn.name}`}
                          >
                            <span>👁️</span> Revisar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lore Quote */}
            {currentCard.flavorText && (
              <div className="mb-4 p-3 rounded-lg bg-neutral-950/60 border-l-2 border-amber-500">
                <p className="font-cinzel text-xs text-amber-200/90 italic leading-relaxed">
                  "{currentCard.flavorText}"
                </p>
              </div>
            )}

            {/* Ability Breakdown */}
            <div className="mb-4">
              <h3 className="text-xs uppercase font-cinzel tracking-widest text-neutral-400 mb-1.5 font-bold">
                Texto de Habilidad & Reglas
              </h3>
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <p className="font-medieval text-sm md:text-base text-neutral-200 leading-relaxed">
                  {currentCard.ability}
                </p>
              </div>
            </div>

            {/* Illustrator */}
            <div className="text-xs text-neutral-400">
              <span className="text-neutral-500">Ilustrador: </span>
              <span className="text-neutral-200 font-medium">{currentCard.illustrator}</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 mt-6 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(currentCard);
                  }}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <span>✏️</span> Abrir en Generador
                </button>
              )}

              {onAnalyzeAbility && (
                <button
                  onClick={() => {
                    onClose();
                    onAnalyzeAbility(currentCard);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-amber-600/40"
                  title="Analizar habilidad detallada bajo reglamento D.A.R. 1.0"
                >
                  <span>🧠</span> Analizar D.A.R.
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {onAddToDeck && (
                <button
                  onClick={() => {
                    onAddToDeck(currentCard);
                    soundFx.playCardFlick();
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>➕</span> Añadir al Mazo
                </button>
              )}

              {onActivateAbility && (
                <button
                  onClick={() => {
                    onClose();
                    onActivateAbility(currentCard);
                  }}
                  disabled={!canActivate || isExhausted}
                  className={`px-4 py-2 rounded-lg text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 shadow-lg ${
                    isExhausted
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 opacity-60 cursor-not-allowed'
                      : !canActivate
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 opacity-50 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-300 animate-pulse cursor-pointer shadow-amber-950/60'
                  }`}
                  title={
                    isExhausted
                      ? 'Habilidad ya utilizada en este turno'
                      : !canActivate
                      ? 'Habilidad no activable en la fase actual'
                      : `Activar: ${currentCard.ability}`
                  }
                >
                  <span>{isExhausted ? '✓' : '⚡'}</span>
                  <span>
                    {isExhausted
                      ? 'Habilidad Usada'
                      : activateLabel || 'Activar Habilidad'}
                  </span>
                </button>
              )}

              {onPlayCard && (
                <div className="flex flex-col items-end">
                  <button
                    onClick={() => {
                      onClose();
                      onPlayCard(currentCard);
                    }}
                    disabled={!canPlay}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:opacity-50 text-white text-xs font-cinzel font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>▶️</span>{' '}
                    {playLabel ||
                      (currentCard.type === 'Oro'
                        ? 'Bajar Oro'
                        : `Jugar Carta (${currentCard.cost} 🪙)`)}
                  </button>
                  {!canPlay && cannotPlayReason && (
                    <span className="text-[10px] text-amber-400/90 mt-1 max-w-[260px] text-right font-sans">
                      ⚠️ {cannotPlayReason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
