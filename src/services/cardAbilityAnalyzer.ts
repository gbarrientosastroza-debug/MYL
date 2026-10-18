import { CardData, CardType, CardRace, PlayerState } from '../types/card';
import { CANONICAL_CARDS } from '../data/canonicalCards';

export type TimingCategory =
  | 'Al Entrar'
  | 'Activada en Vigilia'
  | 'Aura Continua'
  | 'Guerra de Talismanes'
  | 'Al Atacar / Bloquear'
  | 'Respuesta / Disparada'
  | 'Fase de Agrupación'
  | 'Final del Turno'
  | 'Pasiva de Portador'
  | 'Efecto Estático / Especial'
  | 'Sin Habilidad';

export type CombatRole =
  | 'Agresivo'
  | 'Control'
  | 'Aceleración / Economía'
  | 'Defensa / Muro'
  | 'Disrupción'
  | 'Soporte / Tutor'
  | 'Vanilla';

export interface EffectTag {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface CostAnalysis {
  goldCost: number;
  mustDiscard: number;
  mustDestroySelf: boolean;
  mustBanishSelf: boolean;
  mustSacrificeAlly: boolean;
  summary: string;
}

export interface TargetAnalysis {
  targetType: string;
  targetOwner: 'Propio' | 'Oponente' | 'Ambos' | 'Cualquiera' | 'Sin Objetivo';
  targetZone: string;
  restriction: string;
}

export type TriggerEventType =
  | 'al_entrar'
  | 'activada_vigilia'
  | 'dano_castillo_combate'
  | 'al_bloquear'
  | 'guerra_talismanes'
  | 'fase_agrupacion'
  | 'final_turno'
  | 'aura_continua'
  | 'respuesta_disparada'
  | 'efecto_estatico';

export interface ConditionalAction {
  order: number;
  description: string;
  actionType:
    | 'dano_castillo'
    | 'descarte_oponente'
    | 'descarte_propio'
    | 'robo_cartas'
    | 'busqueda_tutor'
    | 'modificador_fuerza'
    | 'destruccion'
    | 'destierro'
    | 'generacion_oro'
    | 'ver_mano_oponente'
    | 'barajar_castillo'
    | 'retorno_mano'
    | 'anulacion_talismanes'
    | 'imbloqueable'
    | 'furia_ataque_inmediato'
    | 'otro';
  isPrecondition: boolean;
  preconditionLabel?: string;
  count?: number;
  target?: string;
}

export interface CardAbilityPartAnalysis {
  index: number;
  rawText: string;
  timingCategory: TimingCategory;
  timingBadgeColor: string;
  darRuleRef: string;
  triggerConditionDescription: string;
  costAnalysis: CostAnalysis;
  targetAnalysis: TargetAnalysis;
  effectTags: EffectTag[];
  isOncePerTurn: boolean;
  canAttackImmediately?: boolean;
  isEntryTrigger: boolean;
  isActivatedTrigger: boolean;
  triggerEvent?: TriggerEventType;
  hasPrecondition?: boolean;
  preconditionDescription?: string;
  isConditionalOnPriorAction?: boolean;
  dependentActions?: ConditionalAction[];
}

export interface CardAbilityAnalysis {
  cardNumber: number;
  cardName: string;
  cardType: CardType;
  race: CardRace;
  cost: number;
  strength: number;
  hasAbility: boolean;
  rawAbility: string;
  timingCategory: TimingCategory;
  timingBadgeColor: string;
  darRuleRef: string;
  triggerConditionDescription: string;
  costAnalysis: CostAnalysis;
  targetAnalysis: TargetAnalysis;
  effectTags: EffectTag[];
  howToApplySteps: string[];
  combatRole: CombatRole;
  metaSummary: string;
  canSimulate: boolean;
  abilityParts: CardAbilityPartAnalysis[];
  hasMultiAction: boolean;
  hasConditionalSequence: boolean;
  hasMultiTiming: boolean;
  timingsSummary: string[];
  conditionalBreakdown: string[];
}

export interface SimulatedGameState {
  playerGold: number;
  playerHandCount: number;
  playerCastleCount: number;
  playerDefenseCount: number;
  playerCemeteryCount: number;
  playerExileCount: number;
  cpuCastleCount: number;
  cpuDefenseCount: number;
  cpuCemeteryCount: number;
  activeAuras: string[];
  log: string[];
}

export interface SimulationResult {
  success: boolean;
  actionSummary: string;
  detailedLog: string[];
  stateBefore: SimulatedGameState;
  stateAfter: SimulatedGameState;
  resourceDelta: {
    gold: number;
    hand: number;
    castle: number;
    defense: number;
    opponentCastleDamage: number;
    opponentDefenseLost: number;
  };
}

// Effect Tag Definitions
export const EFFECT_TAGS: Record<string, EffectTag> = {
  GENERA_ORO: {
    id: 'GENERA_ORO',
    label: 'Genera Oro',
    icon: '🪙',
    color: 'bg-amber-900/80 text-amber-200 border-amber-500',
    description: 'Añade oro temporal o permanente a la Reserva de Oro para pagar costes.',
  },
  ROBO_CARTAS: {
    id: 'ROBO_CARTAS',
    label: 'Robo de Cartas',
    icon: '🎴',
    color: 'bg-blue-900/80 text-blue-200 border-blue-500',
    description: 'Permite tomar cartas del Mazo Castillo y ponerlas en la mano.',
  },
  BUSQUEDA_CASTILLO: {
    id: 'BUSQUEDA_CASTILLO',
    label: 'Búsqueda en Castillo (Tutor)',
    icon: '🔍',
    color: 'bg-indigo-900/80 text-indigo-200 border-indigo-500',
    description: 'Examina el Mazo Castillo buscando una carta específica que cumpla condiciones.',
  },
  DANO_CASTILLO: {
    id: 'DANO_CASTILLO',
    label: 'Daño al Castillo (Mill)',
    icon: '💔',
    color: 'bg-red-950/80 text-red-200 border-red-600',
    description: 'Envía cartas directamente desde la parte superior del Mazo Castillo al Cementerio.',
  },
  MODIFICADOR_FUERZA: {
    id: 'MODIFICADOR_FUERZA',
    label: 'Modificador de Fuerza',
    icon: '⚔️',
    color: 'bg-emerald-950/80 text-emerald-200 border-emerald-500',
    description: 'Aumenta o reduce la Fuerza de Aliados en juego.',
  },
  DESTRUCCION: {
    id: 'DESTRUCCION',
    label: 'Destrucción',
    icon: '💥',
    color: 'bg-rose-950/80 text-rose-200 border-rose-600',
    description: 'Envía cartas en juego directamente a su Cementerio.',
  },
  DESTIERRO: {
    id: 'DESTIERRO',
    label: 'Destierro',
    icon: '🌌',
    color: 'bg-purple-950/80 text-purple-200 border-purple-500',
    description: 'Envía cartas a la Zona de Destierro (fuera de la partida de forma permanente).',
  },
  ANULACION: {
    id: 'ANULACION',
    label: 'Anulación / Cancelación',
    icon: '🛑',
    color: 'bg-cyan-950/80 text-cyan-200 border-cyan-500',
    description: 'Interrumpe y cancela los efectos de un Talismán o habilidad en juego.',
  },
  RECUPERACION_CEMENTERIO: {
    id: 'RECUPERACION_CEMENTERIO',
    label: 'Recuperación de Cementerio',
    icon: '🪦',
    color: 'bg-stone-900 text-stone-200 border-stone-500',
    description: 'Recupera cartas del Cementerio y las devuelve a la mano o al campo.',
  },
  IMBLOQUEABLE: {
    id: 'IMBLOQUEABLE',
    label: 'Imbloqueable',
    icon: '💨',
    color: 'bg-yellow-950/80 text-yellow-200 border-yellow-500',
    description: 'El Aliado no puede ser asignado a bloqueadores y golpea directo al Castillo.',
  },
  AURA_CONTINUA: {
    id: 'AURA_CONTINUA',
    label: 'Aura Continua',
    icon: '✨',
    color: 'bg-teal-950/80 text-teal-200 border-teal-500',
    description: 'Efecto permanente que modifica las reglas o estadísticas mientras permanezca en mesa.',
  },
  RESTRICCION_JUEGO: {
    id: 'RESTRICCION_JUEGO',
    label: 'Restricción / Bloqueo',
    icon: '🔒',
    color: 'bg-neutral-900 text-neutral-300 border-neutral-600',
    description: 'Impide a los jugadores realizar acciones específicas (jugar talismanes, etc.).',
  },
  CONTROL_CARTAS: {
    id: 'CONTROL_CARTAS',
    label: 'Control / Robo de Carta',
    icon: '🧲',
    color: 'bg-fuchsia-950/80 text-fuchsia-200 border-fuchsia-500',
    description: 'Toma el control o pone en tu campo cartas del oponente.',
  },
  BARAJAR: {
    id: 'BARAJAR',
    label: 'Barajar al Castillo',
    icon: '🔄',
    color: 'bg-sky-950/80 text-sky-200 border-sky-500',
    description: 'Devuelve cartas de la mesa al Mazo Castillo y se baraja.',
  },
  INHABILITAR_BLOQUEO: {
    id: 'INHABILITAR_BLOQUEO',
    label: 'Inhabilita Bloqueo / Defensa',
    icon: '🚫',
    color: 'bg-rose-950/90 text-rose-300 border-rose-500',
    description: 'Impide a un Aliado defender o bloquear ataques durante este turno (DAR 5.3.2).',
  },
};

/**
 * Universal Parser and Semantic Analyzer for Any Card
 */
export function analyzeCardAbility(card: CardData): CardAbilityAnalysis {
  const text = (card.ability || '').trim();
  const lower = text.toLowerCase();
  const hasAbility = text.length > 0;

  // 1. Timing category detection
  let timingCategory: TimingCategory = 'Sin Habilidad';
  let timingBadgeColor = 'bg-neutral-800 text-neutral-400 border-neutral-700';
  let darRuleRef = 'D.A.R. 4.2 Conceptos Generales';
  let triggerConditionDescription = 'Sin efecto activo';

  if (!hasAbility) {
    timingCategory = 'Sin Habilidad';
    timingBadgeColor = 'bg-neutral-800 text-neutral-400 border-neutral-700';
    darRuleRef = 'D.A.R. 4.2.1 Aliados sin habilidad (Vanilla)';
    triggerConditionDescription = 'No posee texto de habilidad especial. Participa en ataque y defensa con su Fuerza base.';
  } else if (
    lower.includes('en guerra de talismanes') ||
    lower.includes('guerra de talismanes')
  ) {
    timingCategory = 'Guerra de Talismanes';
    timingBadgeColor = 'bg-purple-900 text-purple-200 border-purple-500';
    darRuleRef = 'D.A.R. 5.3.3 Guerra de Talismanes (Ventana de Prioridad 6.7)';
    triggerConditionDescription = 'Solo puede activarse durante la subfase 5.3.3 de Combate cuando se tiene la prioridad.';
  } else if (
    lower.includes('en respuesta') ||
    lower.includes('en respuesta a que') ||
    lower.includes('si tu oponente juega')
  ) {
    timingCategory = 'Respuesta / Disparada';
    timingBadgeColor = 'bg-rose-900 text-rose-200 border-rose-500';
    darRuleRef = 'D.A.R. 6.7 Regla de Respuesta y Prioridad';
    triggerConditionDescription = 'Se dispara en respuesta directa a una acción del oponente o evento en mesa.';
  } else if (
    lower.includes('cuando entra') ||
    lower.includes('entra en juego') ||
    lower.includes('al entrar en juego') ||
    lower.includes('al entrar')
  ) {
    timingCategory = 'Al Entrar';
    timingBadgeColor = 'bg-emerald-900 text-emerald-200 border-emerald-500';
    darRuleRef = 'D.A.R. 5.2.1 / 6.1 Disparo por Ingreso a Zona de Juego';
    triggerConditionDescription = 'Se ejecuta inmediatamente cuando la carta es bajada con éxito a la mesa.';
  } else if (
    lower.includes('en tu fase de vigilia') ||
    lower.includes('en fase de vigilia')
  ) {
    timingCategory = 'Activada en Vigilia';
    timingBadgeColor = 'bg-blue-900 text-blue-200 border-blue-500';
    darRuleRef = 'D.A.R. 5.2 Fase de Vigilia (Acción Activa)';
    triggerConditionDescription = 'Habilidad activada por el jugador durante su fase principal de Vigilia.';
  } else if (
    lower.includes('al atacar') ||
    lower.includes('cuando ataca') ||
    lower.includes('cuando bloquea') ||
    lower.includes('al ser bloqueado') ||
    lower.includes('si hace daño') ||
    lower.includes('puede atacar cuando entra')
  ) {
    timingCategory = 'Al Atacar / Bloquear';
    timingBadgeColor = 'bg-amber-900 text-amber-200 border-amber-500';
    darRuleRef = 'D.A.R. 5.3 Fase de Batalla Mitológica';
    triggerConditionDescription = 'Condicionada al combate: declaración de ataque, bloqueo o impacto al Mazo Castillo.';
  } else if (
    lower.includes('en cada fase de agrupación') ||
    lower.includes('fase de agrupación')
  ) {
    timingCategory = 'Fase de Agrupación';
    timingBadgeColor = 'bg-cyan-900 text-cyan-200 border-cyan-500';
    darRuleRef = 'D.A.R. 5.1 Fase de Agrupación';
    triggerConditionDescription = 'Se dispara al inicio del turno durante la fase de reagrupar cartas.';
  } else if (
    lower.includes('al final del turno') ||
    lower.includes('al finalizar tu turno')
  ) {
    timingCategory = 'Final del Turno';
    timingBadgeColor = 'bg-stone-800 text-stone-200 border-stone-500';
    darRuleRef = 'D.A.R. 5.5 Fase Final del Turno';
    triggerConditionDescription = 'Se resuelve al cierre del turno antes de ceder el turno al oponente.';
  } else if (card.type === 'Arma') {
    timingCategory = 'Pasiva de Portador';
    timingBadgeColor = 'bg-orange-900 text-orange-200 border-orange-500';
    darRuleRef = 'D.A.R. 4.2.2 Portadores y Efectos de Armas';
    triggerConditionDescription = 'Efecto continuo o disparado otorgado al Aliado que porta esta arma.';
  } else if (card.type === 'Talismán') {
    timingCategory = 'Al Entrar';
    timingBadgeColor = 'bg-purple-900 text-purple-200 border-purple-500';
    darRuleRef = 'D.A.R. 4.2.3 Jugar Talismanes';
    triggerConditionDescription = 'Efecto instantáneo: se resuelve al jugarse y va al Cementerio tras su aplicación.';
  } else if (
    lower.includes('mientras esté en juego') ||
    lower.includes('mientras') ||
    lower.includes('tus caballeros ganan') ||
    lower.includes('tus dragones ganan') ||
    lower.includes('los oros en juego')
  ) {
    timingCategory = 'Aura Continua';
    timingBadgeColor = 'bg-teal-900 text-teal-200 border-teal-500';
    darRuleRef = 'D.A.R. 4.3 Efectos Continuos de Campo y Auras';
    triggerConditionDescription = 'Aura permanente activa de manera ininterrumpida mientras la carta permanezca en mesa.';
  } else {
    timingCategory = 'Efecto Estático / Especial';
    timingBadgeColor = 'bg-neutral-800 text-neutral-200 border-neutral-600';
    darRuleRef = 'D.A.R. 4.2 Reglas Específicas de Cartas';
    triggerConditionDescription = 'Efecto condicional o estático regido por el texto específico de la carta.';
  }

  // 2. Cost Analysis
  const costAnalysis: CostAnalysis = {
    goldCost: 0,
    mustDiscard: 0,
    mustDestroySelf: false,
    mustBanishSelf: false,
    mustSacrificeAlly: false,
    summary: 'Sin coste adicional',
  };

  if (hasAbility) {
    const goldMatch = lower.match(/pagar\s+(\d+|un|una|dos|tres)\s+(?:de\s+)?oro/i);
    if (goldMatch) {
      const g = goldMatch[1];
      costAnalysis.goldCost = g === 'dos' ? 2 : g === 'tres' ? 3 : parseInt(g, 10) || 1;
    }

    const discMatch = lower.match(/descartar\s+(\d+|un|una|dos)\s*(?:carta[s]?)?/i) || lower.match(/descarta\s+(\d+|un|una|dos)/i);
    if (discMatch) {
      const d = discMatch[1];
      costAnalysis.mustDiscard = d === 'dos' ? 2 : parseInt(d, 10) || 1;
    }

    if (
      lower.includes('destruye a ') ||
      lower.includes('destruir a ') ||
      lower.includes('destruir esta carta') ||
      lower.includes('destruye esta carta') ||
      lower.includes('destruir espada de cristal') ||
      lower.includes('destruir príncipe valiant')
    ) {
      costAnalysis.mustDestroySelf = true;
    }

    if (
      lower.includes('destierra a ') ||
      lower.includes('desterrar a ') ||
      lower.includes('destierra esta carta') ||
      lower.includes('desterrar esta carta') ||
      lower.includes('destierra sir gawein') ||
      lower.includes('desterrar a cornelius')
    ) {
      costAnalysis.mustBanishSelf = true;
    }

    if (lower.includes('destruye uno de tus aliados') || lower.includes('sacrifica un aliado')) {
      costAnalysis.mustSacrificeAlly = true;
    }

    const costParts: string[] = [];
    if (card.cost > 0) costParts.push(`${card.cost} 🪙 para jugar`);
    if (costAnalysis.goldCost > 0) costParts.push(`Pagar ${costAnalysis.goldCost} 🪙`);
    if (costAnalysis.mustDiscard > 0) costParts.push(`Descartar ${costAnalysis.mustDiscard} carta(s)`);
    if (costAnalysis.mustDestroySelf) costParts.push(`Destruir esta carta como coste`);
    if (costAnalysis.mustBanishSelf) costParts.push(`Desterrar esta carta como coste`);
    if (costAnalysis.mustSacrificeAlly) costParts.push(`Destruir 1 Aliado propio`);
    costAnalysis.summary = costParts.length > 0 ? costParts.join(' + ') : 'Sin coste adicional de activación';
  }

  // 3. Targets Analysis
  const targetAnalysis: TargetAnalysis = {
    targetType: 'Ninguno',
    targetOwner: 'Sin Objetivo',
    targetZone: 'Mesa',
    restriction: 'Ninguna',
  };

  if (lower.includes('aliado oponente') || lower.includes('aliados oponentes')) {
    targetAnalysis.targetType = 'Aliado';
    targetAnalysis.targetOwner = 'Oponente';
    targetAnalysis.targetZone = 'Línea de Defensa / Ataque';
  } else if (lower.includes('uno de tus aliados') || lower.includes('tus aliados') || lower.includes('un caballero en tu')) {
    targetAnalysis.targetType = 'Aliado';
    targetAnalysis.targetOwner = 'Propio';
    targetAnalysis.targetZone = 'Línea de Defensa o Mazo';
  } else if (lower.includes('tótem')) {
    targetAnalysis.targetType = 'Tótem';
    targetAnalysis.targetOwner = lower.includes('oponente') ? 'Oponente' : 'Propio';
    targetAnalysis.targetZone = 'Línea de Apoyo';
  } else if (lower.includes('arma')) {
    targetAnalysis.targetType = 'Arma';
    targetAnalysis.targetOwner = 'Propio';
    targetAnalysis.targetZone = 'Aliado Portador';
  } else if (lower.includes('oro')) {
    targetAnalysis.targetType = 'Oro';
    targetAnalysis.targetOwner = 'Propio';
    targetAnalysis.targetZone = 'Reserva de Oro';
  } else if (lower.includes('mazo castillo oponente') || lower.includes('oponente bota')) {
    targetAnalysis.targetType = 'Mazo Castillo';
    targetAnalysis.targetOwner = 'Oponente';
    targetAnalysis.targetZone = 'Mazo Castillo';
  } else if (lower.includes('cementerio')) {
    targetAnalysis.targetType = 'Carta en Cementerio';
    targetAnalysis.targetOwner = lower.includes('oponente') ? 'Oponente' : 'Propio';
    targetAnalysis.targetZone = 'Cementerio';
  }

  // Restrictions
  if (lower.includes('sólo puede ser portada por') || lower.includes('solo puede ser portada por')) {
    const bearerMatch = text.match(/s[oó]lo puede ser portada por\s+([^.]+)/i);
    targetAnalysis.restriction = bearerMatch ? bearerMatch[1].trim() : 'Restricción de portador';
  } else if (lower.includes('sólo puedes tener en juego a un') || lower.includes('solo puedes tener en juego a un')) {
    targetAnalysis.restriction = 'Carta Única en mesa (DAR 4.1.3)';
  }

  // 4. Effect Tags Detection
  const effectTags: EffectTag[] = [];

  if (
    lower.includes('genera ') ||
    lower.includes('produce ') ||
    lower.includes('agrega ') ||
    lower.includes('añade') ||
    (card.type === 'Oro' && hasAbility && lower.includes('oro'))
  ) {
    effectTags.push(EFFECT_TAGS.GENERA_ORO);
  }

  if (lower.includes('roba') || lower.includes('robas') || lower.includes('robar')) {
    effectTags.push(EFFECT_TAGS.ROBO_CARTAS);
  }

  if (lower.includes('busca') || lower.includes('buscar')) {
    if (lower.includes('cementerio')) {
      effectTags.push(EFFECT_TAGS.RECUPERACION_CEMENTERIO);
    } else {
      effectTags.push(EFFECT_TAGS.BUSQUEDA_CASTILLO);
    }
  }

  if (lower.includes('bota') || lower.includes('botar') || lower.includes('daño al mazo')) {
    effectTags.push(EFFECT_TAGS.DANO_CASTILLO);
  }

  if (
    lower.includes('gana +') ||
    lower.includes('ganan +') ||
    lower.includes('bono de fuerza') ||
    lower.includes('a la fuerza')
  ) {
    effectTags.push(EFFECT_TAGS.MODIFICADOR_FUERZA);
  }

  if (
    lower.includes('destruye') ||
    lower.includes('destruir') ||
    lower.includes('sea destruido')
  ) {
    effectTags.push(EFFECT_TAGS.DESTRUCCION);
  }

  if (lower.includes('destierra') || lower.includes('desterrar')) {
    effectTags.push(EFFECT_TAGS.DESTIERRO);
  }

  if (lower.includes('anular') || lower.includes('anula') || lower.includes('cancelar')) {
    effectTags.push(EFFECT_TAGS.ANULACION);
  }

  if (lower.includes('imbloqueable') || lower.includes('imbloqueables')) {
    effectTags.push(EFFECT_TAGS.IMBLOQUEABLE);
  }

  if (
    lower.includes('mientras') ||
    lower.includes('no puede ser afectado') ||
    lower.includes('todos tus')
  ) {
    effectTags.push(EFFECT_TAGS.AURA_CONTINUA);
  }

  if (
    lower.includes('no se puedan jugar') ||
    lower.includes('sólo puede jugar un') ||
    lower.includes('pierden sus habilidades') ||
    lower.includes('no puede atacar')
  ) {
    effectTags.push(EFFECT_TAGS.RESTRICCION_JUEGO);
  }

  if (lower.includes('baraja') || lower.includes('barajar')) {
    effectTags.push(EFFECT_TAGS.BARAJAR);
  }

  if (lower.includes('bajas a tu línea') || lower.includes('ponerlo en tu línea')) {
    effectTags.push(EFFECT_TAGS.CONTROL_CARTAS);
  }

  // 5. Combat Role
  let combatRole: CombatRole = 'Control';
  if (!hasAbility) {
    combatRole = 'Vanilla';
  } else if (effectTags.some((e) => e.id === 'GENERA_ORO')) {
    combatRole = 'Aceleración / Economía';
  } else if (effectTags.some((e) => e.id === 'BUSQUEDA_CASTILLO')) {
    combatRole = 'Soporte / Tutor';
  } else if (
    effectTags.some((e) => e.id === 'DANO_CASTILLO' || e.id === 'IMBLOQUEABLE') ||
    (card.strength >= 3 && card.cost <= 3)
  ) {
    combatRole = 'Agresivo';
  } else if (
    effectTags.some((e) => e.id === 'DESTRUCCION' || e.id === 'DESTIERRO' || e.id === 'ANULACION')
  ) {
    combatRole = 'Disrupción';
  } else if (
    card.strength >= 3 ||
    effectTags.some((e) => e.id === 'AURA_CONTINUA' || e.id === 'RESTRICCION_JUEGO')
  ) {
    combatRole = 'Defensa / Muro';
  }

  // 6. Step-by-Step DAR Protocol Instructions (How to Apply)
  const steps: string[] = [];
  if (!hasAbility) {
    steps.push('1. Declaración de Juego: Paga su coste de oro en la Fase de Vigilia (DAR 5.2).');
    steps.push('2. Entrada a Mesa: Coloca la carta en tu Línea de Defensa (DAR 4.3.4).');
    steps.push('3. Estado de Ingreso: Sufre "enfermedad de invocación" y no puede atacar en su primer turno (DAR 4.2.1).');
    steps.push('4. Participación: A partir de tu siguiente Fase de Agrupación, queda habilitada para atacar o bloquear con su Fuerza impresa.');
  } else {
    steps.push(
      `1. Ventana de Oportunidad y Prioridad: Verificar que el juego se encuentre en ${timingCategory} según ${darRuleRef}. El jugador activo debe tener la prioridad oficial (DAR 6.7).`
    );
    if (costAnalysis.summary !== 'Sin coste adicional') {
      steps.push(
        `2. Pago de Costes Obligatorios: Antes de resolver el efecto, el jugador debe pagar o ejecutar: [${costAnalysis.summary}]. Si no puede cumplir el coste íntegramente, la acción es ilegal y se cancela.`
      );
    } else {
      steps.push(
        '2. Verificación de Activación: No exige costes adicionales de activación; se verifica la presencia legal de la carta en su zona correspondiente.'
      );
    }
    if (targetAnalysis.targetType !== 'Ninguno') {
      steps.push(
        `3. Designación de Objetivos Legales: Seleccionar objetivo válido (${targetAnalysis.targetType} en ${targetAnalysis.targetZone} perteneciente a ${targetAnalysis.targetOwner}). ${targetAnalysis.restriction !== 'Ninguna' ? `Condición: ${targetAnalysis.restriction}.` : ''}`
      );
    } else {
      steps.push(
        '3. Selección de Parámetros: El efecto opera de forma global o automática sin requerir designación de un único objetivo específico.'
      );
    }
    steps.push(
      `4. Resolución del Efecto: Aplicar las consecuencias descritas: ${effectTags.map((e) => e.label).join(', ') || 'Modificación del estado de juego'}. Se realizan los tránsitos de zona correspondientes.`
    );
    if (timingCategory === 'Aura Continua' || timingCategory === 'Pasiva de Portador') {
      steps.push(
        '5. Duración Continua: La modificación permanece activa de forma ininterrumpida mientras la carta se mantenga boca arriba en su zona reglamentaria.'
      );
    } else if (card.type === 'Talismán') {
      steps.push(
        '5. Tránsito al Cementerio: Tras resolverse íntegramente el efecto del Talismán, la carta se deposita boca arriba en el Cementerio del propietario (DAR 4.3.7).'
      );
    } else {
      steps.push(
        '5. Cierre de Ventana: Tras la resolución, se cede la prioridad o se continúa con el flujo ordinario del paso en curso.'
      );
    }
  }

  // 7. Multi-Part Ability Parsing
  const abilityParts = parseCardAbilityParts(card);

  const hasMultiTiming =
    abilityParts.some((p) => p.isEntryTrigger) &&
    abilityParts.some(
      (p) =>
        p.isActivatedTrigger ||
        p.isOncePerTurn ||
        p.timingCategory === 'Activada en Vigilia' ||
        p.triggerEvent === 'activada_vigilia'
    );
  const hasConditionalSequence = abilityParts.some(
    (p) => p.hasPrecondition || p.isConditionalOnPriorAction
  );
  const hasMultiAction = abilityParts.length > 1 || hasConditionalSequence;
  const timingsSummary = Array.from(new Set(abilityParts.map((p) => p.timingCategory)));
  const conditionalBreakdown = abilityParts
    .filter((p) => p.hasPrecondition && p.preconditionDescription)
    .map((p) => p.preconditionDescription!);

  // If card has multiple ability parts or conditional requirements, add dedicated guidance steps
  if (hasConditionalSequence) {
    steps.unshift(
      `⚠️ Habilidad Condicional Secuencial detectada: Ciertas acciones están supeditadas al éxito de una acción previa (ej. primero debe infligirse daño de combate no bloqueado al Mazo Castillo o pagarse el coste para desbloquear el efecto resultante).`
    );
  }
  if (hasMultiTiming) {
    steps.unshift(
      `⚡ Habilidad de Múltiples Fases detectada: Esta carta posee un efecto al entrar en juego y una acción activa permanente que puede ejecutarse en cada turno.`
    );
  }
  if (abilityParts.length > 1) {
    steps.unshift(
      `0. Estructura de Habilidades Múltiples (${abilityParts.length} acciones programadas): ${abilityParts
        .map(
          (p) =>
            `[Acción ${p.index + 1}: ${p.timingCategory}${
              p.isOncePerTurn ? ' (1/Turno)' : ''
            }${p.hasPrecondition ? ' (Condicional)' : ''}]`
        )
        .join(' + ')}. Cada efecto se activa de forma independiente en su ventana reglamentaria.`
    );
  }

  // 8. Meta Summary
  const metaSummary = hasAbility
    ? `Carta clave en arquetipos de ${card.race !== 'Sin Raza' ? card.race : card.type}. Especializada en ${
        effectTags.map((e) => e.label).join(' y ') || 'modificación de juego'
      } bajo el rol de ${combatRole}.${
        hasMultiTiming
          ? ' Posee doble acción (al entrar y en cada turno).'
          : hasConditionalSequence
          ? ' Posee efectos condicionados al combate o costes previos.'
          : abilityParts.length > 1
          ? ` Posee ${abilityParts.length} efectos independientes en su texto.`
          : ''
      }`
    : `Carta estándar sin habilidad (Vanilla). Útil como combatiente puro por coste/fuerza (${card.cost} 🪙 / ${card.strength} 🛡️).`;

  return {
    cardNumber: card.number,
    cardName: card.name,
    cardType: card.type,
    race: card.race,
    cost: card.cost,
    strength: card.strength,
    hasAbility,
    rawAbility: card.ability || 'Sin habilidad especial descrita.',
    timingCategory,
    timingBadgeColor,
    darRuleRef,
    triggerConditionDescription,
    costAnalysis,
    targetAnalysis,
    effectTags,
    howToApplySteps: steps,
    combatRole,
    metaSummary,
    canSimulate: hasAbility,
    abilityParts,
    hasMultiAction,
    hasConditionalSequence,
    hasMultiTiming,
    timingsSummary,
    conditionalBreakdown,
  };
}

/**
 * Universal Multi-Part Ability Parser
 * Breaks down any card's text into separate, modular ability parts so they can
 * be triggered and activated in their respective timing windows independently.
 * Accurately interprets conditional sequences (e.g. damage castle -> discard)
 * and multi-phase abilities (entry + turn-by-turn).
 */
export function parseCardAbilityParts(card: CardData): CardAbilityPartAnalysis[] {
  const text = (card.ability || '').trim();
  if (!text) return [];

  // Split into sentences / major clauses
  const rawClauses = text
    .split(/\.\s+|\.\n+|\n+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 0);

  // Break compound clauses
  const clauses: string[] = [];
  for (const clause of rawClauses) {
    const lower = clause.toLowerCase();
    const hasEntry = lower.includes('entra en juego') || lower.includes('al entrar');
    const hasVigiliaTransition = lower.match(
      /(?:,\s*|\s+y\s+)(en tu fase de vigilia|en fase de vigilia|una vez por turno|en cada turno)/i
    );
    const hasCombatConditionTransition = lower.match(
      /(?:,\s*|\s+y\s+)(si hace daño al mazo castillo|si hace daño|cuando inflija daño)/i
    );

    if (hasEntry && hasVigiliaTransition && hasVigiliaTransition.index !== undefined) {
      const splitIdx = hasVigiliaTransition.index;
      const part1 = clause.slice(0, splitIdx).trim().replace(/,\s*$/, '');
      const part2 = clause.slice(splitIdx).trim().replace(/^,\s*|^y\s+/i, '');
      if (part1) clauses.push(part1);
      if (part2) clauses.push(part2);
    } else if (hasCombatConditionTransition && hasCombatConditionTransition.index !== undefined) {
      const splitIdx = hasCombatConditionTransition.index;
      const part1 = clause.slice(0, splitIdx).trim().replace(/,\s*$/, '');
      const part2 = clause.slice(splitIdx).trim().replace(/^,\s*|^y\s+/i, '');
      if (part1) clauses.push(part1);
      if (part2) clauses.push(part2);
    } else {
      clauses.push(clause);
    }
  }

  return clauses.map((clauseText, idx) => {
    const clauseLower = clauseText.toLowerCase();

    let timingCategory: TimingCategory = 'Efecto Estático / Especial';
    let timingBadgeColor = 'bg-neutral-800 text-neutral-200 border-neutral-600';
    let darRuleRef = 'D.A.R. 4.2 Reglas Específicas de Cartas';
    let triggerConditionDescription = 'Efecto regido por el texto específico de la carta.';
    let isEntryTrigger = false;
    let isActivatedTrigger = false;
    let canAttackImmediately = false;
    let triggerEvent: TriggerEventType = 'efecto_estatico';
    let hasPrecondition = false;
    let preconditionDescription: string | undefined = undefined;
    let isConditionalOnPriorAction = false;
    const dependentActions: ConditionalAction[] = [];

    // 1. COMBAT CASTLE DAMAGE TRIGGER (Conditional: must deal unblocked damage first)
    if (
      clauseLower.includes('si hace daño al mazo castillo') ||
      clauseLower.includes('hace daño al mazo castillo') ||
      clauseLower.includes('cuando inflija daño al mazo castillo') ||
      clauseLower.includes('al hacer daño al mazo castillo') ||
      (clauseLower.includes('si hace daño') && clauseLower.includes('castillo'))
    ) {
      timingCategory = 'Al Atacar / Bloquear';
      timingBadgeColor = 'bg-red-950 text-red-200 border-red-500';
      darRuleRef = 'D.A.R. 5.3.4 Asignación de Daño (Disparo Condicional por Daño al Castillo)';
      triggerConditionDescription =
        'Condición Estricta: El Aliado debe atacar con éxito y su daño de combate no debe ser bloqueado ni prevenido al Mazo Castillo rival.';
      triggerEvent = 'dano_castillo_combate';
      hasPrecondition = true;
      preconditionDescription =
        'Primero debe infligir daño de combate directo no bloqueado al Mazo Castillo rival para desencadenar la acción.';
      isConditionalOnPriorAction = true;

      // Extract what action is triggered upon damage
      if (
        clauseLower.includes('descártale') ||
        (clauseLower.includes('descarta') && clauseLower.includes('azar')) ||
        clauseLower.includes('descarta 1')
      ) {
        dependentActions.push({
          order: 1,
          description: 'El oponente descarta 1 carta de su mano al azar al Cementerio',
          actionType: 'descarte_oponente',
          isPrecondition: false,
          count: 1,
          target: 'Mano Oponente',
        });
      }
      if (clauseLower.includes('bota') || clauseLower.includes('bote') || clauseLower.includes('botar')) {
        let count = 1;
        const countMatch =
          clauseLower.match(/bota[r]?\s+(\d+|una|dos|tres|cuatro)\s+carta/i) ||
          clauseLower.match(/bota[r]?\s+(\d+|una|dos|tres|cuatro)/i);
        if (countMatch) {
          const raw = countMatch[1].toLowerCase();
          if (raw === 'dos' || raw === '2') count = 2;
          else if (raw === 'tres' || raw === '3') count = 3;
          else if (raw === 'cuatro' || raw === '4') count = 4;
        }
        dependentActions.push({
          order: 1,
          description: `El oponente bota ${count} carta(s) de su Mazo Castillo`,
          actionType: 'dano_castillo',
          isPrecondition: false,
          count,
          target: 'Castillo Oponente',
        });
      }
      if (clauseLower.includes('roba') || clauseLower.includes('robar')) {
        dependentActions.push({
          order: 1,
          description: 'Robar cartas de tu Mazo Castillo',
          actionType: 'robo_cartas',
          isPrecondition: false,
          target: 'Castillo Propio',
        });
      }
      if (clauseLower.includes('ver su mano') || clauseLower.includes('ver la mano')) {
        dependentActions.push({
          order: 1,
          description: 'Inspeccionar todas las cartas en la mano del oponente',
          actionType: 'ver_mano_oponente',
          isPrecondition: false,
          target: 'Mano Oponente',
        });
      }
    } else if (
      clauseLower.includes('puede atacar cuando entra') ||
      clauseLower.includes('pueden atacar cuando entran') ||
      clauseLower.includes('puede atacar al entrar') ||
      clauseLower.includes('pueden atacar al entrar') ||
      clauseLower.includes('puede atacar el turno que entra') ||
      clauseLower.includes('pueden atacar el turno que entran') ||
      clauseLower.includes('puede atacar en el turno que entra') ||
      clauseLower.includes('pueden atacar en el turno que entran') ||
      clauseLower.includes('debe atacar cuando entra') ||
      clauseLower.includes('debe atacar al entrar') ||
      clauseLower.includes('debe ser declarado atacante')
    ) {
      timingCategory = 'Al Atacar / Bloquear';
      timingBadgeColor = 'bg-amber-900 text-amber-200 border-amber-500';
      darRuleRef = 'D.A.R. 4.2.1 / 5.3 Excepción de Ataque Inmediato (Furia/Haste)';
      triggerConditionDescription =
        'Habilita al Aliado para atacar en la Fase de Batalla del mismo turno en que entra en juego.';
      canAttackImmediately = true;
      isEntryTrigger = true;
      triggerEvent = 'al_entrar';
      dependentActions.push({
        order: 1,
        description: 'Habilidad de Furia: Ataca en el turno que entra a juego',
        actionType: 'furia_ataque_inmediato',
        isPrecondition: false,
      });
    } else if (
      clauseLower.includes('cuando entra') ||
      clauseLower.includes('entra en juego') ||
      clauseLower.includes('al entrar en juego') ||
      clauseLower.includes('al entrar al juego') ||
      clauseLower.includes('al entrar') ||
      clauseLower.includes('al ser jugado') ||
      clauseLower.includes('en su fase de ingreso')
    ) {
      timingCategory = 'Al Entrar';
      timingBadgeColor = 'bg-emerald-900 text-emerald-200 border-emerald-500';
      darRuleRef = 'D.A.R. 5.2.1 / 6.1 Disparo por Ingreso a Zona de Juego';
      triggerConditionDescription =
        'Se dispara inmediatamente cuando la carta entra con éxito al campo de juego.';
      isEntryTrigger = true;
      triggerEvent = 'al_entrar';

      // Check sequential clauses like "roba 3 cartas y luego descarta 2"
      if (
        (clauseLower.includes('roba') || clauseLower.includes('robas')) &&
        (clauseLower.includes('descarta') || clauseLower.includes('luego'))
      ) {
        hasPrecondition = true;
        preconditionDescription = 'Acción secuencial: Robar cartas primero, luego descartar cartas.';
        isConditionalOnPriorAction = true;
        dependentActions.push({
          order: 1,
          description: 'Acción 1: Robar cartas del Mazo Castillo',
          actionType: 'robo_cartas',
          isPrecondition: false,
        });
        dependentActions.push({
          order: 2,
          description: 'Acción 2 (Dependiente): Descartar cartas de la mano al Cementerio',
          actionType: 'descarte_propio',
          isPrecondition: true,
          preconditionLabel: 'Requiere haber tomado las cartas antes de descartar',
        });
      }
    } else if (
      clauseLower.includes('en tu fase de vigilia') ||
      clauseLower.includes('en fase de vigilia') ||
      clauseLower.includes('una vez por turno') ||
      clauseLower.includes('cada turno') ||
      clauseLower.includes('hasta 3 veces por turno') ||
      clauseLower.includes('puedes pagar') ||
      clauseLower.includes('paga 1 de oro') ||
      clauseLower.includes('paga 2 de oro') ||
      clauseLower.includes('paga 3 de oro') ||
      clauseLower.includes('destruye a campesino') ||
      clauseLower.includes('destierra este aliado') ||
      clauseLower.includes('destierra esta carta') ||
      clauseLower.includes('destruye este tótem')
    ) {
      timingCategory = 'Activada en Vigilia';
      timingBadgeColor = 'bg-blue-900 text-blue-200 border-blue-500';
      darRuleRef = 'D.A.R. 5.2 Fase de Vigilia (Habilidad Activada cada turno)';
      triggerConditionDescription =
        'Habilidad activable por el jugador en su Fase de Vigilia una vez por turno pagando su coste.';
      isActivatedTrigger = true;
      triggerEvent = 'activada_vigilia';

      // Check cost preconditions
      if (clauseLower.includes('paga') || clauseLower.includes('pagar') || clauseLower.includes('destruye') || clauseLower.includes('destierra')) {
        hasPrecondition = true;
        preconditionDescription = 'Requiere pagar el coste reglamentario (Oro, Destierro o Sacrificio) antes de resolver el efecto.';
        isConditionalOnPriorAction = true;
      }
    } else if (
      clauseLower.includes('en guerra de talismanes') ||
      clauseLower.includes('guerra de talismanes')
    ) {
      timingCategory = 'Guerra de Talismanes';
      timingBadgeColor = 'bg-purple-900 text-purple-200 border-purple-500';
      darRuleRef = 'D.A.R. 5.3.3 Guerra de Talismanes';
      triggerConditionDescription = 'Activación rápida durante la subfase 5.3.3 de Combate.';
      triggerEvent = 'guerra_talismanes';
    } else if (
      clauseLower.includes('en respuesta') ||
      clauseLower.includes('si tu oponente juega')
    ) {
      timingCategory = 'Respuesta / Disparada';
      timingBadgeColor = 'bg-rose-900 text-rose-200 border-rose-500';
      darRuleRef = 'D.A.R. 6.7 Regla de Respuesta y Prioridad';
      triggerConditionDescription =
        'Se dispara en respuesta directa a una acción del oponente o evento en mesa.';
      triggerEvent = 'respuesta_disparada';
    } else if (
      clauseLower.includes('al atacar') ||
      clauseLower.includes('cuando ataca') ||
      clauseLower.includes('cuando bloquea') ||
      clauseLower.includes('al ser bloqueado')
    ) {
      timingCategory = 'Al Atacar / Bloquear';
      timingBadgeColor = 'bg-amber-900 text-amber-200 border-amber-500';
      darRuleRef = 'D.A.R. 5.3 Fase de Batalla Mitológica';
      triggerConditionDescription =
        'Condicionada al combate: declaración de ataque o bloqueo de unidades.';
      triggerEvent = 'al_bloquear';
    } else if (
      clauseLower.includes('en cada fase de agrupación') ||
      clauseLower.includes('fase de agrupación')
    ) {
      timingCategory = 'Fase de Agrupación';
      timingBadgeColor = 'bg-cyan-900 text-cyan-200 border-cyan-500';
      darRuleRef = 'D.A.R. 5.1 Fase de Agrupación';
      triggerConditionDescription = 'Se dispara al inicio del turno durante la reagrupación.';
      triggerEvent = 'fase_agrupacion';
    } else if (
      clauseLower.includes('al final del turno') ||
      clauseLower.includes('al finalizar tu turno') ||
      clauseLower.includes('al final de este turno')
    ) {
      timingCategory = 'Final del Turno';
      timingBadgeColor = 'bg-stone-800 text-stone-200 border-stone-500';
      darRuleRef = 'D.A.R. 5.5 Fase Final del Turno';
      triggerConditionDescription = 'Se resuelve al cierre del turno antes de ceder la prioridad.';
      triggerEvent = 'final_turno';
    } else if (
      clauseLower.includes('mientras esté en juego') ||
      clauseLower.includes('mientras') ||
      clauseLower.includes('no puede ser afectado por talismanes') ||
      clauseLower.includes('tus caballeros ganan') ||
      clauseLower.includes('tus dragones ganan') ||
      clauseLower.includes('tus demás dragones') ||
      clauseLower.includes('tus demás faeries') ||
      clauseLower.includes('todos los oros en juego')
    ) {
      timingCategory = 'Aura Continua';
      timingBadgeColor = 'bg-teal-900 text-teal-200 border-teal-500';
      darRuleRef = 'D.A.R. 4.3 Efectos Continuos de Campo y Auras';
      triggerConditionDescription =
        'Aura permanente activa de manera continua mientras permanezca en mesa.';
      triggerEvent = 'aura_continua';
    } else if (card.type === 'Arma') {
      timingCategory = 'Pasiva de Portador';
      timingBadgeColor = 'bg-orange-900 text-orange-200 border-orange-500';
      darRuleRef = 'D.A.R. 4.2.2 Portadores y Efectos de Armas';
      triggerConditionDescription = 'Efecto o estadística otorgada al Aliado portador.';
      triggerEvent = 'aura_continua';
    } else if (card.type === 'Talismán') {
      timingCategory = 'Al Entrar';
      timingBadgeColor = 'bg-purple-900 text-purple-200 border-purple-500';
      darRuleRef = 'D.A.R. 4.2.3 Jugar Talismanes';
      triggerConditionDescription = 'Efecto instantáneo: se resuelve al jugarse y va al Cementerio.';
      isEntryTrigger = true;
      triggerEvent = 'al_entrar';
    }

    const isOncePerTurn = Boolean(
      clauseLower.includes('una vez por turno') ||
      clauseLower.includes('solo una vez por turno') ||
      clauseLower.includes('sólo una vez por turno') ||
      clauseLower.includes('hasta 3 veces por turno')
    );

    const partCost: CostAnalysis = {
      goldCost: 0,
      mustDiscard: 0,
      mustDestroySelf: false,
      mustBanishSelf: false,
      mustSacrificeAlly: false,
      summary: 'Sin coste adicional',
    };
    const goldMatch = clauseLower.match(/pagar\s+(\d+|un|una|dos|tres)\s+(?:de\s+)?oro/i);
    if (goldMatch) {
      const g = goldMatch[1];
      partCost.goldCost = g === 'dos' ? 2 : g === 'tres' ? 3 : parseInt(g, 10) || 1;
    }
    const discMatch =
      clauseLower.match(/descartar\s+(\d+|un|una|dos)\s*(?:carta[s]?)?/i) ||
      clauseLower.match(/descarta\s+(\d+|un|una|dos)/i);
    if (discMatch) {
      const d = discMatch[1];
      partCost.mustDiscard = d === 'dos' ? 2 : parseInt(d, 10) || 1;
    }
    if (clauseLower.includes('destruye esta carta') || clauseLower.includes('destruir esta carta')) {
      partCost.mustDestroySelf = true;
    }
    if (clauseLower.includes('destierra esta carta') || clauseLower.includes('desterrar esta carta')) {
      partCost.mustBanishSelf = true;
    }
    if (
      clauseLower.includes('destruye uno de tus aliados') ||
      clauseLower.includes('destruir uno de tus aliados')
    ) {
      partCost.mustSacrificeAlly = true;
    }

    const partTags: EffectTag[] = [];
    if (clauseLower.includes('genera') || clauseLower.includes('produce') || clauseLower.includes('agrega')) {
      partTags.push(EFFECT_TAGS.GENERA_ORO);
    }
    if (clauseLower.includes('roba') || clauseLower.includes('robas') || clauseLower.includes('robar')) {
      partTags.push(EFFECT_TAGS.ROBO_CARTAS);
    }
    if (clauseLower.includes('busca') || clauseLower.includes('buscar')) {
      if (clauseLower.includes('cementerio')) partTags.push(EFFECT_TAGS.RECUPERACION_CEMENTERIO);
      else partTags.push(EFFECT_TAGS.BUSQUEDA_CASTILLO);
    }
    if (clauseLower.includes('bota') || clauseLower.includes('daño al mazo')) {
      partTags.push(EFFECT_TAGS.DANO_CASTILLO);
    }
    if (
      clauseLower.includes('gana +') ||
      clauseLower.includes('ganan +') ||
      clauseLower.includes('a la fuerza') ||
      clauseLower.includes('suma ') ||
      clauseLower.includes('obtiene ')
    ) {
      partTags.push(EFFECT_TAGS.MODIFICADOR_FUERZA);
      const isTurnOnly =
        clauseLower.includes('hasta el final del turno') ||
        clauseLower.includes('hasta la fase final') ||
        clauseLower.includes('por este turno') ||
        clauseLower.includes('durante este turno') ||
        clauseLower.includes('este turno');
      const isPermanent =
        clauseLower.includes('permanente') ||
        clauseLower.includes('permanentemente') ||
        clauseLower.includes('de forma permanente') ||
        clauseLower.includes('de manera permanente') ||
        clauseLower.includes('hasta el final del juego') ||
        !isTurnOnly;
      dependentActions.push({
        order: dependentActions.length + 1,
        description: `Modificador de Fuerza: ${isPermanent ? 'Permanente (+F constante)' : 'Temporal (hasta el final del turno)'}`,
        actionType: 'modificador_fuerza',
        isPrecondition: false,
      });
    }
    if (
      clauseLower.includes('no puede defender') ||
      clauseLower.includes('no pueda defender') ||
      clauseLower.includes('no podrá defender') ||
      clauseLower.includes('no podra defender') ||
      clauseLower.includes('no pueden defender') ||
      clauseLower.includes('no puedan defender') ||
      clauseLower.includes('no puede bloquear') ||
      clauseLower.includes('no pueda bloquear') ||
      clauseLower.includes('no podrá bloquear') ||
      clauseLower.includes('no podra bloquear') ||
      clauseLower.includes('no pueden bloquear') ||
      clauseLower.includes('no puedan bloquear')
    ) {
      partTags.push(EFFECT_TAGS.INHABILITAR_BLOQUEO);
      dependentActions.push({
        order: dependentActions.length + 1,
        description: 'Inhabilita Defensa: El Aliado objetivo no podrá bloquear ataques este turno',
        actionType: 'otro',
        isPrecondition: false,
        target: clauseLower.includes('oponente') ? 'Aliado Oponente' : 'Aliado',
      });
    }
    if (clauseLower.includes('destruye') || clauseLower.includes('destruir')) {
      partTags.push(EFFECT_TAGS.DESTRUCCION);
    }
    if (clauseLower.includes('destierra') || clauseLower.includes('desterrar')) {
      partTags.push(EFFECT_TAGS.DESTIERRO);
    }
    if (clauseLower.includes('anular') || clauseLower.includes('anula') || clauseLower.includes('cancelar')) {
      partTags.push(EFFECT_TAGS.ANULACION);
    }
    if (clauseLower.includes('imbloqueable')) {
      partTags.push(EFFECT_TAGS.IMBLOQUEABLE);
    }

    const partTarget: TargetAnalysis = {
      targetType: clauseLower.includes('aliado')
        ? 'Aliado'
        : clauseLower.includes('tótem')
        ? 'Tótem'
        : clauseLower.includes('talismán')
        ? 'Talismán'
        : 'General',
      targetOwner: clauseLower.includes('oponente')
        ? 'Oponente'
        : clauseLower.includes('tu')
        ? 'Propio'
        : 'Cualquiera',
      targetZone: clauseLower.includes('cementerio')
        ? 'Cementerio'
        : clauseLower.includes('mazo')
        ? 'Mazo Castillo'
        : 'Mesa',
      restriction: 'Ninguna',
    };

    return {
      index: idx,
      rawText: clauseText + '.',
      timingCategory,
      timingBadgeColor,
      darRuleRef,
      triggerConditionDescription,
      costAnalysis: partCost,
      targetAnalysis: partTarget,
      effectTags: partTags,
      isOncePerTurn,
      canAttackImmediately,
      isEntryTrigger,
      isActivatedTrigger,
      triggerEvent,
      hasPrecondition,
      preconditionDescription,
      isConditionalOnPriorAction,
      dependentActions,
    };
  });
}

/**
 * Cache and retrieve analysis for all 236 canonical cards
 */
let cachedAllAnalysis: CardAbilityAnalysis[] | null = null;

export function getAll236CardsAnalysis(): CardAbilityAnalysis[] {
  if (cachedAllAnalysis) return cachedAllAnalysis;
  cachedAllAnalysis = CANONICAL_CARDS.map((c) => analyzeCardAbility(c));
  return cachedAllAnalysis;
}

/**
 * Get individual card analysis by card number (1 to 236)
 */
export function getCardAnalysisByNumber(cardNumber: number): CardAbilityAnalysis | null {
  const all = getAll236CardsAnalysis();
  return all.find((a) => a.cardNumber === cardNumber) || null;
}

/**
 * Interactive Ability Simulator Engine
 * Executes a simulated application of the card's ability on a sample match state
 */
export function simulateAbilityExecution(
  card: CardData,
  initialState?: Partial<SimulatedGameState>
): SimulationResult {
  const stateBefore: SimulatedGameState = {
    playerGold: 3,
    playerHandCount: 5,
    playerCastleCount: 45,
    playerDefenseCount: 2,
    playerCemeteryCount: 1,
    playerExileCount: 0,
    cpuCastleCount: 45,
    cpuDefenseCount: 2,
    cpuCemeteryCount: 1,
    activeAuras: [],
    log: [],
    ...initialState,
  };

  const stateAfter: SimulatedGameState = JSON.parse(JSON.stringify(stateBefore));
  const detailedLog: string[] = [];
  const analysis = analyzeCardAbility(card);

  detailedLog.push(`▶️ INICIO DE SIMULACIÓN: "${card.name}" [Carta #${card.number} · ${card.type}]`);
  detailedLog.push(`📜 Texto Oficial: "${analysis.rawAbility}"`);
  detailedLog.push(`⏱️ Timing D.A.R.: ${analysis.timingCategory} (${analysis.darRuleRef})`);

  let resourceDelta = {
    gold: 0,
    hand: 0,
    castle: 0,
    defense: 0,
    opponentCastleDamage: 0,
    opponentDefenseLost: 0,
  };

  if (!analysis.hasAbility) {
    detailedLog.push('ℹ️ La carta no posee habilidad activa para simular. Entra a mesa con sus valores base.');
    return {
      success: true,
      actionSummary: `Invocación estándar de "${card.name}" (${card.strength} Fuerza) sin habilidad.`,
      detailedLog,
      stateBefore,
      stateAfter,
      resourceDelta,
    };
  }

  // Simulate payment of cost if in Vigilia
  if (analysis.costAnalysis.goldCost > 0) {
    stateAfter.playerGold = Math.max(0, stateAfter.playerGold - analysis.costAnalysis.goldCost);
    resourceDelta.gold -= analysis.costAnalysis.goldCost;
    detailedLog.push(`🪙 Coste pagado: -${analysis.costAnalysis.goldCost} Oro.`);
  }

  if (analysis.costAnalysis.mustDiscard > 0) {
    stateAfter.playerHandCount = Math.max(0, stateAfter.playerHandCount - analysis.costAnalysis.mustDiscard);
    stateAfter.playerCemeteryCount += analysis.costAnalysis.mustDiscard;
    resourceDelta.hand -= analysis.costAnalysis.mustDiscard;
    detailedLog.push(`🎴 Descarte realizado: -${analysis.costAnalysis.mustDiscard} carta(s) de tu mano al Cementerio.`);
  }

  if (analysis.costAnalysis.mustDestroySelf) {
    stateAfter.playerCemeteryCount += 1;
    detailedLog.push(`💥 Coste cumplido: "${card.name}" es enviada al Cementerio.`);
  }

  if (analysis.costAnalysis.mustBanishSelf) {
    stateAfter.playerExileCount += 1;
    detailedLog.push(`🌌 Coste cumplido: "${card.name}" es enviada a la Zona de Destierro.`);
  }

  // Simulate Effect application
  const lower = (card.ability || '').toLowerCase();

  // 1. Generación de Oro
  if (analysis.effectTags.some((e) => e.id === 'GENERA_ORO')) {
    let goldGain = 1;
    if (lower.includes('genera 2') || lower.includes('produce 2') || lower.includes('dos')) goldGain = 2;
    if (lower.includes('genera 3') || lower.includes('produce 3') || lower.includes('tres')) goldGain = 3;
    stateAfter.playerGold += goldGain;
    resourceDelta.gold += goldGain;
    detailedLog.push(`✨ Efecto aplicado: +${goldGain} Oro temporal generado en tu Reserva de Oro.`);
  }

  // 2. Robo de Cartas
  if (analysis.effectTags.some((e) => e.id === 'ROBO_CARTAS')) {
    let drawCount = 1;
    if (lower.includes('roba 2') || lower.includes('dos cartas')) drawCount = 2;
    if (lower.includes('roba 3') || lower.includes('tres cartas')) drawCount = 3;
    stateAfter.playerHandCount += drawCount;
    stateAfter.playerCastleCount = Math.max(0, stateAfter.playerCastleCount - drawCount);
    resourceDelta.hand += drawCount;
    resourceDelta.castle -= drawCount;
    detailedLog.push(`🎴 Efecto aplicado: Robas ${drawCount} carta(s) de tu Mazo Castillo.`);
  }

  // 3. Búsqueda en Castillo (Tutor)
  if (analysis.effectTags.some((e) => e.id === 'BUSQUEDA_CASTILLO')) {
    stateAfter.playerHandCount += 1;
    stateAfter.playerCastleCount = Math.max(0, stateAfter.playerCastleCount - 1);
    resourceDelta.hand += 1;
    resourceDelta.castle -= 1;
    detailedLog.push('🔍 Efecto aplicado: Buscas 1 carta objetivo en tu Mazo Castillo y la pones en tu mano (se baraja el mazo).');
  }

  // 4. Daño directo al Castillo oponente (Mill)
  if (analysis.effectTags.some((e) => e.id === 'DANO_CASTILLO')) {
    let millCount = 2;
    const millMatch = lower.match(/bota\s+(\d+|una|dos|tres|cuatro)/i);
    if (millMatch) {
      const m = millMatch[1];
      millCount = m === 'tres' ? 3 : m === 'cuatro' ? 4 : m === 'una' ? 1 : parseInt(m, 10) || 2;
    }
    stateAfter.cpuCastleCount = Math.max(0, stateAfter.cpuCastleCount - millCount);
    stateAfter.cpuCemeteryCount += millCount;
    resourceDelta.opponentCastleDamage += millCount;
    detailedLog.push(`💔 Efecto aplicado: Tu oponente bota ${millCount} carta(s) de su Mazo Castillo al Cementerio.`);
  }

  // 5. Destrucción de Aliados Oponentes
  if (analysis.effectTags.some((e) => e.id === 'DESTRUCCION') && lower.includes('oponente')) {
    let destroyed = 1;
    if (lower.includes('dos aliados oponentes')) destroyed = 2;
    stateAfter.cpuDefenseCount = Math.max(0, stateAfter.cpuDefenseCount - destroyed);
    stateAfter.cpuCemeteryCount += destroyed;
    resourceDelta.opponentDefenseLost += destroyed;
    detailedLog.push(`💥 Efecto aplicado: ${destroyed} Aliado(s) oponente(s) destruido(s) y enviado(s) al Cementerio.`);
  }

  // 6. Destierro de Aliados Oponentes
  if (analysis.effectTags.some((e) => e.id === 'DESTIERRO') && lower.includes('oponente')) {
    stateAfter.cpuDefenseCount = Math.max(0, stateAfter.cpuDefenseCount - 1);
    resourceDelta.opponentDefenseLost += 1;
    detailedLog.push('🌌 Efecto aplicado: 1 Aliado oponente es desterrado permanentemente.');
  }

  // 7. Auras continuas
  if (analysis.effectTags.some((e) => e.id === 'AURA_CONTINUA')) {
    stateAfter.activeAuras.push(`Aura de ${card.name}: ${card.ability.slice(0, 40)}...`);
    detailedLog.push(`✨ Aura permanente activada en mesa: "${card.name}".`);
  }

  detailedLog.push('✅ Simulación completada con éxito conforme a las reglas del D.A.R. 1.0.');

  const actionSummary = `Habilidad de "${card.name}" aplicada correctamente. Timing: ${analysis.timingCategory}. ${analysis.effectTags.map((e) => e.label).join(', ')}.`;

  return {
    success: true,
    actionSummary,
    detailedLog,
    stateBefore,
    stateAfter,
    resourceDelta,
  };
}

/**
 * Set Statistics across all 236 cards
 */
export interface SetAbilityStats {
  totalCards: number;
  withAbility: number;
  vanilla: number;
  timingCounts: Record<TimingCategory, number>;
  effectTagCounts: Record<string, number>;
  combatRoleCounts: Record<CombatRole, number>;
  uniqueCardsCount: number;
}

export function computeSetAbilityStats(): SetAbilityStats {
  const all = getAll236CardsAnalysis();

  const timingCounts: Record<TimingCategory, number> = {
    'Al Entrar': 0,
    'Activada en Vigilia': 0,
    'Aura Continua': 0,
    'Guerra de Talismanes': 0,
    'Al Atacar / Bloquear': 0,
    'Respuesta / Disparada': 0,
    'Fase de Agrupación': 0,
    'Final del Turno': 0,
    'Pasiva de Portador': 0,
    'Efecto Estático / Especial': 0,
    'Sin Habilidad': 0,
  };

  const effectTagCounts: Record<string, number> = {};
  Object.keys(EFFECT_TAGS).forEach((k) => {
    effectTagCounts[k] = 0;
  });

  const combatRoleCounts: Record<CombatRole, number> = {
    Agresivo: 0,
    Control: 0,
    'Aceleración / Economía': 0,
    'Defensa / Muro': 0,
    Disrupción: 0,
    'Soporte / Tutor': 0,
    Vanilla: 0,
  };

  let withAbility = 0;
  let vanilla = 0;

  all.forEach((item) => {
    if (item.hasAbility) withAbility++;
    else vanilla++;

    timingCounts[item.timingCategory] = (timingCounts[item.timingCategory] || 0) + 1;
    combatRoleCounts[item.combatRole] = (combatRoleCounts[item.combatRole] || 0) + 1;

    item.effectTags.forEach((t) => {
      effectTagCounts[t.id] = (effectTagCounts[t.id] || 0) + 1;
    });
  });

  return {
    totalCards: all.length,
    withAbility,
    vanilla,
    timingCounts,
    effectTagCounts,
    combatRoleCounts,
    uniqueCardsCount: all.filter((c) => CANONICAL_CARDS.find((card) => card.number === c.cardNumber)?.uniqueCard).length,
  };
}
