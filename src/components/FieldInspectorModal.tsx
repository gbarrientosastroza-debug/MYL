import React, { useState } from 'react';
import { CardData, TurnPhase, PlayerState, AllyInPlay, SupportInPlay } from '../types/card';
import { MythosCard } from './MythosCard';
import { soundFx } from '../utils/soundFx';
import { hasActivatedInPlayAbility, getMaxActivationsPerTurn } from '../services/abilityEngine';
import { parseCardAbilityParts } from '../services/cardAbilityAnalyzer';

export interface FieldInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  cpuState: PlayerState;
  playerDeckName: string;
  cpuDeckName: string;
  activePlayer: 'player' | 'cpu';
  phase: TurnPhase;
  abilitiesUsedThisTurn: Record<string, number>;
  onInspectCard: (
    card: CardData,
    sourceZone: string,
    canPlay?: boolean,
    playLabel?: string,
    attachedWeapons?: CardData[],
    effectiveStrength?: number
  ) => void;
  onActivateAbility?: (card: CardData, instanceId: string, allyInstanceId?: string) => void;
}

type TabType = 'all' | 'player' | 'cpu' | 'weapons' | 'totems' | 'gold';

interface InPlayItem {
  id: string;
  card: CardData;
  owner: 'player' | 'cpu';
  ownerName: string;
  zone: string;
  isAlly: boolean;
  allyData?: AllyInPlay;
  attachedWeapons?: CardData[];
  effectiveStrength?: number;
  isAttacking?: boolean;
  hasAbility?: boolean;
  isAbilityExhausted?: boolean;
  canActivateNow?: boolean;
  instanceId: string;
}

