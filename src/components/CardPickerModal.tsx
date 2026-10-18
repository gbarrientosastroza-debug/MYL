import React, { useState } from 'react';
import { CardData } from '../types/card';
import { MythosCard } from './MythosCard';

interface CardPickerModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  filterLabel?: string;
  cards: CardData[];
  maxSelect?: number;
  onSelect: (selectedCards: CardData[]) => void;
  onClose: () => void;
}

export const CardPickerModal: React.FC<CardPickerModalProps> = ({
  isOpen,
  title,
  subtitle,
  filterLabel,
  cards,
  maxSelect = 1,
  onSelect,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelect = (card: CardData) => {
    if (maxSelect === 1) {
      onSelect([card]);
      return;
    }

    if (selectedIds.includes(card.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== card.id));
    } else {
      if (selectedIds.length < maxSelect) {
        setSelectedIds((prev) => [...prev, card.id]);
      }
    }
  };

  const handleConfirmMulti = () => {
    const selected = cards.filter((c) => selectedIds.includes(c.id));
    if (selected.length > 0) {
      onSelect(selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-500/30 bg-amber-950/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-amber-300 tracking-wider">
                {title}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1">
              {subtitle}
            </p>
            {filterLabel && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-cinzel font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                Filtro Activo: {filterLabel}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors text-lg"
            title="Cerrar búsqueda"
          >
            ✕
          </button>
        </div>

        {/* Card Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {cards.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-4xl">📭</span>
              <p className="mt-3 text-sm font-cinzel text-neutral-400">
                No hay cartas que coincidan con el criterio en esta zona.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-cinzel font-bold transition-all border border-neutral-700"
              >
                Volver al Duelo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5 justify-items-center">
              {cards.map((card, idx) => {
                const isSelected = selectedIds.includes(card.id);
                return (
                  <div
                    key={`${card.id}-${idx}`}
                    onClick={() => toggleSelect(card)}
                    className={`relative cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:scale-105 rounded-xl p-1 ${
                      isSelected
                        ? 'ring-4 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] bg-amber-950/40'
                        : 'hover:ring-2 hover:ring-amber-500/50'
                    }`}
                  >
                    <MythosCard card={card} size="sm" interactive={false} />

                    {/* Selection Indicator */}
                    {maxSelect === 1 ? (
                      <div className="mt-2 text-center">
                        <span className="inline-block px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-cinzel font-bold shadow-md transition-colors">
                          Elegir Esta
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-[10px] font-cinzel font-bold shadow-md transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          {isSelected ? '✓ Seleccionada' : 'Seleccionar'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (For multi-select) */}
        {maxSelect > 1 && cards.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-amber-500/30 bg-neutral-950 flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-cinzel">
              Seleccionadas: {selectedIds.length} / {maxSelect}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-cinzel transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={selectedIds.length === 0}
                onClick={handleConfirmMulti}
                className={`px-5 py-1.5 rounded-lg text-xs font-cinzel font-bold tracking-wider transition-all shadow-md ${
                  selectedIds.length === 0
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                }`}
              >
                Confirmar Selección ({selectedIds.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
