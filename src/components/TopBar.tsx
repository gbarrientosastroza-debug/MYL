import React from 'react';
import { soundFx } from '../utils/soundFx';

export type AppView = 'catalog' | 'generator' | 'deck' | 'duel' | 'abilities';

interface TopBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  cardsCount: number;
  onOpenRules?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onNavigate,
  onOpenRules,
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(soundFx.enabled);

  const toggleSound = () => {
    soundFx.enabled = !soundFx.enabled;
    setSoundEnabled(soundFx.enabled);
    if (soundFx.enabled) {
      soundFx.playGoldClink();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/90 border-b border-neutral-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => {
            soundFx.playCardFlick();
            onNavigate('catalog');
          }}
          className="text-lg md:text-xl font-cinzel font-black tracking-wider text-amber-200 hover:text-amber-100 transition-colors uppercase whitespace-nowrap"
        >
          Mitos & Leyendas
        </button>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-300">
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onNavigate('catalog');
            }}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'catalog'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-500'
                : 'hover:text-white'
            }`}
          >
            Catálogo
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onNavigate('generator');
            }}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'generator'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-500'
                : 'hover:text-white'
            }`}
          >
            Generador
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onNavigate('deck');
            }}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'deck'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-500'
                : 'hover:text-white'
            }`}
          >
            Mazo Castillo
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onNavigate('duel');
            }}
            className={`transition-colors whitespace-nowrap ${
              currentView === 'duel'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-500'
                : 'hover:text-white'
            }`}
          >
            Duelo TCG
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              onNavigate('abilities');
            }}
            className={`transition-colors whitespace-nowrap flex items-center gap-1 ${
              currentView === 'abilities'
                ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-500'
                : 'hover:text-white'
            }`}
            title="Motor de Análisis de Habilidades de las 236 cartas D.A.R. 1.0"
          >
            <span>🧠</span> Habilidades (236)
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2.5">
          {onOpenRules && (
            <button
              onClick={() => {
                soundFx.playCardFlick();
                onOpenRules();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 text-xs font-cinzel font-semibold border border-amber-600/30 transition-colors flex items-center gap-1.5"
              title="Ver Documento Actualizado de Reglas (D.A.R. 1.0)"
            >
              <span>📜</span> <span className="hidden sm:inline">Reglas</span> D.A.R.
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white text-xs transition-colors"
            title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            onClick={() => {
              soundFx.playCardFlick();
              onNavigate('generator');
            }}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs transition-colors whitespace-nowrap shadow-sm"
          >
            Crear Carta
          </button>
        </div>
      </div>
    </header>
  );
};
