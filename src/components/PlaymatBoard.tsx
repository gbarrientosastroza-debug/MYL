import React from 'react';
import { CardData, TurnPhase, PlayerState, AllyInPlay, SupportInPlay } from '../types/card';
import { MythosCard } from './MythosCard';
import {
  checkWeaponBearerEligibility,
  hasActivatedInPlayAbility,
  getMaxActivationsPerTurn,
  allyCannotAttack,
} from '../services/abilityEngine';

export interface PlaymatBoardProps {
  owner: 'player' | 'cpu';
  state: PlayerState;
  isPlayer: boolean;
  activePlayer: 'player' | 'cpu';
  phase: TurnPhase;
  deckName: string;
  isDualView: boolean;
  selectedAttackerIds: string[];
  blockAssignments: Record<string, string>;
  abilitiesUsedThisTurn: Record<string, number>;
  assigningWeaponCard: CardData | null;
  talismansPriority?: 'defender' | 'attacker';
  playerOroJugadoEsteTurno?: boolean;
  rotated180?: boolean;
  onOpenCardDetail: (
    card: CardData,
    sourceZone: string,
    canPlay?: boolean,
    playLabel?: string,
    attachedWeapons?: CardData[],
    effectiveStrength?: number,
    canActivate?: boolean,
    activateLabel?: string,
    isExhausted?: boolean,
    cannotPlayReason?: string,
    instanceId?: string,
    allyInstanceId?: string
  ) => void;
  onOpenGraveyard: (title: string, cards: CardData[]) => void;
  onOpenBanish: (title: string, cards: CardData[]) => void;
  onActivateAbility: (card: CardData, instanceId: string, allyInstanceId?: string) => void;
  onAssignWeaponTarget?: (allyInstanceId: string) => void;
  onToggleAttacker?: (instanceId: string) => void;
  onAssignBlocker?: (attackerInstanceId: string, blockerInstanceId: string) => void;
  onChangeCpuDeckClick?: () => void;
  onOpenFieldInspector?: () => void;
}

