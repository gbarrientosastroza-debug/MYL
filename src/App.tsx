/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CardData } from './types/card';
import { CANONICAL_CARDS } from './data/canonicalCards';
import { TopBar, AppView } from './components/TopBar';
import { CardCatalog } from './components/CardCatalog';
import { CardGenerator } from './components/CardGenerator';
import { DeckBuilder } from './components/DeckBuilder';
import { DuelArena } from './components/DuelArena';
import { AbilityAnalyzerView } from './components/AbilityAnalyzerView';
import { CardModal } from './components/CardModal';
import { DarRulesModal } from './components/DarRulesModal';
import { soundFx } from './utils/soundFx';
import {
  loadAllCardImages,
  saveBatchCardImages,
  loadStoredCustomCards,
  saveStoredCustomCards,
} from './utils/cardImageStorage';
import {
  SavedDeck,
  getActivePlayerDeck,
  getActiveCpuDeck,
  setActivePlayerDeck,
  setActiveCpuDeck,
  cleanupStorageQuota,
} from './utils/deckStorage';

const STORAGE_CUSTOM_KEY = 'mylo_custom_cards_v1';
const STORAGE_DECK_KEY = 'mylo_player_deck_v1';
const STORAGE_IMAGES_KEY = 'mylo_card_images_v1';
const STORAGE_DISPLAY_MODE_KEY = 'mylo_display_mode_v1';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('catalog');
  const [allCards, setAllCards] = useState<CardData[]>(CANONICAL_CARDS);
  const [playerDeck, setPlayerDeck] = useState<CardData[]>([]);
  const [playerDeckName, setPlayerDeckName] = useState<string>('Caballeros de Camelot');
  const [cpuDeck, setCpuDeck] = useState<CardData[]>([]);
  const [cpuDeckName, setCpuDeckName] = useState<string>('Dragones Sagrados');
  const [inspectedCard, setInspectedCard] = useState<CardData | null>(null);
  const [editingCard, setEditingCard] = useState<CardData | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'full-art' | 'frame'>('full-art');
  const [customImageMap, setCustomImageMap] = useState<Record<number, string>>({});
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [analyzingCardNumber, setAnalyzingCardNumber] = useState<number>(1);

  // Load custom cards, custom images, and player deck from IndexedDB & localStorage
  useEffect(() => {
    async function initStorage() {
      // 0. Proactively clean up localStorage to keep quota completely free
      cleanupStorageQuota();

      // 1. Saved images map from IndexedDB (unlimited storage) + server disk
      let imgMap: Record<number, string> = {};
      try {
        const idbImages = await loadAllCardImages();
        imgMap = { ...idbImages };
      } catch (err) {
        console.warn('IDB load images error:', err);
      }

      try {
        const storedImages = localStorage.getItem(STORAGE_IMAGES_KEY);
        if (storedImages) {
          const parsed = JSON.parse(storedImages);
          imgMap = { ...parsed, ...imgMap };
          // Once loaded into memory, purge from localStorage to prevent quota exhaustion
          localStorage.removeItem(STORAGE_IMAGES_KEY);
        }
      } catch {}

      setCustomImageMap(imgMap);

      // 2. Saved display mode
      const storedMode = localStorage.getItem(STORAGE_DISPLAY_MODE_KEY);
      if (storedMode === 'full-art' || storedMode === 'frame') {
        setDisplayMode(storedMode);
      }

      // 3. Saved custom & recognized cards (IndexedDB + localStorage)
      let customCards: CardData[] = [];
      try {
        const idbCards = await loadStoredCustomCards();
        if (idbCards && idbCards.length > 0) {
          customCards = idbCards;
        }
      } catch {}

      if (customCards.length === 0) {
        try {
          const storedCustom = localStorage.getItem(STORAGE_CUSTOM_KEY);
          if (storedCustom) {
            customCards = JSON.parse(storedCustom);
          }
        } catch {}
      }

      // Build catalog cards with their images applied
      let initialList: CardData[] = CANONICAL_CARDS.map((c) => {
        const customMatch = customCards.find((custom) => custom.number === c.number || custom.name === c.name);
        const resolvedImage = imgMap[c.number] || customMatch?.imageUrl || c.imageUrl;
        if (customMatch) {
          return {
            ...c,
            ...customMatch,
            imageUrl: resolvedImage,
          };
        }
        return {
          ...c,
          imageUrl: resolvedImage,
        };
      });

      // Append any brand new custom cards not in canonical set
      customCards.forEach((c) => {
        const exists = initialList.some((existing) => existing.number === c.number || existing.name === c.name);
        if (!exists) {
          initialList.push({
            ...c,
            imageUrl: imgMap[c.number] || c.imageUrl,
          });
        }
      });

      setAllCards(initialList);

      // 4. Saved player & CPU decks from deckStorage
      try {
        const activePlayer = getActivePlayerDeck();
        if (activePlayer && activePlayer.cards.length > 0) {
          const deckWithImages = activePlayer.cards.map((c) => {
            const matchInList = initialList.find((item) => item.number === c.number || item.name === c.name);
            return {
              ...c,
              imageUrl: imgMap[c.number] || matchInList?.imageUrl || c.imageUrl,
            };
          });
          setPlayerDeck(deckWithImages);
          setPlayerDeckName(activePlayer.name);
        }

        const activeCpu = getActiveCpuDeck();
        if (activeCpu && activeCpu.cards.length > 0) {
          const cpuWithImages = activeCpu.cards.map((c) => {
            const matchInList = initialList.find((item) => item.number === c.number || item.name === c.name);
            return {
              ...c,
              imageUrl: imgMap[c.number] || matchInList?.imageUrl || c.imageUrl,
            };
          });
          setCpuDeck(cpuWithImages);
          setCpuDeckName(activeCpu.name);
        }
      } catch (err) {
        console.warn('Error loading active decks:', err);
      }
    }

    initStorage();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle batch image uploads from ImageDropzone (Server Disk + IndexedDB backed)
  const handleImagesLoaded = async (
    newImages: Record<number, string>,
    synthesizedCards?: CardData[]
  ) => {
    const merged = { ...customImageMap, ...newImages };
    setCustomImageMap(merged);

    // Save to server disk & IndexedDB permanently
    await saveBatchCardImages(newImages);

    // Update allCards with new images immediately so catalog preview updates right away
    setAllCards((prevCards) => {
      let updatedList = prevCards.map((card) => {
        if (newImages[card.number] || merged[card.number]) {
          return {
            ...card,
            imageUrl: newImages[card.number] || merged[card.number],
          };
        }
        return card;
      });

      // If any synthesized cards for new numbers were created, add them so they appear in catalog
      if (synthesizedCards && synthesizedCards.length > 0) {
        synthesizedCards.forEach((synth) => {
          const exists = updatedList.some((c) => c.number === synth.number);
          if (!exists) {
            updatedList = [synth, ...updatedList];
          }
        });

        // Persist newly added custom cards
        const allCustoms = updatedList.filter((c) => c.isCustom);
        saveStoredCustomCards(allCustoms);
      }

      return updatedList;
    });

    // Update deck with new images
    setPlayerDeck((prevDeck) =>
      prevDeck.map((card) => {
        if (newImages[card.number] || merged[card.number]) {
          return {
            ...card,
            imageUrl: newImages[card.number] || merged[card.number],
          };
        }
        return card;
      })
    );

    showToast(`¡${Object.keys(newImages).length} imagen(es) asignadas y guardadas permanentemente!`);
  };

  const handleToggleDisplayMode = (mode: 'full-art' | 'frame') => {
    setDisplayMode(mode);
    try {
      localStorage.setItem(STORAGE_DISPLAY_MODE_KEY, mode);
    } catch {
      // no-op
    }
  };

  const handleSaveCard = (card: CardData) => {
    const existingIdx = allCards.findIndex((c) => c.id === card.id);
    let nextList: CardData[];
    if (existingIdx !== -1) {
      nextList = [...allCards];
      nextList[existingIdx] = card;
    } else {
      nextList = [card, ...allCards];
    }
    setAllCards(nextList);

    // Persist custom cards to both IndexedDB and localStorage (without base64 images)
    const customCards = nextList.filter((c) => c.isCustom);
    saveStoredCustomCards(customCards);
    try {
      const sanitized = customCards.map((c) => ({
        ...c,
        imageUrl: c.imageUrl && c.imageUrl.startsWith('data:') ? `/cards/${c.number || 236}.png` : c.imageUrl,
      }));
      localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(sanitized));
    } catch {}

    if (card.number && card.imageUrl) {
      saveBatchCardImages({ [card.number]: card.imageUrl });
      setCustomImageMap((prev) => ({ ...prev, [card.number]: card.imageUrl! }));
    }

    showToast(`Carta "${card.name}" guardada y lista en tu colección.`);
  };

  const handleCardsRecognized = (newCards: CardData[]) => {
    const imagesToSave: Record<number, string> = {};

    newCards.forEach((c) => {
      if (c.number && c.imageUrl) {
        imagesToSave[c.number] = c.imageUrl;
      }
    });

    if (Object.keys(imagesToSave).length > 0) {
      saveBatchCardImages(imagesToSave);
      setCustomImageMap((prev) => ({ ...prev, ...imagesToSave }));
    }

    setAllCards((prevCards) => {
      let nextList = [...prevCards];

      newCards.forEach((recognized) => {
        const matchIdx = nextList.findIndex(
          (c) => c.number === recognized.number || c.name.toLowerCase() === recognized.name.toLowerCase()
        );

        if (matchIdx !== -1) {
          nextList[matchIdx] = {
            ...nextList[matchIdx],
            ...recognized,
            imageUrl: recognized.imageUrl || nextList[matchIdx].imageUrl,
            isCustom: true,
          };
        } else {
          nextList = [recognized, ...nextList];
        }
      });

      // Persist to both IndexedDB and localStorage (without base64 images)
      const customCards = nextList.filter((c) => c.isCustom);
      saveStoredCustomCards(customCards);
      try {
        const sanitized = customCards.map((c) => ({
          ...c,
          imageUrl: c.imageUrl && c.imageUrl.startsWith('data:') ? `/cards/${c.number || 236}.png` : c.imageUrl,
        }));
        localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(sanitized));
      } catch {}

      return nextList;
    });

    soundFx.playVictory();
    showToast(`¡${newCards.length} carta(s) incorporada(s) con habilidades y fuerza reconocidas!`);
  };

  const handleUpdateDeck = (newDeck: CardData[], newName?: string) => {
    setPlayerDeck(newDeck);
    if (newName) setPlayerDeckName(newName);
    try {
      const minimalDeck = newDeck.map((c) => ({ id: c.id, number: c.number, name: c.name }));
      localStorage.setItem(STORAGE_DECK_KEY, JSON.stringify(minimalDeck));
    } catch {
      // no-op
    }
  };

  const handleAssignCpuDeck = (deck: SavedDeck) => {
    setCpuDeck(deck.cards);
    setCpuDeckName(deck.name);
    setActiveCpuDeck(deck);
    showToast(`Mazo "${deck.name}" asignado al Bot Rival (CPU)`);
  };

  const handleAddToDeck = (card: CardData) => {
    const currentCount = playerDeck.filter((c) => c.name === card.name).length;
    const max = card.uniqueCard ? 1 : 3;

    if (currentCount >= max) {
      showToast(`Límite alcanzado: Ya tienes ${max} copia(s) de "${card.name}".`);
      return;
    }

    soundFx.playCardFlick();
    const updated = [...playerDeck, { ...card, id: `${card.id}-${Date.now()}` }];
    handleUpdateDeck(updated);
    showToast(`"${card.name}" añadida al Mazo (${updated.length} cartas).`);
  };

  const handleEditCard = (card: CardData) => {
    setEditingCard(card);
    setCurrentView('generator');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-amber-600 selection:text-white">
      {/* Top Bar Navigation adhering to 3-zone contract */}
      <TopBar
        currentView={currentView}
        onNavigate={(view) => {
          if (view !== 'generator') {
            setEditingCard(undefined);
          }
          setCurrentView(view);
        }}
        cardsCount={allCards.length}
        onOpenRules={() => setShowRulesModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'catalog' && (
          <CardCatalog
            cards={allCards}
            onSelectCard={(c) => setInspectedCard(c)}
            onEditCard={handleEditCard}
            onAddToDeck={handleAddToDeck}
            onAnalyzeCard={(c) => {
              setAnalyzingCardNumber(c.number);
              setCurrentView('abilities');
            }}
            onGoToGenerator={() => {
              setEditingCard(undefined);
              setCurrentView('generator');
            }}
            onImagesLoaded={handleImagesLoaded}
            onCardsRecognized={handleCardsRecognized}
            displayMode={displayMode}
            onToggleDisplayMode={handleToggleDisplayMode}
            customImagesCount={Object.keys(customImageMap).length}
          />
        )}

        {currentView === 'generator' && (
          <CardGenerator
            initialCard={editingCard}
            onSaveCard={handleSaveCard}
            onGoToCatalog={() => setCurrentView('catalog')}
          />
        )}

        {currentView === 'deck' && (
          <DeckBuilder
            deck={playerDeck}
            deckName={playerDeckName}
            onUpdateDeck={handleUpdateDeck}
            availableCards={allCards}
            onStartDuel={() => setCurrentView('duel')}
            cpuDeckName={cpuDeckName}
            onAssignCpuDeck={handleAssignCpuDeck}
          />
        )}

        {currentView === 'duel' && (
          <DuelArena
            playerDeck={playerDeck}
            playerDeckName={playerDeckName}
            cpuDeck={cpuDeck}
            cpuDeckName={cpuDeckName}
            onExitDuel={() => setCurrentView('catalog')}
            onGoToDeckBuilder={() => setCurrentView('deck')}
            onChangeCpuDeck={handleAssignCpuDeck}
          />
        )}

        {currentView === 'abilities' && (
          <AbilityAnalyzerView
            cards={allCards}
            initialCardNumber={analyzingCardNumber}
            onAddToDeck={handleAddToDeck}
            onGoToDuel={() => setCurrentView('duel')}
            onGoToDeckBuilder={() => setCurrentView('deck')}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-medium text-xs shadow-2xl animate-in slide-in-from-bottom-2 flex items-center gap-2">
          <span>✨</span> {toastMessage}
        </div>
      )}

      {/* 3D Card Inspection Modal */}
      {inspectedCard && (
        <CardModal
          card={inspectedCard}
          onClose={() => setInspectedCard(null)}
          onEdit={(c) => {
            setInspectedCard(null);
            handleEditCard(c);
          }}
          onAddToDeck={handleAddToDeck}
          onAnalyzeAbility={(c) => {
            setInspectedCard(null);
            setAnalyzingCardNumber(c.number);
            setCurrentView('abilities');
          }}
        />
      )}

      {/* D.A.R. 1.0 Official Rules Modal */}
      <DarRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      {/* Clean quiet footer without ornamental clutter */}
      <footer className="w-full border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-cinzel text-neutral-300">
            Mitos y Leyendas · Espada Sagrada (Primera Edición)
          </span>
          <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
            <span>236 Cartas Oficiales</span>
            <span>·</span>
            <span>Motor de Habilidades D.A.R. 1.0</span>
            <span>·</span>
            <span>Generador & Duelo TCG</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
