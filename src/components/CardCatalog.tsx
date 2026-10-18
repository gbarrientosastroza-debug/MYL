import React, { useState, useMemo } from 'react';
import { CardData } from '../types/card';
import { MythosCard } from './MythosCard';
import { ImageDropzone } from './ImageDropzone';
import { soundFx } from '../utils/soundFx';

interface CardCatalogProps {
  cards: CardData[];
  onSelectCard: (card: CardData) => void;
  onEditCard: (card: CardData) => void;
  onAddToDeck: (card: CardData) => void;
  onAnalyzeCard?: (card: CardData) => void;
  onGoToGenerator: () => void;
  onImagesLoaded: (imageMap: Record<number, string>, newCards?: CardData[]) => void;
  onCardsRecognized?: (cards: CardData[]) => void;
  displayMode: 'full-art' | 'frame';
  onToggleDisplayMode: (mode: 'full-art' | 'frame') => void;
  customImagesCount: number;
}

export const CardCatalog: React.FC<CardCatalogProps> = ({
  cards,
  onSelectCard,
  onEditCard,
  onAddToDeck,
  onAnalyzeCard,
  onGoToGenerator,
  onImagesLoaded,
  onCardsRecognized,
  displayMode,
  onToggleDisplayMode,
  customImagesCount,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRace, setFilterRace] = useState<string>('all');
  const [filterCost, setFilterCost] = useState<string>('all');
  const [filterHasCustomImage, setFilterHasCustomImage] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'cost' | 'strength'>('number');
  const [cardFlipMap, setCardFlipMap] = useState<Record<string, boolean>>({});

  const toggleFlip = (id: string) => {
    soundFx.playCardFlick();
    setCardFlipMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // Custom background filter
        if (filterHasCustomImage) {
          const hasCustom = Boolean(
            card.imageUrl &&
            (card.imageUrl.startsWith('data:') || card.imageUrl.startsWith('blob:') || card.isCustom)
          );
          if (!hasCustom) return false;
        }

        // Type filter
        if (filterType !== 'all' && card.type !== filterType) return false;

        // Race filter
        if (filterRace === 'Caballero' && card.race !== 'Caballero') return false;
        if (filterRace === 'Dragón' && card.race !== 'Dragón') return false;
        if (filterRace === 'Faerie' && card.race !== 'Faerie') return false;
        if (filterRace === 'custom' && !card.isCustom) return false;

        // Cost filter
        if (filterCost !== 'all') {
          const costNum = parseInt(filterCost, 10);
          if (card.cost !== costNum) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = card.name.toLowerCase().includes(q);
          const matchAbility = card.ability.toLowerCase().includes(q);
          const matchFlavor = card.flavorText.toLowerCase().includes(q);
          const matchArtist = card.illustrator.toLowerCase().includes(q);
          if (!matchName && !matchAbility && !matchFlavor && !matchArtist) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'number') return a.number - b.number;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'cost') return a.cost - b.cost;
        if (sortBy === 'strength') return b.strength - a.strength;
        return 0;
      });
  }, [cards, filterType, filterRace, filterCost, searchQuery, sortBy]);

  const alliesCount = cards.filter((c) => c.type === 'Aliado').length;
  const talismansCount = cards.filter((c) => c.type === 'Talismán').length;
  const totemsCount = cards.filter((c) => c.type === 'Tótem').length;
  const weaponsCount = cards.filter((c) => c.type === 'Arma').length;
  const goldsCount = cards.filter((c) => c.type === 'Oro').length;
  const customCount = cards.filter((c) => c.isCustom).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-cinzel text-amber-500 font-bold uppercase tracking-wider mb-1">
            <span>Colección Oficial</span>
            <span>·</span>
            <span>Espada Sagrada</span>
            <span>·</span>
            <span>Primera Edición</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-amber-100 tracking-wide">
            Catálogo de Cartas
          </h1>
          {/* Metadata text without pills */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1.5 font-medium flex-wrap">
            <span>{cards.length} cartas en total</span>
            <span aria-hidden="true">·</span>
            <span>{alliesCount} Aliados</span>
            <span aria-hidden="true">·</span>
            <span>{talismansCount} Talismanes</span>
            <span aria-hidden="true">·</span>
            <span>{totemsCount} Tótems</span>
            <span aria-hidden="true">·</span>
            <span>{weaponsCount} Armas</span>
            {customCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400">{customCount} Creadas en Estudio</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onGoToGenerator}
          className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-amber-950/60 self-start md:self-auto"
        >
          <span>✨</span> Generar Nueva Carta
        </button>
      </div>

      {/* Image Backgrounds Loader / Dropzone */}
      <ImageDropzone
        onImagesLoaded={onImagesLoaded}
        onCardsRecognized={onCardsRecognized}
        onEditCard={onEditCard}
        displayMode={displayMode}
        onToggleDisplayMode={onToggleDisplayMode}
        loadedCount={customImagesCount}
        availableCards={cards}
      />

      {/* Control Bar: Filters & Search */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 mb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Type Segmented Filter (Functional Tabs) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 flex-wrap">
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setFilterType('all');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todas ({cards.length})
            </button>
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setFilterType('Aliado');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'Aliado'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🛡️ Aliados ({alliesCount})
            </button>
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setFilterType('Talismán');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'Talismán'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              📜 Talismanes ({talismansCount})
            </button>
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setFilterType('Tótem');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'Tótem'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🗿 Tótems ({totemsCount})
            </button>
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setFilterType('Arma');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'Arma'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ⚔️ Armas ({weaponsCount})
            </button>
            <button
              onClick={() => {
                soundFx.playCardFlick();
                setFilterType('Oro');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === 'Oro'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              🪙 Oros ({goldsCount})
            </button>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar por nombre, texto de habilidad o ilustrador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Secondary row: Race subfilter (when viewing Aliados or All) */}
        {(filterType === 'all' || filterType === 'Aliado') && (
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60 text-xs">
            <span className="text-neutral-400 font-cinzel font-semibold">Raza:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'Caballero', label: 'Caballeros' },
                { id: 'Dragón', label: 'Dragones' },
                { id: 'Faerie', label: 'Faeries' },
                ...(customCount > 0 ? [{ id: 'custom', label: 'Mis Creaciones' }] : [])
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    soundFx.playCardFlick();
                    setFilterRace(r.id);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    filterRace === r.id
                      ? 'bg-neutral-800 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary filters: Cost & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-800/80 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 font-medium">Filtrar por Coste en Oro:</span>
            <div className="flex items-center gap-1">
              {['all', '0', '1', '2', '3', '4', '5', '6', '7'].map((cost) => (
                <button
                  key={cost}
                  onClick={() => setFilterCost(cost)}
                  className={`px-2.5 py-1 rounded text-xs font-cinzel font-semibold transition-colors ${
                    filterCost === cost
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {cost === 'all' ? 'Todos' : `${cost} 🪙`}
                </button>
              ))}
            </div>

            {customImagesCount > 0 && (
              <button
                onClick={() => {
                  soundFx.playCardFlick();
                  setFilterHasCustomImage(!filterHasCustomImage);
                }}
                className={`ml-2 px-2.5 py-1 rounded text-xs font-cinzel font-semibold transition-colors flex items-center gap-1 ${
                  filterHasCustomImage
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'bg-neutral-800 text-amber-300 hover:text-white'
                }`}
                title="Mostrar solo cartas con fondo o imagen personalizada"
              >
                <span>🖼️</span> Con Fondo HD ({customImagesCount})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playCardFlick();
                const areAllFlipped = Object.values(cardFlipMap).some(Boolean);
                const newMap: Record<string, boolean> = {};
                if (!areAllFlipped) {
                  filteredCards.forEach((c) => {
                    newMap[c.id] = true;
                  });
                }
                setCardFlipMap(newMap);
              }}
              className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Voltear todas las cartas para ver el reverso oficial"
            >
              <span>🔄</span> Voltear Reverso
            </button>

            <span className="text-neutral-400">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'number' | 'name' | 'cost' | 'strength')}
              className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs focus:outline-hidden focus:border-amber-500"
            >
              <option value="number">Número de Colección (#)</option>
              <option value="name">Nombre Alfabético (A-Z)</option>
              <option value="cost">Menor Coste en Oro</option>
              <option value="strength">Mayor Fuerza de Ataque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {filteredCards.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="font-cinzel font-bold text-amber-200 text-lg">No se encontraron cartas</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Ninguna carta coincide con los criterios de búsqueda seleccionados. Intenta restablecer los filtros.
          </p>
          <button
            onClick={() => {
              setFilterRace('all');
              setFilterCost('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-semibold"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8 justify-items-center">
          {filteredCards.map((c) => (
            <div
              key={c.id}
              className="flex flex-col items-center group/card transition-transform duration-200 hover:-translate-y-1 relative"
            >
              {/* Badge for cards with custom uploaded background/art */}
              {c.imageUrl && (c.imageUrl.startsWith('data:') || c.imageUrl.startsWith('blob:')) && (
                <div className="absolute -top-2 right-2 z-20 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-cinzel font-bold shadow-md flex items-center gap-1 border border-emerald-400/50 pointer-events-none animate-in fade-in">
                  <span>🖼️</span> HD
                </div>
              )}

              <MythosCard
                card={c}
                size="md"
                displayMode={displayMode}
                isFlipped={cardFlipMap[c.id] || false}
                onClick={() => {
                  soundFx.playCardFlick();
                  onSelectCard(c);
                }}
                interactive={true}
              />

              {/* Action row under each card */}
              <div className="w-full mt-2.5 flex items-center justify-between gap-1 px-1">
                <button
                  onClick={() => toggleFlip(c.id)}
                  className="px-2 py-1 rounded bg-neutral-850 hover:bg-neutral-750 text-[11px] text-neutral-400 hover:text-white transition-colors"
                  title="Voltear carta"
                >
                  🔄
                </button>
                <button
                  onClick={() => {
                    soundFx.playCardFlick();
                    onSelectCard(c);
                  }}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium text-amber-300 transition-colors flex-1 text-center"
                >
                  Detalle 3D
                </button>
                {onAnalyzeCard && (
                  <button
                    onClick={() => onAnalyzeCard(c)}
                    className="px-2 py-1 rounded bg-neutral-850 hover:bg-neutral-750 text-[11px] text-amber-300 hover:text-white transition-colors"
                    title="Analizar Habilidad (D.A.R. 1.0)"
                  >
                    🧠
                  </button>
                )}
                <button
                  onClick={() => onAddToDeck(c)}
                  className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[11px] font-semibold text-white transition-colors"
                  title="Añadir al mazo de duelo"
                >
                  + Mazo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
