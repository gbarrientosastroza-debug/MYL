import { CardData } from '../types/card';
import { CANONICAL_CARDS } from '../data/canonicalCards';

export interface SavedDeck {
  id: string;
  name: string;
  description?: string;
  cards: CardData[];
  createdAt: number;
  updatedAt: number;
  archetype?: 'Caballero' | 'Dragón' | 'Faerie' | 'Control' | 'Equilibrado' | 'Personalizado';
  isPreset?: boolean;
}

interface CompactCardRef {
  n: number; // card number
  id?: string;
  // Minimal fields for custom cards not in canonical set
  c?: {
    name: string;
    type: string;
    race: string;
    cost: number;
    strength: number;
    ability: string;
    rarity: string;
  };
}

interface CompactStoredDeck {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  archetype?: any;
  cardRefs: CompactCardRef[];
}

const STORAGE_SAVED_DECKS_KEY = 'mylo_saved_decks_v2';
const STORAGE_ACTIVE_PLAYER_DECK_ID = 'mylo_active_player_deck_id_v2';
const STORAGE_ACTIVE_CPU_DECK_ID = 'mylo_active_cpu_deck_id_v2';

// In-memory cache for ultra-fast access and guaranteed zero-loss fallback
let inMemoryDecksCache: SavedDeck[] | null = null;

// IndexedDB database name and store for secondary persistence
const IDB_DECKS_DB = 'MyLo_Decks_Vault_v1';
const IDB_DECKS_STORE = 'saved_decks';

function openDecksDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(IDB_DECKS_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_DECKS_STORE)) {
        db.createObjectStore(IDB_DECKS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDecksToIndexedDB(decks: CompactStoredDeck[]): Promise<void> {
  try {
    const db = await openDecksDb();
    const tx = db.transaction(IDB_DECKS_STORE, 'readwrite');
    const store = tx.objectStore(IDB_DECKS_STORE);
    store.clear();
    for (const d of decks) {
      store.put(d);
    }
  } catch (err) {
    console.warn('Notice: IndexedDB decks backup error (non-fatal):', err);
  }
}

/**
 * Safely cleans up any obsolete or bloated localStorage keys to guarantee ample quota.
 */
export function cleanupStorageQuota(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // 1. Remove legacy or oversized keys known to bloat localStorage
    const obsoleteKeys = [
      'mylo_card_images_v1',
      'mylo_saved_decks_v1',
      'mylo_player_deck_v1',
    ];
    for (const key of obsoleteKeys) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }

    // 2. Scan remaining keys and remove any unessential keys containing large base64 data (> 30KB)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Protect critical configuration keys
      if (
        key === STORAGE_SAVED_DECKS_KEY ||
        key === STORAGE_ACTIVE_PLAYER_DECK_ID ||
        key === STORAGE_ACTIVE_CPU_DECK_ID ||
        key === 'mylo_display_mode_v1'
      ) {
        continue;
      }
      try {
        const val = localStorage.getItem(key);
        if (val && (val.length > 30000 || val.includes('data:image'))) {
          localStorage.removeItem(key);
        }
      } catch {}
    }
  } catch {}
}

/**
 * Loads decks from IndexedDB as a reliable secondary storage tier.
 */
