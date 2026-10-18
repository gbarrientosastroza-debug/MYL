import React, { useState, useMemo } from 'react';
import { CardData, CardType, CardRace } from '../types/card';
import { MythosCard } from './MythosCard';
import {
  analyzeCardAbility,
  getAll236CardsAnalysis,
  getCardAnalysisByNumber,
  simulateAbilityExecution,
  computeSetAbilityStats,
  CardAbilityAnalysis,
  SimulationResult,
  TimingCategory,
  EFFECT_TAGS,
} from '../services/cardAbilityAnalyzer';
import { CANONICAL_CARDS } from '../data/canonicalCards';
import { soundFx } from '../utils/soundFx';

interface AbilityAnalyzerViewProps {
  cards?: CardData[];
  initialCardNumber?: number;
  onAddToDeck?: (card: CardData) => void;
  onGoToDuel?: () => void;
  onGoToDeckBuilder?: () => void;
}

export const AbilityAnalyzerView: React.FC<AbilityAnalyzerViewProps> = ({
  cards = CANONICAL_CARDS,
  initialCardNumber = 1,
  onAddToDeck,
  onGoToDuel,
  onGoToDeckBuilder,
}) => {
  const [selectedCardNumber, setSelectedCardNumber] = useState<number>(initialCardNumber);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedTimingFilter, setSelectedTimingFilter] = useState<string>('ALL');
  const [selectedEffectFilter, setSelectedEffectFilter] = useState<string>('ALL');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Pre-calculated stats of all 236 cards
  const stats = useMemo(() => computeSetAbilityStats(), []);

  // Full set analysis
  const allAnalysis = useMemo(() => getAll236CardsAnalysis(), []);

  // Filtered cards list
  const filteredAnalysis = useMemo(() => {
    return allAnalysis.filter((item) => {
      // Type filter
      if (selectedTypeFilter !== 'ALL' && item.cardType !== selectedTypeFilter) {
        return false;
      }
      // Timing filter
      if (selectedTimingFilter !== 'ALL' && item.timingCategory !== selectedTimingFilter) {
        return false;
      }
      // Effect tag filter
      if (
        selectedEffectFilter !== 'ALL' &&
        !item.effectTags.some((t) => t.id === selectedEffectFilter)
      ) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const numMatch = query.replace('#', '');
        const matchesNumber = item.cardNumber.toString() === numMatch;
        const matchesName = item.cardName.toLowerCase().includes(query);
        const matchesRace = item.race.toLowerCase().includes(query);
        const matchesAbility = item.rawAbility.toLowerCase().includes(query);
        const matchesRole = item.combatRole.toLowerCase().includes(query);
        if (!matchesNumber && !matchesName && !matchesRace && !matchesAbility && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [allAnalysis, selectedTypeFilter, selectedTimingFilter, selectedEffectFilter, searchTerm]);

  // Current selected card analysis
  const currentAnalysis = useMemo(() => {
    return getCardAnalysisByNumber(selectedCardNumber) || allAnalysis[0];
  }, [selectedCardNumber, allAnalysis]);

  // Current card data for 3D renderer
  const currentCardData = useMemo(() => {
    return (
      cards.find((c) => c.number === currentAnalysis.cardNumber) ||
      CANONICAL_CARDS.find((c) => c.number === currentAnalysis.cardNumber) ||
      CANONICAL_CARDS[0]
    );
  }, [cards, currentAnalysis]);

  // Navigate to previous/next card in whole set
  const handleSelectPrevious = () => {
    soundFx.playCardFlick();
    setSimulationResult(null);
    const newNum = selectedCardNumber <= 1 ? 236 : selectedCardNumber - 1;
    setSelectedCardNumber(newNum);
  };

  const handleSelectNext = () => {
    soundFx.playCardFlick();
    setSimulationResult(null);
    const newNum = selectedCardNumber >= 236 ? 1 : selectedCardNumber + 1;
    setSelectedCardNumber(newNum);
  };

  // Run interactive simulation
  const handleRunSimulation = () => {
    soundFx.playSummon();
    setIsSimulating(true);
    setTimeout(() => {
      const res = simulateAbilityExecution(currentCardData);
      setSimulationResult(res);
      setIsSimulating(false);
      if (res.resourceDelta.gold > 0) {
        soundFx.playGoldClink();
      }
    }, 350);
  };

  // Copy DAR ruling text
  const handleCopyAnalysis = () => {
    const textToCopy = `[MITOS Y LEYENDAS · ANÁLISIS D.A.R. 1.0]
Carta #${currentAnalysis.cardNumber}: ${currentAnalysis.cardName} (${currentAnalysis.cardType} · ${currentAnalysis.race})
Coste: ${currentAnalysis.cost} Oro | Fuerza: ${currentAnalysis.strength}
Texto Oficial: "${currentAnalysis.rawAbility}"
Timing D.A.R.: ${currentAnalysis.timingCategory} (${currentAnalysis.darRuleRef})
Costes de Activación: ${currentAnalysis.costAnalysis.summary}
Objetivos: ${currentAnalysis.targetAnalysis.targetType} (${currentAnalysis.targetAnalysis.targetOwner}) en ${currentAnalysis.targetAnalysis.targetZone}
Efectos Clasificados: ${currentAnalysis.effectTags.map((e) => e.label).join(', ')}

PROTOCOLO DE APLICACIÓN PASO A PASO:
${currentAnalysis.howToApplySteps.join('\n')}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 text-neutral-100 animate-in fade-in select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & SET METRICS BANNER                                        */}
      {/* ========================================================================= */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-neutral-900 to-neutral-900 border border-amber-600/40 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-cinzel text-amber-500 font-bold uppercase tracking-wider mb-1">
            <span>Motor Oficial de Análisis D.A.R. 1.0</span>
            <span>·</span>
            <span>Espada Sagrada (Primer Bloque)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-cinzel font-black text-amber-100 flex items-center gap-2">
            <span>🧠</span> Motor de Habilidades (236 Cartas)
          </h1>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Análisis semántico individual de las 236 cartas del set oficial: timing de activación, desglose de costes, designación de objetivos, protocolo de aplicación y simulador en vivo.
          </p>
        </div>

        {/* Global Statistics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="px-3 py-2 rounded-xl bg-neutral-950/90 border border-amber-500/40">
            <span className="block font-mono font-bold text-amber-300 text-sm">236</span>
            <span className="text-[10px] text-neutral-400 font-cinzel">Total Cartas</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-neutral-950/90 border border-emerald-500/40">
            <span className="block font-mono font-bold text-emerald-300 text-sm">{stats.withAbility}</span>
            <span className="text-[10px] text-neutral-400 font-cinzel">Con Habilidad</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-neutral-950/90 border border-blue-500/40">
            <span className="block font-mono font-bold text-blue-300 text-sm">{stats.vanilla}</span>
            <span className="text-[10px] text-neutral-400 font-cinzel">Oros/Vanilla</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-neutral-950/90 border border-purple-500/40">
            <span className="block font-mono font-bold text-purple-300 text-sm">100%</span>
            <span className="text-[10px] text-neutral-400 font-cinzel">Auditadas DAR</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH, FILTERS & CAROUSEL BAR                                         */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 mb-6 flex flex-col gap-3 shadow-lg">
        {/* Search Bar + Quick Number Jump */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, número (#1 a #236), raza o palabra clave (ej. 'oro', 'roba', 'destruye', 'baraja', 'imbloqueable')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-amber-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-500 font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
            <label className="text-xs text-neutral-400 font-cinzel whitespace-nowrap">Ir a Carta #:</label>
            <input
              type="number"
              min="1"
              max="236"
              value={selectedCardNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= 236) {
                  setSelectedCardNumber(val);
                  setSimulationResult(null);
                }
              }}
              className="w-16 px-2 py-1.5 rounded-lg bg-neutral-950 border border-amber-600/60 text-amber-200 font-mono font-bold text-center text-xs focus:outline-none"
            />
            <span className="text-xs text-neutral-500">/ 236</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-800 text-xs">
          {/* Type Filter */}
          <span className="text-neutral-400 font-cinzel text-[11px]">Tipo:</span>
          {['ALL', 'Aliado', 'Talismán', 'Tótem', 'Arma', 'Oro'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTypeFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-cinzel font-semibold transition-all cursor-pointer ${
                selectedTypeFilter === t
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t === 'ALL' ? 'Todos' : t}
            </button>
          ))}

          <span className="text-neutral-600">·</span>

          {/* Timing Filter */}
          <span className="text-neutral-400 font-cinzel text-[11px]">Timing:</span>
          {[
            'ALL',
            'Al Entrar',
            'Activada en Vigilia',
            'Guerra de Talismanes',
            'Aura Continua',
            'Respuesta / Disparada',
            'Pasiva de Portador',
          ].map((tm) => (
            <button
              key={tm}
              onClick={() => setSelectedTimingFilter(tm)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-cinzel font-semibold transition-all cursor-pointer ${
                selectedTimingFilter === tm
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tm === 'ALL' ? 'Cualquiera' : tm}
            </button>
          ))}

          <span className="text-neutral-600">·</span>

          {/* Effect Tag Filter */}
          <span className="text-neutral-400 font-cinzel text-[11px]">Efecto:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'GENERA_ORO', label: '🪙 Oro' },
            { id: 'ROBO_CARTAS', label: '🎴 Robo' },
            { id: 'BUSQUEDA_CASTILLO', label: '🔍 Tutor' },
            { id: 'DANO_CASTILLO', label: '💔 Daño' },
            { id: 'DESTRUCCION', label: '💥 Destruir' },
            { id: 'DESTIERRO', label: '🌌 Desterrar' },
            { id: 'AURA_CONTINUA', label: '✨ Auras' },
          ].map((ef) => (
            <button
              key={ef.id}
              onClick={() => setSelectedEffectFilter(ef.id)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-cinzel font-semibold transition-all cursor-pointer ${
                selectedEffectFilter === ef.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {ef.label}
            </button>
          ))}
        </div>

        {/* Carousel / Quick Card Selector Strip */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
          <button
            onClick={handleSelectPrevious}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-cinzel font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>◀</span> Anterior
          </button>

          {/* Cards Strip */}
          <div className="flex-1 overflow-x-auto flex items-center gap-1.5 py-1 px-1 scrollbar-thin">
            {filteredAnalysis.slice(0, 30).map((item) => {
              const isSelected = item.cardNumber === selectedCardNumber;
              return (
                <button
                  key={item.cardNumber}
                  onClick={() => {
                    soundFx.playCardFlick();
                    setSelectedCardNumber(item.cardNumber);
                    setSimulationResult(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition-all cursor-pointer flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-amber-600 text-white font-bold border-amber-400 shadow-md scale-105'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-amber-600/40 hover:text-amber-200'
                  }`}
                  title={`${item.cardName} (${item.cardType})`}
                >
                  <span className="font-bold">#{item.cardNumber}</span>
                  <span className="truncate max-w-[80px] font-cinzel">{item.cardName}</span>
                </button>
              );
            })}
            {filteredAnalysis.length > 30 && (
              <span className="text-[10px] text-neutral-500 italic pl-1 shrink-0">
                +{filteredAnalysis.length - 30} más en filtro
              </span>
            )}
          </div>

          <button
            onClick={handleSelectNext}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-cinzel font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            Siguiente <span>▶</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN INDIVIDUAL CARD ANALYSIS DISPLAY                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 1 (3 Cols): 3D CARD RENDER & ACTION BUTTONS                      */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-4 flex flex-col items-center gap-4">
          <div className="relative group p-2 rounded-2xl bg-gradient-to-b from-neutral-900 to-black border-2 border-amber-600/40 shadow-2xl">
            <div className="transform hover:scale-102 transition-transform duration-300">
              <MythosCard card={currentCardData} size="lg" interactive={true} />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs px-2 text-neutral-400 font-cinzel">
              <span>#{currentAnalysis.cardNumber} de 236</span>
              <span className="text-amber-400 font-bold">{currentAnalysis.race}</span>
              <span>Edición I</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="w-full flex flex-col gap-2">
            {onAddToDeck && (
              <button
                onClick={() => {
                  soundFx.playCardFlick();
                  onAddToDeck(currentCardData);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-cinzel font-bold shadow-lg shadow-amber-950 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>➕</span> Agregar al Mazo Activo
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyAnalysis}
                className="py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-cinzel font-semibold border border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Copiar informe técnico para árbitros o jugadores"
              >
                <span>📋</span> {copiedNotification ? '¡Copiado!' : 'Copiar Dictamen'}
              </button>

              {onGoToDuel && (
                <button
                  onClick={onGoToDuel}
                  className="py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-cinzel font-semibold border border-amber-600/40 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>⚔️</span> Ir a la Arena
                </button>
              )}
            </div>

            {onGoToDeckBuilder && (
              <button
                onClick={onGoToDeckBuilder}
                className="py-1.5 text-center text-xs text-neutral-400 hover:text-amber-300 transition-colors font-cinzel"
              >
                ← Volver al Constructor de Mazos
              </button>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 2 (5 Cols): TECHNICAL PROFILE & DAR PROTOCOL                     */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card Title Card */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold text-xs">
                  #{currentAnalysis.cardNumber}
                </span>
                <span className="text-xs font-cinzel text-neutral-400 uppercase">
                  {currentAnalysis.cardType} {currentAnalysis.race !== 'Sin Raza' ? `· ${currentAnalysis.race}` : ''}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-cinzel font-bold border ${currentAnalysis.timingBadgeColor}`}>
                ⏱️ {currentAnalysis.timingCategory}
              </span>
            </div>

            <h2 className="text-2xl font-cinzel font-black text-amber-100 tracking-wide">
              {currentAnalysis.cardName}
            </h2>

            {/* Combat stats row */}
            <div className="flex items-center gap-3 text-xs mt-2 font-mono flex-wrap">
              <span className="text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60">
                🪙 Coste: {currentAnalysis.cost}
              </span>
              {currentAnalysis.cardType === 'Aliado' && (
                <span className="text-blue-300 font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/60">
                  🛡️ Fuerza: {currentAnalysis.strength}
                </span>
              )}
              <span className="text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 font-cinzel text-[11px]">
                Rol: <strong className="text-amber-200">{currentAnalysis.combatRole}</strong>
              </span>
            </div>
          </div>

          {/* Original Card Ability Quote Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-neutral-950 to-neutral-950 border-l-4 border-amber-500 shadow-lg">
            <span className="text-[10px] uppercase font-cinzel text-amber-500 font-bold tracking-wider block mb-1">
              📜 Texto Original Impreso en la Carta:
            </span>
            <p className="text-sm font-serif italic text-amber-100/90 leading-relaxed font-medium">
              "{currentAnalysis.rawAbility}"
            </p>
          </div>

          {/* Structured DAR Specification Matrix */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
            <h3 className="text-xs font-cinzel font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-2">
              <span>⚙️</span> Matriz de Activación & Reglas D.A.R. 1.0
            </h3>

            {/* Timing & DAR Ref */}
            <div className="text-xs">
              <span className="text-neutral-400 font-cinzel block text-[11px]">Ventana de Timing & Regla:</span>
              <div className="mt-0.5 p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-start gap-2">
                <span className="text-amber-400 text-sm">⏱️</span>
                <div>
                  <strong className="text-amber-200 font-cinzel">{currentAnalysis.darRuleRef}</strong>
                  <p className="text-[11px] text-neutral-300 mt-0.5">
                    {currentAnalysis.triggerConditionDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Costs */}
            <div className="text-xs">
              <span className="text-neutral-400 font-cinzel block text-[11px]">Costes de Activación:</span>
              <div className="mt-0.5 p-2 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-neutral-200 text-xs">
                {currentAnalysis.costAnalysis.summary}
              </div>
            </div>

            {/* Targeting & Zone Restrictions */}
            <div className="text-xs">
              <span className="text-neutral-400 font-cinzel block text-[11px]">Objetivos y Ámbito:</span>
              <div className="mt-0.5 p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-wrap gap-2 text-[11px]">
                <span className="text-neutral-300">
                  Tipo: <strong className="text-amber-300">{currentAnalysis.targetAnalysis.targetType}</strong>
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-300">
                  Controlador: <strong className="text-amber-300">{currentAnalysis.targetAnalysis.targetOwner}</strong>
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-300">
                  Zona: <strong className="text-amber-300">{currentAnalysis.targetAnalysis.targetZone}</strong>
                </span>
              </div>
            </div>

            {/* Classified Effects Tags */}
            <div className="text-xs">
              <span className="text-neutral-400 font-cinzel block text-[11px] mb-1">Efectos Clasificados:</span>
              {currentAnalysis.effectTags.length === 0 ? (
                <span className="text-neutral-500 italic text-[11px]">Sin efectos especiales (Combatiente puro)</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {currentAnalysis.effectTags.map((tag) => (
                    <span
                      key={tag.id}
                      className={`px-2 py-0.5 rounded text-[10px] font-cinzel font-bold border flex items-center gap-1 ${tag.color}`}
                      title={tag.description}
                    >
                      <span>{tag.icon}</span> {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sequential Step-by-Step DAR Protocol */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-2.5">
            <h3 className="text-xs font-cinzel font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-2">
              <span>📜</span> Protocolo Oficial de Aplicación Paso a Paso (Árbitros / Jugadores)
            </h3>
            <div className="space-y-2 text-xs text-neutral-300 leading-relaxed font-sans">
              {currentAnalysis.howToApplySteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-neutral-950/80 border border-neutral-800/80 flex items-start gap-2"
                >
                  <span className="font-mono font-bold text-amber-400 text-xs shrink-0">
                    {idx + 1}.
                  </span>
                  <p className="text-[11px] text-neutral-300 leading-normal">
                    {step.replace(/^\d+\.\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 3 (3 Cols): INTERACTIVE LIVE SIMULATOR                           */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-600/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div>
                <span className="text-[10px] font-cinzel text-amber-500 font-bold uppercase tracking-wider block">
                  Entorno de Pruebas
                </span>
                <h3 className="text-sm font-cinzel font-bold text-amber-100 flex items-center gap-1.5">
                  <span>▶️</span> Simulador en Vivo
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                DAR Sandbox
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Prueba cómo interactúa y modifica los recursos del duelo la habilidad de <strong>"{currentAnalysis.cardName}"</strong> en un tablero simulado.
            </p>

            {/* Run Button */}
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-cinzel font-bold text-xs shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSimulating ? '⏳' : '⚡'}</span>
              <span>{isSimulating ? 'Simulando...' : 'Ejecutar Simulación en Tablero'}</span>
            </button>

            {/* Simulation Results Display */}
            {simulationResult && (
              <div className="space-y-3 pt-2 border-t border-neutral-800 animate-in fade-in">
                {/* Resource Delta Chips */}
                <div className="text-[11px] font-cinzel font-bold text-amber-400">
                  Impacto en Recursos:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div
                    className={`p-2 rounded-lg border text-center ${
                      simulationResult.resourceDelta.gold > 0
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                        : simulationResult.resourceDelta.gold < 0
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block text-[10px] font-cinzel">Oro Reserva</span>
                    <strong className="text-sm">
                      {simulationResult.resourceDelta.gold > 0 ? `+${simulationResult.resourceDelta.gold}` : simulationResult.resourceDelta.gold} 🪙
                    </strong>
                  </div>

                  <div
                    className={`p-2 rounded-lg border text-center ${
                      simulationResult.resourceDelta.hand > 0
                        ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                        : simulationResult.resourceDelta.hand < 0
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block text-[10px] font-cinzel">Cartas Mano</span>
                    <strong className="text-sm">
                      {simulationResult.resourceDelta.hand > 0 ? `+${simulationResult.resourceDelta.hand}` : simulationResult.resourceDelta.hand} 🎴
                    </strong>
                  </div>

                  <div
                    className={`p-2 rounded-lg border text-center ${
                      simulationResult.resourceDelta.opponentCastleDamage > 0
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block text-[10px] font-cinzel">Daño Rival</span>
                    <strong className="text-sm">
                      {simulationResult.resourceDelta.opponentCastleDamage > 0
                        ? `-${simulationResult.resourceDelta.opponentCastleDamage}`
                        : '0'} 💔
                    </strong>
                  </div>

                  <div
                    className={`p-2 rounded-lg border text-center ${
                      simulationResult.resourceDelta.opponentDefenseLost > 0
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="block text-[10px] font-cinzel">Aliados Rival</span>
                    <strong className="text-sm">
                      {simulationResult.resourceDelta.opponentDefenseLost > 0
                        ? `-${simulationResult.resourceDelta.opponentDefenseLost}`
                        : '0'} 🛡️
                    </strong>
                  </div>
                </div>

                {/* Console Log Outputs */}
                <div>
                  <span className="text-[10px] font-cinzel text-neutral-400 block mb-1">
                    Registro de Eventos Oficial:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-xl bg-black border border-neutral-800 font-mono text-[10px] text-neutral-300">
                    {simulationResult.detailedLog.map((logLine, idx) => (
                      <div key={idx} className="leading-tight">
                        {logLine}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSimulationResult(null)}
                  className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-cinzel transition-colors cursor-pointer"
                >
                  Reiniciar Simulador
                </button>
              </div>
            )}
          </div>

          {/* Tactical Advice Meta Card */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl text-xs space-y-2">
            <h4 className="font-cinzel font-bold text-amber-300 flex items-center gap-1.5">
              <span>🎯</span> Valoración Táctica Metagame
            </h4>
            <p className="text-neutral-300 text-[11px] leading-relaxed">
              {currentAnalysis.metaSummary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