export const FieldInspectorModal: React.FC<FieldInspectorModalProps> = ({
  isOpen,
  onClose,
  playerState,
  cpuState,
  playerDeckName,
  cpuDeckName,
  activePlayer,
  phase,
  abilitiesUsedThisTurn,
  onInspectCard,
  onActivateAbility,
}) => {
  const [selectedTab, setSelectedTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  // Build collection of all in-play items across both sides of the table
  const items: InPlayItem[] = [];

  // 1. Player Attack Line
  playerState.lineaAtaque.forEach((atk) => {
    items.push({
      id: atk.instanceId,
      instanceId: atk.instanceId,
      card: atk.card,
      owner: 'player',
      ownerName: playerDeckName,
      zone: 'Línea de Ataque (Jugador)',
      isAlly: true,
      allyData: atk,
      attachedWeapons: atk.attachedWeapons,
      effectiveStrength: atk.currentStrength,
      isAttacking: true,
      hasAbility: false,
    });
  });

  // 2. Player Defense Line
  playerState.lineaDefensa.forEach((def) => {
    const hasAb = hasActivatedInPlayAbility(def.card);
    const uses = abilitiesUsedThisTurn[def.instanceId] || 0;
    const maxUses = getMaxActivationsPerTurn(def.card);
    const exhausted = uses >= maxUses;
    const canAct =
      hasAb && !exhausted && activePlayer === 'player' && phase === 'VIGILIA';

    items.push({
      id: def.instanceId,
      instanceId: def.instanceId,
      card: def.card,
      owner: 'player',
      ownerName: playerDeckName,
      zone: 'Línea de Defensa (Jugador)',
      isAlly: true,
      allyData: def,
      attachedWeapons: def.attachedWeapons,
      effectiveStrength: def.currentStrength,
      hasAbility: hasAb,
      isAbilityExhausted: exhausted,
      canActivateNow: canAct,
    });
  });

  // 3. Player Support Line (Tótems / Weapons in support)
  playerState.lineaApoyo.forEach((sup) => {
    const hasAb = hasActivatedInPlayAbility(sup.card);
    const uses = abilitiesUsedThisTurn[sup.instanceId] || 0;
    const maxUses = getMaxActivationsPerTurn(sup.card);
    const exhausted = uses >= maxUses;
    const canAct =
      hasAb && !exhausted && activePlayer === 'player' && phase === 'VIGILIA';

    items.push({
      id: sup.instanceId,
      instanceId: sup.instanceId,
      card: sup.card,
      owner: 'player',
      ownerName: playerDeckName,
      zone: 'Línea de Apoyo (Jugador)',
      isAlly: false,
      hasAbility: hasAb,
      isAbilityExhausted: exhausted,
      canActivateNow: canAct,
    });
  });

  // 4. Player Gold Cards with abilities
  playerState.oroCards.forEach((oro, i) => {
    const hasAb = hasActivatedInPlayAbility(oro);
    const uses = abilitiesUsedThisTurn[oro.id] || 0;
    const maxUses = getMaxActivationsPerTurn(oro);
    const exhausted = uses >= maxUses;
    const canAct =
      hasAb && !exhausted && activePlayer === 'player' && phase === 'VIGILIA';

    items.push({
      id: `${oro.id}-${i}`,
      instanceId: oro.id,
      card: oro,
      owner: 'player',
      ownerName: playerDeckName,
      zone: 'Reserva de Oro (Jugador)',
      isAlly: false,
      hasAbility: hasAb,
      isAbilityExhausted: exhausted,
      canActivateNow: canAct,
    });
  });

  // 5. CPU Attack Line
  cpuState.lineaAtaque.forEach((atk) => {
    items.push({
      id: atk.instanceId,
      instanceId: atk.instanceId,
      card: atk.card,
      owner: 'cpu',
      ownerName: `Rival: ${cpuDeckName}`,
      zone: 'Línea de Ataque (Rival)',
      isAlly: true,
      allyData: atk,
      attachedWeapons: atk.attachedWeapons,
      effectiveStrength: atk.currentStrength,
      isAttacking: true,
      hasAbility: false,
    });
  });

  // 6. CPU Defense Line
  cpuState.lineaDefensa.forEach((def) => {
    items.push({
      id: def.instanceId,
      instanceId: def.instanceId,
      card: def.card,
      owner: 'cpu',
      ownerName: `Rival: ${cpuDeckName}`,
      zone: 'Línea de Defensa (Rival)',
      isAlly: true,
      allyData: def,
      attachedWeapons: def.attachedWeapons,
      effectiveStrength: def.currentStrength,
      hasAbility: hasActivatedInPlayAbility(def.card),
    });
  });

  // 7. CPU Support Line
  cpuState.lineaApoyo.forEach((sup) => {
    items.push({
      id: sup.instanceId,
      instanceId: sup.instanceId,
      card: sup.card,
      owner: 'cpu',
      ownerName: `Rival: ${cpuDeckName}`,
      zone: 'Línea de Apoyo (Rival)',
      isAlly: false,
      hasAbility: hasActivatedInPlayAbility(sup.card),
    });
  });

  // 8. CPU Gold Cards
  cpuState.oroCards.forEach((oro, i) => {
    items.push({
      id: `cpu-${oro.id}-${i}`,
      instanceId: oro.id,
      card: oro,
      owner: 'cpu',
      ownerName: `Rival: ${cpuDeckName}`,
      zone: 'Reserva de Oro (Rival)',
      isAlly: false,
      hasAbility: hasActivatedInPlayAbility(oro),
    });
  });

  // Filter items according to active tab
  let filtered = items;
  if (selectedTab === 'player') {
    filtered = items.filter((it) => it.owner === 'player');
  } else if (selectedTab === 'cpu') {
    filtered = items.filter((it) => it.owner === 'cpu');
  } else if (selectedTab === 'weapons') {
    filtered = items.filter(
      (it) => it.attachedWeapons && it.attachedWeapons.length > 0
    );
  } else if (selectedTab === 'totems') {
    filtered = items.filter((it) => it.zone.includes('Apoyo'));
  } else if (selectedTab === 'gold') {
    filtered = items.filter((it) => it.zone.includes('Oro'));
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (it) =>
        it.card.name.toLowerCase().includes(q) ||
        it.card.race.toLowerCase().includes(q) ||
        it.card.type.toLowerCase().includes(q) ||
        (it.card.ability && it.card.ability.toLowerCase().includes(q)) ||
        (it.attachedWeapons &&
          it.attachedWeapons.some((w) =>
            w.name.toLowerCase().includes(q) ||
            w.ability.toLowerCase().includes(q)
          ))
    );
  }

  // Total weapon count in play
  const totalEquippedWeapons = items.reduce(
    (acc, it) => acc + (it.attachedWeapons?.length || 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-neutral-900 border-2 border-amber-600/60 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col gap-4 text-neutral-100 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">🔍</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-cinzel text-amber-400 font-bold tracking-widest">
                  Inspector de Campo · D.A.R. 1.0
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold">
                  {items.length} en juego · {totalEquippedWeapons} armas
                </span>
              </div>
              <h3 className="font-cinzel font-bold text-amber-100 text-base sm:text-lg">
                Revisión de Cartas en Juego & Equipamientos
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playCardFlick();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm shadow-md"
            title="Cerrar inspector de campo"
          >
            ✕
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-cinzel">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'all'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              ⭐ Todos ({items.length})
            </button>
            <button
              onClick={() => setSelectedTab('player')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'player'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              🛡️ Tu Campo ({items.filter((it) => it.owner === 'player').length})
            </button>
            <button
              onClick={() => setSelectedTab('cpu')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'cpu'
                  ? 'bg-red-700 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              👹 Rival ({items.filter((it) => it.owner === 'cpu').length})
            </button>
            <button
              onClick={() => setSelectedTab('weapons')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'weapons'
                  ? 'bg-amber-700 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              🗡️ Con Armas ({items.filter((it) => it.attachedWeapons && it.attachedWeapons.length > 0).length})
            </button>
            <button
              onClick={() => setSelectedTab('totems')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'totems'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              🗿 Apoyo ({items.filter((it) => it.zone.includes('Apoyo')).length})
            </button>
            <button
              onClick={() => setSelectedTab('gold')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedTab === 'gold'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              🪙 Oros ({items.filter((it) => it.zone.includes('Oro')).length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, raza o habilidad..."
              className="w-full px-3 py-1.5 pr-8 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* In-Play Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[60vh]">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <span className="text-3xl block mb-2">🎴</span>
              <p className="font-cinzel text-sm">
                No hay cartas en juego que coincidan con el filtro actual.
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Invoca aliados o baja tótems y oros a la mesa para inspeccionarlos aquí.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isPlayerCard = item.owner === 'player';
              const baseStrength = item.card.strength || 0;
              const hasWeapons = item.attachedWeapons && item.attachedWeapons.length > 0;

              return (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isPlayerCard
                      ? 'bg-neutral-950/80 border-amber-900/50 hover:border-amber-600/70 shadow-md shadow-amber-950/20'
                      : 'bg-neutral-950/80 border-red-900/50 hover:border-red-600/70 shadow-md shadow-red-950/20'
                  }`}
                >
                  {/* Left: Card Thumbnail + Identity */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Compact Card Thumbnail with Click to Detail */}
                    <div
                      className="shrink-0 cursor-pointer transform hover:scale-105 transition-transform"
                      onClick={() => {
                        onInspectCard(
                          item.card,
                          item.zone,
                          false,
                          undefined,
                          item.attachedWeapons,
                          item.effectiveStrength
                        );
                      }}
                      title="Clic para ver carta en 3D"
                    >
                      <MythosCard card={item.card} size="xs" interactive={false} />
                    </div>

                    {/* Card Stats and Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-cinzel font-bold border ${
                            isPlayerCard
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                              : 'bg-red-950/80 text-red-300 border-red-600/50'
                          }`}
                        >
                          {isPlayerCard ? '🛡️ Jugador' : '👹 Rival (CPU)'}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-700 text-[9.5px] font-mono">
                          📍 {item.zone}
                        </span>

                        {item.isAttacking && (
                          <span className="px-2 py-0.5 rounded bg-red-600 text-white font-cinzel font-bold text-[9px] animate-pulse">
                            ⚔️ Atacando
                          </span>
                        )}
                      </div>

                      <h4 className="font-cinzel font-bold text-amber-100 text-sm sm:text-base flex items-center gap-2">
                        <span>{item.card.name}</span>
                        {item.card.cost !== undefined && (
                          <span className="text-[11px] font-mono text-amber-400 font-normal">
                            (Coste: {item.card.cost} 🪙)
                          </span>
                        )}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono flex-wrap">
                        <span>{item.card.type}</span>
                        {item.card.race && item.card.race !== 'Sin Raza' && (
                          <>
                            <span>·</span>
                            <span className="text-neutral-300">{item.card.race}</span>
                          </>
                        )}
                        {item.card.type === 'Aliado' && (
                          <>
                            <span>·</span>
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              🛡️ Fuerza: {item.effectiveStrength ?? baseStrength}
                              {hasWeapons && (item.effectiveStrength ?? baseStrength) > baseStrength && (
                                <span className="text-emerald-400 font-bold text-[10px]">
                                  (Base: {baseStrength} + Armas: {(item.effectiveStrength ?? baseStrength) - baseStrength})
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Card Ability Description with Multi-Part Breakdown */}
                      {(() => {
                        const parts = parseCardAbilityParts(item.card);
                        if (parts.length > 1) {
                          return (
                            <div className="space-y-1 mt-1 max-w-xl">
                              <span className="text-[10px] font-cinzel font-bold text-amber-400/90 flex items-center gap-1">
                                <span>🧩</span> Habilidad Dividida por Partes ({parts.length}):
                              </span>
                              {parts.map((p, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="p-1.5 rounded bg-neutral-900/90 border border-neutral-700/60 flex items-start gap-1.5"
                                >
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-cinzel font-bold border shrink-0 ${p.timingBadgeColor}`}
                                  >
                                    P{p.index + 1} · {p.timingCategory}
                                    {p.isOncePerTurn ? ' (1/Turno)' : ''}
                                  </span>
                                  <p className="text-[10.5px] text-neutral-300 leading-snug font-sans">
                                    {p.rawText}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <p className="text-xs text-neutral-300 leading-relaxed font-sans max-w-xl line-clamp-2">
                            {item.card.ability || 'Sin habilidad especial.'}
                          </p>
                        );
                      })()}

                      {/* Attached Weapons list (if any) */}
                      {hasWeapons && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 space-y-1.5 max-w-xl">
                          <div className="flex items-center justify-between text-[10.5px] font-cinzel font-bold text-amber-300">
                            <span className="flex items-center gap-1.5">
                              <span>🗡️</span> Armas Equipadas a este Aliado ({item.attachedWeapons!.length}):
                            </span>
                            <span className="text-[9px] text-neutral-400 font-mono">DAR 4.2.2</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.attachedWeapons!.map((w, wIdx) => (
                              <div
                                key={wIdx}
                                className="px-2 py-1 rounded bg-neutral-900 border border-amber-500/60 flex items-center gap-2 text-xs"
                              >
                                <span className="text-amber-200 font-cinzel font-bold text-[11px]">
                                  🗡️ {w.name}
                                </span>
                                {w.strength > 0 && (
                                  <span className="text-emerald-400 font-mono font-bold text-[10px] bg-emerald-950/80 px-1 rounded">
                                    +{w.strength} F
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    onInspectCard(
                                      w,
                                      `Arma Equipada a ${item.card.name}`,
                                      false
                                    );
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-[9px] cursor-pointer transition-colors shadow-xs"
                                  title={`Revisar arma ${w.name}`}
                                >
                                  👁️ Ver
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full md:w-auto shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    <button
                      onClick={() => {
                        onInspectCard(
                          item.card,
                          item.zone,
                          false,
                          undefined,
                          item.attachedWeapons,
                          item.effectiveStrength
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-cinzel font-bold text-xs border border-amber-500/40 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>👁️</span> Detalle 3D
                    </button>

                    {item.canActivateNow && onActivateAbility && (
                      <button
                        onClick={() => {
                          onActivateAbility(item.card, item.instanceId);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-black text-xs shadow-md border border-amber-300 animate-pulse flex items-center gap-1.5 cursor-pointer"
                        title="Activar habilidad en este turno"
                      >
                        <span>⚡</span> Activar Habilidad
                      </button>
                    )}

                    {item.hasAbility && item.isAbilityExhausted && (
                      <span className="px-2.5 py-1 rounded bg-neutral-900 text-neutral-400 border border-neutral-700 text-[10px] font-cinzel">
                        ✓ Habilidad Usada
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>
            💡 Haz clic en <strong>"Detalle 3D"</strong> o en cualquier miniatura para inspeccionar la carta y sus armas equipadas con vista holográfica.
          </span>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
