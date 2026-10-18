import React, { useState, useEffect } from 'react';
import { CardData } from '../types/card';
import { MythosCard } from './MythosCard';
import { soundFx } from '../utils/soundFx';
import {
  SavedDeck,
  loadAllSavedDecks,
  saveUserDeck,
  deleteUserDeck,
  duplicateUserDeck,
  buildPresetDeck,
  setActivePlayerDeck,
  setActiveCpuDeck,
  getActivePlayerDeck,
  getActiveCpuDeck,
} from '../utils/deckStorage';

interface DeckBuilderProps {
  deck: CardData[];
  deckName?: string;
  onUpdateDeck: (newDeck: CardData[], newName?: string, deckId?: string) => void;
  availableCards: CardData[];
  onStartDuel: () => void;
  cpuDeckName?: string;
  onAssignCpuDeck?: (deck: SavedDeck) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  deck,
  deckName = 'Mazo de Caballeros',
  onUpdateDeck,
  availableCards,
  onStartDuel,
  cpuDeckName = 'Dragones Sagrados',
  onAssignCpuDeck,
}) => {
  const [testHand, setTestHand] = useState<CardData[] | null>(null);
  const [builderNotice, setBuilderNotice] = useState<string | null>(null);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [showDecksModal, setShowDecksModal] = useState<boolean>(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState<boolean>(false);
  const [newDeckNameInput, setNewDeckNameInput] = useState<string>('');
  const [currentDeckId, setCurrentDeckId] = useState<string | undefined>(undefined);
  const [currentDeckTitle, setCurrentDeckTitle] = useState<string>(deckName);
  const [deckToDelete, setDeckToDelete] = useState<{ id: string; name: string } | null>(null);

  // Load saved decks from storage
  useEffect(() => {
    const list = loadAllSavedDecks();
    setSavedDecks(list);
    const activeP = getActivePlayerDeck();
    if (activeP) {
      setCurrentDeckId(activeP.id);
      setCurrentDeckTitle(activeP.name);
    }
  }, []);

  const refreshDecks = () => {
    const list = loadAllSavedDecks();
    setSavedDecks(list);
  };

  const showNotice = (msg: string) => {
    setBuilderNotice(msg);
    setTimeout(() => setBuilderNotice(null), 3500);
  };

  const cardCounts = deck.reduce<Record<string, number>>((acc, card) => {
    acc[card.name] = (acc[card.name] || 0) + 1;
    return acc;
  }, {});

  const addCard = (card: CardData) => {
    const currentCount = cardCounts[card.name] || 0;
    const maxAllowed = card.uniqueCard ? 1 : 3;

    if (currentCount >= maxAllowed) {
      showNotice(`No puedes incluir más de ${maxAllowed} copia(s) de "${card.name}".`);
      return;
    }

    if (deck.length >= 50) {
      showNotice('El mazo reglamentario no puede superar las 50 cartas (DAR 4.3.1).');
      return;
    }

    soundFx.playCardFlick();
    onUpdateDeck([...deck, { ...card, id: `${card.id}-${Date.now()}` }], currentDeckTitle, currentDeckId);
  };

  const removeCard = (cardName: string) => {
    const idx = deck.findIndex((c) => c.name === cardName);
    if (idx !== -1) {
      soundFx.playCardFlick();
      const nextDeck = [...deck];
      nextDeck.splice(idx, 1);
      onUpdateDeck(nextDeck, currentDeckTitle, currentDeckId);
    }
  };

  // Pre-constructed decks
  const loadPreset = (archetype: 'camelot' | 'dragons' | 'faerie' | 'control' | 'dar_balanced') => {
    soundFx.playSummon();
    const newCards = buildPresetDeck(archetype);
    let name = 'Mazo Oficial';
    let pId = 'preset-dar-balanced';
    if (archetype === 'camelot') {
      name = 'Caballeros de Camelot';
      pId = 'preset-camelot';
    } else if (archetype === 'dragons') {
      name = 'Dragones Sagrados';
      pId = 'preset-dragons';
    } else if (archetype === 'faerie') {
      name = 'Corte Faerie & Magia';
      pId = 'preset-faerie';
    } else if (archetype === 'control') {
      name = 'Control de Tótems & Destierro';
      pId = 'preset-control';
    }

    setCurrentDeckId(pId);
    setCurrentDeckTitle(name);
    onUpdateDeck(newCards, name, pId);
    showNotice(`¡Cargado "${name}" de 50 cartas reglamentarias D.A.R.!`);
  };

  // Save current deck
  const handleSaveCurrentDeck = () => {
    try {
      soundFx.playCardFlick();
      const saved = saveUserDeck(currentDeckTitle, deck, currentDeckId);
      setCurrentDeckId(saved.id);
      setCurrentDeckTitle(saved.name);
      setActivePlayerDeck(saved);
      refreshDecks();
      showNotice(`💾 ¡Mazo "${saved.name}" guardado exitosamente!`);
    } catch (err) {
      console.warn('Notice saving deck:', err);
      showNotice(`💾 Mazo "${currentDeckTitle}" guardado en memoria.`);
    }
  };

  // Save as new deck
  const handleConfirmSaveAs = () => {
    if (!newDeckNameInput.trim()) {
      showNotice('Debes ingresar un nombre para el nuevo mazo.');
      return;
    }
    try {
      soundFx.playSummon();
      const saved = saveUserDeck(newDeckNameInput.trim(), deck);
      setCurrentDeckId(saved.id);
      setCurrentDeckTitle(saved.name);
      setActivePlayerDeck(saved);
      setShowSaveAsModal(false);
      setNewDeckNameInput('');
      refreshDecks();
      showNotice(`✨ ¡Nuevo mazo "${saved.name}" creado y guardado!`);
    } catch (err) {
      console.warn('Notice creating deck:', err);
      showNotice(`✨ Mazo "${newDeckNameInput.trim()}" guardado.`);
      setShowSaveAsModal(false);
    }
  };

  // Load a deck from saved list
  const handleLoadSavedDeck = (saved: SavedDeck) => {
    soundFx.playSummon();
    setCurrentDeckId(saved.id);
    setCurrentDeckTitle(saved.name);
    setActivePlayerDeck(saved);
    onUpdateDeck(saved.cards, saved.name, saved.id);
    setShowDecksModal(false);
    showNotice(`📂 ¡Mazo "${saved.name}" cargado en el constructor!`);
  };

  // Assign deck to CPU rival
  const handleAssignToCpu = (saved: SavedDeck) => {
    soundFx.playCardFlick();
    setActiveCpuDeck(saved);
    if (onAssignCpuDeck) {
      onAssignCpuDeck(saved);
    }
    refreshDecks();
    showNotice(`🤖 Mazo "${saved.name}" asignado al Bot Rival (CPU).`);
  };

  // Duplicate a deck
  const handleDuplicateDeck = (id: string) => {
    try {
      const dup = duplicateUserDeck(id);
      if (dup) {
        refreshDecks();
        showNotice(`📄 ¡Copia de mazo "${dup.name}" creada!`);
      }
    } catch (err) {
      console.warn('Notice duplicating deck:', err);
    }
  };

  // Delete a deck
  const handleDeleteDeck = (id: string, name: string) => {
    setDeckToDelete({ id, name });
  };

  const handleConfirmDelete = () => {
    if (!deckToDelete) return;
    try {
      deleteUserDeck(deckToDelete.id);
      refreshDecks();
      showNotice(`🗑️ Mazo "${deckToDelete.name}" eliminado.`);
    } catch (err) {
      console.warn('Notice deleting deck:', err);
    }
    setDeckToDelete(null);
  };

  const drawTestHand = () => {
    if (deck.length < 8) {
      showNotice('Necesitas al menos 8 cartas en tu mazo para probar una mano inicial.');
      return;
    }
    soundFx.playCardFlick();
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setTestHand(shuffled.slice(0, 8));
  };

  // Stats calculation
  const knightCount = deck.filter((c) => c.race === 'Caballero').length;
  const dragonCount = deck.filter((c) => c.race === 'Dragón').length;
  const faerieCount = deck.filter((c) => c.race === 'Faerie').length;
  const totemCount = deck.filter((c) => c.type === 'Tótem').length;
  const talismanCount = deck.filter((c) => c.type === 'Talismán').length;
  const weaponCount = deck.filter((c) => c.type === 'Arma').length;
  const goldCount = deck.filter((c) => c.type === 'Oro').length;
  const avgCost = deck.length > 0 ? (deck.reduce((sum, c) => sum + c.cost, 0) / deck.length).toFixed(1) : '0';
  const avgStrength = deck.length > 0 ? (deck.reduce((sum, c) => sum + c.strength, 0) / deck.length).toFixed(1) : '0';

  // Group unique cards for deck display
  const uniqueDeckCards = Array.from(new Set(deck.map((c) => c.name))).map((name) => {
    return deck.find((c) => c.name === name)!;
  });

  const activeCpu = getActiveCpuDeck();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {builderNotice && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-950/90 border border-amber-500 text-amber-200 text-xs sm:text-sm flex items-center justify-between shadow-xl animate-in slide-in-from-top-1">
          <span>✨ {builderNotice}</span>
          <button onClick={() => setBuilderNotice(null)} className="text-amber-400 hover:text-white text-xs font-bold px-2 py-0.5">✕</button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-cinzel text-amber-500 font-bold uppercase tracking-wider mb-1">
            <span>Estrategia & Armado</span>
            <span>·</span>
            <span>Gestión de Mazos D.A.R. 1.0</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-cinzel font-bold text-amber-100 tracking-wide">
              {currentDeckTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-cinzel font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              🛡️ Tu Mazo Activo
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-2 font-medium flex-wrap">
            <span className={deck.length === 50 ? 'text-emerald-400 font-bold' : deck.length >= 30 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>
              {deck.length} cartas ({deck.length === 50 ? '✓ Reglamentario D.A.R. 50 cartas' : 'D.A.R. exige 50 cartas'})
            </span>
            <span aria-hidden="true">·</span>
            <span>Coste Prom: <strong className="text-amber-300 font-mono">{avgCost} 🪙</strong></span>
            <span aria-hidden="true">·</span>
            <span>Fuerza Prom: <strong className="text-red-400 font-mono">{avgStrength} 🛡️</strong></span>
            <span aria-hidden="true">·</span>
            <span>Aliados: {deck.filter(c => c.type === 'Aliado').length}</span>
            <span aria-hidden="true">·</span>
            <span>Oros: {goldCount}</span>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              refreshDecks();
              setShowDecksModal(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-cinzel font-bold border border-amber-600/40 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <span>📂</span> Mis Mazos ({savedDecks.length})
          </button>

          <button
            onClick={handleSaveCurrentDeck}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-xs font-cinzel font-bold border border-emerald-600/40 transition-colors flex items-center gap-1.5 shadow-md"
            title="Guardar cambios en este mazo"
          >
            <span>💾</span> Guardar Mazo
          </button>

          <button
            onClick={() => {
              setNewDeckNameInput(`${currentDeckTitle} (Nuevo)`);
              setShowSaveAsModal(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-cinzel font-bold border border-neutral-700 transition-colors flex items-center gap-1.5"
            title="Guardar como un mazo nuevo"
          >
            <span>➕</span> Guardar como Nuevo
          </button>

          <button
            onClick={drawTestHand}
            className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1"
          >
            <span>🃏</span> Probar Mano (8)
          </button>

          <button
            onClick={onStartDuel}
            disabled={deck.length < 15}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-950 disabled:opacity-50"
          >
            <span>⚔️</span> Iniciar Duelo D.A.R.
          </button>
        </div>
      </div>

      {/* CPU Rival Deck Assignment Quick Bar */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border border-red-900/60 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xl">🤖</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-cinzel font-bold text-red-300 uppercase tracking-wider">
                Mazo Asignado al Bot Rival (CPU):
              </span>
              <strong className="text-xs text-amber-200 font-cinzel font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800/80">
                {activeCpu?.name || cpuDeckName}
              </strong>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              El rival jugará con este mazo cuando inicies un duelo en la Arena.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-neutral-400 font-cinzel">Cambiar Mazo Rival:</label>
          <select
            value={activeCpu?.id || ''}
            onChange={(e) => {
              const selected = savedDecks.find((d) => d.id === e.target.value);
              if (selected) handleAssignToCpu(selected);
            }}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-200 text-xs font-cinzel font-semibold focus:outline-none focus:border-amber-500"
          >
            {savedDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cards.length} cartas)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Decks Bar */}
      <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-cinzel font-bold text-amber-400 uppercase tracking-wider">
            Mazos Preconstruidos (50 Cartas DAR):
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => loadPreset('dar_balanced')}
              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs text-white font-bold transition-colors shadow-xs"
            >
              📜 D.A.R. 50 Oficial
            </button>
            <button
              onClick={() => loadPreset('camelot')}
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white font-medium transition-colors"
            >
              🛡️ Caballeros Camelot
            </button>
            <button
              onClick={() => loadPreset('dragons')}
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white font-medium transition-colors"
            >
              🐉 Dragones Sagrados
            </button>
            <button
              onClick={() => loadPreset('faerie')}
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white font-medium transition-colors"
            >
              🧚 Corte Faerie
            </button>
            <button
              onClick={() => loadPreset('control')}
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white font-medium transition-colors"
            >
              🗿 Control Tótems
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            soundFx.playDamage();
            onUpdateDeck([], currentDeckTitle, currentDeckId);
          }}
          className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
        >
          Vaciar Mazo
        </button>
      </div>

      {/* Test Hand Simulator Modal/Drawer */}
      {testHand && (
        <div className="mb-8 p-6 rounded-2xl bg-neutral-900 border border-amber-500/40 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-cinzel font-bold text-amber-200">
                Mano de Prueba Inicial (8 cartas)
              </h3>
              <p className="text-xs text-neutral-400">
                Simula la apertura de tu partida para verificar consistencia de coste y aliados.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={drawTestHand}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold"
              >
                🔄 Repartir Otra Mano
              </button>
              <button
                onClick={() => setTestHand(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {testHand.map((c, i) => (
              <div key={`${c.id}-${i}`} className="transform hover:-translate-y-2 transition-transform">
                <MythosCard card={c} size="sm" interactive={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deck Grid + Catalog Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Current Deck Content (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 rounded-2xl border border-neutral-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <h2 className="text-lg font-cinzel font-bold text-amber-300">
              Cartas en Mazo ({deck.length}/50)
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              {uniqueDeckCards.length} cartas distintas
            </span>
          </div>

          {deck.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-sm italic">
              El mazo está vacío. Añade cartas desde el catálogo de la derecha o carga un mazo preconstruido.
            </div>
          ) : (
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {uniqueDeckCards.map((card) => {
                const count = cardCounts[card.name];
                return (
                  <div
                    key={card.name}
                    className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-14 rounded overflow-hidden shrink-0 border border-neutral-800">
                        <img
                          src={card.imageUrl || '/cards/basic_oro.png'}
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-cinzel font-bold text-neutral-200 group-hover:text-amber-300 transition-colors truncate">
                          {card.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                          <span className="text-amber-400 font-mono">{card.cost} 🪙</span>
                          {card.type === 'Aliado' && (
                            <span className="text-red-400 font-mono">{card.strength} 🛡️</span>
                          )}
                          <span className="text-neutral-500">·</span>
                          <span>{card.type}</span>
                          {card.uniqueCard && (
                            <span className="text-amber-400 font-bold">(Única)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-mono text-xs font-bold">
                        x{count}
                      </span>
                      <button
                        onClick={() => removeCard(card.name)}
                        className="w-6 h-6 rounded bg-neutral-800 hover:bg-red-900/50 text-neutral-400 hover:text-red-300 text-xs flex items-center justify-center transition-colors"
                        title="Quitar 1 copia"
                      >
                        -
                      </button>
                      <button
                        onClick={() => addCard(card)}
                        disabled={count >= (card.uniqueCard ? 1 : 3) || deck.length >= 50}
                        className="w-6 h-6 rounded bg-neutral-800 hover:bg-emerald-900/50 text-neutral-400 hover:text-emerald-300 text-xs flex items-center justify-center transition-colors disabled:opacity-40"
                        title="Añadir 1 copia"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Available Cards Catalog to Add (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 rounded-2xl border border-neutral-800 p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <h2 className="text-lg font-cinzel font-bold text-amber-300">
              Colección Disponible ({availableCards.length})
            </h2>
            <span className="text-xs text-neutral-400">
              Clic en "+ Añadir" para incorporar al mazo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[640px] overflow-y-auto pr-1">
            {availableCards.map((c) => {
              const count = cardCounts[c.name] || 0;
              const max = c.uniqueCard ? 1 : 3;
              const isMax = count >= max || deck.length >= 50;

              return (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-between text-center gap-2 hover:border-amber-600/30 transition-colors"
                >
                  <div className="transform scale-90 -my-2">
                    <MythosCard card={c} size="sm" interactive={false} />
                  </div>

                  <div className="w-full pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {count}/{max}
                    </span>
                    <button
                      onClick={() => addCard(c)}
                      disabled={isMax}
                      className={`px-3 py-1 rounded text-xs font-semibold font-cinzel transition-colors ${
                        isMax
                          ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                      }`}
                    >
                      {count >= max ? 'Máx.' : '+ Añadir'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: MIS MAZOS GUARDADOS & ASIGNACIÓN A BOT RIVAL                        */}
      {/* ========================================================================= */}
      {showDecksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-500/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-amber-500/30 bg-amber-950/20 flex items-center justify-between">
              <div>
                <h2 className="font-cinzel text-lg sm:text-xl font-bold text-amber-300 flex items-center gap-2">
                  <span>📂</span> Gestor de Mazos Guardados
                </h2>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Carga tus mazos en el constructor o asígnalos directamente al Bot Rival para el duelo.
                </p>
              </div>
              <button
                onClick={() => setShowDecksModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {savedDecks.map((sDeck) => {
                const isPlayerActive = sDeck.id === currentDeckId || sDeck.name === currentDeckTitle;
                const isCpuActive = activeCpu?.id === sDeck.id || activeCpu?.name === sDeck.name;

                return (
                  <div
                    key={sDeck.id}
                    className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-cinzel text-base font-bold text-amber-200">
                          {sDeck.name}
                        </h3>
                        {isPlayerActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-cinzel font-bold bg-amber-600/30 text-amber-300 border border-amber-500/50">
                            🛡️ Tu Mazo Activo
                          </span>
                        )}
                        {isCpuActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-cinzel font-bold bg-red-600/30 text-red-300 border border-red-500/50">
                            🤖 Asignado al Rival (CPU)
                          </span>
                        )}
                        {sDeck.isPreset && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-400">
                            Preconstruido
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 mt-1">
                        {sDeck.description || `${sDeck.cards.length} cartas`}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono mt-1.5">
                        <span>{sDeck.cards.length} cartas</span>
                        <span>·</span>
                        <span>{sDeck.cards.filter((c) => c.type === 'Aliado').length} Aliados</span>
                        <span>·</span>
                        <span>{sDeck.cards.filter((c) => c.type === 'Oro').length} Oros</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        onClick={() => handleLoadSavedDeck(sDeck)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-cinzel font-bold shadow-xs transition-colors flex items-center gap-1"
                        title="Cargar este mazo en el constructor para jugar o editar"
                      >
                        <span>🛡️</span> Cargar
                      </button>

                      <button
                        onClick={() => handleAssignToCpu(sDeck)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold shadow-xs transition-colors flex items-center gap-1 ${
                          isCpuActive
                            ? 'bg-red-800 text-white cursor-default'
                            : 'bg-neutral-800 hover:bg-red-950/60 text-red-300 border border-red-800/60'
                        }`}
                        title="Asignar este mazo al Bot Rival para enfrentarte a él"
                      >
                        <span>🤖</span> {isCpuActive ? '✓ Asignado a CPU' : 'Asignar a Rival'}
                      </button>

                      <button
                        onClick={() => handleDuplicateDeck(sDeck.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors"
                        title="Duplicar mazo"
                      >
                        📄
                      </button>

                      {!sDeck.isPreset && (
                        <button
                          onClick={() => handleDeleteDeck(sDeck.id, sDeck.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/50 text-neutral-400 hover:text-red-300 text-xs transition-colors"
                          title="Eliminar mazo"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GUARDAR COMO NUEVO MAZO                                            */}
      {/* ========================================================================= */}
      {showSaveAsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden">
            <h3 className="text-lg font-cinzel font-bold text-amber-200 mb-2">
              Guardar como Nuevo Mazo
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Ingresa un nombre para identificar este mazo en tu colección.
            </p>

            <input
              type="text"
              value={newDeckNameInput}
              onChange={(e) => setNewDeckNameInput(e.target.value)}
              placeholder="Ej: Mazo Relámpago de Faeries"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-amber-100 text-sm font-cinzel font-semibold focus:outline-none focus:border-amber-500 mb-5"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSaveAs}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-cinzel font-bold shadow-md"
              >
                Guardar Mazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE MAZO */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-sm bg-neutral-900 border-2 border-red-500/70 rounded-2xl shadow-2xl p-5 text-center">
            <span className="text-3xl mb-2 inline-block">🗑️</span>
            <h3 className="text-base font-cinzel font-bold text-red-200 mb-1">
              ¿Eliminar Mazo?
            </h3>
            <p className="text-xs text-neutral-300 mb-5">
              ¿Estás seguro de que deseas eliminar el mazo <strong className="text-amber-300">"{deckToDelete.name}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeckToDelete(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-cinzel font-bold shadow-md cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
