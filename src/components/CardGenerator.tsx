import React, { useState } from 'react';
import { CardData, CardType, CardRace, CardRarity, FoilEffect } from '../types/card';
import { MythosCard } from './MythosCard';
import { exportCardAsPng, exportCardBackAsPng } from '../utils/cardCanvasExport';
import { soundFx } from '../utils/soundFx';
import { CANONICAL_CARDS } from '../data/canonicalCards';

interface CardGeneratorProps {
  initialCard?: CardData;
  onSaveCard: (card: CardData) => void;
  onGoToCatalog: () => void;
}

export const CardGenerator: React.FC<CardGeneratorProps> = ({
  initialCard,
  onSaveCard,
  onGoToCatalog,
}) => {
  const defaultCard: CardData = initialCard || {
    id: `custom-${Date.now()}`,
    number: 21,
    totalInSet: 236,
    edition: 'PRIMERA EDICION',
    name: 'REY DE CAMELOT',
    type: 'Aliado',
    race: 'Caballero',
    strength: 3,
    cost: 4,
    flavorText: 'CUANDO LA ESPADA DE LUZ TOCA LA ROCA, EL DESTINO DEL REINO DESPIERTA.',
    ability: 'Cuando este Aliado entra en juego, tus demás Caballeros ganan +1 a la fuerza hasta el final del turno.',
    illustrator: 'MAURICIO HERRERA',
    rarity: 'Ultra Real',
    foil: 'rainbow',
    imagePreset: 'arturo',
    isCustom: true,
  };

  const [card, setCard] = useState<CardData>(defaultCard);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'full-art' | 'frame'>('full-art');
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const handleInputChange = (field: keyof CardData, value: unknown) => {
    setCard((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCard((prev) => ({
          ...prev,
          imageUrl: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    soundFx.playSummon();
    onSaveCard({
      ...card,
      id: card.id.startsWith('mylo-') ? `custom-remix-${Date.now()}` : card.id,
      isCustom: true,
    });
    setSaveNotification(`¡Carta "${card.name}" guardada con éxito en la colección!`);
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      soundFx.playCardFlick();
      if (isFlipped) {
        await exportCardBackAsPng();
      } else {
        await exportCardAsPng(card, previewMode);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleLoadCanonical = (index: number) => {
    const target = CANONICAL_CARDS[index];
    if (target) {
      soundFx.playCardFlick();
      setCard({ ...target });
    }
  };

  const handleRandomize = () => {
    soundFx.playGoldClink();
    const races: CardRace[] = ['Caballero', 'Dragón', 'Faerie', 'Héroe', 'Eterno'];
    const names = [
      'Galahad el Purificado',
      'Dragón del Cataclismo',
      'Morgana Le Fay',
      'Caballero del Grial',
      'Dragón Ancestral de Roca',
      'Merlín el Iluminado',
      'Dragón de Sombras',
    ];
    const abilities = [
      'Cuando entra en juego, destruye un Aliado oponente de coste 3 o menor.',
      'Tus demás Aliados de su raza ganan +1 a la fuerza.',
      'En guerra de talismanes, puedes desterrar esta carta para anular un efecto oponente.',
      'Puede atacar en el turno en que entra en juego.',
      'Al ser destruido, busca un Aliado en tu mazo castillo y ponlo en tu mano.',
    ];
    const randomRace = races[Math.floor(Math.random() * races.length)];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)];
    const randomPreset = randomRace === 'Dragón' ? 'magma' : 'arturo';

    setCard((prev) => ({
      ...prev,
      id: `custom-${Date.now()}`,
      name: randomName.toUpperCase(),
      race: randomRace,
      strength: Math.floor(Math.random() * 4) + 1,
      cost: Math.floor(Math.random() * 5) + 2,
      ability: randomAbility,
      imagePreset: randomPreset,
      imageUrl: undefined,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
        <div>
          <span className="text-xs uppercase font-cinzel text-amber-500 tracking-widest font-bold">
            Estudio de Creación · Primera Edición
          </span>
          <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-amber-100 tracking-wide mt-1">
            Generador de Cartas
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Diseña y genera cartas con el auténtico formato clásico de Mitos y Leyendas: Espada Sagrada.
            Edita las 20 cartas canónicas o crea tus propias cartas legendarias listas para imprimir en PNG o jugar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRandomize}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>🎲</span> Idea Aleatoria
          </button>
          <button
            onClick={onGoToCatalog}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>📚</span> Ver Catálogo (20 Cartas)
          </button>
        </div>
      </div>

      {/* Quick Preset Selector for the 20 Canonical Cards */}
      <div className="mb-8 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="text-xs font-cinzel font-bold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Plantillas de Cartas Canónicas (1 al 20)</span>
          <span className="text-[11px] text-neutral-400">Haz clic para cargar y editar cualquiera</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {CANONICAL_CARDS.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => handleLoadCanonical(idx)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                card.name === c.name
                  ? 'bg-amber-600 text-white font-bold shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              #{c.number} {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {saveNotification && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <span>✅</span> {saveNotification}
        </div>
      )}

      {/* Two Column Workspace: Live 3D Preview (Left) & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live 3D Interactive Card Preview */}
        <div className="lg:col-span-5 flex flex-col items-center sticky top-6">
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl flex flex-col items-center w-full">
            <div className="mb-4 text-xs font-cinzel font-semibold text-neutral-400 uppercase tracking-widest text-center">
              Vista Previa 3D Interactiva
            </div>

            {/* The Scalable MythosCard Component */}
            <div className="my-2">
              <MythosCard
                card={card}
                size="lg"
                displayMode={previewMode}
                isFlipped={isFlipped}
                interactive={true}
              />
            </div>

            {/* View Mode & Actions Under Preview */}
            <div className="flex items-center gap-1.5 my-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playCardFlick();
                  setPreviewMode(previewMode === 'full-art' ? 'frame' : 'full-art');
                }}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-amber-300 font-medium transition-colors"
              >
                {previewMode === 'full-art' ? '⚔️ Ver Marco Renderizado' : '🖼️ Ver Fondo Completo'}
              </button>
            </div>

            <div className="w-full flex items-center justify-center gap-2 mt-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => {
                  soundFx.playCardFlick();
                  setIsFlipped(!isFlipped);
                }}
                className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>🔄</span> Voltear
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>📥</span> {isExporting ? 'Renderizando...' : (isFlipped ? 'Exportar Reverso PNG' : 'Exportar PNG (750x1050)')}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950"
              >
                <span>💾</span> Guardar
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 text-center mt-3">
              Mueve el cursor para interactuar con la iluminación 3D y el foil holográfico.
            </p>
          </div>
        </div>

        {/* Right Column: Customizer Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-5">
            <h2 className="text-lg font-cinzel font-bold text-amber-200 border-b border-neutral-800 pb-3">
              Información Básica de la Carta
            </h2>

            {/* Card Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                Nombre de la Carta
              </label>
              <input
                type="text"
                value={card.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej. REY ARTURO PENDRAGON"
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 font-cinzel font-bold text-sm tracking-wide"
              />
            </div>

            {/* Type & Race */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Tipo de Carta
                </label>
                <select
                  value={card.type}
                  onChange={(e) => handleInputChange('type', e.target.value as CardType)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-sm"
                >
                  <option value="Aliado">Aliado</option>
                  <option value="Talismán">Talismán</option>
                  <option value="Arma">Arma</option>
                  <option value="Tótem">Tótem</option>
                  <option value="Oro">Oro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Raza del Aliado
                </label>
                <select
                  value={card.race}
                  onChange={(e) => handleInputChange('race', e.target.value as CardRace)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-sm font-medieval italic"
                >
                  <option value="Caballero">Caballero</option>
                  <option value="Dragón">Dragón</option>
                  <option value="Faerie">Faerie</option>
                  <option value="Olímpico">Olímpico</option>
                  <option value="Héroe">Héroe</option>
                  <option value="Sombra">Sombra</option>
                  <option value="Eterno">Eterno</option>
                  <option value="Bestia">Bestia</option>
                  <option value="Sacerdote">Sacerdote</option>
                  <option value="Sin Raza">Sin Raza</option>
                </select>
              </div>
            </div>

            {/* Strength & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel flex items-center justify-between">
                  <span>🛡️ Fuerza de Combate (Escudo)</span>
                  <span className="text-amber-400 font-bold">{card.strength}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={card.strength}
                  onChange={(e) => handleInputChange('strength', parseInt(e.target.value) || 0)}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel flex items-center justify-between">
                  <span>🪙 Coste en Oro (Moneda)</span>
                  <span className="text-amber-400 font-bold">{card.cost}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={card.cost}
                  onChange={(e) => handleInputChange('cost', parseInt(e.target.value) || 0)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Flavor Text (Cita / Lore) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                Cita / Lore de Ambientación
              </label>
              <textarea
                rows={2}
                value={card.flavorText}
                onChange={(e) => handleInputChange('flavorText', e.target.value)}
                placeholder="Frase o cita histórica en mayúsculas..."
                className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-xs font-cinzel font-medium"
              />
            </div>

            {/* Ability Text */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                Texto de Habilidad / Reglas de Juego
              </label>
              <textarea
                rows={3}
                value={card.ability}
                onChange={(e) => handleInputChange('ability', e.target.value)}
                placeholder="Efecto de la carta cuando entra en juego o en combate..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-sm font-medieval"
              />
            </div>
          </div>

          {/* Card Aesthetics & Illustration */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-5">
            <h2 className="text-lg font-cinzel font-bold text-amber-200 border-b border-neutral-800 pb-3">
              Ilustración y Efectos Visuales
            </h2>

            {/* Preset Illustration or File Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Estilo de Ilustración Predefinido
                </label>
                <select
                  value={card.imagePreset || 'arturo'}
                  onChange={(e) => {
                    handleInputChange('imagePreset', e.target.value);
                    handleInputChange('imageUrl', undefined);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-sm"
                >
                  <option value="arturo">Rey Arturo (Castillo dorado y capa roja)</option>
                  <option value="guinivere">Reina Guinivere (Damasco violeta y oro)</option>
                  <option value="lancelot">Sir Lancelot (Armadura de plata y corcel)</option>
                  <option value="gawein">Sir Gawein (Hacha de guerra y fuego)</option>
                  <option value="wyrm">El Gran Wyrm (Colosal dragón zafiro)</option>
                  <option value="magma">Dragón de Magma (Fuego volcánico)</option>
                  <option value="eter">Dragón de Éter (Relámpagos tormentosos)</option>
                  <option value="demonio">Dragón Demonio (Abismo carmesí)</option>
                  <option value="luz">Dragón de Luz (Haces celestiales)</option>
                  <option value="aire">Dragón de Aire (Alas extendidas en cielo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  O Subir Ilustración Propia
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Foil Holographic Effect & Rarity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Acabado Foil Holográfico
                </label>
                <select
                  value={card.foil}
                  onChange={(e) => handleInputChange('foil', e.target.value as FoilEffect)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-sm"
                >
                  <option value="none">Sin Foil (Estándar)</option>
                  <option value="rainbow">Foil Arcoíris Prisma (Ultra Real)</option>
                  <option value="gold">Foil Dorado Metálico (Real)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Rareza
                </label>
                <select
                  value={card.rarity}
                  onChange={(e) => handleInputChange('rarity', e.target.value as CardRarity)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-hidden focus:border-amber-500 text-sm"
                >
                  <option value="Vasallo">Vasallo (Común)</option>
                  <option value="Cortesano">Cortesano (Infrecuente)</option>
                  <option value="Real">Real (Rara)</option>
                  <option value="Ultra Real">Ultra Real (Mítica Holográfica)</option>
                  <option value="Promocional">Promocional Especial</option>
                </select>
              </div>
            </div>

            {/* Illustrator & Collector Credits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Ilustrador
                </label>
                <input
                  type="text"
                  value={card.illustrator}
                  onChange={(e) => handleInputChange('illustrator', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs font-medium uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Número
                </label>
                <input
                  type="number"
                  value={card.number}
                  onChange={(e) => handleInputChange('number', parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5 font-cinzel">
                  Edición
                </label>
                <input
                  type="text"
                  value={card.edition}
                  onChange={(e) => handleInputChange('edition', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs font-medium uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
