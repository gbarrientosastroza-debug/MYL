import React from 'react';

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

interface DecisionModalProps {
  isOpen: boolean;
  cardName: string;
  title?: string;
  description?: string;
  options: DecisionOption[];
  onChoose: (optionId: string) => void;
  onCancel?: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  cardName,
  title = 'ELECCIÓN DE HABILIDAD',
  description = 'Esta carta te permite elegir entre 2 efectos posibles. Selecciona el que deseas activar:',
  options,
  onChoose,
  onCancel,
}) => {
  if (!isOpen || options.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-500/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.3)] p-5 sm:p-6 overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Header */}
        <div className="text-center mb-5">
          <span className="inline-block text-3xl mb-1">⚖️</span>
          <h2 className="font-cinzel text-lg sm:text-xl font-bold text-amber-300 tracking-wider">
            {title}
          </h2>
          <p className="text-xs text-amber-500/90 font-cinzel font-semibold uppercase mt-0.5">
            Efecto de: {cardName}
          </p>
          <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <button
              key={opt.id}
              onClick={() => onChoose(opt.id)}
              className="w-full text-left p-4 rounded-xl border border-amber-500/40 bg-neutral-900/90 hover:bg-amber-950/40 hover:border-amber-400 transition-all duration-200 group flex items-start gap-3.5 shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transform hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-xl shrink-0 group-hover:bg-amber-500/30">
                {opt.icon || (idx === 0 ? '🅰️' : '🅱️')}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-cinzel text-sm font-bold text-amber-200 group-hover:text-amber-100">
                    {opt.label}
                  </h3>
                  <span className="text-[10px] text-amber-400 font-cinzel opacity-0 group-hover:opacity-100 transition-opacity">
                    Elegir ➔
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Optional cancel if allowed */}
        {onCancel && (
          <div className="mt-4 pt-3 border-t border-neutral-800 text-center">
            <button
              onClick={onCancel}
              className="text-xs font-cinzel text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancelar acción
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
