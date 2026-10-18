import React, { useState } from 'react';

interface DarRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DarRulesModal: React.FC<DarRulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'fases' | 'zonas' | 'combate' | 'glosario'>('fases');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] bg-neutral-900 border border-amber-900/50 rounded-2xl shadow-2xl p-6 flex flex-col text-neutral-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-cinzel text-amber-500 font-bold uppercase tracking-wider">
              <span>Mitos y Leyendas</span>
              <span>·</span>
              <span>D.A.R. Versión 1.0 (Julio 2021)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-cinzel font-bold text-amber-100">
              Reglamento Oficial: Formato Primer Bloque
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-neutral-800 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('fases')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'fases'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            ⏳ Fases del Turno (5.1 - 5.5)
          </button>
          <button
            onClick={() => setActiveTab('combate')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'combate'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            ⚔️ Batalla & Guerra de Talismanes (5.3)
          </button>
          <button
            onClick={() => setActiveTab('zonas')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'zonas'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            🗺️ Zonas de Juego (4.3)
          </button>
          <button
            onClick={() => setActiveTab('glosario')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'glosario'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            📖 Glosario & Palabras Clave (6.0)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-4 pr-2 space-y-4 text-xs text-neutral-300 leading-relaxed">
          {activeTab === 'fases' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  1. Fase de Agrupación (DAR 5.1)
                </h3>
                <p>
                  Los Aliados en la <strong>Línea de Ataque</strong> regresan a la <strong>Línea de Defensa</strong> y las cartas de Oro en la <strong>Zona de Oro Pagado</strong> se mueven de regreso a la <strong>Reserva de Oro</strong>. Se disparan habilidades en respuesta a la Agrupación (ej. Rey Arturo). Solo los Aliados presentes desde esta fase podrán ser declarados atacantes en este turno.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  2. Fase de Vigilia (DAR 5.2)
                </h3>
                <p>
                  El Jugador Activo se prepara para la batalla:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-neutral-300">
                  <li><strong>Jugar Oro (opcional):</strong> El jugador activo puede bajar 1 Oro de su mano a su Reserva de Oro (máximo 1 por turno al inicio de Vigilia).</li>
                  <li><strong>Jugar Aliados:</strong> Paga el coste en Oro de la Reserva a Oro Pagado y entra en la Línea de Defensa.</li>
                  <li><strong>Jugar Tótems & Armas:</strong> Los Tótems se ubican en la Línea de Apoyo. Las Armas se cargan sobre un Aliado portador válido.</li>
                  <li><strong>Jugar Talismanes:</strong> Resuelven su efecto de 0% a 100% y van al Cementerio.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  3. Batalla Mitológica (DAR 5.3)
                </h3>
                <p>
                  Fase opcional si el Jugador Activo decide atacar. Se compone de 4 pasos: Declaración de Ataque, Declaración de Bloqueo, Guerra de Talismanes y Asignación de Daño.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  4. Fase Final (DAR 5.4)
                </h3>
                <p>
                  Concluyen todos los efectos y modificadores que dicen "hasta la Fase Final". Se disparan los efectos que dicen "en la Fase Final" (intercalando jugador activo y luego inactivo).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  5. Final del Turno (DAR 5.5)
                </h3>
                <p>
                  El Jugador Activo <strong>roba 1 carta</strong> de su Mazo Castillo. Se verifica el límite de mano: si tiene más de <strong>8 cartas en mano</strong>, debe descartar cartas al Cementerio hasta quedarse con 8. Luego comienza el turno oponente.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'combate' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  5.3.1 Declaración de Ataque
                </h3>
                <p>
                  El Jugador Activo elige qué Aliados atacarán y los traslada de la Línea de Defensa a la <strong>Línea de Ataque</strong>. Requisito DAR: solo pueden atacar Aliados que hayan permanecido en juego bajo su control desde el inicio de la última Fase de Agrupación (salvo si indican <em>"Puede atacar el turno que entra en juego"</em>).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  5.3.2 Declaración de Bloqueo
                </h3>
                <p>
                  El jugador defensor elige qué Aliados de su Línea de Defensa bloquean a los atacantes <strong>uno a uno (1 a 1)</strong>. Los Aliados en Línea de Ataque no pueden bloquear. Los Aliados con la habilidad <strong>Imbloqueable</strong> no pueden ser designados por bloqueadores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-amber-600/40">
                <h3 className="text-amber-300 font-cinzel font-bold text-sm mb-1">
                  5.3.3 Guerra de Talismanes (Prioridad Oficial)
                </h3>
                <p>
                  ¡El momento cumbre de la batalla!
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-neutral-300">
                  <li><strong>Prioridad Inicial:</strong> El jugador defensor tiene la prioridad para jugar un Talismán o utilizar una Habilidad activada.</li>
                  <li><strong>Intercalación 1 a 1:</strong> Las acciones se alternan entre ambos jugadores. Si un jugador no desea jugar en ese turno, puede <em>Ceder/Pasar Prioridad</em>.</li>
                  <li><strong>Fin de Guerra de Talismanes:</strong> Termina cuando ambos jugadores deciden no jugar más cartas consecutivamente.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <h3 className="text-amber-400 font-cinzel font-bold text-sm mb-1">
                  5.3.4 Asignación de Daño (Comparación de Fuerzas)
                </h3>
                <div className="space-y-2 mt-1">
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <strong className="text-emerald-400">Atacante &gt; Bloqueador:</strong> La diferencia de Fuerza (Fuerza Atacante - Fuerza Bloqueador) se asigna como Daño directo al Mazo Castillo del defensor (bota cartas de arriba al cementerio). El Bloqueador es Destruido.
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <strong className="text-amber-400">Atacante == Bloqueador:</strong> Ambos Aliados son Destruidos por Daño de combate. El Mazo Castillo no recibe daño.
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <strong className="text-red-400">Bloqueador &gt; Atacante:</strong> El Aliado Atacante es Destruido. El Mazo Castillo no recibe daño.
                  </div>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                    <strong className="text-purple-400">Ataque No Bloqueado:</strong> Toda la Fuerza del atacante se asigna directamente al Mazo Castillo rival (bota tantas cartas como su Fuerza).
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'zonas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Mazo Castillo (4.3.1)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  50 cartas en mazo legal, incluye el Oro Inicial. Si en cualquier momento un jugador se queda sin cartas en su Mazo Castillo, pierde el juego de inmediato.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Reserva de Oro (4.3.2)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Oros disponibles para pagar cartas y habilidades. Cada jugador comienza con 1 Oro sin Habilidad en su Reserva.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Zona de Oro Pagado (4.3.3)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Oros agotados tras pagar costes. Se reagrupan hacia la Reserva en la Fase de Agrupación.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Línea de Defensa (4.3.4)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Donde se colocan los Aliados al entrar en juego y desde donde pueden bloquear ataques oponentes.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Línea de Ataque (4.3.5)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Donde se sitúan los Aliados declarados atacantes. No pueden bloquear ataques oponentes.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Línea de Apoyo (4.3.6)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Donde se juegan y residen los Tótems y Armas que aportan efectos continuos o bonificaciones.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Cementerio & Destierro (4.3.7 - 4.3.8)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Zona pública para cartas destruidas/botadas o desterradas del juego.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <h4 className="font-cinzel font-bold text-amber-300">Mano (4.3.10)</h4>
                <p className="text-[11px] mt-1 text-neutral-400">
                  Cartas en mano del jugador. Máximo 8 cartas al final del turno.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'glosario' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Botar (6.4):</span> Enviar cartas desde el tope superior del Mazo Castillo al Cementerio como Daño de Combate o Directo.
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Carta Única (4.13):</span> Solo se puede controlar 1 copia de esa carta en juego a la vez. Si entra una segunda copia, una debe ir al Cementerio.
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Imbloqueable (6.17):</span> El Aliado atacante no puede ser asignado por ningún bloqueador en Batalla Mitológica.
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Indestructible (6.19):</span> La carta no puede ser destruida por daño de combate ni por efectos que digan "destruir".
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Indesterrable (6.18):</span> La carta no puede ser enviada a la Zona de Destierro por efectos.
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Anular vs Cancelar (4.7 & 4.8):</span> Anular evita que una carta entre en juego o se resuelva. Cancelar detiene la habilidad de una carta que ya está en juego.
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="font-bold text-amber-300 font-cinzel">Oro Inicial (4.2.5):</span> Se comienza con 1 Oro sin Habilidad en la Reserva de Oro al inicio del duelo.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            Entendido, volver al juego
          </button>
        </div>
      </div>
    </div>
  );
};