export const PlaymatBoard: React.FC<PlaymatBoardProps> = ({
  owner,
  state,
  isPlayer,
  activePlayer,
  phase,
  deckName,
  isDualView,
  selectedAttackerIds,
  blockAssignments,
  abilitiesUsedThisTurn,
  assigningWeaponCard,
  talismansPriority = 'defender',
  playerOroJugadoEsteTurno = false,
  rotated180,
  onOpenCardDetail,
  onOpenGraveyard,
  onOpenBanish,
  onActivateAbility,
  onAssignWeaponTarget,
  onToggleAttacker,
  onAssignBlocker,
  onChangeCpuDeckClick,
  onOpenFieldInspector,
}) => {
  const isCpu = owner === 'cpu';
  // Rival mat starts rotated 180 degrees by default for authentic face-to-face tabletop immersion
  const [isRotated180, setIsRotated180] = React.useState<boolean>(rotated180 ?? isCpu);
  // Default cardsUpright to true so rival cards and text remain readable while board is rotated 180°
  const [cardsUpright, setCardsUpright] = React.useState<boolean>(true);

  // Generous zone height with plenty of vertical headroom so complete cards, activation buttons, and weapons are never cut off
  const zoneHeight = isDualView
    ? 'min-h-[290px] sm:min-h-[315px] md:min-h-[335px]'
    : 'min-h-[305px] sm:min-h-[330px] md:min-h-[350px]';

  // Orientation class for elements inside rotated rival playmat
  const counterRotateClass = isCpu && isRotated180 && cardsUpright ? 'transform rotate-180' : '';
  const cardOrientationClass = counterRotateClass;

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all p-2.5 sm:p-3.5 mb-2 ${
        isCpu
          ? 'bg-gradient-to-b from-[#180808]/90 via-[#0e0404]/90 to-black/90 border-red-900/60 shadow-[0_0_30px_rgba(185,28,28,0.15)]'
          : 'bg-gradient-to-b from-[#181105]/90 via-[#0e0a02]/90 to-black/90 border-amber-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
      }`}
    >
      {/* Board Header Bar */}
      <div
        className={`px-3 py-1.5 rounded-xl border mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md ${
          isCpu
            ? 'bg-red-950/40 border-red-800/40 text-red-200'
            : 'bg-amber-950/40 border-amber-800/40 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-cinzel font-bold text-sm flex items-center gap-1.5">
            <span>{isCpu ? '👹' : '🛡️'}</span>
            <span className={isCpu ? 'text-red-300' : 'text-amber-300'}>
              {isCpu ? 'Tapete Rival (CPU)' : 'Tu Tapete (Jugador)'}
            </span>
          </span>

          <span className="text-neutral-500">·</span>

          <div className="flex items-center gap-1 text-[11px] font-cinzel">
            <span className="text-neutral-400">Mazo:</span>
            <strong className={`font-semibold ${isCpu ? 'text-red-200' : 'text-amber-200'}`}>
              {deckName}
            </strong>
          </div>

          <span className="text-neutral-500">·</span>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <span>🏰 Castillo:</span>
            <strong className="font-mono text-amber-400 font-bold">{state.castillo.length}</strong> / 50
          </div>

          <span className="text-neutral-500">·</span>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <span>🎴 Mano:</span>
            <strong className="font-mono text-amber-300 font-bold">{state.mano.length}</strong>
          </div>

          <span className="text-neutral-500">·</span>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <span>🪙 Oro:</span>
            <strong className="font-mono text-amber-400 font-bold">{state.reservaOro}</strong>
            <span className="text-[10px] text-neutral-400">(Pag: {state.oroPagado.length})</span>
          </div>

          <span className="text-neutral-500">·</span>

          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <span>🛡️ Defensores:</span>
            <strong className={`font-mono font-bold ${isCpu ? 'text-red-400' : 'text-emerald-400'}`}>
              {state.lineaDefensa.length}
            </strong>
          </div>

          {state.lineaAtaque.length > 0 && (
            <>
              <span className="text-neutral-500">·</span>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold animate-pulse">
                <span>⚔️ Atacando:</span>
                <strong className="font-mono">{state.lineaAtaque.length}</strong>
              </div>
            </>
          )}
        </div>

        {/* Actions on board: Field review & CPU controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenFieldInspector && (
            <button
              onClick={onOpenFieldInspector}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-cinzel font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                isCpu
                  ? 'bg-red-950/80 hover:bg-red-900 text-amber-200 border-red-700/60 shadow-xs'
                  : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-600/60 shadow-xs'
              }`}
              title={`Revisar cartas en juego y equipamientos de ${isCpu ? 'Rival' : 'Jugador'}`}
            >
              <span>🔍</span>
              <span>Revisar Campo</span>
            </button>
          )}

          {isCpu && (
            <>
              <button
                onClick={() => setIsRotated180(!isRotated180)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-cinzel font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  isRotated180
                    ? 'bg-red-900/90 hover:bg-red-800 text-amber-200 border-amber-500/60 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                }`}
                title="Girar tapete rival 180° para simular la vista real de mesa frente a frente"
              >
                <span>🔄</span>
                <span>{isRotated180 ? 'Tapete Rival: 180° (Mesa Real)' : 'Tapete Rival: 0° (Normal)'}</span>
              </button>

              {isRotated180 && (
                <button
                  onClick={() => setCardsUpright(!cardsUpright)}
                  className="px-2 py-1 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 text-[10.5px] font-cinzel border border-neutral-700 transition-colors cursor-pointer"
                  title="Alternar entre cartas invertidas (mesa real) o cartas al derecho (legibles)"
                >
                  <span>🔤</span> {cardsUpright ? 'Cartas: Al Derecho' : 'Cartas: 180°'}
                </button>
              )}

              {onChangeCpuDeckClick && (
                <button
                  onClick={onChangeCpuDeckClick}
                  className="px-2.5 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 text-white text-[11px] font-cinzel font-bold shadow-xs border border-red-700/60 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Asignar o cambiar el mazo del Bot Rival"
                >
                  <span>🤖</span> Mazo Rival
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hand display for CPU: Face-down card backs representing hidden hand */}
      {isCpu && (
        <div
          className={`w-full py-1.5 px-3 rounded-xl bg-black/70 border border-neutral-800/90 flex items-center justify-between gap-2 text-xs shadow-inner ${
            isRotated180 ? 'transform rotate-180' : ''
          }`}
        >
          <div className="flex items-center gap-2 font-cinzel text-neutral-300">
            <span className="text-red-400 font-bold">🎴 Mano Oculta del Rival:</span>
            <strong className="text-amber-400 font-mono font-bold">{state.mano.length} cartas</strong>
            <span className="text-[10px] text-neutral-500 hidden sm:inline">(Límite DAR 5.5: 8 cartas)</span>
          </div>
          <div className="flex items-center -space-x-3 hover:space-x-1 transition-all overflow-x-auto py-0.5">
            {state.mano.map((_, idx) => (
              <div
                key={idx}
                className="w-7 h-10 sm:w-8 sm:h-11 rounded-[3px] shadow-md border border-neutral-700 bg-neutral-900 overflow-hidden shrink-0 transition-transform hover:-translate-y-1"
                title={`Carta en mano del rival #${idx + 1}`}
              >
                <img
                  src="/card-back.png"
                  alt="Dorso Mitos y Leyendas"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {state.mano.length === 0 && (
              <span className="text-[10px] text-neutral-500 italic">Mano vacía</span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9-ZONE PLAYMAT GRID (Supports 180° tabletop perspective)                  */}
      {/* 3 Columns: [ Col 1: Perm, Cem, Dest ] [ Col 2: Pag, Cast, Res ] [ Col 3: Atk, Def, Apoyo ] */}
      {/* ========================================================================= */}
      <div
        className={`w-full grid grid-cols-12 gap-2 sm:gap-2.5 md:gap-3 items-stretch transition-transform duration-500 origin-center ${
          isRotated180 ? 'transform rotate-180' : ''
        }`}
      >
        {/* =================================================================== */}
        {/* COLUMN 1 (Left): EFECTOS PERMANENTES | CEMENTERIO | DESTIERRO        */}
        {/* =================================================================== */}
        <div className="col-span-3 sm:col-span-2 md:col-span-2 flex flex-col gap-2 sm:gap-2.5">
          {/* ZONE 1 (Top-Left): EFECTOS PERMANENTES */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 bg-gradient-to-b from-[#092b2d] via-[#051c1d] to-[#041213] overflow-hidden shadow-xl flex flex-col justify-between p-2 group hover:border-amber-400 transition-colors`}
            title="Zona de Efectos Permanentes (DAR 4.3)"
          >
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_#0d9488_0%,_transparent_70%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/20 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[8px] sm:text-[9px] md:text-[10px] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                EFECTOS PERMANENTES
              </span>
            </div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${counterRotateClass}`}>
              <div className="flex items-center justify-between text-[9px] font-cinzel text-teal-300 font-bold">
                <span>Auras</span>
                <span>{state.efectosPermanentes.length}</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center overflow-hidden py-0.5 gap-1">
                {state.efectosPermanentes.map((eff, i) => (
                  <div
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-500/60 text-[8px] font-cinzel text-teal-200 text-center shadow-xs truncate max-w-full"
                    title={eff}
                  >
                    ✨ {eff}
                  </div>
                ))}
              </div>

              <div className="text-[7.5px] text-neutral-400 text-center truncate">
                Permanente
              </div>
            </div>
          </div>

          {/* ZONE 2 (Middle-Left): CEMENTERIO */}
          <div
            onClick={() => {
              if (state.cementerio.length > 0) {
                onOpenGraveyard(`Cementerio (${state.name})`, state.cementerio);
              }
            }}
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 bg-gradient-to-b from-[#2d0909] via-[#1c0505] to-[#120404] overflow-hidden shadow-xl flex flex-col justify-between p-2 cursor-pointer group hover:border-red-400 transition-colors`}
            title="Cementerio (DAR 4.3.7) - Clic para ver todas las cartas"
          >
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_#991b1b_0%,_transparent_75%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/20 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[8px] sm:text-[9px] md:text-[10px] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                CEMENTERIO
              </span>
            </div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${counterRotateClass}`}>
              <div className="flex items-center justify-between text-[9px] font-cinzel text-red-300 font-bold">
                <span>💀 Cementerio</span>
                <span className="font-mono text-white bg-red-950/80 px-1 rounded">
                  {state.cementerio.length}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center py-1">
                {state.cementerio.length > 0 ? (
                  <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-[4px] overflow-hidden shadow-lg border border-red-500/50">
                    <img
                      src={state.cementerio[state.cementerio.length - 1].imageUrl || '/card-back.png'}
                      alt="Tope de Cementerio"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[6.5px] text-center font-cinzel text-neutral-200 truncate px-0.5">
                      {state.cementerio[state.cementerio.length - 1].name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-neutral-500 italic">Vacío</span>
                )}
              </div>

              <span className="text-[7.5px] text-neutral-400 text-center">
                {state.cementerio.length > 0 ? 'Examinar 🔍' : 'DAR 4.3.7'}
              </span>
            </div>
          </div>

          {/* ZONE 3 (Bottom-Left): DESTIERRO */}
          <div
            onClick={() => {
              if (state.destierro.length > 0) {
                onOpenBanish(`Zona de Destierro (${state.name})`, state.destierro);
              }
            }}
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 bg-gradient-to-b from-[#111827] via-[#090d16] to-[#030712] overflow-hidden shadow-xl flex flex-col justify-between p-2 cursor-pointer group hover:border-indigo-400 transition-colors`}
            title="Zona de Destierro (DAR 4.3.8) - Cartas retiradas del juego"
          >
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_#3b82f6_0%,_transparent_75%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/20 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[8px] sm:text-[9px] md:text-[10px] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                DESTIERRO
              </span>
            </div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${counterRotateClass}`}>
              <div className="flex items-center justify-between text-[9px] font-cinzel text-indigo-300 font-bold">
                <span>✝️ Destierro</span>
                <span className="font-mono text-white bg-indigo-950/80 px-1 rounded">
                  {state.destierro.length}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center py-1">
                {state.destierro.length > 0 ? (
                  <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-[4px] overflow-hidden shadow-lg border border-indigo-500/50">
                    <img
                      src={state.destierro[state.destierro.length - 1].imageUrl || '/card-back.png'}
                      alt="Desterrada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <span className="text-[9px] text-neutral-500 italic">0 Cartas</span>
                )}
              </div>

              <span className="text-[7.5px] text-neutral-400 text-center">
                DAR 4.3.8
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* COLUMN 2 (Middle-Left): ORO PAGADO | MAZO CASTILLO | RESERVA DE ORO  */}
        {/* =================================================================== */}
        <div className="col-span-3 sm:col-span-2 md:col-span-2 flex flex-col gap-2 sm:gap-2.5">
          {/* ZONE 4 (Top-Middle): ORO PAGADO */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 bg-gradient-to-b from-[#2e1d09] via-[#1a1105] to-[#0f0a03] overflow-hidden shadow-xl flex flex-col justify-between p-2 group hover:border-amber-400 transition-colors`}
            title="Zona de Oro Pagado (DAR 4.3.3) - Se reactiva en Agrupación"
          >
            <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_top,_#b45309_0%,_transparent_75%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/20 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[8px] sm:text-[9px] md:text-[10px] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                ORO PAGADO
              </span>
            </div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${counterRotateClass}`}>
              <div className="flex items-center justify-between text-[9px] font-cinzel text-amber-300 font-bold">
                <span>🪙 Oro Pagado</span>
                <span className="font-mono text-amber-400 font-bold bg-black/80 px-1 rounded">
                  {state.oroPagado.length}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center py-1">
                {state.oroPagado.length > 0 ? (
                  <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-[4px] overflow-hidden shadow-lg border border-amber-600/60 bg-black">
                    <img
                      src={state.oroPagado[state.oroPagado.length - 1].imageUrl || '/cards/236.png'}
                      alt="Oro Pagado"
                      className="w-full h-full object-cover grayscale opacity-75"
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-cinzel font-bold text-xs text-amber-200 drop-shadow">
                      🪙 {state.oroPagado.length}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-neutral-500 italic">0 Pagado</span>
                )}
              </div>

              <span className="text-[7.5px] text-neutral-400 text-center">
                DAR 4.3.3
              </span>
            </div>
          </div>

          {/* ZONE 5 (Middle-Middle): MAZO CASTILLO */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 bg-gradient-to-b from-[#3a2007] via-[#211204] to-[#120a02] overflow-hidden shadow-xl flex flex-col justify-between p-2 group hover:border-amber-400 transition-colors`}
            title="Mazo Castillo (DAR 4.3.1) - Representa tu vida en el juego"
          >
            <div className="absolute inset-0 opacity-45 bg-[radial-gradient(circle_at_center,_#ea580c_0%,_transparent_75%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/20 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[8px] sm:text-[9px] md:text-[10px] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                MAZO CASTILLO
              </span>
            </div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${counterRotateClass}`}>
              <div className="flex items-center justify-between text-[9px] font-cinzel text-amber-300 font-bold">
                <span>🏰 Mazo Castillo</span>
                <span className="font-mono text-white bg-black/80 px-1 rounded">
                  {state.castillo.length} / 50
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center py-1">
                {state.castillo.length > 0 ? (
                  <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-[4px] overflow-hidden shadow-2xl border-2 border-amber-600/70 transform hover:scale-105 transition-transform">
                    <img
                      src="/card-back.png"
                      alt="Mazo Castillo"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 inset-x-1 py-0.5 rounded bg-black/85 text-amber-300 font-mono text-[8.5px] font-bold text-center">
                      {state.castillo.length} cartas
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-red-500 font-bold animate-pulse">
                    ¡CASTILLO VACÍO!
                  </span>
                )}
              </div>

              <div className="text-[7.5px] text-center text-amber-400 font-mono">
                {state.castillo.length} / 50 Vida
              </div>
            </div>
          </div>

          {/* ZONE 6 (Bottom-Middle): RESERVA DE ORO */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 bg-gradient-to-b from-[#2e1d09] via-[#1a1105] to-[#0f0a03] overflow-hidden shadow-xl flex flex-col justify-between p-2 group hover:border-amber-400 transition-colors`}
            title="Reserva de Oro (DAR 4.3.2) - Oro disponible para pagar costes"
          >
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_bottom,_#f59e0b_0%,_transparent_75%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/20 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[8px] sm:text-[9px] md:text-[10px] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                RESERVA DE ORO
              </span>
            </div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${counterRotateClass}`}>
              <div className="flex items-center justify-between text-[9px] font-cinzel text-amber-300 font-bold">
                <span>🪙 Oro Activo</span>
                <span className="font-mono text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50">
                  {state.reservaOro} 🪙
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center py-1">
                {state.oroCards.length > 0 ? (
                  <div className="flex items-center -space-x-3 hover:space-x-1 transition-all">
                    {state.oroCards.slice(0, 5).map((oro, i) => {
                      const isCodex = oro.name.toUpperCase().includes('CODEX');
                      const isCodexCombatPhase =
                        isPlayer &&
                        (phase === 'ASIGNACION_DANO' ||
                          phase === 'DECLARACION_ATAQUE' ||
                          phase === 'DECLARACION_BLOQUEO' ||
                          phase === 'GUERRA_TALISMANES') &&
                        isCodex;
                      const hasAbility =
                        isCodexCombatPhase ||
                        (isPlayer &&
                          activePlayer === 'player' &&
                          phase === 'VIGILIA' &&
                          hasActivatedInPlayAbility(oro));
                      const currentUses = abilitiesUsedThisTurn[oro.id] || 0;
                      const maxUses = getMaxActivationsPerTurn(oro);
                      const isExhausted = currentUses >= maxUses;

                      return (
                        <div
                          key={`${oro.id}-${i}`}
                          onClick={() =>
                            onOpenCardDetail(
                              oro,
                              'Reserva de Oro',
                              false,
                              undefined,
                              undefined,
                              undefined,
                              hasAbility,
                              isCodexCombatPhase ? '🌌 Destierra (Daño 0)' : '⚡ Activar Oro',
                              isExhausted,
                              undefined,
                              oro.id
                            )
                          }
                          className="relative group w-10 h-14 sm:w-11 sm:h-16 rounded-[3px] overflow-visible shadow-md border border-amber-400/80 bg-black cursor-pointer transform hover:-translate-y-1 transition-transform"
                          title={`${oro.name} - Clic para ver detalle`}
                        >
                          <img
                            src={oro.imageUrl || '/cards/236.png'}
                            alt={oro.name}
                            className="w-full h-full object-cover rounded-[3px]"
                          />
                          {/* Inspect Eye Badge on Gold */}
                          <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            👁️
                          </div>

                          {hasAbility && (
                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap">
                              {isCodexCombatPhase ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onActivateAbility(oro, oro.id);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[7.5px] font-cinzel font-bold shadow-lg border border-amber-300 animate-bounce cursor-pointer"
                                  title="Destierra Codex Artúricos para reducir todo el daño a 0"
                                >
                                  🌌 Destierra (Daño 0)
                                </button>
                              ) : !isExhausted ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onActivateAbility(oro, oro.id);
                                  }}
                                  className="px-1 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[7px] font-cinzel font-bold shadow-lg border border-amber-300 animate-pulse cursor-pointer"
                                  title={`Activar habilidad de ${oro.name}`}
                                >
                                  ⚡ Activar
                                </button>
                              ) : (
                                <span className="px-1 py-0.5 rounded bg-neutral-900/90 text-neutral-400 text-[6.5px] font-cinzel border border-neutral-700">
                                  ✓ Usada
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {state.oroCards.length > 5 && (
                      <span className="text-[9px] font-bold text-amber-400 pl-3">
                        +{state.oroCards.length - 5}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[9px] text-neutral-500 italic">Sin Oro</span>
                )}
              </div>

              {isPlayer && activePlayer === 'player' && phase === 'VIGILIA' && !playerOroJugadoEsteTurno ? (
                <span className="text-[7.5px] text-emerald-400 text-center font-bold animate-pulse">
                  ✨ Puedes bajar 1 Oro
                </span>
              ) : (
                <span className="text-[7.5px] text-neutral-400 text-center">
                  DAR 4.3.2
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* COLUMN 3 (Right, Wide Area): LINEA DE ATAQUE | DEFENSA | APOYO      */}
        {/* =================================================================== */}
        <div className="col-span-6 sm:col-span-8 md:col-span-8 flex flex-col gap-2 sm:gap-2.5">
          {/* ZONE 7 (Row 1, Right): LINEA DE ATAQUE */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 shadow-xl flex flex-col justify-between p-2 sm:p-2.5 group hover:border-amber-400 transition-colors bg-black/60`}
            title="Línea de Ataque (DAR 4.3.5) - Aliados atacantes en combate"
          >
            {/* Authentic Fiery Sun Warrior Artwork Background */}
            <div className="absolute inset-0 z-0 rounded-xl overflow-hidden">
              <img
                src="/src/assets/images/zone_ataque_bg_1791114626382.jpg"
                alt="Línea de Ataque"
                className="w-full h-full object-cover opacity-45 select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" />
            </div>

            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/25 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[10px] sm:text-xs md:text-sm uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                LINEA DE ATAQUE
              </span>
            </div>

            {/* Header inside Attack Zone */}
            <div className={`relative z-10 flex items-center justify-between text-[11px] font-cinzel text-amber-300 font-bold ${counterRotateClass}`}>
              <div className="flex items-center gap-1.5">
                <span>⚔️ Atacantes (DAR 4.3.5)</span>
                {phase === 'GUERRA_TALISMANES' && (
                  <span className="text-[9px] text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500 font-sans">
                    Prioridad: {talismansPriority === 'defender' ? 'Defensor' : 'Atacante'}
                  </span>
                )}
              </div>
              <span className="font-mono text-amber-400 text-[10px]">
                {state.lineaAtaque.length} Atacando
              </span>
            </div>

            {/* Cards in Attack Line - with unclipped vertical space */}
            <div className="relative z-10 flex-1 flex items-start gap-3.5 overflow-x-auto py-2.5 px-1 min-h-[220px]">
              {state.lineaAtaque.length === 0 ? (
                <div className={`w-full text-center text-[11px] text-neutral-400 italic py-8 ${counterRotateClass}`}>
                  {phase === 'DECLARACION_ATAQUE' && isPlayer
                    ? '👉 Selecciona Aliados abajo en tu Línea de Defensa y pulsa "Confirmar Ataque".'
                    : 'Sin Aliados en Línea de Ataque.'}
                </div>
              ) : (
                state.lineaAtaque.map((atk) => {
                  const blockerId = blockAssignments[atk.instanceId];
                  return (
                    <div
                      key={atk.instanceId}
                      className={`relative shrink-0 flex flex-col items-center gap-1 animate-in zoom-in-95 group/atkCard ${cardOrientationClass}`}
                    >
                      {/* Combat State Badge */}
                      {phase === 'DECLARACION_ATAQUE' || phase === 'DECLARACION_BLOQUEO' || phase === 'GUERRA_TALISMANES' || phase === 'ASIGNACION_DANO' ? (
                        blockerId ? (
                          <span className="text-[8px] px-2 py-0.5 rounded bg-indigo-900/90 text-indigo-200 border border-indigo-500 font-cinzel font-bold shadow-xs">
                            🛡️ Bloqueado
                          </span>
                        ) : (
                          <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-900/90 text-emerald-200 border border-emerald-500 font-cinzel font-bold shadow-xs animate-pulse">
                            ⚡ Daño Directo
                          </span>
                        )
                      ) : (
                        <span className="text-[8px] px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-600/60 font-cinzel font-bold shadow-xs">
                          ⚔️ En Ataque (Reagrupa en tu Agrupación)
                        </span>
                      )}

                      <div
                        className="relative cursor-pointer transition-transform hover:scale-102"
                        onClick={() =>
                          onOpenCardDetail(
                            atk.card,
                            'Línea de Ataque',
                            false,
                            undefined,
                            atk.attachedWeapons,
                            atk.currentStrength
                          )
                        }
                        title="Clic para inspeccionar carta en detalle 3D"
                      >
                        <MythosCard card={atk.card} size="xs" interactive={false} />

                        <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 z-10">
                          <div className="px-1.5 py-0.5 rounded bg-black/90 text-[10px] font-cinzel font-bold text-red-400 border border-red-500/60 shadow">
                            🛡️ {atk.currentStrength}
                          </div>
                        </div>

                        {/* Dedicated Corner Inspect Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCardDetail(
                              atk.card,
                              'Línea de Ataque',
                              false,
                              undefined,
                              atk.attachedWeapons,
                              atk.currentStrength
                            );
                          }}
                          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/90 hover:bg-amber-600 text-white text-[10px] flex items-center justify-center border border-amber-500/60 shadow-md z-20 cursor-pointer transition-transform hover:scale-110"
                          title="Inspeccionar carta en detalle 3D"
                        >
                          👁️
                        </button>
                      </div>

                      {/* Display attached weapons with click-to-inspect */}
                      {atk.attachedWeapons && atk.attachedWeapons.length > 0 && (
                        <div className="w-full flex flex-col items-center gap-1 mt-1 p-1 rounded-lg bg-amber-950/70 border border-amber-600/50">
                          <div className="flex items-center justify-between w-full px-1 text-[7.5px] font-cinzel font-bold text-amber-300">
                            <span>🗡️ Armas ({atk.attachedWeapons.length})</span>
                            <span className="text-[7px] text-emerald-400 font-mono">
                              +{atk.attachedWeapons.reduce((sum, w) => sum + (w.strength || 0), 0)} F
                            </span>
                          </div>
                          <div className="flex flex-col items-stretch gap-1 w-full max-w-[130px]">
                            {atk.attachedWeapons.map((w, wIdx) => (
                              <button
                                key={wIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCardDetail(w, `Arma Equipada a ${atk.card.name}`);
                                }}
                                className="w-full px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-amber-200 border border-amber-500/70 text-[8px] font-mono flex items-center justify-between gap-1 shadow-xs cursor-pointer transition-all hover:scale-102"
                                title={`Examinar arma ${w.name}: +${w.strength} F. ${w.ability}`}
                              >
                                <span className="truncate max-w-[65px] font-semibold">🗡️ {w.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {w.strength > 0 && <span className="text-emerald-400 font-bold">+{w.strength}</span>}
                                  <span className="text-[8.5px] text-amber-300">👁️</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[7.5px] text-neutral-400 text-right">
              DAR 4.3.5
            </div>
          </div>

          {/* ZONE 8 (Row 2, Right): LINEA DE DEFENSA */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 shadow-xl flex flex-col justify-between p-2 sm:p-2.5 group hover:border-amber-400 transition-colors bg-black/60`}
            title="Línea de Defensa (DAR 4.3.4) - Aliados que protegen tu Mazo Castillo"
          >
            {/* Authentic Celtic Standing Stones Artwork Background */}
            <div className="absolute inset-0 z-0 rounded-xl overflow-hidden">
              <img
                src="/src/assets/images/zone_defensa_bg_1791114643725.jpg"
                alt="Línea de Defensa"
                className="w-full h-full object-cover opacity-45 select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" />
            </div>

            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/25 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[10px] sm:text-xs md:text-sm uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                LINEA DE DEFENSA
              </span>
            </div>

            {/* Header inside Defense Zone */}
            <div className={`relative z-10 flex items-center justify-between text-[11px] font-cinzel text-amber-300 font-bold ${counterRotateClass}`}>
              <span>🛡️ Defensores (DAR 4.3.4)</span>
              <span className="font-mono text-amber-400 text-[10px]">
                {state.lineaDefensa.length} Aliados
              </span>
            </div>

            {/* Cards in Defense Line - unclipped track */}
            <div className="relative z-10 flex-1 flex items-start gap-3.5 overflow-x-auto py-2.5 px-1 min-h-[220px]">
              {state.lineaDefensa.length === 0 ? (
                <div className={`w-full text-center text-[11px] text-neutral-400 italic py-8 ${counterRotateClass}`}>
                  {isPlayer
                    ? 'Invoca Aliados aquí desde tu mano pagando su coste en Oro.'
                    : 'La CPU no tiene defensores en mesa actualmente.'}
                </div>
              ) : (
                state.lineaDefensa.map((ally) => {
                  const isAttackingSelected = selectedAttackerIds.includes(ally.instanceId);
                  const isWeaponTargetMode = Boolean(assigningWeaponCard && isPlayer);
                  const weaponCheck = assigningWeaponCard
                    ? checkWeaponBearerEligibility(assigningWeaponCard, ally)
                    : { allowed: false, bonusStrength: 0, traits: {} };
                  const isEligibleWeaponTarget = isWeaponTargetMode && weaponCheck.allowed;
                  const allyHasAbility =
                    isPlayer &&
                    activePlayer === 'player' &&
                    phase === 'VIGILIA' &&
                    hasActivatedInPlayAbility(ally.card);
                  const allyUsed = abilitiesUsedThisTurn[ally.instanceId] || 0;
                  const allyMax = getMaxActivationsPerTurn(ally.card);
                  const allyExhausted = allyUsed >= allyMax;

                  return (
                    <div
                      key={ally.instanceId}
                      onClick={() => {
                        if (isWeaponTargetMode) {
                          if (isEligibleWeaponTarget && onAssignWeaponTarget) {
                            onAssignWeaponTarget(ally.instanceId);
                          }
                          return;
                        }

                        if (phase === 'DECLARACION_ATAQUE' && isPlayer && ally.canAttack && onToggleAttacker) {
                          onToggleAttacker(ally.instanceId);
                          return;
                        }

                        // Direct click to inspect in normal play or for CPU cards
                        onOpenCardDetail(
                          ally.card,
                          'Línea de Defensa',
                          false,
                          undefined,
                          ally.attachedWeapons,
                          ally.currentStrength,
                          allyHasAbility,
                          '⚡ Activar Habilidad',
                          allyExhausted,
                          undefined,
                          ally.instanceId
                        );
                      }}
                      className={`relative shrink-0 flex flex-col items-center gap-1.5 animate-in zoom-in-95 group/defAlly transition-all ${cardOrientationClass} ${
                        isWeaponTargetMode
                          ? isEligibleWeaponTarget
                            ? 'ring-4 ring-emerald-500 rounded-lg scale-105 cursor-pointer animate-pulse'
                            : 'opacity-40 grayscale cursor-not-allowed'
                          : phase === 'DECLARACION_ATAQUE' && isPlayer
                          ? ally.canAttack && !allyCannotAttack(ally.card, state)
                            ? isAttackingSelected
                              ? 'ring-4 ring-amber-500 rounded-lg scale-105 cursor-pointer'
                              : 'hover:ring-2 hover:ring-amber-400/80 rounded-lg cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:scale-102'
                      }`}
                    >
                      {/* Weapon Targeting Badge */}
                      {isWeaponTargetMode && isEligibleWeaponTarget && (
                        <span className="text-[7.5px] px-2 py-0.5 rounded bg-emerald-600 text-white font-cinzel font-bold shadow-md animate-bounce">
                          ✓ Equipar Aquí
                        </span>
                      )}

                      {/* Declaration checkbox badge */}
                      {phase === 'DECLARACION_ATAQUE' && isPlayer && ally.canAttack && !allyCannotAttack(ally.card, state) && (
                        <div
                          className={`text-[8px] px-2 py-0.5 rounded font-cinzel font-bold flex items-center gap-1 shadow-md ${
                            isAttackingSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-neutral-900/90 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          <span>{isAttackingSelected ? '✓' : '○'}</span>
                          <span>{isAttackingSelected ? 'Atacando' : 'Atacar'}</span>
                        </div>
                      )}

                      {/* Explicit Defender-Only indicator in Attack Declaration */}
                      {phase === 'DECLARACION_ATAQUE' && isPlayer && allyCannotAttack(ally.card, state) && (
                        <div className="text-[7.5px] px-2 py-0.5 rounded font-cinzel font-bold bg-neutral-900/90 text-rose-300 border border-rose-900/60 shadow-md">
                          <span>🛡️ Sólo Defiende</span>
                        </div>
                      )}

                      <div className="relative">
                        <MythosCard card={ally.card} size="xs" interactive={false} />

                        {/* Red Shield Strength Badge */}
                        <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5 z-10">
                          <div
                            className={`px-1.5 py-0.5 rounded text-[10px] font-cinzel font-bold border shadow ${
                              (ally.permanentStrengthBonus || 0) > 0 || (ally.turnStrengthBonus || 0) > 0
                                ? 'bg-amber-950/95 text-amber-200 border-amber-400'
                                : 'bg-black/90 text-red-400 border-red-500/60'
                            }`}
                            title={`Fuerza: ${ally.currentStrength} (Base: ${ally.baseStrength}${
                              (ally.permanentStrengthBonus || 0) > 0
                                ? ` + ${ally.permanentStrengthBonus} F permanente`
                                : ''
                            }${
                              (ally.turnStrengthBonus || 0) > 0
                                ? ` + ${ally.turnStrengthBonus} F temporal este turno`
                                : ''
                            })`}
                          >
                            🛡️ {ally.currentStrength}
                            {((ally.permanentStrengthBonus || 0) > 0 || (ally.turnStrengthBonus || 0) > 0) && (
                              <span className="text-[7.5px] text-emerald-300 ml-0.5 font-mono">
                                +{(ally.permanentStrengthBonus || 0) + (ally.turnStrengthBonus || 0)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct Corner Inspect Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCardDetail(
                              ally.card,
                              'Línea de Defensa',
                              false,
                              undefined,
                              ally.attachedWeapons,
                              ally.currentStrength,
                              allyHasAbility,
                              '⚡ Activar Habilidad',
                              allyExhausted,
                              undefined,
                              ally.instanceId
                            );
                          }}
                          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/90 hover:bg-amber-600 text-white text-[10px] flex items-center justify-center border border-amber-500/60 shadow-md z-20 cursor-pointer transition-transform hover:scale-110"
                          title="Inspeccionar carta en detalle 3D"
                        >
                          👁️
                        </button>

                        {ally.cannotDefend ? (
                          <span className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded bg-purple-950/95 text-[7px] text-purple-200 font-cinzel font-bold text-center truncate border border-purple-500 shadow-xs animate-pulse">
                            🚫 No Puede Bloquear
                          </span>
                        ) : allyCannotAttack(ally.card, state) ? (
                          <span className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded bg-rose-950/90 text-[7px] text-rose-300 font-cinzel font-bold text-center truncate border border-rose-600/70 shadow-xs">
                            🛡️ Sólo Defiende
                          </span>
                        ) : !ally.canAttack && isPlayer ? (
                          <span className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded bg-black/90 text-[7px] text-neutral-300 text-center truncate border border-neutral-700">
                            ⏳ Entró este turno
                          </span>
                        ) : ally.canAttack && isPlayer && phase !== 'DECLARACION_ATAQUE' ? (
                          <span className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded bg-emerald-950/90 text-[7px] text-emerald-300 font-cinzel font-bold text-center truncate border border-emerald-600/70 shadow-xs">
                            ⚡ Puede Atacar
                          </span>
                        ) : null}
                      </div>

                      {/* Prominent In-play manual ability activator during Vigilia */}
                      {isPlayer && activePlayer === 'player' && phase === 'VIGILIA' && (
                        <div className="w-full flex items-center justify-center gap-1 z-20 mt-1">
                          {hasActivatedInPlayAbility(ally.card) && (() => {
                            const usedCount = abilitiesUsedThisTurn[ally.instanceId] || 0;
                            const maxUses = getMaxActivationsPerTurn(ally.card);
                            const isExhausted = usedCount >= maxUses;

                            return (
                              <button
                                disabled={isExhausted}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isExhausted) {
                                    onActivateAbility(ally.card, ally.instanceId);
                                  }
                                }}
                                className={`w-full py-1.5 px-2 rounded-md font-cinzel font-black text-[9px] shadow-lg flex items-center justify-center gap-1 transition-all ${
                                  isExhausted
                                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-600 opacity-60 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white border border-amber-300 shadow-amber-950 animate-pulse cursor-pointer'
                                }`}
                                title={
                                  isExhausted
                                    ? `Habilidad ya utilizada: ${ally.card.ability}`
                                    : `Activar: ${ally.card.ability}`
                                }
                              >
                                <span>{isExhausted ? '✓' : '⚡'}</span>
                                <span>{isExhausted ? 'Usada' : 'Activar Habilidad'}</span>
                              </button>
                            );
                          })()}
                        </div>
                      )}

                      {/* Display attached weapons with click-to-inspect */}
                      {ally.attachedWeapons && ally.attachedWeapons.length > 0 && (
                        <div className="w-full flex flex-col items-center gap-1 mt-1 p-1 rounded-lg bg-amber-950/70 border border-amber-600/50">
                          <div className="flex items-center justify-between w-full px-1 text-[7.5px] font-cinzel font-bold text-amber-300">
                            <span>🗡️ Armas ({ally.attachedWeapons.length})</span>
                            <span className="text-[7px] text-emerald-400 font-mono">
                              +{ally.attachedWeapons.reduce((sum, w) => sum + (w.strength || 0), 0)} F
                            </span>
                          </div>
                          <div className="flex flex-col items-stretch gap-1 w-full max-w-[130px]">
                            {ally.attachedWeapons.map((w, wIdx) => {
                              const wpnKey = `${ally.instanceId}-wpn-${wIdx}`;
                              const wpnUsed = abilitiesUsedThisTurn[wpnKey] || 0;
                              const wpnMax = getMaxActivationsPerTurn(w);
                              const wpnExhausted = wpnUsed >= wpnMax;

                              return (
                                <div key={wIdx} className="flex items-center gap-1 w-full">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenCardDetail(w, `Arma Equipada a ${ally.card.name}`);
                                    }}
                                    className="flex-1 px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-amber-200 border border-amber-500/70 text-[8px] font-mono flex items-center justify-between gap-1 shadow-xs cursor-pointer transition-all hover:scale-102"
                                    title={`Examinar arma ${w.name}: +${w.strength} F. ${w.ability}`}
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <span>🗡️</span>
                                      <span className="truncate max-w-[65px] font-semibold">{w.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {w.strength > 0 && <span className="text-emerald-400 font-bold">+{w.strength}</span>}
                                      <span className="text-[8.5px] text-amber-300">👁️</span>
                                    </div>
                                  </button>

                                  {isPlayer && activePlayer === 'player' && phase === 'VIGILIA' && hasActivatedInPlayAbility(w) && (
                                    <button
                                      disabled={wpnExhausted}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!wpnExhausted) {
                                          onActivateAbility(w, wpnKey, ally.instanceId);
                                        }
                                      }}
                                      className={`text-[8px] px-1.5 py-0.5 rounded font-cinzel font-bold shadow-xs transition-all ${
                                        wpnExhausted
                                          ? 'bg-neutral-800 text-neutral-400 border border-neutral-600 opacity-60 cursor-not-allowed'
                                          : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-sm animate-pulse'
                                      }`}
                                      title={`Activar habilidad de arma ${w.name}`}
                                    >
                                      ⚡
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[7.5px] text-neutral-400 text-right">
              DAR 4.3.4
            </div>
          </div>

          {/* ZONE 9 (Row 3, Right): LINEA DE APOYO */}
          <div
            className={`relative ${zoneHeight} rounded-xl border-2 border-dashed border-white/60 overflow-hidden shadow-xl flex flex-col justify-between p-2 sm:p-2.5 group hover:border-amber-400 transition-colors`}
            title="Línea de Apoyo (DAR 4.3.6) - Tótems y Armas de soporte permanente"
          >
            {/* Authentic Ancient Celtic Stone Relief Artwork Background */}
            <div className="absolute inset-0 z-0">
              <img
                src="/src/assets/images/zone_apoyo_bg_1791114658197.jpg"
                alt="Línea de Apoyo"
                className="w-full h-full object-cover opacity-45 select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/80" />
            </div>

            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 py-1 bg-black/80 border-y border-white/25 text-center pointer-events-none ${counterRotateClass}`}>
              <span className="font-cinzel font-bold text-white tracking-widest text-[10px] sm:text-xs md:text-sm uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                LINEA DE APOYO
              </span>
            </div>

            {/* Header inside Support Zone */}
            <div className={`relative z-10 flex items-center justify-between text-[11px] font-cinzel text-teal-300 font-bold ${counterRotateClass}`}>
              <span>🗿 Tótems & Soporte (DAR 4.3.6)</span>
              <span className="font-mono text-teal-400 text-[10px]">
                {state.lineaApoyo.length} Cartas
              </span>
            </div>

            {/* Cards in Support Line */}
            <div className="relative z-10 flex-1 flex items-start gap-3.5 overflow-x-auto py-2.5 px-1 min-h-[220px]">
              {state.lineaApoyo.length === 0 ? (
                <div className={`w-full text-center text-[11px] text-neutral-400 italic py-8 ${counterRotateClass}`}>
                  {isPlayer
                    ? 'Los Tótems y Armas que van directo a apoyo permanecen aquí (DAR 4.2.4).'
                    : 'Sin Tótems ni soporte en mesa.'}
                </div>
              ) : (
                state.lineaApoyo.map((sup) => {
                  const hasAbility =
                    isPlayer &&
                    activePlayer === 'player' &&
                    phase === 'VIGILIA' &&
                    hasActivatedInPlayAbility(sup.card);
                  const supUsed = abilitiesUsedThisTurn[sup.instanceId] || 0;
                  const supMax = getMaxActivationsPerTurn(sup.card);
                  const supExhausted = supUsed >= supMax;

                  return (
                    <div
                      key={sup.instanceId}
                      className={`relative shrink-0 flex flex-col items-center animate-in zoom-in-95 group/supCard ${cardOrientationClass}`}
                    >
                      <div
                        className="relative cursor-pointer"
                        onClick={() =>
                          onOpenCardDetail(
                            sup.card,
                            'Línea de Apoyo',
                            false,
                            undefined,
                            undefined,
                            undefined,
                            hasAbility,
                            '⚡ Activar Tótem',
                            supExhausted,
                            undefined,
                            sup.instanceId
                          )
                        }
                      >
                        <MythosCard card={sup.card} size="xs" interactive={false} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCardDetail(
                              sup.card,
                              'Línea de Apoyo',
                              false,
                              undefined,
                              undefined,
                              undefined,
                              hasAbility,
                              '⚡ Activar Tótem',
                              supExhausted,
                              undefined,
                              sup.instanceId
                            );
                          }}
                          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/90 hover:bg-amber-600 text-white text-[10px] flex items-center justify-center border border-amber-500/60 shadow-md z-10 cursor-pointer"
                          title="Ver detalle 3D"
                        >
                          👁️
                        </button>
                      </div>

                      {/* Tótem Manual Activator Button */}
                      {hasAbility && (
                        <button
                          disabled={supExhausted}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!supExhausted) {
                              onActivateAbility(sup.card, sup.instanceId);
                            }
                          }}
                          className={`w-full text-[8.5px] px-2 py-1 rounded font-cinzel font-bold shadow-md flex items-center justify-center gap-1 z-20 mt-1 transition-all ${
                            supExhausted
                              ? 'bg-neutral-800 text-neutral-400 border border-neutral-600 opacity-60 cursor-not-allowed'
                              : 'bg-teal-700 hover:bg-teal-600 text-teal-100 border border-teal-400 animate-pulse cursor-pointer'
                          }`}
                          title={
                            supExhausted
                              ? `Habilidad ya utilizada: ${sup.card.ability}`
                              : `Activar: ${sup.card.ability}`
                          }
                        >
                          <span>{supExhausted ? '✓' : '⚡'}</span>
                          <span>{supExhausted ? 'Usada' : 'Activar'}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-[7.5px] text-neutral-400 text-right">
              DAR 4.3.6
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