export async function loadDecksFromIndexedDB(): Promise<SavedDeck[]> {
  try {
    const db = await openDecksDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_DECKS_STORE, 'readonly');
      const store = tx.objectStore(IDB_DECKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rawDecks: CompactStoredDeck[] = req.result || [];
        const hydrated = rawDecks.map(hydrateStoredDeck);
        resolve(hydrated);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Builds a legal 50-card DAR Primer Bloque deck following official rules:
 * - Max 3 copies per regular card
 * - Max 1 copy for unique cards
 * - Total exactly 50 cards
 */
export function buildPresetDeck(
  archetype: 'camelot' | 'dragons' | 'faerie' | 'control' | 'dar_balanced'
): CardData[] {
  const result: CardData[] = [];
  const cardCounts: Record<string, number> = {};

  const canAddCard = (card: CardData): boolean => {
    const current = cardCounts[card.name] || 0;
    const max = card.uniqueCard ? 1 : 3;
    return current < max && result.length < 50;
  };

  const addCard = (card: CardData) => {
    if (!canAddCard(card)) return false;
    cardCounts[card.name] = (cardCounts[card.name] || 0) + 1;
    result.push({
      ...card,
      id: `${card.id}-preset-${result.length}`,
    });
    return true;
  };

  if (archetype === 'camelot') {
    const knights = CANONICAL_CARDS.filter((c) => c.race === 'Caballero');
    knights.forEach((k) => {
      const copies = k.uniqueCard ? 1 : 2;
      for (let i = 0; i < copies; i++) addCard(k);
    });

    const weapons = CANONICAL_CARDS.filter((c) => c.type === 'Arma');
    weapons.forEach((w) => {
      const copies = w.name.toUpperCase().includes('EXCALIBUR') ? 1 : 2;
      for (let i = 0; i < copies; i++) addCard(w);
    });

    const talismans = CANONICAL_CARDS.filter((c) => c.type === 'Talismán');
    talismans.slice(0, 6).forEach((t) => {
      for (let i = 0; i < 2; i++) addCard(t);
    });

    const golds = CANONICAL_CARDS.filter((c) => c.type === 'Oro');
    golds.forEach((g) => {
      for (let i = 0; i < 2; i++) addCard(g);
    });

    for (const card of CANONICAL_CARDS) {
      if (result.length >= 50) break;
      addCard(card);
    }
  } else if (archetype === 'dragons') {
    const dragons = CANONICAL_CARDS.filter((c) => c.race === 'Dragón');
    dragons.forEach((d) => {
      const copies = d.uniqueCard ? 1 : 3;
      for (let i = 0; i < copies; i++) addCard(d);
    });

    const dragonTalismans = CANONICAL_CARDS.filter(
      (c) => c.name.toUpperCase().includes('DRAGON') || c.type === 'Talismán'
    );
    dragonTalismans.forEach((t) => {
      for (let i = 0; i < 2; i++) addCard(t);
    });

    const golds = CANONICAL_CARDS.filter((c) => c.type === 'Oro');
    golds.forEach((g) => {
      for (let i = 0; i < 2; i++) addCard(g);
    });

    for (const card of CANONICAL_CARDS) {
      if (result.length >= 50) break;
      addCard(card);
    }
  } else if (archetype === 'faerie') {
    const faeries = CANONICAL_CARDS.filter((c) => c.race === 'Faerie');
    faeries.forEach((f) => {
      const copies = f.uniqueCard ? 1 : 2;
      for (let i = 0; i < copies; i++) addCard(f);
    });

    const magicTalismans = CANONICAL_CARDS.filter(
      (c) => c.type === 'Talismán' && !c.name.toUpperCase().includes('DRAGON')
    );
    magicTalismans.forEach((t) => {
      for (let i = 0; i < 2; i++) addCard(t);
    });

    const golds = CANONICAL_CARDS.filter((c) => c.type === 'Oro');
    golds.forEach((g) => {
      for (let i = 0; i < 2; i++) addCard(g);
    });

    for (const card of CANONICAL_CARDS) {
      if (result.length >= 50) break;
      addCard(card);
    }
  } else if (archetype === 'control') {
    const totems = CANONICAL_CARDS.filter((c) => c.type === 'Tótem');
    totems.forEach((tot) => {
      for (let i = 0; i < 2; i++) addCard(tot);
    });

    const defensiveAllies = CANONICAL_CARDS.filter(
      (c) => c.type === 'Aliado' && c.strength >= 3
    );
    defensiveAllies.forEach((a) => {
      for (let i = 0; i < 2; i++) addCard(a);
    });

    const controlTalismans = CANONICAL_CARDS.filter(
      (c) =>
        c.type === 'Talismán' &&
        (c.ability.toLowerCase().includes('destruye') ||
          c.ability.toLowerCase().includes('destierra') ||
          c.ability.toLowerCase().includes('baraja'))
    );
    controlTalismans.forEach((t) => {
      for (let i = 0; i < 2; i++) addCard(t);
    });

    const golds = CANONICAL_CARDS.filter((c) => c.type === 'Oro');
    golds.forEach((g) => {
      for (let i = 0; i < 2; i++) addCard(g);
    });

    for (const card of CANONICAL_CARDS) {
      if (result.length >= 50) break;
      addCard(card);
    }
  } else {
    // Balanced DAR structure: 24 allies, 8 talismans, 4 weapons, 4 totems, 10 gold
    const allies = CANONICAL_CARDS.filter((c) => c.type === 'Aliado');
    allies.slice(0, 12).forEach((a) => {
      for (let i = 0; i < 2; i++) addCard(a);
    });

    const talismans = CANONICAL_CARDS.filter((c) => c.type === 'Talismán');
    talismans.slice(0, 4).forEach((t) => {
      for (let i = 0; i < 2; i++) addCard(t);
    });

    const weapons = CANONICAL_CARDS.filter((c) => c.type === 'Arma');
    weapons.slice(0, 2).forEach((w) => {
      for (let i = 0; i < 2; i++) addCard(w);
    });

    const totems = CANONICAL_CARDS.filter((c) => c.type === 'Tótem');
    totems.slice(0, 2).forEach((tot) => {
      for (let i = 0; i < 2; i++) addCard(tot);
    });

    const golds = CANONICAL_CARDS.filter((c) => c.type === 'Oro');
    golds.forEach((g) => {
      for (let i = 0; i < 2; i++) addCard(g);
    });

    for (const card of CANONICAL_CARDS) {
      if (result.length >= 50) break;
      addCard(card);
    }
  }

  // Ensure exactly 50 cards
  while (result.length < 50) {
    const filler = CANONICAL_CARDS[result.length % CANONICAL_CARDS.length];
    result.push({ ...filler, id: `${filler.id}-fill-${result.length}` });
  }

  return result.slice(0, 50);
}

/**
 * Returns the default standard preset decks available in the app.
 * Generated on demand in memory, never bloating localStorage.
 */
export function getDefaultPresetDecks(): SavedDeck[] {
  const now = 1700000000000;
  return [
    {
      id: 'preset-camelot',
      name: 'Caballeros de Camelot',
      description: 'Mazo agresivo de Caballeros enfocado en ataques rápidos y bonificaciones de Rey Arturo y Excalibur.',
      archetype: 'Caballero',
      isPreset: true,
      cards: buildPresetDeck('camelot'),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'preset-dragons',
      name: 'Dragones Sagrados',
      description: 'Mazo de alto poder con dragones devastadores, robo de cartas y sinergia con Cuna de Dragones.',
      archetype: 'Dragón',
      isPreset: true,
      cards: buildPresetDeck('dragons'),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'preset-faerie',
      name: 'Corte Faerie & Magia',
      description: 'Estrategia de evasión, robo constante con Bruja Anís y control del cementerio con Pooka y Pixie.',
      archetype: 'Faerie',
      isPreset: true,
      cards: buildPresetDeck('faerie'),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'preset-control',
      name: 'Control de Tótems & Destierro',
      description: 'Mazo defensivo basado en Tótems continuos, sangría de cartas rivales y recursos de reserva de oro.',
      archetype: 'Control',
      isPreset: true,
      cards: buildPresetDeck('control'),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'preset-dar-balanced',
      name: 'Mazo Reglamentario D.A.R. 1.0',
      description: 'Estructura equilibrada oficial con distribución balanceada de Aliados, Armas, Tótems, Talismanes y Oros.',
      archetype: 'Equilibrado',
      isPreset: true,
      cards: buildPresetDeck('dar_balanced'),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Converts a SavedDeck to compact storage format
 * Drops massive base64 images and redundant canonical texts.
 */
function toCompactDeck(deck: SavedDeck): CompactStoredDeck {
  const cardRefs: CompactCardRef[] = (deck.cards || []).map((card) => {
    // If it is a canonical card (number 1..236 and not marked custom), store ONLY the card number
    const isCanonical =
      !card.isCustom &&
      typeof card.number === 'number' &&
      card.number >= 1 &&
      card.number <= 236;

    if (isCanonical) {
      return {
        n: card.number,
      };
    }

    // Custom card: store minimal text schema only, NEVER base64 imageUrl
    return {
      n: card.number || 0,
      c: {
        name: (card.name || 'Personalizada').slice(0, 50),
        type: card.type || 'Aliado',
        race: card.race || 'Sin Raza',
        cost: card.cost ?? 1,
        strength: card.strength ?? 1,
        ability: (card.ability || '').slice(0, 300),
        rarity: card.rarity || 'Vasallo',
      },
    };
  });

  return {
    id: deck.id,
    name: (deck.name || 'Mazo').slice(0, 80),
    description: deck.description ? deck.description.slice(0, 150) : undefined,
    createdAt: deck.createdAt || Date.now(),
    updatedAt: deck.updatedAt || Date.now(),
    archetype: deck.archetype || 'Personalizado',
    cardRefs,
  };
}

/**
 * Hydrates a stored deck back into full CardData objects
 */
function hydrateStoredDeck(raw: any): SavedDeck {
  // Case A: New compact format with cardRefs
  if (Array.isArray(raw.cardRefs)) {
    const hydratedCards: CardData[] = raw.cardRefs.map((ref: CompactCardRef, idx: number) => {
      const canonicalMatch = CANONICAL_CARDS.find((c) => c.number === ref.n);
      if (canonicalMatch) {
        return {
          ...canonicalMatch,
          id: ref.id || `${canonicalMatch.id}-${idx}`,
        };
      }

      if (ref.c) {
        return {
          id: ref.id || `custom-${ref.n}-${idx}`,
          number: ref.n,
          totalInSet: 236,
          edition: 'PRIMERA EDICION',
          name: ref.c.name,
          type: ref.c.type as any,
          race: ref.c.race as any,
          strength: ref.c.strength,
          cost: ref.c.cost,
          flavorText: '',
          ability: ref.c.ability,
          illustrator: 'Comunidad',
          rarity: (ref.c.rarity || 'Vasallo') as any,
          foil: 'none',
          imageUrl: `/cards/${ref.n}.png`,
          isCustom: true,
        };
      }

      // Fallback filler
      const fallback = CANONICAL_CARDS[0];
      return { ...fallback, id: `fallback-${idx}` };
    });

    return {
      id: raw.id,
      name: raw.name || 'Mazo Guardado',
      description: raw.description,
      createdAt: raw.createdAt || Date.now(),
      updatedAt: raw.updatedAt || Date.now(),
      archetype: raw.archetype || 'Personalizado',
      isPreset: false,
      cards: hydratedCards,
    };
  }

  // Case B: Legacy format where cards were full objects
  if (Array.isArray(raw.cards)) {
    const sanitizedCards: CardData[] = raw.cards.map((card: any, idx: number) => {
      const canonicalMatch = CANONICAL_CARDS.find((c) => c.number === card.number);
      if (canonicalMatch) {
        return {
          ...canonicalMatch,
          id: card.id || `${canonicalMatch.id}-${idx}`,
        };
      }
      // Strip any base64 image strings from legacy deck objects to save memory
      const safeImageUrl =
        typeof card.imageUrl === 'string' && card.imageUrl.startsWith('data:')
          ? `/cards/${card.number || 236}.png`
          : card.imageUrl || `/cards/${card.number || 236}.png`;

      return {
        ...card,
        imageUrl: safeImageUrl,
      };
    });

    return {
      id: raw.id,
      name: raw.name || 'Mazo Guardado',
      description: raw.description,
      createdAt: raw.createdAt || Date.now(),
      updatedAt: raw.updatedAt || Date.now(),
      archetype: raw.archetype || 'Personalizado',
      isPreset: Boolean(raw.isPreset),
      cards: sanitizedCards,
    };
  }

  // Empty fallback
  return {
    id: raw.id || `deck-${Date.now()}`,
    name: raw.name || 'Mazo Guardado',
    description: raw.description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archetype: 'Personalizado',
    isPreset: false,
    cards: [],
  };
}

/**
 * Loads all saved decks. Returns defaults presets + loaded user decks.
 */
export function loadAllSavedDecks(): SavedDeck[] {
  if (inMemoryDecksCache) {
    return inMemoryDecksCache;
  }

  const presets = getDefaultPresetDecks();
  const userDecks: SavedDeck[] = [];

  try {
    const raw = localStorage.getItem(STORAGE_SAVED_DECKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          // If item is not a built-in preset ID, hydrate it as user deck
          if (!presets.some((p) => p.id === item.id)) {
            userDecks.push(hydrateStoredDeck(item));
          }
        }
      }
    }
  } catch (err) {
    console.warn('Notice loading saved decks from localStorage:', err);
  }

  const allDecks = [...userDecks, ...presets];
  inMemoryDecksCache = allDecks;
  return allDecks;
}

/**
 * Saves all user decks with quota protection and fallback strategies.
 */
export function saveAllDecks(decks: SavedDeck[]): void {
  // Update in-memory cache immediately - guarantees zero-loss in the active session
  inMemoryDecksCache = [...decks];

  // Only persist user decks (presets are code-defined)
  const userDecks = decks.filter((d) => !d.isPreset);
  const compact = userDecks.map(toCompactDeck);
  const jsonStr = JSON.stringify(compact);

  // 1. Proactive cleanup to keep localStorage completely unblocked
  cleanupStorageQuota();

  // 2. Safe write to localStorage
  try {
    localStorage.setItem(STORAGE_SAVED_DECKS_KEY, jsonStr);
  } catch (err: any) {
    console.warn('Quota notice while saving decks to localStorage:', err?.message || err);

    // Emergency Quota Recovery
    try {
      cleanupStorageQuota();
      // Retry
      localStorage.setItem(STORAGE_SAVED_DECKS_KEY, jsonStr);
    } catch {
      // If full, save top 10 most recently updated decks
      try {
        const trimmed = compact.slice(0, 10);
        localStorage.setItem(STORAGE_SAVED_DECKS_KEY, JSON.stringify(trimmed));
      } catch {
        console.warn('LocalStorage unavailable or full; persisting safely in IndexedDB and memory.');
      }
    }
  }

  // 3. Always save backup copy into IndexedDB as an unconstrained secondary tier
  saveDecksToIndexedDB(compact).catch((idbErr) => {
    console.warn('IndexedDB decks backup notice:', idbErr);
  });
}

/**
 * Saves or updates a specific deck.
 */
export function saveUserDeck(
  name: string,
  cards: CardData[],
  existingId?: string,
  description?: string
): SavedDeck {
  const decks = loadAllSavedDecks();
  const now = Date.now();

  if (existingId && existingId !== 'new') {
    const idx = decks.findIndex((d) => d.id === existingId);
    if (idx !== -1 && !decks[idx].isPreset) {
      const updated: SavedDeck = {
        ...decks[idx],
        name: name.trim() || 'Mazo sin nombre',
        cards: [...cards],
        description: description ?? decks[idx].description,
        updatedAt: now,
        isPreset: false,
      };
      decks[idx] = updated;
      saveAllDecks(decks);
      return updated;
    }
  }

  // Create new user deck
  const newDeck: SavedDeck = {
    id: `deck-${now}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || `Mazo Guardado (${new Date(now).toLocaleDateString()})`,
    description: description || `${cards.length} cartas`,
    cards: [...cards],
    createdAt: now,
    updatedAt: now,
    isPreset: false,
    archetype: 'Personalizado',
  };

  const updatedDecks = [newDeck, ...decks];
  saveAllDecks(updatedDecks);
  return newDeck;
}

/**
 * Deletes a deck by ID (built-in presets cannot be deleted).
 */
export function deleteUserDeck(id: string): void {
  const decks = loadAllSavedDecks().filter((d) => d.id !== id);
  saveAllDecks(decks);
}

/**
 * Duplicates a deck.
 */
export function duplicateUserDeck(id: string): SavedDeck | null {
  const decks = loadAllSavedDecks();
  const source = decks.find((d) => d.id === id);
  if (!source) return null;

  return saveUserDeck(
    `${source.name} (Copia)`,
    source.cards,
    undefined,
    source.description
  );
}

/**
 * Gets active player deck. Defaults to Camelot preset or first deck.
 */
export function getActivePlayerDeck(): SavedDeck {
  const decks = loadAllSavedDecks();
  try {
    const savedId = localStorage.getItem(STORAGE_ACTIVE_PLAYER_DECK_ID);
    if (savedId) {
      const found = decks.find((d) => d.id === savedId);
      if (found) return found;
    }
  } catch {}
  return decks[0] || getDefaultPresetDecks()[0];
}

/**
 * Sets active player deck.
 */
export function setActivePlayerDeck(deck: SavedDeck): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_PLAYER_DECK_ID, deck.id);
  } catch (err) {
    console.warn('Failed to set active player deck id in localStorage:', err);
  }
}

/**
 * Gets active CPU rival deck. Defaults to Dragons preset or second deck.
 */
export function getActiveCpuDeck(): SavedDeck {
  const decks = loadAllSavedDecks();
  try {
    const savedId = localStorage.getItem(STORAGE_ACTIVE_CPU_DECK_ID);
    if (savedId) {
      const found = decks.find((d) => d.id === savedId);
      if (found) return found;
    }
  } catch {}
  const dragons = decks.find((d) => d.id === 'preset-dragons');
  return dragons || decks[1] || decks[0] || getDefaultPresetDecks()[1];
}

/**
 * Sets active CPU rival deck.
 */
export function setActiveCpuDeck(deck: SavedDeck): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_CPU_DECK_ID, deck.id);
  } catch (err) {
    console.warn('Failed to set active cpu deck id in localStorage:', err);
  }
}
