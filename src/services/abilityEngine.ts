import { CardData, PlayerState, AllyInPlay, CardRace } from '../types/card';
import { analyzeCardAbility, parseCardAbilityParts, CardAbilityPartAnalysis } from './cardAbilityAnalyzer';
import { abilityLogger, DestructionAuditItem } from './abilityLogger';

export interface WeaponTraits {
  unblockable?: boolean;
  indestructibleInCombat?: boolean;
  furyCanAttackImmediately?: boolean;
  cannotBeDestroyedByTalismans?: boolean;
  immuneToOpponentAllies?: boolean;
  extraTurnEndDraw?: boolean;
  mustPayGoldToAttack?: number;
  onBlockedDiscard?: number;
  banishAtTurnEnd?: boolean;
  allowsExtraWeapon?: boolean;
  canAttackOverride?: boolean;
}

export interface WeaponBearerCheck {
  allowed: boolean;
  reason?: string;
  bonusStrength: number;
  traits: WeaponTraits;
}

/**
 * Validates whether an Ally card can legally attack in the Battle Phase
 * of the very same turn in which it entered play (Haste / Furia / DAR exemption).
 */
export function allyCanAttackOnEntry(card: CardData, player: PlayerState): boolean {
  if (!card) return false;
  const typeNorm = (card.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (typeNorm !== 'aliado') return false;

  const text = (card.ability || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
  const cardNameUpper = (card.name || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Direct text granting immediate attack (Furia / Carga / DAR exemption)
  if (
    text.includes('puede atacar cuando entra') ||
    text.includes('pueden atacar cuando entran') ||
    text.includes('puede atacar al entrar') ||
    text.includes('pueden atacar al entrar') ||
    text.includes('puede atacar el turno que entra') ||
    text.includes('pueden atacar el turno que entran') ||
    text.includes('puede atacar en el turno que entra') ||
    text.includes('pueden atacar en el turno que entran') ||
    text.includes('debe atacar cuando entra') ||
    text.includes('debe atacar al entrar') ||
    text.includes('debe ser declarado atacante') ||
    text.includes('deben ser declarados atacantes') ||
    text.includes('al entrar en juego, debe ser declarado atacante') ||
    text.includes('furia') ||
    text.includes('carga')
  ) {
    // Condition for Sir Jason de la Sangre: "Si tienes algún Dragón en juego, Sir Jason de la Sangre puede atacar cuando entra en juego"
    if (cardNameUpper.includes('JASON') || text.includes('si tienes algun dragon en juego')) {
      const hasOtherDragon =
        player.lineaDefensa.some((a) => (a.card.race || '').toLowerCase().includes('drag')) ||
        player.lineaAtaque.some((a) => (a.card.race || '').toLowerCase().includes('drag'));
      return hasOtherDragon;
    }
    return true;
  }

  // 2. Global continuous field auras active on the player's side:
  // El Gran Wyrm: "tus demás Dragones ganan + 1 a la fuerza y pueden atacar cuando entran en juego"
  const isDragon = (card.race || '').toLowerCase().includes('drag');
  if (isDragon && !cardNameUpper.includes('EL GRAN WYRM')) {
    const hasWyrm =
      player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('EL GRAN WYRM')) ||
      player.lineaAtaque.some((a) => a.card.name.toUpperCase().includes('EL GRAN WYRM'));
    if (hasWyrm) return true;
  }

  // Titania: "tus demás Faeries ganan + 1 a la fuerza y pueden atacar cuando entran en juego"
  const isFaerie = (card.race || '').toLowerCase().includes('faer') || (card.race || '').toLowerCase().includes('feer');
  if (isFaerie && !cardNameUpper.includes('TITANIA')) {
    const hasTitania =
      player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('TITANIA')) ||
      player.lineaAtaque.some((a) => a.card.name.toUpperCase().includes('TITANIA'));
    if (hasTitania) return true;
  }

  return false;
}

/**
 * Validates whether an Ally card is strictly prohibited from being declared an attacker
 * (e.g. "sólo puede bloquear", "solo puede defender", "no puede ser declarado atacante",
 * "Alto Druida", "Sir Mador del Portal", "Dragonel", or unfulfilled conditional attack requirements).
 */
export function allyCannotAttack(card: CardData, player?: PlayerState, rival?: PlayerState): boolean {
  if (!card) return true;
  const typeNorm = (card.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (typeNorm !== 'aliado') return true;

  const text = (card.ability || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
  const nameUpper = (card.name || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Direct absolute restrictions: "solo puede bloquear", "solo puede defender", "no puede ser declarado atacante", "no puede atacar"
  if (
    text.includes('solo puede bloquear') ||
    text.includes('solo puede defender') ||
    text.includes('solo defiende') ||
    text.includes('solo para defender') ||
    text.includes('solo para bloquear') ||
    text.includes('unicamente puede bloquear') ||
    text.includes('unicamente puede defender') ||
    text.includes('no puede ser declarado atacante') ||
    text.includes('no pueden ser declarados atacantes') ||
    text.includes('no puede ser declarado como atacante') ||
    text.includes('no pueden ser declarados como atacantes') ||
    text.includes('no puede ser atacante') ||
    text.includes('no pueden ser atacantes') ||
    text.includes('no puede atacar') ||
    text.includes('no pueden atacar') ||
    text.includes('no podra atacar') ||
    text.includes('no podran atacar') ||
    nameUpper.includes('ALTO DRUIDA') ||
    nameUpper.includes('MADOR DEL PORTAL') ||
    nameUpper.includes('DRAGONEL')
  ) {
    return true;
  }

  // 2. Conditional attack restrictions:
  // Duque Thurk Bloodline: "Sólo puede atacar, si designas como atacantes a otros 2 Dragones."
  if (nameUpper.includes('DUQUE THURK') || text.includes('designas como atacantes a otros 2 dragones')) {
    if (player) {
      const otherDragons = [
        ...player.lineaDefensa,
        ...player.lineaAtaque,
      ].filter(
        (a) =>
          a.card.id !== card.id &&
          ((a.card.race || '').toLowerCase() === 'dragón' || (a.card.race || '').toLowerCase() === 'dragon')
      );
      if (otherDragons.length < 2) return true;
    }
  }

  // "Sólo puede atacar si Rey Arturo Pendragón está en juego"
  if (text.includes('sólo puede atacar si rey arturo') || text.includes('solo puede atacar si rey arturo')) {
    if (player) {
      const hasArturo =
        player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('REY ARTURO')) ||
        player.lineaAtaque.some((a) => a.card.name.toUpperCase().includes('REY ARTURO'));
      if (!hasArturo) return true;
    }
  }

  // "Sólo puede atacar si descartas 3"
  if (text.includes('sólo puede atacar si descartas 3') || text.includes('solo puede atacar si descartas 3')) {
    if (player && player.mano.length < 3) return true;
  }

  // "Sólo puede atacar, si tu oponente tiene algún Caballero en juego"
  if (text.includes('si tu oponente tiene algún caballero') || text.includes('si tu oponente tiene algun caballero')) {
    if (rival) {
      const rivalHasKnight =
        rival.lineaDefensa.some((a) => a.card.race === 'Caballero') ||
        rival.lineaAtaque.some((a) => a.card.race === 'Caballero');
      if (!rivalHasKnight) return true;
    }
  }

  return false;
}

export type TutorFilterType =
  | 'Tótem'
  | 'Talismán'
  | 'Arma'
  | 'Caballero'
  | 'Faerie'
  | 'Dragón'
  | 'Oro_Normal'
  | 'Aliado'
  | 'any';

export interface TutorRequest {
  sourceZone: 'castillo' | 'cementerio' | 'both';
  filterType?: TutorFilterType;
  filterName?: string;
  filterStrength?: number;
  destination: 'mano' | 'reserva' | 'castillo_shuffle' | 'lineaDefensa' | 'juego_arma';
  maxCount: number;
  reason: string;
  cardName: string;
  drawExtraAfter?: number;
  targetOwner?: 'player' | 'cpu';
}

export interface DiscardRequest {
  targetZone: 'mano';
  targetOwner: 'player' | 'rival';
  count: number;
  reason: string;
  cardName: string;
  invokingCard?: CardData;
  afterDiscardEffect?: 'draw' | 'buff' | 'damage';
  afterDiscardAmount?: number;
}

export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

export interface ChoiceRequest {
  title: string;
  cardName: string;
  description: string;
  options: ChoiceOption[];
  invokingCard: CardData;
}

export interface AbilityExecutionResult {
  updatedPlayer: PlayerState;
  updatedRival: PlayerState;
  logMessage: string;
  sound?: 'summon' | 'damage' | 'shield' | 'victory' | 'flick';
  abilityName: string;
  activatedSuccessfully: boolean;
  pendingTutor?: TutorRequest;
  pendingChoice?: ChoiceRequest;
  pendingDiscard?: DiscardRequest;
  modularPlan?: ModularCardPlan;
}

/**
 * Modular Ability Execution Pipeline Types
 * Handles sequential multi-step card effects (costs, choices, searches, follow-ups)
 */
export type ModularStepAction =
  | 'pay_gold'
  | 'discard_cards'
  | 'destroy_self'
  | 'banish_self'
  | 'sacrifice_ally'
  | 'draw_cards'
  | 'generate_gold'
  | 'buff_strength'
  | 'destroy_opp_ally'
  | 'destroy_opp_totem'
  | 'banish_opp_ally'
  | 'banish_opp_graveyard'
  | 'shuffle_to_castle'
  | 'mill_castle'
  | 'tutor_search'
  | 'choice_branch'
  | 'nullify_ability'
  | 'prevent_combat_damage';

export interface ModularAbilityStep {
  stepNumber: number;
  totalSteps: number;
  action: ModularStepAction;
  description: string;
  isMandatoryCost?: boolean;
  params?: {
    count?: number;
    amount?: number;
    filterType?: string;
    filterRace?: string;
    filterName?: string;
    sourceZone?: 'castillo' | 'cementerio' | 'mano' | 'mesa';
    destination?: 'mano' | 'castillo_shuffle' | 'cementerio' | 'destierro';
    targetOwner?: 'player' | 'cpu' | 'both';
    options?: ChoiceOption[];
    reason?: string;
  };
}

export interface ModularCardPlan {
  cardName: string;
  triggerTiming: 'entry' | 'vigilia' | 'combat' | 'response' | 'continuous';
  darRule: string;
  steps: ModularAbilityStep[];
}

/**
 * Returns the modular multi-step execution plan for cards with complex
 * or sequential triggers under DAR regulations.
 */
export function getModularAbilityPlan(card: CardData): ModularCardPlan | null {
  if (!card || !card.ability) return null;
  const cardNameUpper = card.name.toUpperCase().trim();
  const abilityText = card.ability.toLowerCase();

  // Sir Owen: Roba 3 cartas y luego descarta 2
  if (cardNameUpper.includes('SIR OWEN') || abilityText.includes('roba 3 cartas y descarta 2')) {
    return {
      cardName: card.name,
      triggerTiming: 'entry',
      darRule: 'D.A.R. 5.2.1 / 6.1 Secuencia de Ingreso',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'draw_cards',
          description: 'Paso 1: Robar 3 cartas del Mazo Castillo a la mano.',
          params: { count: 3 },
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'discard_cards',
          description: 'Paso 2: Descartar 2 cartas de la mano al Cementerio.',
          isMandatoryCost: false,
          params: { count: 2, sourceZone: 'mano', destination: 'cementerio' },
        },
      ],
    };
  }

  // Brag: Baraja 1 carta de tu mano en tu Mazo Castillo y roba 2 cartas
  if (cardNameUpper.includes('BRAG') || (abilityText.includes('baraja 1 carta de tu mano') && abilityText.includes('roba 2'))) {
    return {
      cardName: card.name,
      triggerTiming: 'entry',
      darRule: 'D.A.R. 5.2.1 Secuencia de Ingreso',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'shuffle_to_castle',
          description: 'Paso 1: Barajar 1 carta de tu mano en tu Mazo Castillo.',
          isMandatoryCost: true,
          params: { count: 1 },
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'draw_cards',
          description: 'Paso 2: Robar 2 cartas de tu Mazo Castillo.',
          params: { count: 2 },
        },
      ],
    };
  }

  // Tótem de Cristal: Paga 3 oro para barajar un Talismán de cementerio a castillo
  if (cardNameUpper.includes('TOTEM DE CRISTAL') || (card.type === 'Tótem' && cardNameUpper.includes('CRISTAL'))) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 5.2 Habilidad Activada de Tótem',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'pay_gold',
          description: 'Paso 1: Pagar 3 de Oro de la Reserva.',
          isMandatoryCost: true,
          params: { amount: 3 },
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'tutor_search',
          description: 'Paso 2: Seleccionar 1 Talismán del Cementerio para barajarlo en el Mazo Castillo.',
          params: { sourceZone: 'cementerio', filterType: 'Talismán', destination: 'castillo_shuffle', count: 1 },
        },
      ],
    };
  }

  // Argusthat: Paga 2 oro para barajar un Aliado de cementerio a castillo
  if (cardNameUpper.includes('ARGUSTHAT')) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 5.2 Habilidad Activada',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'pay_gold',
          description: 'Paso 1: Pagar 2 de Oro de la Reserva.',
          isMandatoryCost: true,
          params: { amount: 2 },
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'tutor_search',
          description: 'Paso 2: Seleccionar 1 Aliado del Cementerio para barajarlo en el Mazo Castillo.',
          params: { sourceZone: 'cementerio', filterType: 'Aliado', destination: 'castillo_shuffle', count: 1 },
        },
      ],
    };
  }

  // Darg el Semi Dragón: Paga 1 oro para ganar +1 Fuerza
  if (cardNameUpper.includes('DARG') || abilityText.includes('el semi dragón, gane + 1')) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 5.2 Habilidad Activada de Aliado',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'pay_gold',
          description: 'Paso 1: Pagar 1 de Oro de la Reserva.',
          isMandatoryCost: true,
          params: { amount: 1 },
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'buff_strength',
          description: 'Paso 2: Darg gana +1 a la Fuerza hasta el final del turno.',
          params: { amount: 1 },
        },
      ],
    };
  }

  // Excalibur: Descarta 1 para que Arturo gane bono de fuerza igual al coste
  if (cardNameUpper.includes('EXCALIBUR')) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 4.2.2 Habilidad de Arma Legendaria',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'discard_cards',
          description: 'Paso 1: Descartar 1 carta de la mano.',
          isMandatoryCost: true,
          params: { count: 1 },
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'buff_strength',
          description: 'Paso 2: Rey Arturo gana Fuerza igual al coste en oro de la carta descartada.',
        },
      ],
    };
  }

  // Codex Artúricus: En daño, destierra Codex para reducir todo el daño a 0
  if (cardNameUpper.includes('CODEX')) {
    return {
      cardName: card.name,
      triggerTiming: 'combat',
      darRule: 'D.A.R. 5.3.4 Asignación de Daño de Combate',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'banish_self',
          description: 'Paso 1: Desterrar Codex Artúricus de la Reserva de Oro.',
          isMandatoryCost: true,
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'prevent_combat_damage',
          description: 'Paso 2: Reducir todo el daño de combate a 0.',
        },
      ],
    };
  }

  // Sir Gaerín: Destruir para anular habilidad de Caballero
  if (cardNameUpper.includes('SIR GAERIN') || abilityText.includes('destruir a sir gaerin')) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 5.2 Habilidad Activada',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'destroy_self',
          description: 'Paso 1: Destruir a Sir Gaerín el Blanco.',
          isMandatoryCost: true,
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'nullify_ability',
          description: 'Paso 2: Anular la habilidad de un Caballero rival hasta el final del turno.',
        },
      ],
    };
  }

  // Atha-Uk: Destruir para desterrar 1 carta del cementerio oponente
  if (cardNameUpper.includes('ATHA-UK') || abilityText.includes('destruir a atha-uk')) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 5.2 Habilidad Activada',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'destroy_self',
          description: 'Paso 1: Destruir a Atha-Uk.',
          isMandatoryCost: true,
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'banish_opp_graveyard',
          description: 'Paso 2: Desterrar 1 carta del Cementerio oponente.',
          params: { count: 1 },
        },
      ],
    };
  }

  // Comisario: Desterrar para que oponente no robe
  if (cardNameUpper.includes('COMISARIO') || abilityText.includes('destierra a comisario')) {
    return {
      cardName: card.name,
      triggerTiming: 'vigilia',
      darRule: 'D.A.R. 5.2 Habilidad Activada',
      steps: [
        {
          stepNumber: 1,
          totalSteps: 2,
          action: 'banish_self',
          description: 'Paso 1: Desterrar a Comisario.',
          isMandatoryCost: true,
        },
        {
          stepNumber: 2,
          totalSteps: 2,
          action: 'nullify_ability',
          description: 'Paso 2: El oponente no podrá robar cartas en su próximo turno.',
        },
      ],
    };
  }

  return null;
}

/**
 * Checks whether an entry ability can be legally executed when a card enters play.
 * If requirements or costs (discard, gold, ally sacrifice, opponent targets, cemetery cards,
 * castle cards) cannot be met, simply returns { canExecute: false } so the ability
 * is skipped gracefully without interrupting play.
 */
export function canExecuteEntryAbility(
  card: CardData,
  player: PlayerState,
  rival: PlayerState
): { canExecute: boolean; reason?: string } {
  if (!card.ability || card.type === 'Oro') {
    return { canExecute: true };
  }

  const analysis = analyzeCardAbility(card);
  const text = card.ability.toLowerCase();
  const cardNameUpper = card.name.toUpperCase().trim();

  // Deferred / Attack / End-of-turn / In-Play Activated abilities should NEVER execute on entry:
  if (cardNameUpper.includes('ETTIN')) {
    return { canExecute: false, reason: 'Habilidad se activa en respuesta a ser declarado atacante' };
  }
  if (cardNameUpper.includes('BRUJA ANIS') || cardNameUpper.includes('BRUJA ANÍS')) {
    return { canExecute: false, reason: 'Habilidad se activa al finalizar tu turno' };
  }
  if (cardNameUpper.includes('ULTIMA CANCION') || cardNameUpper.includes('ÚLTIMA CANCIÓN')) {
    if (player.reservaOro >= 2) {
      return { canExecute: true };
    }
    return { canExecute: false, reason: 'Habilidad de Tótem se activa en Fase de Vigilia pulsando "⚡ Activar" pagando 2 de Oro' };
  }

  // If the card has no entry trigger parts and is not a talisman, entry gatekeeper allows it
  const hasEntryPart =
    analysis.abilityParts?.some(
      (p) => p.isEntryTrigger || p.timingCategory === 'Al Entrar'
    ) || analysis.timingCategory === 'Al Entrar';

  if (!hasEntryPart && card.type !== 'Talismán') {
    return { canExecute: true };
  }

  // 1. Specific card prerequisite checks:
  // Pixie requires Morgana in defense or attack
  if (cardNameUpper.includes('PIXIE')) {
    const hasMorgana =
      player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('MORGANA')) ||
      player.lineaAtaque.some((a) => a.card.name.toUpperCase().includes('MORGANA'));
    if (!hasMorgana) {
      return { canExecute: false, reason: 'requiere tener a Morgana en juego' };
    }
  }

  // Sir Jason de la Sangre: "si tienes algún Dragón en juego"
  if (cardNameUpper.includes('JASON') || text.includes('si tienes algún dragón en juego')) {
    const hasDragon =
      player.lineaDefensa.some((a) => a.card.race === 'Dragón') ||
      player.lineaAtaque.some((a) => a.card.race === 'Dragón');
    if (!hasDragon) {
      return { canExecute: false, reason: 'requiere controlar al menos un Dragón en juego' };
    }
  }

  // Kelpie: "uno de tus dragones gana +2 a la fuerza..."
  if (cardNameUpper.includes('KELPIE')) {
    const hasDragon =
      player.lineaDefensa.some((a) => a.card.race === 'Dragón') ||
      player.lineaAtaque.some((a) => a.card.race === 'Dragón');
    if (!hasDragon) {
      return { canExecute: false, reason: 'no controlas ningún Dragón en juego para potenciar' };
    }
  }

  // 2. Discard requirement as a mandatory cost:
  if (
    (text.includes('para que') && (text.includes('descarta') || text.includes('descartar'))) ||
    text.includes('al entrar en juego, descarta') ||
    text.includes('al entrar al juego, descarta') ||
    text.includes('debes descartar')
  ) {
    const handCount = player.mano.filter((c) => c.id !== card.id).length;
    let needed = 1;
    if (text.includes('descarta 2') || text.includes('descarta dos')) needed = 2;
    if (text.includes('descarta 3') || text.includes('descarta tres')) needed = 3;
    if (handCount < needed) {
      return {
        canExecute: false,
        reason: `requiere descartar ${needed} carta(s) de tu mano pero sólo tienes ${handCount}`,
      };
    }
  }

  // 3. Hand shuffle requirement (e.g. Brag: "baraja 1 carta de tu mano en tu mazo castillo")
  if (text.includes('baraja 1 carta de tu mano') || text.includes('baraja una carta de tu mano')) {
    const handCount = player.mano.filter((c) => c.id !== card.id).length;
    if (handCount === 0) {
      return {
        canExecute: false,
        reason: 'no tienes cartas en tu mano para barajar en el mazo',
      };
    }
  }

  // 4. Extra Gold cost required upon entry:
  if (analysis.costAnalysis.goldCost > 0) {
    if (player.reservaOro < analysis.costAnalysis.goldCost) {
      return {
        canExecute: false,
        reason: `requiere ${analysis.costAnalysis.goldCost} de Oro en reserva pero tienes ${player.reservaOro}`,
      };
    }
  }

  // 5. Sacrifice / destroy another ally required:
  if (
    analysis.costAnalysis.mustSacrificeAlly ||
    text.includes('destruye otro aliado') ||
    text.includes('sacrifica otro aliado') ||
    text.includes('destierra otro aliado')
  ) {
    const otherAllies = player.lineaDefensa.filter((a) => a.card.id !== card.id).length;
    if (otherAllies === 0) {
      return {
        canExecute: false,
        reason: 'requiere controlar y destruir otro Aliado en tu Línea de Defensa',
      };
    }
  }

  // 6. Target required: Opponent Ally in play:
  if (
    (text.includes('destruye un aliado oponente') ||
      text.includes('destruye un aliado rival') ||
      text.includes('destruye un aliado del oponente') ||
      text.includes('baraja un aliado oponente') ||
      text.includes('baraja un aliado rival') ||
      text.includes('sube a su mano un aliado oponente') ||
      text.includes('elige un aliado oponente') ||
      text.includes('hace daño a un aliado rival') ||
      text.includes('al entrar en juego destruye un aliado oponente')) &&
    !text.includes('o ')
  ) {
    const rivalAllies = rival.lineaDefensa.length + rival.lineaAtaque.length;
    if (rivalAllies === 0) {
      return {
        canExecute: false,
        reason: 'el oponente no tiene ningún Aliado en juego como objetivo',
      };
    }
  }

  // 7. Target required: Opponent Totem / Support in play:
  if (
    (text.includes('destruye un tótem oponente') ||
      text.includes('destruye un totem rival') ||
      text.includes('destruye un tótem del oponente')) &&
    !text.includes('o ')
  ) {
    const rivalTotems = rival.lineaApoyo.filter((s) => s.card.type === 'Tótem').length;
    if (rivalTotems === 0) {
      return {
        canExecute: false,
        reason: 'el oponente no tiene ningún Tótem en su Línea de Apoyo',
      };
    }
  }

  // 8. Target required: Opponent Gold with ability (e.g. Bane):
  if (cardNameUpper.includes('BANE') || (text.includes('un oro con habilidad') && text.includes('baraje'))) {
    const hasGoldWithAbility = rival.oroCards.some(
      (c) => c.ability && c.ability.trim().length > 5
    );
    if (!hasGoldWithAbility) {
      return {
        canExecute: false,
        reason: 'el oponente no tiene ningún Oro con habilidad en juego',
      };
    }
  }

  // 9. Target required: Opponent Hand discard (e.g. Sir Héctor):
  if (
    (text.includes('oponente descarta') ||
      text.includes('rival descarta') ||
      text.includes('tu oponente se descarta')) &&
    !text.includes('a menos que') &&
    !text.includes('o ')
  ) {
    if (rival.mano.length === 0) {
      return {
        canExecute: false,
        reason: 'el oponente no tiene cartas en su mano para descartar',
      };
    }
  }

  // 10. Dragón Nival: Destroy all allies of strength 2 or less
  if (cardNameUpper.includes('NIVAL')) {
    const smallAllies = [
      ...player.lineaDefensa,
      ...player.lineaAtaque,
      ...rival.lineaDefensa,
      ...rival.lineaAtaque,
    ].filter((a) => a.currentStrength <= 2);
    if (smallAllies.length === 0) {
      return {
        canExecute: false,
        reason: 'no hay ningún Aliado de fuerza 2 o menor en juego para destruir',
      };
    }
  }

  // 11. Target required: Cards in Graveyard (Cementerio):
  if (
    text.includes('de tu cementerio') &&
    (text.includes('rescata') ||
      text.includes('baraja') ||
      text.includes('recicla') ||
      text.includes('pon en tu mano'))
  ) {
    if (player.cementerio.length === 0) {
      return {
        canExecute: false,
        reason: 'tu Cementerio está vacío para recuperar o barajar cartas',
      };
    }
    if (
      (text.includes('faerie') || cardNameUpper.includes('POOKA')) &&
      !player.cementerio.some((c) => c.race === 'Faerie')
    ) {
      return {
        canExecute: false,
        reason: 'no tienes Faeries en tu Cementerio',
      };
    }
    if (
      text.includes('aliado de tu cementerio') &&
      !player.cementerio.some((c) => c.type === 'Aliado')
    ) {
      return {
        canExecute: false,
        reason: 'no tienes Aliados en tu Cementerio',
      };
    }
    if (
      text.includes('tótem de tu cementerio') &&
      !player.cementerio.some((c) => c.type === 'Tótem')
    ) {
      return {
        canExecute: false,
        reason: 'no tienes Tótems en tu Cementerio',
      };
    }
  }

  // 12. Search / Tutor requirement: Castle (Castillo):
  if (
    (text.includes('en tu mazo castillo') || text.includes('de tu mazo castillo')) &&
    (text.includes('busca') || text.includes('añade a tu mano') || text.includes('ponlo en tu mano'))
  ) {
    if (player.castillo.length === 0) {
      return {
        canExecute: false,
        reason: 'tu Mazo Castillo está vacío para buscar',
      };
    }
    if (
      (text.includes('caballero') || cardNameUpper.includes('GUINIVERE')) &&
      !player.castillo.some((c) => c.race === 'Caballero')
    ) {
      return {
        canExecute: false,
        reason: 'no tienes Caballeros en tu Mazo Castillo',
      };
    }
    if (
      (text.includes('faerie') || cardNameUpper.includes('ESMERALDA')) &&
      !player.castillo.some((c) => c.race === 'Faerie')
    ) {
      return {
        canExecute: false,
        reason: 'no tienes Faeries en tu Mazo Castillo',
      };
    }
    if (
      (cardNameUpper.includes('CONJURADOR') || text.includes('oro normal')) &&
      !player.castillo.some((c) => c.type === 'Oro' && (!c.ability || c.ability.length < 5))
    ) {
      return {
        canExecute: false,
        reason: 'no tienes Oros Normales en tu Mazo Castillo',
      };
    }
    if (
      (text.includes('galahad') || cardNameUpper.includes('SHEE DIA')) &&
      !player.castillo.some((c) => c.name.toUpperCase().includes('GALAHAD'))
    ) {
      return {
        canExecute: false,
        reason: 'Sir Galahad no está en tu Mazo Castillo',
      };
    }
    if (cardNameUpper.includes('ETTIN')) {
      return {
        canExecute: false,
        reason: 'Habilidad se activa en respuesta a ser declarado atacante',
      };
    }
    if (cardNameUpper.includes('BRUJA ANIS') || cardNameUpper.includes('BRUJA ANÍS')) {
      return {
        canExecute: false,
        reason: 'Habilidad se activa al finalizar tu turno',
      };
    }

    if (cardNameUpper.includes('NODRIZA')) {
      const hasAnotherNodriza = player.castillo.some((c) =>
        c.name.toUpperCase().includes('NODRIZA')
      );
      if (!hasAnotherNodriza) {
        return {
          canExecute: false,
          reason: 'no quedan más copias de "Dragón Nodriza" en tu Mazo Castillo',
        };
      }
    }
    if (
      cardNameUpper.includes('LUCAN') &&
      !player.castillo.some((c) => c.name.toUpperCase().includes('LUCAN'))
    ) {
      return {
        canExecute: false,
        reason: `no quedan más copias de "${card.name}" en tu Mazo Castillo`,
      };
    }
  }

  // 13. Target required: Strength debuff on opponent ally (e.g. Fuerza Caótica)
  if (
    (text.includes('aliado oponente gana -') ||
      text.includes('aliados oponentes ganan -') ||
      text.includes('aliado oponente pierde') ||
      text.includes('aliado oponente tenga fuerza cero') ||
      text.includes('aliado oponente tenga fuerza 0')) &&
    !text.includes('o ')
  ) {
    const rivalAlliesCount = rival.lineaDefensa.length + (rival.lineaAtaque || []).length;
    if (rivalAlliesCount === 0) {
      return {
        canExecute: false,
        reason: 'el oponente no tiene ningún Aliado en juego para debilitar',
      };
    }
  }

  // 14. Target required: Strength buff on friendly ally (e.g. Furia del Dragón, Knockers, etc.)
  if (
    card.type === 'Talismán' &&
    (text.includes('un aliado gana +') ||
      text.includes('un dragón gana +') ||
      text.includes('un dragon gana +') ||
      text.includes('uno de tus aliados gana +') ||
      text.includes('porte un arma') ||
      text.includes('porte arma')) &&
    !text.includes('todos')
  ) {
    const isDragonBuff = text.includes('drag');
    const isWeaponBuff = text.includes('porte un arma') || text.includes('porte arma');
    let eligibleFriendly = [...player.lineaDefensa, ...(player.lineaAtaque || [])];

    if (isDragonBuff) {
      eligibleFriendly = eligibleFriendly.filter((a) => a.card.race === 'Dragón');
    } else if (isWeaponBuff) {
      eligibleFriendly = eligibleFriendly.filter((a) => (a.attachedWeapons?.length || 0) > 0);
    }

    if (eligibleFriendly.length === 0) {
      return {
        canExecute: false,
        reason: isDragonBuff
          ? 'no controlas ningún Dragón en juego para potenciar'
          : isWeaponBuff
          ? 'no controlas ningún Aliado que porte un arma para potenciar'
          : 'no controlas ningún Aliado en juego para potenciar',
      };
    }
  }

  // 15. Cost requirement: Gold destruction (e.g. Vegetación Animada)
  if (text.includes('destruye uno de tus oros')) {
    const totalGolds = player.oroCards.length + player.oroPagado.length;
    if (totalGolds === 0) {
      return {
        canExecute: false,
        reason: 'no tienes Oros en juego para destruir como coste',
      };
    }
  }

  return { canExecute: true };
}

/**
 * Creates a temporary gold token that is added to oroCards so that
 * gold generated by abilities (Campesino, Juglares, Totem Alquímico, Herrero, Dragón Cobrizo)
 * can actually be spent in any payment interface.
 * Supports goldRestriction (e.g. 'Dragón', 'Arma', 'Arma o Caballero').
 */
export function createTemporaryGoldToken(name = 'Oro Generado', goldRestriction?: string): CardData {
  return {
    id: `oro-temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    number: 0,
    totalInSet: 236,
    edition: 'PRIMERA EDICION',
    name: goldRestriction ? `${name} [${goldRestriction}]` : name,
    type: 'Oro',
    race: 'Sin Raza',
    strength: 0,
    cost: 0,
    flavorText: goldRestriction
      ? `Oro temporal que solo puede ser usado para pagar: ${goldRestriction}.`
      : 'Oro efímero invocado por la magia de tus cartas.',
    ability: goldRestriction
      ? `Oro temporal. Restricción de uso: Solo para ${goldRestriction}. Desaparece al final del turno.`
      : 'Oro temporal que desaparece al final del turno.',
    illustrator: 'Mitos y Leyendas',
    rarity: 'Cortesano',
    foil: 'none',
    uniqueCard: false,
    imagePreset: 'dragon',
    imageUrl: '/cards/basic_oro.png',
    goldRestriction,
  };
}

/**
 * Checks whether a specific gold card can legally pay for targetCard.
 * Unrestricted gold can pay for anything.
 * Restricted gold (Dragón Cobrizo, Herrero, Reina Guinivere) can only pay for matching cards.
 */
export function canGoldPayForCard(gold: CardData, targetCard?: CardData): boolean {
  if (!gold.goldRestriction) return true;
  if (!targetCard) return false; // Generic non-card payments (e.g. attack taxes) cannot use restricted gold

  const rest = gold.goldRestriction.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (rest.includes('dragon')) {
    const isDragon =
      targetCard.type === 'Aliado' &&
      (targetCard.race || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('drag');
    return isDragon;
  }

  if (rest.includes('arma')) {
    if (rest.includes('caballero')) {
      const isKnight =
        targetCard.type === 'Aliado' &&
        (targetCard.race || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('caballer');
      return targetCard.type === 'Arma' || isKnight;
    }
    return targetCard.type === 'Arma';
  }

  if (rest.includes('caballero')) {
    return (
      targetCard.type === 'Aliado' &&
      (targetCard.race || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('caballer')
    );
  }

  return true;
}

/**
 * Filters the player's available gold cards to those legally eligible to pay for targetCard.
 */
export function getEligibleGoldCards(oroCards: CardData[], targetCard?: CardData): CardData[] {
  if (!targetCard) {
    return oroCards.filter((g) => !g.goldRestriction);
  }
  return oroCards.filter((g) => canGoldPayForCard(g, targetCard));
}

/**
 * Safely calculates and pays gold for targetCard from oroCards,
 * prioritizing restricted gold that matches targetCard first so that unrestricted gold remains available.
 */
export function payGoldForCard(
  oroCards: CardData[],
  cost: number,
  targetCard?: CardData
): { paid: CardData[]; remaining: CardData[]; success: boolean } {
  if (cost <= 0) {
    return { paid: [], remaining: oroCards, success: true };
  }

  const eligible = getEligibleGoldCards(oroCards, targetCard);
  if (eligible.length < cost) {
    return { paid: [], remaining: oroCards, success: false };
  }

  // Prioritize restricted gold first
  const sortedEligible = [...eligible].sort((a, b) => {
    const aRest = a.goldRestriction ? 1 : 0;
    const bRest = b.goldRestriction ? 1 : 0;
    return bRest - aRest;
  });

  const toPay = sortedEligible.slice(0, cost);
  const toPayIds = new Set(toPay.map((c) => c.id));
  const remaining = oroCards.filter((c) => !toPayIds.has(c.id));

  return { paid: toPay, remaining, success: true };
}

/**
 * Checks whether an Arma (Weapon) explicitly states in its ability text
 * that it must/can be played directly in Línea de Apoyo.
 */
export function isWeaponSupportLineOnly(card: CardData): boolean {
  if (card.type !== 'Arma') return false;
  const text = (card.ability || '').toLowerCase();
  return (
    text.includes('línea de apoyo') ||
    text.includes('linea de apoyo') ||
    text.includes('zona de apoyo') ||
    text.includes('va a la línea de apoyo') ||
    text.includes('se juega en la línea de apoyo') ||
    text.includes('en tu línea de apoyo')
  );
}

/**
 * Returns true if the card's ability is strictly an entry trigger
 * (e.g. "Cuando este Aliado entra en juego", "Al entrar al juego", etc.)
 * and does NOT have an in-play activated ability.
 */
export function isEntryAbilityOnly(card: CardData): boolean {
  if (!card.ability || card.type === 'Oro') return false;
  if (card.type === 'Talismán') return true; // Talismans always resolve on play

  const parts = parseCardAbilityParts(card);
  const hasEntryPart = parts.some((p) => p.isEntryTrigger || p.timingCategory === 'Al Entrar');
  const hasActivatedPart = parts.some(
    (p) => p.isActivatedTrigger || p.timingCategory === 'Activada en Vigilia' || p.isOncePerTurn
  );

  if (hasEntryPart && !hasActivatedPart) return true;
  if (hasActivatedPart) return false;

  const text = card.ability.toLowerCase();

  const hasEntryPhrase =
    text.includes('entra en juego') ||
    text.includes('entra al juego') ||
    text.includes('al entrar en juego') ||
    text.includes('al entrar al juego') ||
    text.includes('cuando entra en juego') ||
    text.includes('cuando entra al juego') ||
    text.includes('al entrar') ||
    text.includes('cuando entra') ||
    text.includes('en su fase de ingreso') ||
    text.includes('al ser jugado') ||
    text.includes('cuando es jugado') ||
    text.includes('al ser invocado') ||
    text.includes('al ser puesto en juego') ||
    text.includes('cuando juegues') ||
    text.includes('al jugar');

  const hasActivatedPhrase =
    text.includes('en tu fase de vigilia') ||
    text.includes('fase de vigilia') ||
    text.includes('una vez por turno') ||
    text.includes('hasta 3 veces por turno') ||
    text.includes('puedes pagar') ||
    text.includes('paga ') ||
    text.includes('destierra este aliado') ||
    text.includes('destierra esta carta') ||
    text.includes('destruye a campesino') ||
    text.includes('destruye este') ||
    (text.includes('destruye') && text.includes('para')) ||
    (text.includes('genera') && text.includes('oro') && !text.includes('entra'));

  return hasEntryPhrase && !hasActivatedPhrase;
}

/**
 * Returns true if the card has an activated in-play ability that can be manually activated
 * during the player's Vigilia phase.
 */
export function hasActivatedInPlayAbility(card: CardData): boolean {
  if (!card.ability || card.type === 'Talismán') return false;
  if (isEntryAbilityOnly(card)) return false;

  const parts = parseCardAbilityParts(card);
  if (
    parts.some(
      (p) => p.isActivatedTrigger || p.timingCategory === 'Activada en Vigilia' || p.isOncePerTurn
    )
  ) {
    return true;
  }

  const text = card.ability.toLowerCase();

  return (
    text.includes('en tu fase de vigilia') ||
    text.includes('fase de vigilia') ||
    text.includes('una vez por turno') ||
    text.includes('hasta 3 veces por turno') ||
    text.includes('puedes pagar') ||
    text.includes('paga 1 de oro') ||
    text.includes('paga 2 de oro') ||
    text.includes('paga 3 de oro') ||
    text.includes('paga 4 de oro') ||
    text.includes('destierra este aliado') ||
    text.includes('destierra a comisario') ||
    text.includes('destruye a campesino') ||
    text.includes('destruye a sir gaerin') ||
    text.includes('destruye a atha-uk') ||
    text.includes('destruye este tótem') ||
    text.includes('destierra espada dragón') ||
    text.includes('destierra a alabarda') ||
    (text.includes('puedes descartar') && text.includes('para')) ||
    (text.includes('destruye') && text.includes('para generar')) ||
    (text.includes('genera') && text.includes('oro') && !text.includes('entra')) ||
    card.name.toUpperCase().includes('ESPADA LARGA') ||
    text.includes('portador de espada larga')
  );
}

/**
 * Returns the maximum number of times this card's activated ability can be activated per turn.
 */
export function getMaxActivationsPerTurn(card: CardData): number {
  const text = (card.ability || '').toLowerCase();
  if (text.includes('hasta 3 veces por turno') || text.includes('3 veces por turno')) {
    return 3;
  }
  return 1;
}

/**
 * Validates whether an ally is legally eligible to bear this weapon.
 */
export function checkWeaponBearerEligibility(
  weapon: CardData,
  ally: AllyInPlay
): WeaponBearerCheck {
  const text = (weapon.ability || '').toLowerCase();
  const weaponNameUpper = weapon.name.toUpperCase().trim();
  const allyNameUpper = ally.card.name.toUpperCase().trim();
  const allyAbility = (ally.card.ability || '').toLowerCase();

  // 1. ALLY SELF-RESTRICTION AGAINST BEARING WEAPONS (DAR 4.2.2)
  if (
    allyAbility.includes('no puede portar armas') ||
    allyAbility.includes('no puede portar arma')
  ) {
    return {
      allowed: false,
      reason: `Restricción del Aliado: "${ally.card.name}" tiene una habilidad propia que le impide portar armas.`,
      bonusStrength: 0,
      traits: {},
    };
  }

  // 2. SPECIFIC ALLY NAME RESTRICTIONS
  if (
    text.includes('sólo puede ser portada por rey arturo') ||
    text.includes('solo puede ser portada por rey arturo') ||
    text.includes('su portador debe ser rey arturo') ||
    text.includes('sólo puede ser portada por el rey arturo') ||
    text.includes('solo puede portarla rey arturo') ||
    (weaponNameUpper.includes('EXCALIBUR') && text.includes('arturo'))
  ) {
    if (!allyNameUpper.includes('ARTURO')) {
      return {
        allowed: false,
        reason: `Requisito de Portador: "${weapon.name}" sólo puede ser portada por Rey Arturo Pendragón. (Seleccionaste a "${ally.card.name}")`,
        bonusStrength: 0,
        traits: {},
      };
    }
  }

  if (
    text.includes('sólo puede ser portada por sir lancelot') ||
    text.includes('solo puede ser portada por sir lancelot') ||
    text.includes('su portador debe ser sir lancelot') ||
    text.includes('solo puede portarla sir lancelot')
  ) {
    if (!allyNameUpper.includes('LANCELOT')) {
      return {
        allowed: false,
        reason: `Requisito de Portador: "${weapon.name}" sólo puede ser portada por Sir Lancelot. (Seleccionaste a "${ally.card.name}")`,
        bonusStrength: 0,
        traits: {},
      };
    }
  }

  // 3. RACE RESTRICTIONS (DAR 4.2.2)
  const raceMap: Record<string, CardRace> = {
    caballero: 'Caballero',
    caballeros: 'Caballero',
    dragon: 'Dragón',
    dragón: 'Dragón',
    dragones: 'Dragón',
    faerie: 'Faerie',
    faeries: 'Faerie',
    heroe: 'Héroe',
    héroe: 'Héroe',
    heroes: 'Héroe',
    héroes: 'Héroe',
    olimpico: 'Olímpico',
    olímpico: 'Olímpico',
    olimpicos: 'Olímpico',
    olímpicos: 'Olímpico',
    sombra: 'Sombra',
    sombras: 'Sombra',
    eterno: 'Eterno',
    eternos: 'Eterno',
    bestia: 'Bestia',
    bestias: 'Bestia',
    sacerdote: 'Sacerdote',
    sacerdotes: 'Sacerdote',
  };

  const racePatterns = [
    /s[oó]lo puede ser portad[ao] por un?a?\s+([a-záéíóúñ]+)/i,
    /su portador s[oó]lo puede ser un?a?\s+([a-záéíóúñ]+)/i,
    /su portador debe ser un?a?\s+([a-záéíóúñ]+)/i,
    /s[oó]lo puede portarl[ao] un?a?\s+([a-záéíóúñ]+)/i,
    /debe ser portad[ao] por un?a?\s+([a-záéíóúñ]+)/i,
    /s[oó]lo para ([a-záéíóúñ]+)/i,
  ];

  for (const pat of racePatterns) {
    const match = text.match(pat);
    if (match) {
      const rawRace = match[1].toLowerCase();
      const requiredRace = raceMap[rawRace];
      if (requiredRace && ally.card.race !== requiredRace) {
        return {
          allowed: false,
          reason: `Restricción de Raza: "${weapon.name}" sólo puede ser portada por un ${requiredRace}. Tu Aliado "${ally.card.name}" es de raza ${ally.card.race}.`,
          bonusStrength: 0,
          traits: {},
        };
      }
    }
  }

  // 4. WEAPON LIMIT PER ALLY (DAR 4.2.2)
  const currentWeapons = ally.attachedWeapons || [];
  const otherWeapons = currentWeapons.filter((w) => w.id !== weapon.id);

  if (otherWeapons.length > 0) {
    const isSirLancelot =
      allyNameUpper.includes('LANCELOT') ||
      allyAbility.includes('no tiene límite de armas') ||
      allyAbility.includes('no tiene limite de armas');

    const hasMultipleWeaponPermit =
      otherWeapons.some((w) =>
        (w.ability || '').toLowerCase().includes('puede portar otra arma')
      ) || text.includes('puede portar otra arma');

    if (!isSirLancelot && !hasMultipleWeaponPermit) {
      return {
        allowed: false,
        reason: `Requisito DAR 4.2.2: "${ally.card.name}" ya tiene un Arma equipada ("${otherWeapons[0].name}"). Un Aliado sólo puede portar 1 Arma a la vez, salvo excepciones como Sir Lancelot o cartas como Espada Corta.`,
        bonusStrength: 0,
        traits: {},
      };
    }
  }

  // 5. ACCURATE STRENGTH BONUS CALCULATION
  let bonusStrength = 0;
  const traits: WeaponTraits = {};

  if (weaponNameUpper === 'MANDOBLE' || text.includes('duplica su fuerza')) {
    bonusStrength = ally.baseStrength;
    traits.mustPayGoldToAttack = 2;
  } else if (
    text.includes('si su portador es un dragón') &&
    (text.includes('no es un dragón') || text.includes('si no lo es'))
  ) {
    bonusStrength = ally.card.race === 'Dragón' ? 2 : 1;
  } else if (
    text.includes('si su portador es un faerie') &&
    (text.includes('no es un faerie') || text.includes('si no lo es'))
  ) {
    bonusStrength = ally.card.race === 'Faerie' ? 2 : 1;
  } else if (
    text.includes('si su portador es un caballero') &&
    (text.includes('no es un caballero') || text.includes('si no lo es'))
  ) {
    bonusStrength = ally.card.race === 'Caballero' ? 2 : 1;
  } else if (weaponNameUpper === 'EXCALIBUR' || text.includes('gana + 3') || text.includes('gana +3')) {
    bonusStrength = 3;
  } else if (weaponNameUpper === 'LA LANZA DE LOS DIOSES' || text.includes('gana + 4') || text.includes('gana +4')) {
    bonusStrength = 4;
  } else if (weaponNameUpper === 'DARDOS ENVENENADOS' || text.includes('gana - 1') || text.includes('gana -1')) {
    bonusStrength = -1;
  } else {
    const strengthMatch =
      text.match(/gana\s*\+?\s*(\d+)\s*a\s*la\s*fuerza/i) ||
      text.match(/gana\s*\+\s*(\d+)/i) ||
      text.match(/\+\s*(\d+)\s*a\s*la\s*fuerza/i);

    if (strengthMatch) {
      bonusStrength = parseInt(strengthMatch[1], 10);
    } else if (weapon.strength > 0) {
      bonusStrength = weapon.strength;
    } else {
      bonusStrength = 0;
    }
  }

  // 6. SPECIAL CHARACTERISTICS AND TRAITS
  if (
    text.includes('se considera imbloqueable') ||
    text.includes('imbloqueable') ||
    text.includes('no puede ser bloqueado') ||
    weaponNameUpper === 'CABALLO LIGERO' ||
    weaponNameUpper === 'MORNING STAR'
  ) {
    traits.unblockable = true;
  }

  if (
    text.includes('no puede ser destruido en batalla') ||
    text.includes('no puede ser destruido en la asignación de daño') ||
    text.includes('cuando el portador de escudo sidhe bloquea, no puede ser destruido') ||
    text.includes('cuando bloquea, no puede ser destruido') ||
    weaponNameUpper === 'ESCUDO SIDHE'
  ) {
    traits.indestructibleInCombat = true;
  }

  if (
    text.includes('puede ser declarado como atacante') ||
    text.includes('puede atacar cuando entra en juego') ||
    text.includes('puede atacar el turno que entra') ||
    weaponNameUpper === 'BOTAS ELFICAS'
  ) {
    traits.furyCanAttackImmediately = true;
  }

  if (
    text.includes('no puede ser destruido por talismanes') ||
    text.includes('no puede ser afectado por talismanes') ||
    weaponNameUpper === 'MALLA DE MITRIL'
  ) {
    traits.cannotBeDestroyedByTalismans = true;
  }

  if (
    text.includes('no puede ser afectado por habilidades de aliados oponentes') ||
    text.includes('no puede ser afectado por habilidades de aliados') ||
    weaponNameUpper === 'ARMADURA COMPLETA'
  ) {
    traits.immuneToOpponentAllies = true;
  }

  if (
    text.includes('robar 1 carta extra al final del turno') ||
    text.includes('roba 1 carta extra al final del turno') ||
    weaponNameUpper === 'HACHA DE BATALLA'
  ) {
    traits.extraTurnEndDraw = true;
  }

  if (
    (text.includes('debe pagar 2 de oro') && text.includes('atacar')) ||
    weaponNameUpper === 'MANDOBLE'
  ) {
    traits.mustPayGoldToAttack = 2;
  }

  if (weaponNameUpper === 'ESPADA LARGA') {
    traits.mustPayGoldToAttack = 1;
    traits.canAttackOverride = true;
  }

  if (
    (text.includes('si su portador es bloqueado') &&
      (text.includes('descarta') || text.includes('descarte'))) ||
    weaponNameUpper === 'CATAPULTA'
  ) {
    traits.onBlockedDiscard = 1;
  }

  if (
    text.includes('destierra la lanza de los dioses') ||
    (text.includes('destierra') && text.includes('al final del turno')) ||
    weaponNameUpper === 'LA LANZA DE LOS DIOSES'
  ) {
    traits.banishAtTurnEnd = true;
  }

  if (text.includes('puede portar otra arma') || weaponNameUpper === 'ESPADA CORTA') {
    traits.allowsExtraWeapon = true;
  }

  return {
    allowed: true,
    bonusStrength,
    traits,
  };
}

/**
 * Helper to draw cards from Castillo to Mano.
 */
function drawCardsFromCastillo(
  player: PlayerState,
  count: number
): { player: PlayerState; drawn: CardData[] } {
  const actualCount = Math.min(count, player.castillo.length);
  const drawn = player.castillo.slice(0, actualCount);
  const remaining = player.castillo.slice(actualCount);
  return {
    player: {
      ...player,
      castillo: remaining,
      mano: [...player.mano, ...drawn],
    },
    drawn,
  };
}

/**
 * Universal Ability Execution Engine.
 * Supports:
 * - Precise gold generation (adds temporary gold tokens to oroCards & reservaOro).
 * - Precise card drawing.
 * - Interactive Decision Requests (Choice Modal).
 * - Interactive Search / Tutor Requests (Card Picker Modal).
 */
export function executeCardOnPlayAbility(
  card: CardData,
  player: PlayerState,
  rival: PlayerState,
  options?: {
    isManualActivation?: boolean;
    instanceId?: string;
    allyInstanceId?: string;
    chosenOptionId?: string;
    isCpu?: boolean;
  }
): AbilityExecutionResult {
  let updatedPlayer: PlayerState = { ...player };
  let updatedRival: PlayerState = { ...rival };
  const cardNameUpper = card.name.toUpperCase().trim();
  const abilityText = (card.ability || '').toLowerCase();
  const logClauses: string[] = [];
  let sound: 'summon' | 'damage' | 'shield' | 'victory' | 'flick' = 'summon';
  let executedAny = false;
  let pendingTutor: TutorRequest | undefined;
  let pendingChoice: ChoiceRequest | undefined;
  let pendingDiscard: DiscardRequest | undefined;

  const isManual = Boolean(options?.isManualActivation);
  const isCpu = Boolean(options?.isCpu);
  const chosenOptionId = options?.chosenOptionId;

  // Helper to safely pay gold from player's reserve respecting gold restrictions
  const payGold = (amount: number, forCard?: CardData): boolean => {
    const { paid, remaining, success } = payGoldForCard(updatedPlayer.oroCards, amount, forCard);
    if (!success) return false;
    updatedPlayer.oroCards = remaining;
    updatedPlayer.oroPagado = [...updatedPlayer.oroPagado, ...paid];
    updatedPlayer.reservaOro = remaining.length;
    return true;
  };

  // Helper to safely refund gold to player's reserve
  const refundGold = (amount: number): void => {
    const actual = Math.min(amount, updatedPlayer.oroPagado.length);
    if (actual <= 0) return;
    const refunded = updatedPlayer.oroPagado.slice(-actual);
    updatedPlayer.oroPagado = updatedPlayer.oroPagado.slice(0, updatedPlayer.oroPagado.length - actual);
    updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...refunded];
    updatedPlayer.reservaOro += actual;
  };

  // =========================================================================
  // GATEKEEPER 0: PREREQUISITE CHECK FOR ENTRY ABILITIES (DAR 4.2 / 5.2)
  // If an entry ability requires prerequisites or costs that cannot be met,
  // simply do NOT execute or apply the ability; card enters play normally.
  // =========================================================================
  if (!isManual && !chosenOptionId && card.type !== 'Oro') {
    const entryCheck = canExecuteEntryAbility(card, updatedPlayer, updatedRival);
    if (!entryCheck.canExecute) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `📜 "${card.name}" entra en juego normalmente. Su habilidad no se aplica (${entryCheck.reason}).`,
        sound: 'summon',
        abilityName: card.name,
        activatedSuccessfully: true,
      };
    }
  }

  // =========================================================================
  // GATEKEEPER 1: ENTRY TRIGGER VS ACTIVATED IN-PLAY ABILITY
  // =========================================================================
  if (!isManual && !chosenOptionId && card.type !== 'Talismán') {
    // For Oro cards: if it has no on-entry trigger (e.g. Codex Artúricus, or standard gold), it enters play as gold successfully!
    if (card.type === 'Oro') {
      const hasOroEntry =
        abilityText.includes('roba') ||
        abilityText.includes('busca') ||
        abilityText.includes('entra en juego') ||
        abilityText.includes('al entrar');
      if (!hasOroEntry) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `🪙 "${card.name}" entra en tu Reserva de Oro (${card.ability || 'Oro estándar'}).`,
          sound: 'summon',
          abilityName: card.name,
          activatedSuccessfully: true,
        };
      }
    }

    const isDeferredOrAttackTrigger =
      cardNameUpper.includes('ETTIN') ||
      cardNameUpper.includes('BRUJA ANIS') ||
      cardNameUpper.includes('BRUJA ANÍS') ||
      cardNameUpper.includes('ULTIMA CANCION') ||
      cardNameUpper.includes('ÚLTIMA CANCIÓN') ||
      abilityText.includes('en respuesta a que') ||
      abilityText.includes('en respuesta a finalizar tu turno');

    const hasEntryTrigger =
      !isDeferredOrAttackTrigger &&
      (abilityText.includes('entra en juego') ||
        abilityText.includes('entra al juego') ||
        abilityText.includes('entre o salga del juego') ||
        abilityText.includes('al entrar en juego') ||
        abilityText.includes('al entrar al juego') ||
        abilityText.includes('al entrar') ||
        abilityText.includes('cuando entra') ||
        abilityText.includes('al ser jugado') ||
        abilityText.includes('cuando es jugado') ||
        abilityText.includes('al ser invocado') ||
        abilityText.includes('al ser puesto en juego') ||
        abilityText.includes('cuando juegues') ||
        abilityText.includes('cuando juegas') ||
        abilityText.includes('al jugar') ||
        abilityText.includes('en su fase de ingreso') ||
        abilityText.includes('puede atacar cuando entra') ||
        cardNameUpper.includes('ELLYLLON') ||
        (!hasActivatedInPlayAbility(card) && (
          abilityText.includes('roba') ||
          abilityText.includes('busca') ||
          abilityText.includes('genera') ||
          abilityText.includes('produce') ||
          abilityText.includes('agrega') ||
          abilityText.includes('elige') ||
          abilityText.includes('escoge')
        )));

    if (!hasEntryTrigger) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `📜 "${card.name}" entra en juego (${card.ability ? `Habilidad: "${card.ability}"` : 'Sin habilidad'}).`,
        sound: 'summon',
        abilityName: card.name,
        activatedSuccessfully: true,
      };
    }
  }

  // =========================================================================
  // 1. DECISION / CHOICE ABILITIES (User Decision Modal)
  // =========================================================================

  // A. Misil Mágico: Elige entre robar 2 cartas o que un Aliado gane +2 Fuerza
  if (cardNameUpper.includes('MISIL MAGICO') || (abilityText.includes('misil') && abilityText.includes('elige entre robar 2'))) {
    if (!chosenOptionId && !isCpu) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `Misil Mágico: Selecciona qué efecto deseas activar.`,
        abilityName: card.name,
        activatedSuccessfully: true,
        pendingChoice: {
          title: 'MISIL MÁGICO',
          cardName: card.name,
          description: 'Elige uno de los siguientes efectos para aplicar:',
          options: [
            { id: 'draw_2', label: 'Robar 2 cartas', description: 'Roba 2 cartas de tu Mazo Castillo a tu mano.', icon: '🎴' },
            { id: 'buff_2', label: 'Ganar +2 a la Fuerza', description: 'Tus Aliados en juego ganan +2 a la fuerza hasta el final del turno.', icon: '⚔️' },
          ],
          invokingCard: card,
        },
      };
    }

    const choice = chosenOptionId || (updatedPlayer.mano.length < 3 ? 'draw_2' : 'buff_2');
    if (choice === 'draw_2') {
      const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 2);
      updatedPlayer = withDraw;
      logClauses.push(`Misil Mágico: Robas 2 cartas (${drawn.map((c) => c.name).join(', ')}).`);
      sound = 'flick';
    } else {
      const applyMisilBuff = (a: AllyInPlay): AllyInPlay => {
        const prevF = a.currentStrength;
        const newF = a.currentStrength + 2;
        abilityLogger.logStrengthModification({
          sourceCardName: 'Misil Mágico',
          sourceType: 'Talismán',
          targetAlly: a,
          targetOwner: isCpu ? 'cpu' : 'player',
          changeType: 'buff',
          amount: 2,
          isPermanent: false,
          previousStrength: prevF,
          newStrength: newF,
          reason: 'Misil Mágico: +2 a la Fuerza hasta el final del turno.',
        });
        return {
          ...a,
          turnStrengthBonus: (a.turnStrengthBonus || 0) + 2,
          currentStrength: newF,
        };
      };
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(applyMisilBuff);
      updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(applyMisilBuff);
      logClauses.push('Misil Mágico: Tus Aliados ganan +2 a la Fuerza este turno.');
      sound = 'victory';
    }
    executedAny = true;
  }

  // B. Tótem de Hobgoblin: Pagar 4 oro para que rival bote 4, o destruir tótem para robar 2
  else if (cardNameUpper.includes('HOBGOBLIN')) {
    if (!chosenOptionId && !isCpu) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `Tótem de Hobgoblin: Selecciona la opción a activar.`,
        abilityName: card.name,
        activatedSuccessfully: true,
        pendingChoice: {
          title: 'TÓTEM DE HOBGOBLIN',
          cardName: card.name,
          description: 'Puedes elegir entre pagar 4 de oro o destruir este Tótem:',
          options: [
            { id: 'mill_4', label: 'Pagar 4 Oro (Rival bota 4)', description: 'Paga 4 de Oro disponible para que tu oponente bote 4 cartas de su Mazo Castillo.', icon: '💥' },
            { id: 'destroy_draw_2', label: 'Destruir Tótem (Robas 2)', description: 'Destruye a Tótem Hobgoblin para robar 2 cartas de tu Mazo Castillo.', icon: '🎴' },
          ],
          invokingCard: card,
        },
      };
    }

    const choice = chosenOptionId || (updatedPlayer.reservaOro >= 4 ? 'mill_4' : 'destroy_draw_2');
    if (choice === 'mill_4') {
      if (!payGold(4)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: Requiere 4 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      const mill = Math.min(4, updatedRival.castillo.length);
      const milled = updatedRival.castillo.slice(0, mill);
      updatedRival.castillo = updatedRival.castillo.slice(mill);
      updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
      sound = 'damage';
      logClauses.push(`Pagas 4 Oro: Tu rival bota ${mill} cartas de su Mazo Castillo.`);
    } else {
      updatedPlayer.lineaApoyo = updatedPlayer.lineaApoyo.filter((s) => s.card.id !== card.id);
      updatedPlayer.cementerio = [...updatedPlayer.cementerio, card];
      const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 2);
      updatedPlayer = withDraw;
      sound = 'flick';
      logClauses.push(`Destruyes Tótem Hobgoblin: Robas 2 cartas (${drawn.map((c) => c.name).join(', ')}).`);
    }
    executedAny = true;
  }

  // C. Pixie: Si tienes a Morgana en juego, roba 3 cartas o busca 2 en cementerio y barájalas en castillo
  else if (cardNameUpper.includes('PIXIE')) {
    const hasMorgana = updatedPlayer.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('MORGANA'));
    if (!hasMorgana) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: '⚠️ Requisito no cumplido: Pixie requiere tener a Morgana en juego.',
        abilityName: card.name,
        activatedSuccessfully: false,
      };
    }

    if (!chosenOptionId && !isCpu) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: 'Pixie: Elige entre robar 3 cartas o reciclar 2 del cementerio.',
        abilityName: card.name,
        activatedSuccessfully: true,
        pendingChoice: {
          title: 'PIXIE (Poder de Morgana)',
          cardName: card.name,
          description: 'Morgana está en juego. Elige el efecto que deseas ejecutar:',
          options: [
            { id: 'draw_3', label: 'Robar 3 cartas', description: 'Roba 3 cartas de tu Mazo Castillo a tu mano.', icon: '🎴' },
            { id: 'recycle_2', label: 'Reciclar 2 cartas del Cementerio', description: 'Busca 2 cartas en tu Cementerio y barájalas en tu Mazo Castillo.', icon: '♻️' },
          ],
          invokingCard: card,
        },
      };
    }

    const choice = chosenOptionId || 'draw_3';
    if (choice === 'draw_3') {
      const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 3);
      updatedPlayer = withDraw;
      sound = 'flick';
      logClauses.push(`Pixie: Robas 3 cartas (${drawn.map((c) => c.name).join(', ')}).`);
    } else {
      pendingTutor = {
        sourceZone: 'cementerio',
        filterType: 'any',
        destination: 'castillo_shuffle',
        maxCount: 2,
        reason: 'Pixie: Elige 2 cartas de tu Cementerio para barajarlas en tu Mazo Castillo',
        cardName: card.name,
      };
      logClauses.push('Pixie: Selecciona 2 cartas de tu Cementerio para barajar en tu Mazo Castillo.');
    }
    executedAny = true;
  }

  // D. Elección General: "al entrar al juego roba 2 o bota cartas de la mano del rival" / "roba ... o descarta ..."
  else if (
    (abilityText.includes('roba') && (abilityText.includes('bota') || abilityText.includes('descarta')) && (abilityText.includes('mano') || abilityText.includes('rival') || abilityText.includes('oponente') || abilityText.includes('o bota') || abilityText.includes(' o '))) ||
    ((abilityText.includes('elige') || abilityText.includes('escoge') || abilityText.includes('puedes elegir')) && abilityText.includes(' o '))
  ) {
    if (!chosenOptionId && !isCpu) {
      // Determine draw count from ability text
      let drawCount = 2;
      const dMatch = abilityText.match(/roba\s+(\d+|una|dos|tres)/i);
      if (dMatch) {
        const raw = dMatch[1].toLowerCase();
        if (raw === 'una' || raw === '1') drawCount = 1;
        else if (raw === 'tres' || raw === '3') drawCount = 3;
      }

      return {
        updatedPlayer,
        updatedRival,
        logMessage: `${card.name}: Selecciona qué efecto deseas activar.`,
        abilityName: card.name,
        activatedSuccessfully: true,
        pendingChoice: {
          title: `DECISIÓN: ${card.name.toUpperCase()}`,
          cardName: card.name,
          description: 'Esta carta te permite elegir cuál de los 2 efectos deseas utilizar:',
          options: [
            {
              id: 'choice_draw_option',
              label: `Robar ${drawCount} carta${drawCount > 1 ? 's' : ''}`,
              description: `Roba ${drawCount} carta(s) de tu Mazo Castillo a tu mano.`,
              icon: '🎴',
            },
            {
              id: 'choice_bota_rival_option',
              label: 'Botar cartas de la mano del rival',
              description: 'Tu oponente descarta / bota cartas de su mano a su Cementerio.',
              icon: '💥',
            },
          ],
          invokingCard: card,
        },
      };
    }

    const choice = chosenOptionId || (updatedPlayer.mano.length < 3 ? 'choice_draw_option' : 'choice_bota_rival_option');
    if (choice === 'choice_draw_option') {
      let count = 2;
      const drawMatch = abilityText.match(/roba\s+(\d+|una|dos|tres)/i);
      if (drawMatch) {
        const raw = drawMatch[1].toLowerCase();
        if (raw === 'una' || raw === '1') count = 1;
        else if (raw === 'tres' || raw === '3') count = 3;
      }
      const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, count);
      updatedPlayer = withDraw;
      logClauses.push(`Decisión elegida: Robas ${drawn.length} carta(s) (${drawn.map((c) => c.name).join(', ')}).`);
      sound = 'flick';
    } else {
      let discardCount = 2;
      const botaMatch = abilityText.match(/(?:bota|descarta)\s+(\d+|una|dos|tres)/i);
      if (botaMatch) {
        const raw = botaMatch[1].toLowerCase();
        if (raw === 'una' || raw === '1') discardCount = 1;
        else if (raw === 'tres' || raw === '3') discardCount = 3;
      }
      const rivalHand = updatedRival.mano;
      if (rivalHand.length > 0) {
        const actualCount = Math.min(discardCount, rivalHand.length);
        const discarded = rivalHand.slice(0, actualCount);
        updatedRival.mano = rivalHand.slice(actualCount);
        updatedRival.cementerio = [...updatedRival.cementerio, ...discarded];
        logClauses.push(`Decisión elegida: Tu oponente botó ${actualCount} carta(s) de su mano (${discarded.map((c) => c.name).join(', ')}).`);
      } else {
        const mill = Math.min(discardCount, updatedRival.castillo.length);
        const milled = updatedRival.castillo.slice(0, mill);
        updatedRival.castillo = updatedRival.castillo.slice(mill);
        updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
        logClauses.push(`Decisión elegida: El rival no tenía cartas en mano; botó ${mill} carta(s) de su Mazo Castillo.`);
      }
      sound = 'damage';
    }
    executedAny = true;
  }

  // =========================================================================
  // 2. GOLD GENERATION (CAMPESINO, JUGLARES, TOTEM ALQUIMICO, HERRERO, ALQUIMISTA)
  // =========================================================================

  // Campesino: destruye a Campesino para generar 1 oro por este turno
  else if (cardNameUpper.includes('CAMPESINO') || abilityText.includes('destruye a campesino para generar 1 oro')) {
    updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.filter((a) => a.card.id !== card.id);
    updatedPlayer.cementerio = [...updatedPlayer.cementerio, card];
    const goldToken = createTemporaryGoldToken('Oro de Campesino');
    updatedPlayer.oroCards = [...updatedPlayer.oroCards, goldToken];
    updatedPlayer.reservaOro += 1;
    logClauses.push('Destruyes a Campesino: Generas +1 Oro en tu Reserva para este turno.');
    sound = 'shield';
    executedAny = true;
  }

  // Juglares: Genera un oro hasta el final del turno
  else if (cardNameUpper.includes('JUGLARES') || abilityText.includes('genera un oro hasta el final del turno')) {
    const goldToken = createTemporaryGoldToken('Oro de Juglares');
    updatedPlayer.oroCards = [...updatedPlayer.oroCards, goldToken];
    updatedPlayer.reservaOro += 1;
    logClauses.push('Juglares: Generas +1 Oro en tu Reserva hasta el final del turno.');
    sound = 'shield';
    executedAny = true;
  }

  // Tótem Alquímico: destruir a uno de tus Aliados para generar tanto oro como fuerza tenga
  else if (cardNameUpper.includes('ALQUIMICO') || abilityText.includes('destruir a uno de tus aliados para generar tanto oro')) {
    if (updatedPlayer.lineaDefensa.length === 0) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: '⚠️ No tienes Aliados en mesa para sacrificar con Tótem Alquímico.',
        abilityName: card.name,
        activatedSuccessfully: false,
      };
    }
    const sacrificed = updatedPlayer.lineaDefensa[0];
    updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.slice(1);
    updatedPlayer.cementerio = [
      ...updatedPlayer.cementerio,
      sacrificed.card,
      ...(sacrificed.attachedWeapons || []),
    ];
    const goldCount = Math.max(1, sacrificed.currentStrength);
    const goldTokens = Array.from({ length: goldCount }, (_, i) =>
      createTemporaryGoldToken(`Oro Alquímico (${i + 1})`)
    );
    updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...goldTokens];
    updatedPlayer.reservaOro += goldCount;
    logClauses.push(
      `Tótem Alquímico: Sacrificas a "${sacrificed.card.name}" (${sacrificed.currentStrength} F) y generas +${goldCount} Oro en tu Reserva.`
    );
    sound = 'shield';
    executedAny = true;
  }

  // Herrero: En tu fase de vigilia, genera 2 oros para jugar armas
  else if (cardNameUpper.includes('HERRERO')) {
    if (isManual || isCpu) {
      const goldTokens = [
        createTemporaryGoldToken('Oro Herrero (1)', 'Arma'),
        createTemporaryGoldToken('Oro Herrero (2)', 'Arma'),
      ];
      updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...goldTokens];
      updatedPlayer.reservaOro += 2;
      logClauses.push('Herrero: Generas +2 Oros en tu Reserva exclusivamente para jugar Armas.');
      sound = 'shield';
      executedAny = true;
    }
  }

  // Dragón Cobrizo: En tu fase de vigilia, genera 2 oros para bajar Dragones
  else if (cardNameUpper.includes('COBRIZO') || abilityText.includes('bajar dragones')) {
    if (isManual || isCpu) {
      const goldTokens = [
        createTemporaryGoldToken('Oro Dragón Cobrizo (1)', 'Dragón'),
        createTemporaryGoldToken('Oro Dragón Cobrizo (2)', 'Dragón'),
      ];
      updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...goldTokens];
      updatedPlayer.reservaOro += 2;
      logClauses.push('🐉 Dragón Cobrizo: Generas +2 Oros en tu Reserva exclusivamente para bajar Dragones.');
      sound = 'shield';
      executedAny = true;
    }
  }

  // Alquimista: En tu fase de vigilia, busca un oro normal en tu mazo castillo y pónlo en tu reserva
  else if (cardNameUpper.includes('ALQUIMISTA')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Oro_Normal',
        destination: 'reserva',
        maxCount: 1,
        reason: 'Alquimista: Busca un Oro Normal en tu Mazo Castillo y ponlo en tu Reserva de Oro',
        cardName: card.name,
      };
      logClauses.push('Alquimista: Busca un Oro Normal en tu Mazo Castillo para tu Reserva.');
    } else {
      const idx = updatedPlayer.castillo.findIndex(
        (c) => c.type === 'Oro' && (!c.ability || c.ability.length < 5)
      );
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.oroCards = [...updatedPlayer.oroCards, found];
        updatedPlayer.reservaOro += 1;
        logClauses.push(`Alquimista: Añade "${found.name}" a tu Reserva de Oro.`);
      }
    }
    executedAny = true;
  }

  // Generación General de Oro (ej: "genera 1 oro", "produce 2 oros", "agrega 1 de oro a tu reserva", etc.)
  else if (
    !cardNameUpper.includes('ESPADA LARGA') &&
    !cardNameUpper.includes('MANDOBLE') &&
    (abilityText.includes('genera') || abilityText.includes('produce') || abilityText.includes('agrega') || abilityText.includes('añade') || /\bda\s+(?:de\s+)?(?:\d+|un|una|dos|tres|cuatro)\s+oro/i.test(abilityText)) &&
    (abilityText.includes('oro') || abilityText.includes('reserva'))
  ) {
    const isVigiliaActivated = (abilityText.includes('vigilia') || abilityText.includes('una vez por turno')) && !abilityText.includes('entra');
    if (isVigiliaActivated && !isManual && !isCpu) {
      // Activated ability for Vigilia, do not trigger on entry
    } else {
      let goldAmount = 1;
      const goldMatch =
        abilityText.match(/(?:genera|produce|agrega|añade|da)\s+(\d+|un|una|dos|tres|cuatro)(?:\s+de)?\s+oro[s]?/i) ||
        abilityText.match(/(?:genera|produce|agrega|añade|da)\s+(\d+|un|una|dos|tres|cuatro)/i);
      if (goldMatch) {
        const raw = goldMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') goldAmount = 2;
        else if (raw === 'tres' || raw === '3') goldAmount = 3;
        else if (raw === 'cuatro' || raw === '4') goldAmount = 4;
        else if (raw === 'un' || raw === 'una' || raw === '1') goldAmount = 1;
      }

      let restriction: string | undefined = undefined;
      if (abilityText.includes('bajar dragones') || abilityText.includes('para dragones')) {
        restriction = 'Dragón';
      } else if (abilityText.includes('bajar armas o caballeros') || abilityText.includes('armas o caballeros')) {
        restriction = 'Arma o Caballero';
      } else if (abilityText.includes('jugar armas') || abilityText.includes('para armas')) {
        restriction = 'Arma';
      } else if (abilityText.includes('bajar caballeros') || abilityText.includes('para caballeros')) {
        restriction = 'Caballero';
      }

      const goldTokens = Array.from({ length: goldAmount }, (_, idx) =>
        createTemporaryGoldToken(`Oro de ${card.name} (${idx + 1})`, restriction)
      );
      updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...goldTokens];
      updatedPlayer.reservaOro += goldAmount;
      const restMsg = restriction ? ` exclusivamente para ${restriction}` : '';
      logClauses.push(`${card.name}: Generas +${goldAmount} Oro en tu Reserva${restMsg} para este turno.`);
      sound = 'shield';
      executedAny = true;

      // Check if card ALSO specifies drawing cards (e.g. "Genera 1 oro y roba 1 carta")
      if (abilityText.includes('roba') || abilityText.includes('robas')) {
        const extraDrawMatch =
          abilityText.match(/(?:roba|robas)\s+(\d+|una|dos|tres|cuatro)\s+carta[s]?/i) ||
          abilityText.match(/(?:roba|robas)\s+(\d+|un|una|dos|tres|cuatro)/i);
        if (extraDrawMatch) {
          let drawCount = 1;
          const dRaw = extraDrawMatch[1].toLowerCase();
          if (dRaw === 'dos' || dRaw === '2') drawCount = 2;
          else if (dRaw === 'tres' || dRaw === '3') drawCount = 3;
          else if (dRaw === 'cuatro' || dRaw === '4') drawCount = 4;
          const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, drawCount);
          updatedPlayer = withDraw;
          if (drawn.length > 0) {
            logClauses.push(`Además robas ${drawn.length} carta(s) (${drawn.map((c) => c.name).join(', ')}).`);
          }
        }
      }
    }
  }

  // =========================================================================
  // 3. TUTORING & SEARCHING (USER INTERACTIVE CARD PICKER)
  // =========================================================================


  // Oldhage: paga 2 oro y bota 1 carta para buscar un Tótem en castillo
  else if (cardNameUpper.includes('OLDHAGE')) {
    if (!payGold(2)) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `⚠️ Oro insuficiente: "Oldhage" requiere 2 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
        abilityName: card.name,
        activatedSuccessfully: false,
      };
    }
    if (updatedPlayer.castillo.length > 0) {
      const milled = updatedPlayer.castillo[0];
      updatedPlayer.castillo = updatedPlayer.castillo.slice(1);
      updatedPlayer.cementerio = [...updatedPlayer.cementerio, milled];
    }
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Tótem',
        destination: 'mano',
        maxCount: 1,
        reason: 'Oldhage: Busca un Tótem en tu Mazo Castillo y ponlo en tu mano',
        cardName: card.name,
      };
      logClauses.push('Pagas 2 Oro y botas 1 carta: Elige un Tótem de tu Mazo Castillo.');
    } else {
      const idx = updatedPlayer.castillo.findIndex((c) => c.type === 'Tótem');
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, found];
        logClauses.push(`Oldhage: Buscas "${found.name}" en tu Mazo Castillo y lo añades a tu mano.`);
      }
    }
    executedAny = true;
  }

  // Goblin Conjurador: paga 3 oro para buscar un Talismán en mazo castillo
  else if (cardNameUpper.includes('CONJURADOR') && card.type === 'Aliado') {
    if (!payGold(3)) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `⚠️ Oro insuficiente: "Goblin Conjurador" requiere 3 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
        abilityName: card.name,
        activatedSuccessfully: false,
      };
    }
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Talismán',
        destination: 'mano',
        maxCount: 1,
        reason: 'Goblin Conjurador: Busca un Talismán en tu Mazo Castillo y ponlo en tu mano',
        cardName: card.name,
      };
      logClauses.push('Pagas 3 Oro: Elige un Talismán de tu Mazo Castillo.');
    } else {
      const idx = updatedPlayer.castillo.findIndex((c) => c.type === 'Talismán');
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, found];
        logClauses.push(`Goblin Conjurador: Buscas "${found.name}" en tu Mazo Castillo.`);
      }
    }
    executedAny = true;
  }

  // Pergamino Mágico: Busca un Talismán en tu mazo castillo y ponlo en tu mano
  else if (cardNameUpper.includes('PERGAMINO MAGICO')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Talismán',
        destination: 'mano',
        maxCount: 1,
        reason: 'Pergamino Mágico: Busca un Talismán en tu Mazo Castillo y ponlo en tu mano',
        cardName: card.name,
      };
      logClauses.push('Pergamino Mágico: Elige un Talismán de tu Mazo Castillo.');
    } else {
      const idx = updatedPlayer.castillo.findIndex((c) => c.type === 'Talismán');
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, found];
        logClauses.push(`Pergamino Mágico: Buscas "${found.name}" y lo pones en tu mano.`);
      }
    }
    executedAny = true;
  }

  // Relatos en la Mesa Redonda: Si no tienes Talismán en mano, busca uno de tu mazo
  else if (cardNameUpper.includes('RELATOS EN LA MESA REDONDA')) {
    const hasTalisman = updatedPlayer.mano.some((c) => c.type === 'Talismán' && c.id !== card.id);
    if (!hasTalisman) {
      if (!isCpu) {
        pendingTutor = {
          sourceZone: 'castillo',
          filterType: 'Talismán',
          destination: 'mano',
          maxCount: 1,
          reason: 'Relatos en la Mesa Redonda: Busca un Talismán en tu Mazo Castillo y ponlo en tu mano',
          cardName: card.name,
        };
        logClauses.push('Sin Talismanes en mano: Elige un Talismán de tu Mazo Castillo.');
      } else {
        const idx = updatedPlayer.castillo.findIndex((c) => c.type === 'Talismán');
        if (idx !== -1) {
          const found = updatedPlayer.castillo[idx];
          updatedPlayer.castillo = [
            ...updatedPlayer.castillo.slice(0, idx),
            ...updatedPlayer.castillo.slice(idx + 1),
          ].sort(() => Math.random() - 0.5);
          updatedPlayer.mano = [...updatedPlayer.mano, found];
          logClauses.push(`Relatos: Buscas "${found.name}" y lo pones en tu mano.`);
        }
      }
    } else {
      logClauses.push('Relatos en la Mesa Redonda: Ya posees Talismanes en mano.');
    }
    executedAny = true;
  }

  // Reina Guinivere: Cuando entra en juego, busca un Caballero en tu mazo castillo. En tu fase de vigilia, genera 2 para bajar armas o 1 para bajar Caballeros.
  else if (cardNameUpper.includes('GUINIVERE')) {
    if (isManual) {
      // Vigilia activated ability (Parte 2): Genera 2 Oro para bajar Armas o Caballeros
      const goldTokens = [
        createTemporaryGoldToken('Oro Reina Guinivere (1)', 'Arma o Caballero'),
        createTemporaryGoldToken('Oro Reina Guinivere (2)', 'Arma o Caballero'),
      ];
      updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...goldTokens];
      updatedPlayer.reservaOro += 2;
      logClauses.push('👑 Reina Guinivere (Fase de Vigilia): Genera 2 de Oro exclusivamente para bajar Armas o Caballeros este turno.');
      sound = 'summon';
      executedAny = true;
    } else {
      // Entry ability (Parte 1): Busca un Caballero en el Mazo Castillo
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Caballero',
        destination: 'mano',
        maxCount: 1,
        reason: isCpu
          ? 'Reina Guinivere (Rival): Busca un Caballero en su Mazo Castillo'
          : 'Reina Guinivere: Busca un Caballero en tu Mazo Castillo y ponlo en tu mano',
        cardName: card.name,
        targetOwner: isCpu ? 'cpu' : 'player',
      };
      logClauses.push(
        isCpu
          ? 'Reina Guinivere (Rival): Selecciona qué Caballero de su Mazo Castillo añade a su mano.'
          : 'Reina Guinivere: Elige un Aliado Caballero de tu Mazo Castillo.'
      );
    }
    executedAny = true;
  }

  // Draco Esmeralda: busca un Faerie en mazo castillo
  else if (cardNameUpper.includes('DRACO ESMERALDA')) {
    pendingTutor = {
      sourceZone: 'castillo',
      filterType: 'Faerie',
      destination: 'mano',
      maxCount: 1,
      reason: isCpu
        ? 'Draco Esmeralda (Rival): Busca un Faerie en su Mazo Castillo'
        : 'Draco Esmeralda: Busca un Faerie en tu Mazo Castillo y ponlo en tu mano',
      cardName: card.name,
      targetOwner: isCpu ? 'cpu' : 'player',
    };
    logClauses.push(
      isCpu
        ? 'Draco Esmeralda (Rival): Selecciona qué Faerie añade a su mano.'
        : 'Draco Esmeralda: Elige un Aliado Faerie de tu Mazo Castillo.'
    );
    executedAny = true;
  }

  // Draco Conjurador: busca un oro normal en tu mazo castillo
  else if (cardNameUpper.includes('DRACO CONJURADOR')) {
    pendingTutor = {
      sourceZone: 'castillo',
      filterType: 'Oro_Normal',
      destination: 'mano',
      maxCount: 1,
      reason: isCpu
        ? 'Draco Conjurador (Rival): Busca un Oro Normal en su Mazo Castillo'
        : 'Draco Conjurador: Busca un Oro Normal en tu Mazo Castillo y ponlo en tu mano',
      cardName: card.name,
      targetOwner: isCpu ? 'cpu' : 'player',
    };
    logClauses.push(
      isCpu
        ? 'Draco Conjurador (Rival): Selecciona qué Oro Normal añade a su mano.'
        : 'Draco Conjurador: Elige un Oro Normal de tu Mazo Castillo.'
    );
    executedAny = true;
  }

  // Rey Arturo Pendragón: busca a Excalibur en tu mazo castillo o cementerio
  else if (cardNameUpper.includes('REY ARTURO') && !isManual) {
    pendingTutor = {
      sourceZone: 'castillo',
      filterName: 'EXCALIBUR',
      destination: 'mano',
      maxCount: 1,
      reason: isCpu
        ? 'Rey Arturo (Rival): Busca a Excalibur en su Mazo Castillo'
        : 'Rey Arturo: Busca a Excalibur en tu Mazo Castillo y ponla en tu mano',
      cardName: card.name,
      targetOwner: isCpu ? 'cpu' : 'player',
    };
    logClauses.push(
      isCpu
        ? 'Rey Arturo (Rival): Selecciona a Excalibur de su Mazo Castillo.'
        : 'Rey Arturo Pendragón: Busca la espada legendaria Excalibur en tu Mazo Castillo.'
    );
    executedAny = true;
  }

  // Sir Boores: Tus Caballeros ganan + 2 a la fuerza, mientras Sir Boores esté en juego
  else if (cardNameUpper.includes('BOORES')) {
    logClauses.push('¡Sir Boores entra en juego! Todos tus Caballeros ganan +2 a la Fuerza mientras esté en juego.');
    executedAny = true;
  }

  // Lady Shee Dia: busca a Sir Galahad en mazo castillo
  else if (cardNameUpper.includes('SHEE DIA')) {
    pendingTutor = {
      sourceZone: 'castillo',
      filterName: 'GALAHAD',
      destination: 'mano',
      maxCount: 1,
      reason: isCpu
        ? 'Lady Shee Dia (Rival): Busca a Sir Galahad en su Mazo Castillo'
        : 'Lady Shee Dia: Busca a Sir Galahad en tu Mazo Castillo y ponlo en tu mano',
      cardName: card.name,
      targetOwner: isCpu ? 'cpu' : 'player',
    };
    logClauses.push(
      isCpu
        ? 'Lady Shee Dia (Rival): Selecciona a Sir Galahad de su Mazo Castillo.'
        : 'Lady Shee Dia: Busca a Sir Galahad en tu Mazo Castillo.'
    );
    executedAny = true;
  }

  // La Dama del Lago: Cuando entra en juego, puedes buscar un arma en tu mazo castillo o cementerio y ponerla en juego sin pagar su coste.
  else if (cardNameUpper.includes('DAMA DEL LAGO')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'both',
        filterType: 'Arma',
        destination: 'juego_arma',
        maxCount: 1,
        reason: 'La Dama del Lago: Busca un Arma en tu Mazo Castillo o Cementerio y ponla en juego sin pagar su coste',
        cardName: card.name,
      };
      logClauses.push('La Dama del Lago: Busca un Arma en tu Mazo Castillo o Cementerio para ponerla en juego sin pagar su coste.');
    } else {
      const fromCast = updatedPlayer.castillo.find((c) => c.type === 'Arma');
      const fromCem = updatedPlayer.cementerio.find((c) => c.type === 'Arma');
      const found = fromCast || fromCem;
      if (found) {
        if (fromCast) {
          updatedPlayer.castillo = updatedPlayer.castillo.filter((c) => c.id !== found.id);
        } else {
          updatedPlayer.cementerio = updatedPlayer.cementerio.filter((c) => c.id !== found.id);
        }
        const dama =
          updatedPlayer.lineaDefensa.find((a) => a.card.name.toUpperCase().includes('DAMA DEL LAGO')) ||
          updatedPlayer.lineaDefensa[0];
        if (dama) {
          dama.attachedWeapons = [...(dama.attachedWeapons || []), found];
          dama.currentStrength += found.strength || 0;
        }
        logClauses.push(`La Dama del Lago (Rival): Pone "${found.name}" en juego sin pagar su coste.`);
      }
    }
    executedAny = true;
  }

  // Lobos de Avalon: busca otro Lobos de Avalon
  else if (cardNameUpper.includes('LOBOS DE AVALON') || cardNameUpper.includes('LOBO DE AVALON')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterName: 'LOBOS DE AVALON',
        filterType: 'Aliado',
        destination: 'mano',
        maxCount: 1,
        reason: 'Lobos de Avalon: Busca otro Lobos de Avalon en tu Mazo Castillo y ponlo en tu mano',
        cardName: card.name,
      };
      logClauses.push('Lobos de Avalon: Llama a otro Lobo de Avalon de tu Mazo Castillo.');
    } else {
      const idx = updatedPlayer.castillo.findIndex(
        (c) => c.name.toUpperCase().includes('LOBO') && c.name.toUpperCase().includes('AVALON')
      );
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, found];
        logClauses.push(`Lobos de Avalon (Rival): Añade a "${found.name}" a su mano.`);
      }
    }
    executedAny = true;
  }

  // Dragón Nodriza: Cuando entra en juego, puedes buscar otra copia de Dragón Nodriza en tu mazo castillo y ponerla en tu mano
  else if (cardNameUpper.includes('NODRIZA')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterName: 'NODRIZA',
        filterType: 'Aliado',
        destination: 'mano',
        maxCount: 1,
        reason: 'Dragón Nodriza: Busca otra copia de Dragón Nodriza en tu Mazo Castillo y ponla en tu mano',
        cardName: card.name,
      };
      logClauses.push('Dragón Nodriza: Busca otra copia de Dragón Nodriza en tu Mazo Castillo.');
    } else {
      const idx = updatedPlayer.castillo.findIndex((c) => c.name.toUpperCase().includes('NODRIZA'));
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, found];
        logClauses.push(`Dragón Nodriza (Rival): Añade a "${found.name}" a su mano.`);
      }
    }
    executedAny = true;
  }

  // Aghast el Dragón: busca un arma en tu mazo castillo
  else if (cardNameUpper.includes('AGHAST')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Arma',
        destination: 'mano',
        maxCount: 1,
        reason: 'Aghast El Dragón: Busca un Arma en tu Mazo Castillo y ponla en tu mano',
        cardName: card.name,
      };
      logClauses.push('Aghast El Dragón: Elige un Arma de tu Mazo Castillo.');
    } else {
      const idx = updatedPlayer.castillo.findIndex((c) => c.type === 'Arma');
      if (idx !== -1) {
        const found = updatedPlayer.castillo[idx];
        updatedPlayer.castillo = [
          ...updatedPlayer.castillo.slice(0, idx),
          ...updatedPlayer.castillo.slice(idx + 1),
        ].sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, found];
        logClauses.push(`Aghast: Añade "${found.name}" a tu mano.`);
      }
    }
    executedAny = true;
  }

  // La Piedra de los Sueños: busca dos armas en tu mazo castillo y ponlas en tu mano
  else if (cardNameUpper.includes('PIEDRA DE LOS SUE') || abilityText.includes('dos armas en tu mazo castillo')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Arma',
        destination: 'mano',
        maxCount: 2,
        reason: 'La Piedra de los Sueños: Elige hasta 2 Armas de tu Mazo Castillo para poner en tu mano',
        cardName: card.name,
      };
      logClauses.push('La Piedra de los Sueños: Busca 2 Armas en tu Mazo Castillo.');
    } else {
      const weapons = updatedPlayer.castillo.filter((c) => c.type === 'Arma').slice(0, 2);
      if (weapons.length > 0) {
        const wIds = new Set(weapons.map((w) => w.id));
        updatedPlayer.castillo = updatedPlayer.castillo.filter((c) => !wIds.has(c.id)).sort(() => Math.random() - 0.5);
        updatedPlayer.mano = [...updatedPlayer.mano, ...weapons];
        logClauses.push(`Piedra de los Sueños: Añade ${weapons.length} Arma(s) a tu mano.`);
      }
    }
    executedAny = true;
  }

  // Argusthat: paga 2 de oro para buscar un Aliado en cementerio y barajarlo con castillo
  else if (cardNameUpper.includes('ARGUSTHAT')) {
    if (!payGold(2)) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `⚠️ Oro insuficiente: "Argusthat" requiere 2 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
        abilityName: card.name,
        activatedSuccessfully: false,
      };
    }
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'cementerio',
        filterType: 'Aliado',
        destination: 'castillo_shuffle',
        maxCount: 1,
        reason: 'Argusthat: Elige 1 Aliado de tu Cementerio para barajarlo en tu Mazo Castillo',
        cardName: card.name,
      };
      logClauses.push('Pagas 2 Oro: Elige un Aliado de tu Cementerio para barajarlo.');
    } else {
      const idx = updatedPlayer.cementerio.findIndex((c) => c.type === 'Aliado');
      if (idx !== -1) {
        const found = updatedPlayer.cementerio[idx];
        updatedPlayer.cementerio = [
          ...updatedPlayer.cementerio.slice(0, idx),
          ...updatedPlayer.cementerio.slice(idx + 1),
        ];
        updatedPlayer.castillo = [...updatedPlayer.castillo, found].sort(() => Math.random() - 0.5);
        logClauses.push(`Argusthat: Baraja a "${found.name}" de regreso en tu Mazo Castillo.`);
      }
    }
    executedAny = true;
  }

  // Pooka: busca hasta 3 Faeries en tu cementerio y barájalos en tu mazo castillo
  else if (cardNameUpper.includes('POOKA')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'cementerio',
        filterType: 'Faerie',
        destination: 'castillo_shuffle',
        maxCount: 3,
        reason: 'Pooka: Elige hasta 3 Faeries de tu Cementerio para barajarlos en tu Mazo Castillo',
        cardName: card.name,
      };
      logClauses.push('Pooka: Elige hasta 3 Faeries de tu Cementerio para barajarlos.');
    } else {
      const faeries = updatedPlayer.cementerio.filter((c) => c.race === 'Faerie').slice(0, 3);
      if (faeries.length > 0) {
        const fIds = new Set(faeries.map((f) => f.id));
        updatedPlayer.cementerio = updatedPlayer.cementerio.filter((c) => !fIds.has(c.id));
        updatedPlayer.castillo = [...updatedPlayer.castillo, ...faeries].sort(() => Math.random() - 0.5);
        logClauses.push(`Pooka: Baraja ${faeries.length} Faeries en tu Mazo Castillo.`);
      }
    }
    executedAny = true;
  }

  // Cuna de Dragones: Busca 2 cartas en tu cementerio y barájalas con tu mazo castillo. Puedes robar 1 carta.
  else if (cardNameUpper.includes('CUNA DE DRAGONES')) {
    if (!isCpu) {
      pendingTutor = {
        sourceZone: 'cementerio',
        filterType: 'any',
        destination: 'castillo_shuffle',
        maxCount: 2,
        drawExtraAfter: 1,
        reason: 'Cuna de Dragones: Elige 2 cartas de tu Cementerio para barajarlas (Luego robarás 1 carta)',
        cardName: card.name,
      };
      logClauses.push('Cuna de Dragones: Selecciona 2 cartas de tu Cementerio.');
    } else {
      const recycled = updatedPlayer.cementerio.slice(0, 2);
      const remainingCem = updatedPlayer.cementerio.slice(2);
      updatedPlayer.cementerio = remainingCem;
      updatedPlayer.castillo = [...updatedPlayer.castillo, ...recycled].sort(() => Math.random() - 0.5);
      const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 1);
      updatedPlayer = withDraw;
      logClauses.push(`Cuna de Dragones: Recicla 2 cartas y roba 1 ("${drawn[0]?.name || ''}").`);
    }
    executedAny = true;
  }

  // Búsqueda General / Tutor (ej: "busca un Tótem en tu mazo castillo", "busca un Talismán", etc.)
  else if (
    !cardNameUpper.includes('ULTIMA CANCION') &&
    !cardNameUpper.includes('ÚLTIMA CANCIÓN') &&
    !cardNameUpper.includes('ETTIN') &&
    (abilityText.includes('busca ') ||
      abilityText.includes('buscar ') ||
      abilityText.includes('busca un') ||
      abilityText.includes('busca dos') ||
      abilityText.includes('busca hasta'))
  ) {
    // Check gold payment if required
    const payMatch = abilityText.match(/(?:pagar|paga)\s+(\d+|un|una|dos|tres)\s+de\s+oro/i);
    if (payMatch && isManual) {
      let cost = 1;
      const raw = payMatch[1].toLowerCase();
      if (raw === 'dos' || raw === '2') cost = 2;
      else if (raw === 'tres' || raw === '3') cost = 3;
      if (!payGold(cost)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: Requiere pagar ${cost} de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
    }

    let filterType: TutorFilterType = 'any';
    let filterName: string | undefined;

    if (abilityText.includes('otra copia') || abilityText.includes('otra copia de') || abilityText.includes('una copia de')) {
      filterName = card.name.toUpperCase();
    }

    if (abilityText.includes('tótem') || abilityText.includes('totem')) {
      filterType = 'Tótem';
    } else if (abilityText.includes('talismán') || abilityText.includes('talisman')) {
      filterType = 'Talismán';
    } else if (abilityText.includes('arma')) {
      filterType = 'Arma';
    } else if (abilityText.includes('caballero')) {
      filterType = 'Caballero';
    } else if (abilityText.includes('faerie')) {
      filterType = 'Faerie';
    } else if (abilityText.includes('dragón') || abilityText.includes('dragon')) {
      filterType = 'Dragón';
    } else if (abilityText.includes('oro normal') || (abilityText.includes('oro') && !abilityText.includes('pagar'))) {
      filterType = 'Oro_Normal';
    } else if (abilityText.includes('aliado')) {
      filterType = 'Aliado';
    }

    const sourceZone: 'castillo' | 'cementerio' =
      abilityText.includes('en tu cementerio') || abilityText.includes('de tu cementerio')
        ? 'cementerio'
        : 'castillo';

    let destination: 'mano' | 'reserva' | 'castillo_shuffle' = 'mano';
    if (abilityText.includes('en tu reserva') || abilityText.includes('a tu reserva')) {
      destination = 'reserva';
    } else if (abilityText.includes('barajar') || abilityText.includes('barájalo') || abilityText.includes('barájalas')) {
      destination = 'castillo_shuffle';
    }

    let maxCount = 1;
    if (abilityText.includes('dos') || abilityText.includes(' 2 ')) maxCount = 2;
    if (abilityText.includes('tres') || abilityText.includes(' 3 ') || abilityText.includes('hasta 3')) maxCount = 3;

    if (!isCpu) {
      pendingTutor = {
        sourceZone,
        filterType,
        filterName,
        destination,
        maxCount,
        reason: `${card.name}: Busca ${maxCount > 1 ? maxCount : 'un(a)'} ${filterType} en tu ${sourceZone === 'cementerio' ? 'Cementerio' : 'Mazo Castillo'}`,
        cardName: card.name,
      };
      logClauses.push(`${card.name}: Iniciando búsqueda de ${filterType} en tu ${sourceZone}.`);
    } else {
      const source = sourceZone === 'cementerio' ? updatedPlayer.cementerio : updatedPlayer.castillo;
      const found = source.find((c) => {
        if (filterType === 'Tótem') return c.type === 'Tótem';
        if (filterType === 'Talismán') return c.type === 'Talismán';
        if (filterType === 'Arma') return c.type === 'Arma';
        if (filterType === 'Caballero') return c.race === 'Caballero';
        if (filterType === 'Faerie') return c.race === 'Faerie';
        if (filterType === 'Dragón') return c.race === 'Dragón';
        if (filterType === 'Aliado') return c.type === 'Aliado';
        if (filterType === 'Oro_Normal') return c.type === 'Oro' && (!c.ability || c.ability.length < 5);
        return true;
      });
      if (found) {
        if (sourceZone === 'cementerio') {
          updatedPlayer.cementerio = updatedPlayer.cementerio.filter((c) => c.id !== found.id);
        } else {
          updatedPlayer.castillo = updatedPlayer.castillo.filter((c) => c.id !== found.id);
        }
        if (destination === 'mano') {
          updatedPlayer.mano = [...updatedPlayer.mano, found];
        } else if (destination === 'reserva') {
          updatedPlayer.oroCards = [...updatedPlayer.oroCards, found];
          updatedPlayer.reservaOro += 1;
        } else {
          updatedPlayer.castillo = [...updatedPlayer.castillo, found].sort(() => Math.random() - 0.5);
        }
        logClauses.push(`${card.name}: Busca y obtiene "${found.name}".`);
      }
    }
    executedAny = true;
  }

  // =========================================================================
  // 4. DRAWING & DISCARDING
  // =========================================================================

  // Sir Owen: roba 3 cartas y descarta 2
  else if (cardNameUpper.includes('SIR OWEN') || abilityText.includes('roba 3 cartas y descarta 2')) {
    const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 3);
    updatedPlayer = withDraw;

    if (updatedPlayer.mano.length > 0) {
      const neededDiscard = Math.min(2, updatedPlayer.mano.length);
      pendingDiscard = {
        targetZone: 'mano',
        targetOwner: isCpu ? 'rival' : 'player',
        count: neededDiscard,
        reason: 'Sir Owen: Robaste 3 cartas. Debes seleccionar qué cartas deseas descartar al Cementerio.',
        cardName: card.name,
        invokingCard: card,
      };
      logClauses.push(
        `Sir Owen: Roba 3 cartas (${drawn.map((c) => c.name).join(', ')}). Selecciona ${neededDiscard} carta(s) de la mano para descartar.`
      );
    } else {
      logClauses.push(`Sir Owen: Roba 3 cartas (${drawn.map((c) => c.name).join(', ')}).`);
    }
    sound = 'flick';
    executedAny = true;
  }

  // Flecha Ácida: Destruye un Aliado oponente de fuerza 2 o menor. Luego roba 1 carta.
  else if (cardNameUpper.includes('FLECHA') || abilityText.includes('destruye un aliado oponente de fuerza 2 o menor')) {
    const targetIdx = updatedRival.lineaDefensa.findIndex((a) => a.currentStrength <= 2);
    if (targetIdx !== -1) {
      const target = updatedRival.lineaDefensa[targetIdx];
      updatedRival.lineaDefensa = [
        ...updatedRival.lineaDefensa.slice(0, targetIdx),
        ...updatedRival.lineaDefensa.slice(targetIdx + 1),
      ];
      updatedRival.cementerio = [
        ...updatedRival.cementerio,
        target.card,
        ...(target.attachedWeapons || []),
      ];
      logClauses.push(`Flecha Ácida impacta y destruye a "${target.card.name}" (${target.currentStrength} F).`);
    }
    // THEN DRAW 1 CARD
    const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 1);
    updatedPlayer = withDraw;
    if (drawn.length > 0) {
      logClauses.push(`Robas 1 carta ("${drawn[0].name}").`);
    }
    sound = 'damage';
    executedAny = true;
  }

  // Legado del Bosque: Cada jugador baraja 2 cartas de su cementerio con su mazo castillo y luego roba 1 carta
  else if (cardNameUpper.includes('LEGADO DEL BOSQUE')) {
    const pRecycled = updatedPlayer.cementerio.slice(0, 2);
    updatedPlayer.cementerio = updatedPlayer.cementerio.slice(2);
    updatedPlayer.castillo = [...updatedPlayer.castillo, ...pRecycled].sort(() => Math.random() - 0.5);

    const rRecycled = updatedRival.cementerio.slice(0, 2);
    updatedRival.cementerio = updatedRival.cementerio.slice(2);
    updatedRival.castillo = [...updatedRival.castillo, ...rRecycled].sort(() => Math.random() - 0.5);

    const { player: withDraw, drawn: pDrawn } = drawCardsFromCastillo(updatedPlayer, 1);
    updatedPlayer = withDraw;
    const { player: withRivalDraw, drawn: rDrawn } = drawCardsFromCastillo(updatedRival, 1);
    updatedRival = withRivalDraw;

    logClauses.push(
      `Legado del Bosque: Ambos jugadores reciclan 2 cartas y roban 1 carta (Robaste "${pDrawn[0]?.name || ''}").`
    );
    sound = 'flick';
    executedAny = true;
  }

  // Urisk: Cada jugador roba 2 cartas
  else if (cardNameUpper.includes('URISK') || abilityText.includes('cada jugador roba 2 cartas')) {
    const { player: withDraw, drawn: pDrawn } = drawCardsFromCastillo(updatedPlayer, 2);
    updatedPlayer = withDraw;
    const { player: withRivalDraw } = drawCardsFromCastillo(updatedRival, 2);
    updatedRival = withRivalDraw;

    logClauses.push(`Urisk: Ambos jugadores roban 2 cartas (Robaste: ${pDrawn.map((c) => c.name).join(', ')}).`);
    sound = 'flick';
    executedAny = true;
  }

  // Brag: puedes barajar 1 carta de tu mano en tu mazo castillo. Luego robar 1 carta
  else if (cardNameUpper.includes('BRAG')) {
    if (updatedPlayer.mano.length > 0) {
      const shuffled = updatedPlayer.mano[0];
      updatedPlayer.mano = updatedPlayer.mano.slice(1);
      updatedPlayer.castillo = [...updatedPlayer.castillo, shuffled].sort(() => Math.random() - 0.5);
    }
    const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 1);
    updatedPlayer = withDraw;
    logClauses.push(`Brag: Baraja 1 carta de tu mano y roba 1 ("${drawn[0]?.name || ''}").`);
    sound = 'flick';
    executedAny = true;
  }

  // Totem de Nwyre: Paga 1 de oro y roba 1 carta
  else if (cardNameUpper.includes('NWYRE') && isManual) {
    if (!payGold(1)) {
      return {
        updatedPlayer,
        updatedRival,
        logMessage: `⚠️ Oro insuficiente: "Tótem de Nwyre" requiere 1 de Oro disponible.`,
        abilityName: card.name,
        activatedSuccessfully: false,
      };
    }
    const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 1);
    updatedPlayer = withDraw;
    logClauses.push(`Tótem de Nwyre: Pagas 1 Oro y robas 1 carta ("${drawn[0]?.name || ''}").`);
    sound = 'flick';
    executedAny = true;
  }

  // Bors de Ganis: Cuando entra en juego, roba 1 carta
  else if (cardNameUpper.includes('BORS') || (cardNameUpper.includes('ELFO OSCURO') && !isManual)) {
    const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, 1);
    updatedPlayer = withDraw;
    logClauses.push(`Robas 1 carta ("${drawn[0]?.name || ''}").`);
    sound = 'flick';
    executedAny = true;
  }

  // Cantrip / Robo general: "roba 1 carta" / "roba 2 cartas" / "roba 2" / "roba 1"
  else {
    const drawMatch =
      abilityText.match(/(?:roba|robas)\s+(\d+|una|dos|tres|cuatro)\s+carta[s]?/i) ||
      abilityText.match(/puedes\s+robar\s+(\d+|una|dos|tres)\s+carta[s]?/i) ||
      abilityText.match(/(?:roba|robas)\s+(\d+|un|una|dos|tres|cuatro)/i);

    if (drawMatch && !cardNameUpper.includes('REY ARTURO')) {
      let count = 1;
      const rawCount = drawMatch[1].toLowerCase();
      if (rawCount === 'dos' || rawCount === '2') count = 2;
      else if (rawCount === 'tres' || rawCount === '3') count = 3;
      else if (rawCount === 'cuatro' || rawCount === '4') count = 4;
      else if (rawCount === 'una' || rawCount === 'un' || rawCount === '1') count = 1;

      const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, count);
      updatedPlayer = withDraw;
      if (drawn.length > 0) {
        logClauses.push(`Robas ${drawn.length} carta(s) (${drawn.map((c) => c.name).join(', ')}).`);
        sound = 'flick';
        executedAny = true;
      }

      // Check if card also generates gold
      if (abilityText.includes('genera') || abilityText.includes('produce') || abilityText.includes('agrega')) {
        const extraGoldMatch =
          abilityText.match(/(?:genera|produce|agrega|añade|da)\s+(\d+|un|una|dos|tres|cuatro)(?:\s+de)?\s+oro[s]?/i) ||
          abilityText.match(/(?:genera|produce|agrega|añade|da)\s+(\d+|un|una|dos|tres|cuatro)/i);
        if (extraGoldMatch) {
          let gCount = 1;
          const gRaw = extraGoldMatch[1].toLowerCase();
          if (gRaw === 'dos' || gRaw === '2') gCount = 2;
          else if (gRaw === 'tres' || gRaw === '3') gCount = 3;
          else if (gRaw === 'cuatro' || gRaw === '4') gCount = 4;
          const extraTokens = Array.from({ length: gCount }, (_, idx) =>
            createTemporaryGoldToken(`Oro de ${card.name} (${idx + 1})`)
          );
          updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...extraTokens];
          updatedPlayer.reservaOro += gCount;
          logClauses.push(`Además generas +${gCount} Oro en tu Reserva.`);
        }
      }
    }

    if (!executedAny && !isManual) {
      if (abilityText.includes('genera') || abilityText.includes('produce') || abilityText.includes('agrega')) {
        const extraGoldMatch =
          abilityText.match(/(?:genera|produce|agrega|añade|da)\s+(\d+|un|una|dos|tres|cuatro)(?:\s+de)?\s+oro[s]?/i) ||
          abilityText.match(/(?:genera|produce|agrega|añade|da)\s+(\d+|un|una|dos|tres|cuatro)/i);
        if (extraGoldMatch) {
          let gCount = 1;
          const gRaw = extraGoldMatch[1].toLowerCase();
          if (gRaw === 'dos' || gRaw === '2') gCount = 2;
          else if (gRaw === 'tres' || gRaw === '3') gCount = 3;
          else if (gRaw === 'cuatro' || gRaw === '4') gCount = 4;
          const extraTokens = Array.from({ length: gCount }, (_, idx) =>
            createTemporaryGoldToken(`Oro de ${card.name} (${idx + 1})`)
          );
          updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...extraTokens];
          updatedPlayer.reservaOro += gCount;
          logClauses.push(`Generas +${gCount} Oro en tu Reserva.`);
          sound = 'summon';
          executedAny = true;
        }
      }
    }
  }

  // =========================================================================
  // 5. OPPONENT DISCARD & MILL DAMAGE
  // =========================================================================
  if (
    abilityText.includes('mira la mano de tu oponente y descarta todos los aliados') ||
    cardNameUpper.includes('CABALLO LUNAR')
  ) {
    const nonAllies = updatedRival.mano.filter((c) => c.type !== 'Aliado');
    const discardedAllies = updatedRival.mano.filter((c) => c.type === 'Aliado');
    updatedRival.mano = nonAllies;
    updatedRival.cementerio = [...updatedRival.cementerio, ...discardedAllies];
    logClauses.push(
      `Descarta todos los Aliados de la mano rival (${discardedAllies.length} descartados: ${discardedAllies.map((c) => c.name).join(', ') || 'ninguno'}).`
    );
    executedAny = true;
  } else {
    const oppDiscardMatch =
      abilityText.match(/(?:oponente|rival)\s+(?:se\s+)?descarta\s+(?:de\s+)?(\d+|un|una|dos|tres)?\s*carta[s]?/i) ||
      abilityText.match(/descártale\s+(\d+|un|una|dos)?/i) ||
      abilityText.match(/tu oponente descarta\s+(\d+|un|una|dos)?/i);

    if (oppDiscardMatch && !cardNameUpper.includes('SIR OWEN')) {
      let count = 1;
      const raw = (oppDiscardMatch[1] || '1').toLowerCase();
      if (raw === 'dos' || raw === '2') count = 2;
      else if (raw === 'tres' || raw === '3') count = 3;

      const targetHand = updatedRival.mano;
      const actualDiscard = Math.min(count, targetHand.length);
      if (actualDiscard > 0) {
        pendingDiscard = {
          targetZone: 'mano',
          targetOwner: isCpu ? 'player' : 'rival',
          count: actualDiscard,
          reason: `${card.name}: Obliga a descartar ${actualDiscard} carta(s). Elige qué carta(s) descartar al Cementerio.`,
          cardName: card.name,
          invokingCard: card,
        };
        logClauses.push(
          `${card.name}: Obliga a descartar ${actualDiscard} carta(s). Selecciona qué carta descartar.`
        );
        executedAny = true;
      }
    }
  }

  // Mill damage
  const millMatch =
    abilityText.match(/(?:tu oponente|el rival|éste)?\s*bota[r]?\s+(\d+|una|dos|tres|cuatro)\s+carta[s]?/i);

  if (
    millMatch &&
    !cardNameUpper.includes('REY ARTURO') &&
    !cardNameUpper.includes('ELLYLLON') &&
    !abilityText.includes('una vez por turno') &&
    !cardNameUpper.includes('HOBGOBLIN')
  ) {
    let count = 1;
    const raw = millMatch[1].toLowerCase();
    if (raw === 'dos' || raw === '2') count = 2;
    else if (raw === 'tres' || raw === '3') count = 3;
    else if (raw === 'cuatro' || raw === '4') count = 4;

    const actualMill = Math.min(count, updatedRival.castillo.length);
    if (actualMill > 0) {
      const milled = updatedRival.castillo.slice(0, actualMill);
      updatedRival.castillo = updatedRival.castillo.slice(actualMill);
      updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
      logClauses.push(`El rival bota ${actualMill} carta(s) de su Mazo Castillo.`);
      sound = 'damage';
      executedAny = true;
    }
  }

  // Ellyllon: Cada vez que Ellyllon entre o salga del juego, tu oponente bota 2 cartas.
  if (cardNameUpper.includes('ELLYLLON')) {
    const mill = Math.min(2, updatedRival.castillo.length);
    const milled = updatedRival.castillo.slice(0, mill);
    updatedRival.castillo = updatedRival.castillo.slice(mill);
    updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
    logClauses.push(`🧚 Ellyllon entra en juego: Tu oponente bota ${mill} cartas de su Mazo Castillo.`);
    sound = 'damage';
    executedAny = true;
  }

  // =========================================================================
  // 6. DESTRUCTION / BOUNCE / BANISH
  // =========================================================================
  if (cardNameUpper.includes('PLAGA') || abilityText.includes('destruye dos aliados oponentes')) {
    const destroyCount = Math.min(2, updatedRival.lineaDefensa.length);
    if (destroyCount > 0) {
      const destroyed = updatedRival.lineaDefensa.slice(0, destroyCount);
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.slice(destroyCount);
      const weapons = destroyed.flatMap((d) => d.attachedWeapons || []);
      updatedRival.cementerio = [
        ...updatedRival.cementerio,
        ...destroyed.map((d) => d.card),
        ...weapons,
      ];
      sound = 'damage';
      logClauses.push(
        `Destruye a ${destroyCount} Aliado(s) oponente(s): ${destroyed.map((d) => `"${d.card.name}"`).join(', ')}.`
      );
      executedAny = true;
    }
  } else if (
    cardNameUpper.includes('DRAGON NIVAL') ||
    abilityText.includes('destruidos todos los aliados de fuerza 2 o menos')
  ) {
    const rivalDestroyed = updatedRival.lineaDefensa.filter((a) => a.currentStrength <= 2);
    const rivalRemaining = updatedRival.lineaDefensa.filter((a) => a.currentStrength > 2);
    const playerDestroyed = updatedPlayer.lineaDefensa.filter(
      (a) => a.currentStrength <= 2 && a.card.id !== card.id
    );
    const playerRemaining = updatedPlayer.lineaDefensa.filter(
      (a) => a.currentStrength > 2 || a.card.id === card.id
    );

    updatedRival.lineaDefensa = rivalRemaining;
    updatedRival.cementerio = [
      ...updatedRival.cementerio,
      ...rivalDestroyed.map((a) => a.card),
      ...rivalDestroyed.flatMap((a) => a.attachedWeapons || []),
    ];

    updatedPlayer.lineaDefensa = playerRemaining;
    updatedPlayer.cementerio = [
      ...updatedPlayer.cementerio,
      ...playerDestroyed.map((a) => a.card),
      ...playerDestroyed.flatMap((a) => a.attachedWeapons || []),
    ];

    sound = 'damage';
    logClauses.push(
      `Tormenta de Nieve: Destruye todos los Aliados con fuerza 2 o menos en mesa (${rivalDestroyed.length} rivales, ${playerDestroyed.length} propios).`
    );
    executedAny = true;
  } else if (
    cardNameUpper.includes('GUILLOTINA') ||
    cardNameUpper.includes('CUATRO FUERTES VIENTOS') ||
    abilityText.includes('mayor fuerza')
  ) {
    if (updatedRival.lineaDefensa.length > 0) {
      const sorted = [...updatedRival.lineaDefensa].sort(
        (a, b) => b.currentStrength - a.currentStrength
      );
      const target = sorted[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.filter(
        (a) => a.instanceId !== target.instanceId
      );
      updatedRival.cementerio = [
        ...updatedRival.cementerio,
        target.card,
        ...(target.attachedWeapons || []),
      ];
      sound = 'damage';
      logClauses.push(
        `Destruye al Aliado oponente más fuerte: "${target.card.name}" (${target.currentStrength} F).`
      );
      executedAny = true;
    }
  } else if (cardNameUpper.includes('DESLEAL') || abilityText.includes('destierra un aliado oponente')) {
    if (updatedRival.lineaDefensa.length > 0) {
      const target = updatedRival.lineaDefensa[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.slice(1);
      updatedRival.destierro = [
        ...updatedRival.destierro,
        target.card,
        ...(target.attachedWeapons || []),
      ];
      sound = 'shield';
      logClauses.push(`Destierra al Aliado oponente "${target.card.name}" a la Zona de Destierro.`);
      executedAny = true;
    }
  } else if (
    cardNameUpper.includes('LLEWELYN') ||
    abilityText.includes('súbelo a su mano') ||
    abilityText.includes('sube a su mano')
  ) {
    if (updatedRival.lineaDefensa.length > 0) {
      const target = updatedRival.lineaDefensa[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.slice(1);
      updatedRival.mano = [...updatedRival.mano, target.card];
      const weapons = target.attachedWeapons || [];
      if (weapons.length > 0) {
        updatedRival.cementerio = [...updatedRival.cementerio, ...weapons];
      }
      sound = 'flick';
      logClauses.push(`Regresa al Aliado rival "${target.card.name}" a la mano de su dueño.`);
      executedAny = true;
    }
  } else if (cardNameUpper.includes('PERSIVAL') || abilityText.includes('baraja un aliado oponente')) {
    if (updatedRival.lineaDefensa.length > 0) {
      const target = updatedRival.lineaDefensa[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.slice(1);
      updatedRival.castillo = [...updatedRival.castillo, target.card].sort(
        () => Math.random() - 0.5
      );
      const weapons = target.attachedWeapons || [];
      if (weapons.length > 0) {
        updatedRival.cementerio = [...updatedRival.cementerio, ...weapons];
      }
      sound = 'flick';
      logClauses.push(`Baraja al Aliado rival "${target.card.name}" de regreso en su Mazo Castillo.`);
      executedAny = true;
    }
  } else if (
    cardNameUpper.includes('BOLA DE FUEGO') ||
    abilityText.includes('destruye una carta en juego, que no sea un oro')
  ) {
    if (updatedRival.lineaDefensa.length > 0) {
      const target = updatedRival.lineaDefensa[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.slice(1);
      updatedRival.cementerio = [
        ...updatedRival.cementerio,
        target.card,
        ...(target.attachedWeapons || []),
      ];
      sound = 'damage';
      logClauses.push(`Destruye al Aliado rival "${target.card.name}".`);
      executedAny = true;
    } else if (updatedRival.lineaApoyo.length > 0) {
      const target = updatedRival.lineaApoyo[0];
      updatedRival.lineaApoyo = updatedRival.lineaApoyo.slice(1);
      updatedRival.cementerio = [...updatedRival.cementerio, target.card];
      sound = 'damage';
      logClauses.push(`Destruye el Tótem/Soporte rival "${target.card.name}".`);
      executedAny = true;
    } else if (updatedRival.castillo.length > 0) {
      const dmg = Math.min(3, updatedRival.castillo.length);
      const milled = updatedRival.castillo.slice(0, dmg);
      updatedRival.castillo = updatedRival.castillo.slice(dmg);
      updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
      sound = 'damage';
      logClauses.push(`Sin defensores: Bola de Fuego inflige 3 de daño directo al Castillo rival.`);
      executedAny = true;
    }
  } else if (
    abilityText.includes('destruye un aliado oponente') ||
    abilityText.includes('destruye a un aliado')
  ) {
    if (updatedRival.lineaDefensa.length > 0) {
      const target = updatedRival.lineaDefensa[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.slice(1);
      updatedRival.cementerio = [
        ...updatedRival.cementerio,
        target.card,
        ...(target.attachedWeapons || []),
      ];
      sound = 'damage';
      logClauses.push(`Destruye al Aliado rival "${target.card.name}".`);
      executedAny = true;
    }
  }

  // =========================================================================
  // 6.5. RESTRICTIONS TO DEFEND / BLOCK (Talismans & Effects)
  // "si un talismán dice que un aliado no puede defender este no podrá bloquear ataque"
  // =========================================================================
  const isCannotDefendEffect =
    abilityText.includes('no puede defender') ||
    abilityText.includes('no pueda defender') ||
    abilityText.includes('no podrá defender') ||
    abilityText.includes('no podra defender') ||
    abilityText.includes('no pueden defender') ||
    abilityText.includes('no puedan defender') ||
    abilityText.includes('no puede bloquear') ||
    abilityText.includes('no pueda bloquear') ||
    abilityText.includes('no podrá bloquear') ||
    abilityText.includes('no podra bloquear') ||
    abilityText.includes('no pueden bloquear') ||
    abilityText.includes('no puedan bloquear');

  if (isCannotDefendEffect && (!isManual || (isManual && (abilityText.includes('no pueda bloquear') || abilityText.includes('no puede defender'))))) {
    const affectsAllRival =
      abilityText.includes('todos los aliados oponentes') ||
      abilityText.includes('los aliados oponentes no') ||
      abilityText.includes('todos los defensores');

    if (affectsAllRival) {
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.map((a) => ({
        ...a,
        cannotDefend: true,
      }));
      logClauses.push('🚫 Todos los Aliados oponentes no podrán defender ni bloquear ataques durante este turno.');
      sound = 'shield';
      executedAny = true;
    } else {
      if (isCpu) {
        if (updatedRival.lineaDefensa.length > 0) {
          const sorted = [...updatedRival.lineaDefensa].sort((a, b) => b.currentStrength - a.currentStrength);
          const target = sorted[0];
          updatedRival.lineaDefensa = updatedRival.lineaDefensa.map((a) =>
            a.instanceId === target.instanceId ? { ...a, cannotDefend: true } : a
          );
          logClauses.push(`🚫 Tu "${target.card.name}" (${target.currentStrength} F) no podrá defender ni bloquear ataques este turno.`);
          sound = 'shield';
          executedAny = true;
        }
      } else {
        if (chosenOptionId) {
          updatedRival.lineaDefensa = updatedRival.lineaDefensa.map((a) =>
            a.instanceId === chosenOptionId ? { ...a, cannotDefend: true } : a
          );
          const chosen = updatedRival.lineaDefensa.find((a) => a.instanceId === chosenOptionId);
          logClauses.push(
            `🚫 "${chosen?.card.name || 'Aliado rival'}" no podrá defender ni bloquear ataques durante este turno.`
          );
          sound = 'shield';
          executedAny = true;
        } else if (updatedRival.lineaDefensa.length > 0) {
          return {
            updatedPlayer,
            updatedRival,
            logMessage: `Elige qué Aliado oponente no podrá defender ni bloquear ataques este turno.`,
            abilityName: card.name,
            activatedSuccessfully: true,
            pendingChoice: {
              title: card.name.toUpperCase(),
              cardName: card.name,
              description: 'Selecciona qué Aliado oponente no podrá bloquear ataques este turno:',
              options: updatedRival.lineaDefensa.map((a) => ({
                id: a.instanceId,
                label: `${a.card.name} (${a.currentStrength} F)`,
                description: `Raza: ${a.card.race || 'Sin Raza'}. Quedará inhabilitado para bloquear ataques este turno.`,
                icon: '🚫',
              })),
              invokingCard: card,
            },
          };
        } else {
          logClauses.push('El oponente no tiene Aliados en Línea de Defensa para inhabilitar.');
          executedAny = true;
        }
      }
    }
  }

  // =========================================================================
  // 6.6. STRENGTH MODIFIERS (BUFFS & DEBUFFS FROM TALISMANS & ENTRY ABILITIES)
  // =========================================================================
  const debuffMatch =
    abilityText.match(/gana[n]?\s*-\s*(\d+)/i) ||
    abilityText.match(/pierde[n]?\s*(\d+)\s*(?:a\s+la\s+)?fuerza/i) ||
    abilityText.match(/pierde[n]?\s*(\d+)\s*de\s*fuerza/i) ||
    abilityText.match(/resta[n]?\s*(\d+)\s*(?:a\s+la\s+)?fuerza/i) ||
    abilityText.match(/-\s*(\d+)\s*a\s*la\s*fuerza/i) ||
    (abilityText.includes('fuerza 0') || abilityText.includes('fuerza cero') ? ['fuerza 0', '0'] : null);

  const buffMatch =
    !debuffMatch &&
    (abilityText.match(/gana[n]?\s*\+?\s*(\d+)\s*(?:a\s+la\s+)?fuerza/i) ||
      abilityText.match(/gana[n]?\s*\+\s*(\d+)/i) ||
      abilityText.match(/\+\s*(\d+)\s*a\s*la\s*fuerza/i) ||
      abilityText.match(/aumenta[n]?\s*(?:en\s+)?(\d+)/i) ||
      (abilityText.includes('duplica su fuerza') || abilityText.includes('duplicar su fuerza') ? ['duplica', '0'] : null));

  if (debuffMatch) {
    const isZeroStrength = abilityText.includes('fuerza 0') || abilityText.includes('fuerza cero');
    const debuffVal = isZeroStrength
      ? 0
      : (parseInt(debuffMatch[1], 10) || 1);

    const affectsAllRival =
      abilityText.includes('todos los aliados oponentes') ||
      abilityText.includes('los aliados oponentes ganen') ||
      abilityText.includes('los aliados oponentes ganan') ||
      abilityText.includes('aliados oponentes ganan -');

    if (affectsAllRival) {
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.map((a) => {
        const prevF = a.currentStrength;
        const newF = Math.max(0, a.currentStrength - debuffVal);
        abilityLogger.logStrengthModification({
          sourceCardName: card.name,
          sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
          targetAlly: a,
          targetOwner: isCpu ? 'player' : 'cpu',
          changeType: 'debuff',
          amount: debuffVal,
          isPermanent: false,
          previousStrength: prevF,
          newStrength: newF,
          reason: 'Afecta a todos los Aliados oponentes hasta el final del turno.',
        });
        return {
          ...a,
          turnStrengthBonus: (a.turnStrengthBonus || 0) - debuffVal,
          currentStrength: newF,
        };
      });
      updatedRival.lineaAtaque = (updatedRival.lineaAtaque || []).map((a) => {
        const prevF = a.currentStrength;
        const newF = Math.max(0, a.currentStrength - debuffVal);
        abilityLogger.logStrengthModification({
          sourceCardName: card.name,
          sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
          targetAlly: a,
          targetOwner: isCpu ? 'player' : 'cpu',
          changeType: 'debuff',
          amount: debuffVal,
          isPermanent: false,
          previousStrength: prevF,
          newStrength: newF,
          reason: 'Afecta a todos los Aliados oponentes hasta el final del turno.',
        });
        return {
          ...a,
          turnStrengthBonus: (a.turnStrengthBonus || 0) - debuffVal,
          currentStrength: newF,
        };
      });
      logClauses.push(
        `📉 Todos los Aliados oponentes ganan -${debuffVal} a la Fuerza hasta el final del turno.`
      );
      sound = 'damage';
      executedAny = true;
    } else {
      const allRivalAllies = [
        ...updatedRival.lineaDefensa,
        ...(updatedRival.lineaAtaque || []),
      ];

      if (chosenOptionId) {
        const applyDebuff = (a: AllyInPlay): AllyInPlay => {
          if (a.instanceId !== chosenOptionId) return a;
          const drop = isZeroStrength ? a.currentStrength : debuffVal;
          const newF = isZeroStrength ? 0 : Math.max(0, a.currentStrength - debuffVal);
          abilityLogger.logStrengthModification({
            sourceCardName: card.name,
            sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
            targetAlly: a,
            targetOwner: isCpu ? 'player' : 'cpu',
            changeType: isZeroStrength ? 'fuerza_cero' : 'debuff',
            amount: drop,
            isPermanent: false,
            previousStrength: a.currentStrength,
            newStrength: newF,
            reason: isZeroStrength ? 'Fuerza reducida a cero hasta fin de turno.' : `Debuff de -${drop} F hasta fin de turno.`,
          });
          return {
            ...a,
            turnStrengthBonus: (a.turnStrengthBonus || 0) - drop,
            currentStrength: newF,
          };
        };
        updatedRival.lineaDefensa = updatedRival.lineaDefensa.map(applyDebuff);
        updatedRival.lineaAtaque = (updatedRival.lineaAtaque || []).map(applyDebuff);

        const target = allRivalAllies.find((a) => a.instanceId === chosenOptionId);
        logClauses.push(
          `📉 "${target?.card.name || 'Aliado rival'}" ${
            isZeroStrength
              ? 'pasa a tener Fuerza 0'
              : `gana -${debuffVal} a la Fuerza`
          } hasta el final del turno.`
        );
        sound = 'damage';
        executedAny = true;
      } else if (allRivalAllies.length > 0) {
        if (isCpu || allRivalAllies.length === 1) {
          const sorted = [...allRivalAllies].sort((a, b) => b.currentStrength - a.currentStrength);
          const target = sorted[0];
          const drop = isZeroStrength ? target.currentStrength : debuffVal;
          const applyDebuff = (a: AllyInPlay): AllyInPlay => {
            if (a.instanceId !== target.instanceId) return a;
            const newF = isZeroStrength ? 0 : Math.max(0, a.currentStrength - debuffVal);
            abilityLogger.logStrengthModification({
              sourceCardName: card.name,
              sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
              targetAlly: a,
              targetOwner: isCpu ? 'player' : 'cpu',
              changeType: isZeroStrength ? 'fuerza_cero' : 'debuff',
              amount: drop,
              isPermanent: false,
              previousStrength: a.currentStrength,
              newStrength: newF,
              reason: isZeroStrength ? 'Fuerza reducida a cero hasta fin de turno.' : `Debuff de -${drop} F hasta fin de turno.`,
            });
            return {
              ...a,
              turnStrengthBonus: (a.turnStrengthBonus || 0) - drop,
              currentStrength: newF,
            };
          };
          updatedRival.lineaDefensa = updatedRival.lineaDefensa.map(applyDebuff);
          updatedRival.lineaAtaque = (updatedRival.lineaAtaque || []).map(applyDebuff);
          logClauses.push(
            `📉 "${target.card.name}" ${
              isZeroStrength
                ? 'pasa a tener Fuerza 0'
                : `gana -${debuffVal} a la Fuerza`
            } hasta el final del turno.`
          );
          sound = 'damage';
          executedAny = true;
        } else {
          return {
            updatedPlayer,
            updatedRival,
            logMessage: `Elige qué Aliado oponente recibirá el efecto de Fuerza.`,
            abilityName: card.name,
            activatedSuccessfully: true,
            pendingChoice: {
              title: card.name.toUpperCase(),
              cardName: card.name,
              description: `Selecciona el Aliado oponente que ${
                isZeroStrength
                  ? 'tendrá Fuerza 0'
                  : `ganará -${debuffVal} a la Fuerza`
              } hasta el final del turno:`,
              options: allRivalAllies.map((a) => ({
                id: a.instanceId,
                label: `${a.card.name} (${a.currentStrength} F)`,
                description: `Raza: ${a.card.race || 'Sin Raza'}. Pasará a tener ${
                  isZeroStrength ? 0 : Math.max(0, a.currentStrength - debuffVal)
                } F hasta el final del turno.`,
                icon: '📉',
              })),
              invokingCard: card,
            },
          };
        }
      }
    }
  } else if (buffMatch) {
    const isMulvan =
      cardNameUpper.includes('MULVAN') || abilityText.includes('duplicar su fuerza');
    const buffVal = isMulvan ? 0 : (parseInt(buffMatch[1], 10) || 1);

    const isPermanent =
      abilityText.includes('permanente') ||
      abilityText.includes('permanentemente') ||
      abilityText.includes('de forma permanente') ||
      cardNameUpper.includes('KELPIE');

    const affectsAllFriendly =
      abilityText.includes('todos tus aliados') ||
      abilityText.includes('cada uno de tus aliados') ||
      cardNameUpper.includes('FE SIN LIMITES') ||
      cardNameUpper.includes('FE SIN LÍMITES');

    if (affectsAllFriendly) {
      const applyBuff = (a: AllyInPlay): AllyInPlay => {
        const prevF = a.currentStrength;
        const newF = a.currentStrength + buffVal;
        abilityLogger.logStrengthModification({
          sourceCardName: card.name,
          sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
          targetAlly: a,
          targetOwner: isCpu ? 'cpu' : 'player',
          changeType: 'buff',
          amount: buffVal,
          isPermanent,
          previousStrength: prevF,
          newStrength: newF,
          reason: `Afecta a todos tus Aliados (${isPermanent ? 'permanente' : 'hasta fin de turno'}).`,
        });
        if (isPermanent) {
          return {
            ...a,
            permanentStrengthBonus: (a.permanentStrengthBonus || 0) + buffVal,
            currentStrength: newF,
          };
        }
        return {
          ...a,
          turnStrengthBonus: (a.turnStrengthBonus || 0) + buffVal,
          currentStrength: newF,
        };
      };
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(applyBuff);
      updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(applyBuff);
      logClauses.push(
        `🛡️ Todos tus Aliados ganan +${buffVal} a la Fuerza ${
          isPermanent ? 'de forma permanente 🛡️' : 'hasta el final del turno ⏳'
        }.`
      );
      sound = 'victory';
      executedAny = true;
    } else {
      let candidates = [
        ...updatedPlayer.lineaDefensa,
        ...(updatedPlayer.lineaAtaque || []),
      ];

      if (
        abilityText.includes('un dragón') ||
        abilityText.includes('un dragon') ||
        cardNameUpper.includes('KELPIE')
      ) {
        candidates = candidates.filter((a) => a.card.race === 'Dragón');
      } else if (abilityText.includes('un faerie') || abilityText.includes('un feérico')) {
        candidates = candidates.filter((a) => a.card.race === 'Faerie');
      } else if (abilityText.includes('un caballero')) {
        candidates = candidates.filter((a) => a.card.race === 'Caballero');
      } else if (abilityText.includes('porte un arma') || abilityText.includes('porte arma')) {
        candidates = candidates.filter((a) => (a.attachedWeapons?.length || 0) > 0);
      }

      if (chosenOptionId) {
        const applyBuff = (a: AllyInPlay): AllyInPlay => {
          if (a.instanceId !== chosenOptionId) return a;
          const finalBonus = isMulvan ? a.currentStrength : buffVal;
          const prevF = a.currentStrength;
          const newF = a.currentStrength + finalBonus;
          abilityLogger.logStrengthModification({
            sourceCardName: card.name,
            sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
            targetAlly: a,
            targetOwner: isCpu ? 'cpu' : 'player',
            changeType: isMulvan ? 'duplicar' : 'buff',
            amount: finalBonus,
            isPermanent,
            previousStrength: prevF,
            newStrength: newF,
            reason: isMulvan ? 'Duplica su fuerza hasta fin de turno.' : `Bono de +${finalBonus} F.`,
          });
          if (isPermanent) {
            return {
              ...a,
              permanentStrengthBonus: (a.permanentStrengthBonus || 0) + finalBonus,
              currentStrength: newF,
              unblockable: cardNameUpper.includes('KELPIE') ? true : a.unblockable,
            };
          }
          return {
            ...a,
            turnStrengthBonus: (a.turnStrengthBonus || 0) + finalBonus,
            currentStrength: newF,
            banishAtTurnEnd: isMulvan ? true : a.banishAtTurnEnd,
          };
        };
        updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(applyBuff);
        updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(applyBuff);

        const chosen = candidates.find((a) => a.instanceId === chosenOptionId);
        logClauses.push(
          `🛡️ "${chosen?.card.name || 'Aliado'}" gana +${
            isMulvan ? chosen?.currentStrength : buffVal
          } a la Fuerza ${
            isPermanent ? 'de forma permanente 🛡️' : 'hasta el final del turno ⏳'
          }${cardNameUpper.includes('KELPIE') ? ' y se considera imbloqueable' : ''}.`
        );
        sound = 'summon';
        executedAny = true;
      } else if (candidates.length > 0) {
        if (candidates.length === 1 || isCpu) {
          const target = [...candidates].sort((a, b) => b.currentStrength - a.currentStrength)[0];
          const finalBonus = isMulvan ? target.currentStrength : buffVal;
          const applyBuff = (a: AllyInPlay): AllyInPlay => {
            if (a.instanceId !== target.instanceId) return a;
            const prevF = a.currentStrength;
            const newF = a.currentStrength + finalBonus;
            abilityLogger.logStrengthModification({
              sourceCardName: card.name,
              sourceType: card.type === 'Talismán' ? 'Talismán' : 'Habilidad_Entrada',
              targetAlly: a,
              targetOwner: isCpu ? 'cpu' : 'player',
              changeType: isMulvan ? 'duplicar' : 'buff',
              amount: finalBonus,
              isPermanent,
              previousStrength: prevF,
              newStrength: newF,
              reason: isMulvan ? 'Duplica su fuerza hasta fin de turno.' : `Bono de +${finalBonus} F.`,
            });
            if (isPermanent) {
              return {
                ...a,
                permanentStrengthBonus: (a.permanentStrengthBonus || 0) + finalBonus,
                currentStrength: newF,
                unblockable: cardNameUpper.includes('KELPIE') ? true : a.unblockable,
              };
            }
            return {
              ...a,
              turnStrengthBonus: (a.turnStrengthBonus || 0) + finalBonus,
              currentStrength: newF,
              banishAtTurnEnd: isMulvan ? true : a.banishAtTurnEnd,
            };
          };
          updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(applyBuff);
          updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(applyBuff);
          logClauses.push(
            `🛡️ "${target.card.name}" gana +${finalBonus} a la Fuerza ${
              isPermanent ? 'de forma permanente 🛡️' : 'hasta el final del turno ⏳'
            }${cardNameUpper.includes('KELPIE') ? ' y se considera imbloqueable' : ''}.`
          );
          sound = 'summon';
          executedAny = true;
        } else {
          return {
            updatedPlayer,
            updatedRival,
            logMessage: `Elige qué Aliado recibirá el bono de Fuerza.`,
            abilityName: card.name,
            activatedSuccessfully: true,
            pendingChoice: {
              title: card.name.toUpperCase(),
              cardName: card.name,
              description: `Selecciona el Aliado que recibirá ${
                isMulvan ? 'el doble de' : `+${buffVal} a la`
              } Fuerza ${isPermanent ? 'permanente' : 'hasta el final del turno'}:`,
              options: candidates.map((a) => ({
                id: a.instanceId,
                label: `${a.card.name} (${a.currentStrength} F)`,
                description: `Raza: ${a.card.race || 'Sin Raza'}. Pasará a tener ${
                  isMulvan ? a.currentStrength * 2 : a.currentStrength + buffVal
                } F.`,
                icon: '🛡️',
              })),
              invokingCard: card,
            },
          };
        }
      }
    }
  }

  // =========================================================================
  // 7. SPECIFIC ACTIVATED WEAPON / ALLY ABILITIES IN VIGILIA
  // =========================================================================
  if (isManual) {
    // Espada Larga: activación pagando 1 oro para que el portador pueda atacar aunque sólo pueda defender
    if (cardNameUpper.includes('ESPADA LARGA')) {
      const requiredGold = 1;
      const canPay = payGold(requiredGold);
      if (!canPay) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Espada Larga" requiere pagar ${requiredGold} de Oro en Reserva para habilitar el ataque.`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }

      let bearerName = 'Portador';
      const enableBearer = (ally: AllyInPlay): AllyInPlay => {
        const isBearer =
          (options?.allyInstanceId && ally.instanceId === options.allyInstanceId) ||
          (ally.attachedWeapons || []).some((w) => w.id === card.id || w.name.toUpperCase().includes('ESPADA LARGA'));
        if (isBearer) {
          bearerName = ally.card.name;
          return {
            ...ally,
            canAttack: true,
            canAttackOverride: true,
            mustPayGoldToAttack: 0,
          };
        }
        return ally;
      };

      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(enableBearer);
      updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(enableBearer);

      logClauses.push(`🗡️ "Espada Larga" activada: Pagas ${requiredGold} Oro. "${bearerName}" ahora puede ser declarado atacante este turno (incluso si solo puede defender).`);
      sound = 'shield';
      executedAny = true;
    }

    // Darg el Semi Dragón
    else if (cardNameUpper.includes('DARG') || abilityText.includes('el semi dragón, gane + 1')) {
      if (!payGold(1)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Darg El Semi Dragón" requiere 1 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map((a) => {
        if (a.card.name.toUpperCase().includes('DARG')) {
          return {
            ...a,
            turnStrengthBonus: (a.turnStrengthBonus || 0) + 1,
            currentStrength: a.currentStrength + 1,
          };
        }
        return a;
      });
      logClauses.push('Pagas 1 Oro: Darg gana +1 a la Fuerza hasta el final del turno.');
      executedAny = true;
    }

    // Excalibur
    else if (cardNameUpper.includes('EXCALIBUR')) {
      if (updatedPlayer.mano.length === 0) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: '⚠️ No tienes cartas en mano para descartar con Excalibur.',
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      pendingDiscard = {
        targetZone: 'mano',
        targetOwner: isCpu ? 'rival' : 'player',
        count: 1,
        reason: 'Excalibur: Elige qué carta de tu mano deseas descartar. Rey Arturo ganará Fuerza equivalente a su coste (mínimo +1 F).',
        cardName: card.name,
        invokingCard: card,
        afterDiscardEffect: 'buff',
      };
      logClauses.push('Excalibur: Selecciona 1 carta de tu mano para descartar y potenciar a Rey Arturo.');
      executedAny = true;
    }

    // Espada Dragón
    else if (cardNameUpper.includes('ESPADA DRAGON') || abilityText.includes('destierra espada dragón')) {
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map((a) => ({
        ...a,
        attachedWeapons: (a.attachedWeapons || []).filter((w) => !w.name.toUpperCase().includes('ESPADA DRAGON')),
      }));
      updatedPlayer.destierro = [...updatedPlayer.destierro, card];
      logClauses.push('Destierras Espada Dragón: Anulas la habilidad de una carta en juego hasta el final del turno.');
      executedAny = true;
    }

    // Alabarda
    else if (cardNameUpper.includes('ALABARDA') || abilityText.includes('destierra a alabarda')) {
      let targetAllyName = '';
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map((a) => {
        const hasAlabarda = (a.attachedWeapons || []).some((w) =>
          w.name.toUpperCase().includes('ALABARDA')
        );
        if (hasAlabarda) {
          targetAllyName = a.card.name;
          return {
            ...a,
            baseStrength: a.baseStrength + 2,
            currentStrength: a.currentStrength + 2,
            attachedWeapons: (a.attachedWeapons || []).filter(
              (w) => !w.name.toUpperCase().includes('ALABARDA')
            ),
          };
        }
        return a;
      });
      updatedPlayer.destierro = [...updatedPlayer.destierro, card];
      logClauses.push(
        `Destierras Alabarda: "${targetAllyName || 'El Aliado portador'}" gana +2 a la Fuerza de forma permanente.`
      );
      executedAny = true;
    }

    // Comisario
    else if (cardNameUpper.includes('COMISARIO') || abilityText.includes('destierra a comisario')) {
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.filter((a) => a.card.id !== card.id);
      updatedPlayer.destierro = [...updatedPlayer.destierro, card];
      logClauses.push('Destierras a Comisario: Tu oponente no podrá robar cartas en su próximo turno.');
      executedAny = true;
    }

    // Sir Gaerin el Blanco
    else if (cardNameUpper.includes('SIR GAERIN') || abilityText.includes('destruir a sir gaerin')) {
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.filter((a) => a.card.id !== card.id);
      updatedPlayer.cementerio = [...updatedPlayer.cementerio, card];
      logClauses.push('Destruyes a Sir Gaerin El Blanco: Anulas la habilidad de un Caballero rival.');
      executedAny = true;
    }

    // Atha-Uk
    else if (cardNameUpper.includes('ATHA-UK') || abilityText.includes('destruir a atha-uk')) {
      updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.filter((a) => a.card.id !== card.id);
      updatedPlayer.cementerio = [...updatedPlayer.cementerio, card];
      if (updatedRival.cementerio.length > 0) {
        const target = updatedRival.cementerio[updatedRival.cementerio.length - 1];
        updatedRival.cementerio = updatedRival.cementerio.slice(0, -1);
        updatedRival.destierro = [...updatedRival.destierro, target];
        logClauses.push(`Destruyes a Atha-Uk: Destierras "${target.name}" del Cementerio rival.`);
      }
      executedAny = true;
    }

    // Tótem de Cristal: En tu fase de vigilia y una vez por turno, pagar 3 de oro para barajar un Talismán de tu cementerio a tu mazo castillo
    else if (cardNameUpper.includes('TOTEM DE CRISTAL') || (card.type === 'Tótem' && cardNameUpper.includes('CRISTAL'))) {
      if (!payGold(3)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Tótem de Cristal" requiere 3 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      const hasTalisman = updatedPlayer.cementerio.some((c) => c.type === 'Talismán');
      if (!hasTalisman) {
        refundGold(3);
        return {
          updatedPlayer,
          updatedRival,
          logMessage: '⚠️ No tienes ningún Talismán en tu Cementerio para barajar con Tótem de Cristal.',
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      pendingTutor = {
        sourceZone: 'cementerio',
        filterType: 'Talismán',
        destination: 'castillo_shuffle',
        maxCount: 1,
        reason: 'Tótem de Cristal: Selecciona un Talismán de tu Cementerio para barajarlo en tu Mazo Castillo.',
        cardName: card.name,
        targetOwner: isCpu ? 'cpu' : 'player',
      };
      logClauses.push('Tótem de Cristal: Pagas 3 de Oro. Elige 1 Talismán de tu Cementerio para barajarlo en tu Mazo Castillo.');
      executedAny = true;
    }

    // Tótem de la Última Canción: En tu fase de vigilia y una vez por turno, pagar 2 de oro para buscar un Tótem en tu mazo castillo y ponerlo en tu mano
    else if (cardNameUpper.includes('ULTIMA CANCION') || cardNameUpper.includes('ÚLTIMA CANCIÓN')) {
      if (!payGold(2)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Tótem de la Última Canción" requiere 2 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Tótem',
        destination: 'mano',
        maxCount: 1,
        reason: 'Tótem de la Última Canción: Busca un Tótem en tu Mazo Castillo y ponlo en tu mano.',
        cardName: card.name,
        targetOwner: isCpu ? 'cpu' : 'player',
      };
      if (isCpu) {
        const found = updatedPlayer.castillo.find((c) => c.type === 'Tótem');
        if (found) {
          updatedPlayer.castillo = updatedPlayer.castillo.filter((c) => c.id !== found.id);
          updatedPlayer.mano = [...updatedPlayer.mano, found];
          logClauses.push(`Tótem de la Última Canción (Rival): Busca y añade a su mano "${found.name}".`);
        }
      }
      logClauses.push('Tótem de la Última Canción: Pagas 2 de Oro para buscar un Tótem en tu Mazo Castillo.');
      executedAny = true;
    }

    // Tótem Goblin: En tu fase de vigilia y una vez por turno, pagar 3 de oro para que tu oponente bote 3 cartas
    else if (cardNameUpper.includes('TOTEM GOBLIN') || (cardNameUpper.includes('GOBLIN') && card.type === 'Tótem')) {
      if (!payGold(3)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Tótem Goblin" requiere 3 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      const millCount = Math.min(3, updatedRival.castillo.length);
      const milled = updatedRival.castillo.slice(0, millCount);
      updatedRival.castillo = updatedRival.castillo.slice(millCount);
      updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
      sound = 'damage';
      logClauses.push(`Tótem Goblin: Pagas 3 de Oro. Tu oponente bota ${millCount} cartas de su Mazo Castillo.`);
      executedAny = true;
    }

    // Oldhage: En tu fase de vigilia, pagar 2 de oro y botar 1 carta para buscar un Tótem en tu mazo castillo y ponerlo en tu mano
    else if (cardNameUpper.includes('OLDHAGE')) {
      if (!payGold(2)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Oldhage" requiere 2 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      if (updatedPlayer.castillo.length > 0) {
        const milled = updatedPlayer.castillo.slice(0, 1);
        updatedPlayer.castillo = updatedPlayer.castillo.slice(1);
        updatedPlayer.cementerio = [...updatedPlayer.cementerio, ...milled];
        logClauses.push(`Botaste 1 carta (${milled[0]?.name}).`);
      }
      pendingTutor = {
        sourceZone: 'castillo',
        filterType: 'Tótem',
        destination: 'mano',
        maxCount: 1,
        reason: 'Oldhage: Busca un Tótem en tu Mazo Castillo y ponlo en tu mano.',
        cardName: card.name,
        targetOwner: isCpu ? 'cpu' : 'player',
      };
      logClauses.push('Oldhage: Pagas 2 de Oro para buscar un Tótem en tu Mazo Castillo.');
      executedAny = true;
    }

    // Tótem de Nwyre: Paga 1 de oro y roba 1 carta
    else if (cardNameUpper.includes('NWYRE')) {
      if (!payGold(1)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Tótem de Nwyre" requiere 1 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      if (updatedPlayer.castillo.length > 0) {
        const drawn = updatedPlayer.castillo.slice(0, 1);
        updatedPlayer.castillo = updatedPlayer.castillo.slice(1);
        updatedPlayer.mano = [...updatedPlayer.mano, ...drawn];
        logClauses.push(`Tótem de Nwyre: Pagas 1 de Oro y robas "${drawn[0]?.name}".`);
      } else {
        logClauses.push('Tótem de Nwyre: Pagas 1 de Oro pero tu Mazo Castillo está vacío.');
      }
      sound = 'flick';
      executedAny = true;
    }

    // Tótem del Errante: En tu fase de vigilia, pagar 2 de oro para desterrar la carta superior del mazo castillo oponente
    else if (cardNameUpper.includes('ERRANTE')) {
      if (!payGold(2)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Tótem del Errante" requiere 2 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      if (updatedRival.castillo.length > 0) {
        const banished = updatedRival.castillo[0];
        updatedRival.castillo = updatedRival.castillo.slice(1);
        updatedRival.destierro = [...updatedRival.destierro, banished];
        logClauses.push(`Tótem del Errante: Pagas 2 de Oro y destierras "${banished.name}" del Mazo Castillo rival.`);
      } else {
        logClauses.push('Tótem del Errante: El Mazo Castillo rival está vacío.');
      }
      sound = 'damage';
      executedAny = true;
    }

    // Argusthat: En tu fase de vigilia y una vez por turno, pagar 2 de oro para buscar un Aliado en tu cementerio y barajarlo con tu mazo castillo
    else if (cardNameUpper.includes('ARGUSTHAT')) {
      if (!payGold(2)) {
        return {
          updatedPlayer,
          updatedRival,
          logMessage: `⚠️ Oro insuficiente: "Argusthat" requiere 2 de Oro disponible (tienes ${updatedPlayer.reservaOro}).`,
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      const hasAlly = updatedPlayer.cementerio.some((c) => c.type === 'Aliado');
      if (!hasAlly) {
        refundGold(2);
        return {
          updatedPlayer,
          updatedRival,
          logMessage: '⚠️ No tienes ningún Aliado en tu Cementerio para barajar con Argusthat.',
          abilityName: card.name,
          activatedSuccessfully: false,
        };
      }
      pendingTutor = {
        sourceZone: 'cementerio',
        filterType: 'Aliado',
        destination: 'castillo_shuffle',
        maxCount: 1,
        reason: 'Argusthat: Selecciona un Aliado de tu Cementerio para barajarlo en tu Mazo Castillo.',
        cardName: card.name,
        targetOwner: isCpu ? 'cpu' : 'player',
      };
      logClauses.push('Argusthat: Pagas 2 de Oro. Elige 1 Aliado de tu Cementerio para barajarlo en tu Mazo Castillo.');
      executedAny = true;
    }

    // Codex Artúricus: Destierra Codex Artúricos para reducir todo el daño a 0
    else if (cardNameUpper.includes('CODEX')) {
      updatedPlayer.oroCards = updatedPlayer.oroCards.filter(
        (o) => !o.name.toUpperCase().includes('CODEX')
      );
      updatedPlayer.destierro = [...updatedPlayer.destierro, card];
      updatedPlayer.reservaOro = Math.max(0, updatedPlayer.reservaOro - 1);
      sound = 'shield';
      logClauses.push('¡Destierras Codex Artúricus! Todo el daño de combate se reduce a 0.');
      executedAny = true;
    }

    // Generic dynamic interpreter for in-play activated / multi-action abilities
    else {
      // 1. Check gold payment condition
      const payMatch =
        abilityText.match(/(?:paga|pagar)\s+(\d+|un|una|dos|tres|cuatro)\s+(?:de\s+)?oro/i) ||
        abilityText.match(/paga\s+(\d+|un|una|dos|tres|cuatro)/i);
      let costPaid = 0;
      if (payMatch) {
        let goldCost = 1;
        const raw = payMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') goldCost = 2;
        else if (raw === 'tres' || raw === '3') goldCost = 3;
        else if (raw === 'cuatro' || raw === '4') goldCost = 4;
        if (!payGold(goldCost)) {
          return {
            updatedPlayer,
            updatedRival,
            logMessage: `⚠️ Oro insuficiente: "${card.name}" requiere ${goldCost} de Oro en Reserva (tienes ${updatedPlayer.reservaOro}).`,
            abilityName: card.name,
            activatedSuccessfully: false,
          };
        }
        costPaid = goldCost;
      }

      // 2. Check sacrifice or exile cost
      if (abilityText.includes('destierra este aliado') || abilityText.includes('destierra esta carta')) {
        updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.filter((a) => a.card.id !== card.id);
        updatedPlayer.lineaApoyo = updatedPlayer.lineaApoyo.filter((s) => s.card.id !== card.id);
        updatedPlayer.destierro = [...updatedPlayer.destierro, card];
        logClauses.push(`Destierras "${card.name}" como coste.`);
        executedAny = true;
      } else if (
        abilityText.includes('destruye este aliado') ||
        abilityText.includes('destruye este tótem') ||
        abilityText.includes('destruye esta carta')
      ) {
        updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.filter((a) => a.card.id !== card.id);
        updatedPlayer.lineaApoyo = updatedPlayer.lineaApoyo.filter((s) => s.card.id !== card.id);
        updatedPlayer.cementerio = [...updatedPlayer.cementerio, card];
        logClauses.push(`Destruyes "${card.name}" como coste.`);
        executedAny = true;
      }

      // 3. Effect: Card Draw
      const drawMatch = abilityText.match(/(?:roba|robas)\s+(\d+|un|una|dos|tres)\s+carta[s]?/i);
      if (drawMatch) {
        let count = 1;
        const raw = drawMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') count = 2;
        else if (raw === 'tres' || raw === '3') count = 3;
        const { player: withDraw, drawn } = drawCardsFromCastillo(updatedPlayer, count);
        updatedPlayer = withDraw;
        logClauses.push(
          `${costPaid > 0 ? `Pagas ${costPaid} Oro: ` : ''}Robas ${drawn.length} carta(s) (${drawn.map((c) => c.name).join(', ')}).`
        );
        sound = 'flick';
        executedAny = true;
      }

      // 4. Effect: Generate Gold
      const goldMatch = abilityText.match(/(?:genera|produce|agrega|da)\s+(\d+|un|una|dos|tres)\s+(?:de\s+)?oro[s]?/i);
      if (goldMatch) {
        let gCount = 1;
        const raw = goldMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') gCount = 2;
        else if (raw === 'tres' || raw === '3') gCount = 3;
        const extraTokens = Array.from({ length: gCount }, (_, idx) =>
          createTemporaryGoldToken(`Oro de ${card.name} (${idx + 1})`)
        );
        updatedPlayer.oroCards = [...updatedPlayer.oroCards, ...extraTokens];
        updatedPlayer.reservaOro += gCount;
        logClauses.push(`Generas +${gCount} de Oro en tu Reserva.`);
        sound = 'summon';
        executedAny = true;
      }

      // 5. Effect: Mill Rival Castle
      if (abilityText.includes('bota') || abilityText.includes('bote') || abilityText.includes('botar')) {
        let millCount = 1;
        const millMatch = abilityText.match(/bota[r]?\s+(\d+|una|dos|tres)\s+carta[s]?/i);
        if (millMatch) {
          const raw = millMatch[1].toLowerCase();
          if (raw === 'dos' || raw === '2') millCount = 2;
          else if (raw === 'tres' || raw === '3') millCount = 3;
        }
        const actualMill = Math.min(millCount, updatedRival.castillo.length);
        if (actualMill > 0) {
          const milled = updatedRival.castillo.slice(0, actualMill);
          updatedRival.castillo = updatedRival.castillo.slice(actualMill);
          updatedRival.cementerio = [...updatedRival.cementerio, ...milled];
          logClauses.push(
            `${costPaid > 0 ? `Pagas ${costPaid} Oro: ` : ''}El oponente bota ${actualMill} carta(s) de su Mazo Castillo.`
          );
          sound = 'damage';
          executedAny = true;
        }
      }

      // 6. Effect: Buff Ally Strength (Permanent vs Turn)
      const buffMatch =
        abilityText.match(/gana[n]?\s*\+?\s*(\d+)/i) ||
        abilityText.match(/gana[n]?\s*(\d+)\s*(?:a\s+la\s+)?fuerza/i) ||
        abilityText.match(/obtiene[n]?\s*\+?\s*(\d+)/i) ||
        abilityText.match(/suma[n]?\s*\+?\s*(\d+)/i) ||
        abilityText.match(/aumenta[n]?\s*(?:en\s+)?(\d+)/i);

      if (buffMatch) {
        const bonus = parseInt(buffMatch[1], 10) || 1;
        const isTurnOnly =
          abilityText.includes('hasta el final del turno') ||
          abilityText.includes('hasta la fase final') ||
          abilityText.includes('por este turno') ||
          abilityText.includes('durante este turno') ||
          abilityText.includes('este turno');
        const isPermanent =
          abilityText.includes('permanente') ||
          abilityText.includes('permanentemente') ||
          abilityText.includes('de forma permanente') ||
          abilityText.includes('de manera permanente') ||
          abilityText.includes('hasta el final del juego') ||
          !isTurnOnly;

        const affectsAllAllies =
          abilityText.includes('todos tus aliados') ||
          abilityText.includes('tus aliados ganan') ||
          abilityText.includes('cada uno de tus aliados');

        const applyStrengthBonus = (a: AllyInPlay): AllyInPlay => {
          if (isPermanent) {
            return {
              ...a,
              permanentStrengthBonus: (a.permanentStrengthBonus || 0) + bonus,
              currentStrength: Math.max(0, a.currentStrength + bonus),
            };
          } else {
            return {
              ...a,
              turnStrengthBonus: (a.turnStrengthBonus || 0) + bonus,
              currentStrength: Math.max(0, a.currentStrength + bonus),
            };
          }
        };

        if (affectsAllAllies) {
          updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(applyStrengthBonus);
          updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(applyStrengthBonus);
          logClauses.push(
            `${costPaid > 0 ? `Pagas ${costPaid} Oro: ` : ''}Todos tus Aliados ganan +${bonus} a la Fuerza ${
              isPermanent ? 'de forma permanente 🛡️' : 'hasta el final del turno ⏳'
            }.`
          );
        } else if (options?.allyInstanceId) {
          updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map((a) =>
            a.instanceId === options.allyInstanceId ? applyStrengthBonus(a) : a
          );
          updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map((a) =>
            a.instanceId === options.allyInstanceId ? applyStrengthBonus(a) : a
          );
          const target = [...updatedPlayer.lineaDefensa, ...(updatedPlayer.lineaAtaque || [])].find(
            (a) => a.instanceId === options.allyInstanceId
          );
          logClauses.push(
            `${costPaid > 0 ? `Pagas ${costPaid} Oro: ` : ''}"${target?.card.name || 'Aliado'}" gana +${bonus} a la Fuerza ${
              isPermanent ? 'de forma permanente 🛡️' : 'hasta el final del turno ⏳'
            }.`
          );
        } else {
          updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map((a) =>
            a.card.id === card.id ? applyStrengthBonus(a) : a
          );
          updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map((a) =>
            a.card.id === card.id ? applyStrengthBonus(a) : a
          );
          logClauses.push(
            `${costPaid > 0 ? `Pagas ${costPaid} Oro: ` : ''}"${card.name}" gana +${bonus} a la Fuerza ${
              isPermanent ? 'de forma permanente 🛡️' : 'hasta el final del turno ⏳'
            }.`
          );
        }
        sound = 'summon';
        executedAny = true;
      }
    }
  }

  // Fe Sin Límites
  if (
    cardNameUpper.includes('FE SIN LIMITES') ||
    cardNameUpper.includes('FE SIN LIMITE') ||
    abilityText.includes('todos tus aliados ganan + 2 a la fuerza')
  ) {
    updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map((a) => ({
      ...a,
      turnStrengthBonus: (a.turnStrengthBonus || 0) + 2,
      currentStrength: a.currentStrength + 2,
    }));
    updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map((a) => ({
      ...a,
      turnStrengthBonus: (a.turnStrengthBonus || 0) + 2,
      currentStrength: a.currentStrength + 2,
    }));
    sound = 'victory';
    logClauses.push('¡Todos tus Aliados en mesa ganan +2 a la Fuerza!');
    executedAny = true;
  }

  // Dragón Demonio entry handling
  if (cardNameUpper.includes('DRAGON DEMONIO')) {
    const markDemonio = (a: AllyInPlay): AllyInPlay => {
      if (a.card.id === card.id || a.card.name.toUpperCase().includes('DRAGON DEMONIO')) {
        return {
          ...a,
          canAttack: true,
          banishAtTurnEnd: true,
          cannotBeDestroyedByTalismans: true,
        };
      }
      return a;
    };
    updatedPlayer.lineaDefensa = updatedPlayer.lineaDefensa.map(markDemonio);
    updatedPlayer.lineaAtaque = (updatedPlayer.lineaAtaque || []).map(markDemonio);
    logClauses.push('Debe atacar cuando entra en juego, no puede ser afectado por Talismanes y será desterrado al final de este turno.');
    sound = 'summon';
    executedAny = true;
  }

  // Dragón Dorado: puede ser jugado en cualquier momento para anular una carta
  if (cardNameUpper.includes('DRAGON DORADO')) {
    const oppAllies = [...updatedRival.lineaDefensa, ...(updatedRival.lineaAtaque || [])];
    if (oppAllies.length > 0) {
      const target = [...oppAllies].sort((a, b) => b.currentStrength - a.currentStrength)[0];
      updatedRival.lineaDefensa = updatedRival.lineaDefensa.filter((a) => a.instanceId !== target.instanceId);
      updatedRival.lineaAtaque = (updatedRival.lineaAtaque || []).filter((a) => a.instanceId !== target.instanceId);
      const w = target.attachedWeapons || [];
      updatedRival.cementerio = [...updatedRival.cementerio, target.card, ...w];
      logClauses.push(`🐉 Dragón Dorado: Anula y destruye a "${target.card.name}" (${target.currentStrength} F). Enviada al Cementerio.`);
      sound = 'damage';
      executedAny = true;
    } else if (updatedRival.lineaApoyo.length > 0) {
      const target = updatedRival.lineaApoyo[0];
      updatedRival.lineaApoyo = updatedRival.lineaApoyo.filter((s) => s.instanceId !== target.instanceId);
      updatedRival.cementerio = [...updatedRival.cementerio, target.card];
      logClauses.push(`🐉 Dragón Dorado: Anula y destruye "${target.card.name}" de la Línea de Apoyo rival.`);
      sound = 'damage';
      executedAny = true;
    } else {
      logClauses.push('🐉 Dragón Dorado jugado para anular una carta rival.');
      sound = 'shield';
      executedAny = true;
    }
  }

  // Summary log message
  let finalLog = '';
  if (logClauses.length > 0) {
    finalLog = `✨ "${card.name}": ${logClauses.join(' ')}`;
  } else {
    finalLog = `📜 "${card.name}" entra en juego (${card.ability || 'Sin habilidad'}).`;
  }

  return {
    updatedPlayer,
    updatedRival,
    logMessage: finalLog,
    sound,
    abilityName: card.name,
    activatedSuccessfully:
      executedAny || Boolean(pendingTutor) || Boolean(pendingChoice) || Boolean(pendingDiscard),
    pendingTutor,
    pendingChoice,
    pendingDiscard,
    modularPlan: getModularAbilityPlan(card) || undefined,
  };
}

/**
 * Recomputes dynamic continuous auras for all allies in play.
 */
export function recalculateContinuousAuras(player: PlayerState, rival?: PlayerState): PlayerState {
  const hasArturo =
    player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('REY ARTURO')) ||
    (player.lineaAtaque || []).some((a) => a.card.name.toUpperCase().includes('REY ARTURO'));

  const hasBoores =
    player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('BOORES')) ||
    (player.lineaAtaque || []).some((a) => a.card.name.toUpperCase().includes('BOORES'));

  const hasWyrm =
    player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('EL GRAN WYRM')) ||
    (player.lineaAtaque || []).some((a) => a.card.name.toUpperCase().includes('EL GRAN WYRM'));

  const hasTitania =
    player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('TITANIA')) ||
    (player.lineaAtaque || []).some((a) => a.card.name.toUpperCase().includes('TITANIA'));

  // Dragón Negro: "Todos los Caballeros ganan - 1 a la fuerza, mientras Dragón Negro esté en juego"
  const hasDragonNegro =
    player.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('DRAGON NEGRO')) ||
    (player.lineaAtaque || []).some((a) => a.card.name.toUpperCase().includes('DRAGON NEGRO')) ||
    (rival && (
      rival.lineaDefensa.some((a) => a.card.name.toUpperCase().includes('DRAGON NEGRO')) ||
      (rival.lineaAtaque || []).some((a) => a.card.name.toUpperCase().includes('DRAGON NEGRO'))
    ));

  const hasTotemFuerza = player.lineaApoyo.some(
    (s) =>
      (s.card.ability || '').toLowerCase().includes('ganan + 1') ||
      (s.card.ability || '').toLowerCase().includes('ganan +1')
  );
  const destierroCount = player.destierro.length;
  const goldCount = player.oroCards.length + player.oroPagado.length;
  const faerieCount =
    player.lineaDefensa.filter((a) => a.card.race === 'Faerie').length +
    (player.lineaAtaque || []).filter((a) => a.card.race === 'Faerie').length;
  const allAlliesCount = player.lineaDefensa.length + (player.lineaAtaque || []).length;
  const armadaCount =
    player.lineaDefensa.filter((a) => a.card.name.toUpperCase().includes('ARMADA')).length +
    (player.lineaAtaque || []).filter((a) => a.card.name.toUpperCase().includes('ARMADA')).length;
  const dragonCemeteryCount = player.cementerio.filter((c) => c.race === 'Dragón').length;

  const hasTotemAlasEternas = player.lineaApoyo.some((s) =>
    s.card.name.toUpperCase().includes('ALAS ETERNAS')
  );

  const calculateAllyStats = (ally: AllyInPlay, isAttackLine = false) => {
    let effectiveStrength = ally.baseStrength;

    // Knight buff from Arturo (+1 a la fuerza a tus Caballeros)
    if (hasArturo && ally.card.race === 'Caballero') {
      effectiveStrength += 1;
    }

    // Knight buff from Sir Boores (+2 a la fuerza a tus Caballeros)
    if (hasBoores && ally.card.race === 'Caballero') {
      effectiveStrength += 2;
    }

    // Knight debuff from Dragón Negro (-1 a la fuerza a todos los Caballeros)
    if (hasDragonNegro && ally.card.race === 'Caballero') {
      effectiveStrength -= 1;
    }

    // Dragon buff from El Gran Wyrm (+1 a la fuerza a tus demás Dragones)
    if (
      hasWyrm &&
      (ally.card.race === 'Dragón' || (ally.card.race || '').toLowerCase().includes('drag')) &&
      !ally.card.name.toUpperCase().includes('EL GRAN WYRM')
    ) {
      effectiveStrength += 1;
    }

    // Faerie buff from Titania (+1 a la fuerza a tus demás Faeries)
    if (
      hasTitania &&
      (ally.card.race === 'Faerie' || (ally.card.race || '').toLowerCase().includes('faer')) &&
      !ally.card.name.toUpperCase().includes('TITANIA')
    ) {
      effectiveStrength += 1;
    }

    // Totem global buff
    if (hasTotemFuerza) {
      effectiveStrength += 1;
    }

    // Sir Gabriel destierro scaling
    if (ally.card.name.toUpperCase().includes('GABRIEL')) {
      effectiveStrength += destierroCount;
    }

    // Lord Elfo faerie scaling
    if (ally.card.name.toUpperCase().includes('LORD ELFO')) {
      effectiveStrength += faerieCount;
    }

    // Belial, El Bestial faerie scaling (+1 por cada Faerie en juego)
    if (ally.card.name.toUpperCase().includes('BELIAL')) {
      effectiveStrength += faerieCount;
    }

    // Otyugh ally scaling (+1 por cada Aliado en juego)
    if (ally.card.name.toUpperCase().includes('OTYUGH')) {
      effectiveStrength += allAlliesCount;
    }

    // Armada Élfica scaling (+1 por cada Armada Élfica en juego)
    if (ally.card.name.toUpperCase().includes('ARMADA')) {
      effectiveStrength += armadaCount;
    }

    // Greenknight gold scaling
    if (ally.card.name.toUpperCase().includes('GREENKNIGHT')) {
      effectiveStrength += goldCount;
    }

    // Dragón de Mercurio
    if (ally.card.name.toUpperCase().includes('DRAGON DE MERCURIO')) {
      effectiveStrength += dragonCemeteryCount;
    }

    // Weapon stat and trait assignments
    let isUnblockable = ally.unblockable || false;
    let isIndestructible = ally.indestructibleInCombat || false;
    let cannotBeDestroyedByTalismans = ally.cannotBeDestroyedByTalismans || false;
    let immuneToOpponentAllies = ally.immuneToOpponentAllies || false;
    let extraTurnEndDraw = ally.extraTurnEndDraw || false;
    let mustPayGoldToAttack = ally.mustPayGoldToAttack;
    let onBlockedDiscard = ally.onBlockedDiscard;
    let canAttack = ally.canAttack;

    // Preserve and grant immediate attack if ally inherently has haste or field aura grants it
    if (allyCanAttackOnEntry(ally.card, player)) {
      canAttack = true;
    }
    if (
      hasWyrm &&
      (ally.card.race || '').toLowerCase().includes('drag') &&
      !ally.card.name.toUpperCase().includes('EL GRAN WYRM')
    ) {
      canAttack = true;
    }
    if (
      hasTitania &&
      ((ally.card.race || '').toLowerCase().includes('faer') ||
        (ally.card.race || '').toLowerCase().includes('feér')) &&
      !ally.card.name.toUpperCase().includes('TITANIA')
    ) {
      canAttack = true;
    }

    if (ally.attachedWeapons && ally.attachedWeapons.length > 0) {
      ally.attachedWeapons.forEach((wpn) => {
        const check = checkWeaponBearerEligibility(wpn, ally);
        effectiveStrength += check.bonusStrength;

        if (ally.card.name.toUpperCase().includes('LANCELOT')) {
          effectiveStrength += 2;
        }

        if (ally.card.name.toUpperCase().includes('NIXX')) {
          effectiveStrength += 2;
        }

        if (check.traits.unblockable) isUnblockable = true;
        if (check.traits.indestructibleInCombat) isIndestructible = true;
        if (check.traits.cannotBeDestroyedByTalismans) cannotBeDestroyedByTalismans = true;
        if (check.traits.immuneToOpponentAllies) immuneToOpponentAllies = true;
        if (check.traits.extraTurnEndDraw) extraTurnEndDraw = true;
        if (check.traits.furyCanAttackImmediately) canAttack = true;
        if (check.traits.mustPayGoldToAttack) {
          mustPayGoldToAttack = check.traits.mustPayGoldToAttack;
        }
        if (check.traits.onBlockedDiscard) {
          onBlockedDiscard = check.traits.onBlockedDiscard;
        }
      });
    }

    // Totem de las Alas Eternas: tus Aliados imbloqueables ganan +1 a la fuerza
    if (hasTotemAlasEternas && isUnblockable) {
      effectiveStrength += 1;
    }

    // Strict Attack Prohibition: "sólo puede bloquear", "solo puede defender", "no puede atacar", etc.
    const hasEspadaLarga = (ally.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'));
    const attackOverridden = Boolean(ally.canAttackOverride || hasEspadaLarga);
    if (attackOverridden) {
      canAttack = true;
    } else if (allyCannotAttack(ally.card, player)) {
      canAttack = false;
    }

    const totalBonusStrength = (ally.permanentStrengthBonus || 0) + (ally.turnStrengthBonus || 0);
    const finalStrength = Math.max(0, effectiveStrength + totalBonusStrength);

    const allyAbilityNorm = (ally.card.ability || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const allyNameNorm = (ally.card.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let banishAtTurnEnd = ally.banishAtTurnEnd || false;
    if (
      allyNameNorm.includes('dragon demonio') ||
      allyAbilityNorm.includes('al final de este turno, destierralo') ||
      allyAbilityNorm.includes('destierralo al final de este turno') ||
      allyAbilityNorm.includes('destierralo al final del turno') ||
      (allyAbilityNorm.includes('destierralo') && allyAbilityNorm.includes('final'))
    ) {
      banishAtTurnEnd = true;
    }

    if (
      allyNameNorm.includes('dragon demonio') ||
      allyAbilityNorm.includes('no puede ser afectado por talismanes') ||
      allyAbilityNorm.includes('no puede ser destruido por talismanes')
    ) {
      cannotBeDestroyedByTalismans = true;
    }

    return {
      ...ally,
      currentStrength: finalStrength,
      cannotDefend: ally.cannotDefend || false,
      turnStrengthBonus: ally.turnStrengthBonus || 0,
      permanentStrengthBonus: ally.permanentStrengthBonus || 0,
      hasAttackedThisTurn: ally.hasAttackedThisTurn || false,
      destroyAtTurnEndIfAttacked: ally.destroyAtTurnEndIfAttacked || false,
      banishAtTurnEnd,
      dragonDeLuzTriggeredTurn: ally.dragonDeLuzTriggeredTurn,
      canAttackOverride: attackOverridden || undefined,
      unblockable: isUnblockable,
      indestructibleInCombat: isIndestructible,
      cannotBeDestroyedByTalismans,
      immuneToOpponentAllies,
      extraTurnEndDraw,
      mustPayGoldToAttack,
      onBlockedDiscard,
      canAttack: isAttackLine ? ally.canAttack : canAttack,
    };
  };

  const updatedDefense: AllyInPlay[] = player.lineaDefensa.map((ally) => calculateAllyStats(ally, false));
  const updatedAtaque: AllyInPlay[] = (player.lineaAtaque || []).map((ally) => calculateAllyStats(ally, true));

  // Developer Console Logger for Auras
  const activeAuraNames: string[] = [];
  if (hasArturo) activeAuraNames.push('Rey Arturo (+1 F a Caballeros)');
  if (hasBoores) activeAuraNames.push('Sir Boores (+2 F a Caballeros)');
  if (hasDragonNegro) activeAuraNames.push('Dragón Negro (-1 F a Caballeros)');
  if (hasWyrm) activeAuraNames.push('El Gran Wyrm (+1 F a otros Dragones)');
  if (hasTitania) activeAuraNames.push('Titania (+1 F a otros Faeries)');
  if (hasTotemFuerza) activeAuraNames.push('Tótem de Fuerza (+1 F general)');
  if (hasTotemAlasEternas) activeAuraNames.push('Tótem de las Alas Eternas (+1 F a Imbloqueables)');

  const auditAllies = [...updatedDefense, ...updatedAtaque].map((a) => ({
    name: a.card.name,
    base: a.baseStrength,
    auras: Math.max(0, a.currentStrength - (a.turnStrengthBonus || 0) - (a.permanentStrengthBonus || 0)) - a.baseStrength,
    bonuses: (a.turnStrengthBonus || 0) + (a.permanentStrengthBonus || 0),
    final: a.currentStrength,
  }));

  abilityLogger.logAuraRecalculation(
    player.id === 'player' ? 'Jugador' : 'Rival',
    activeAuraNames,
    allAlliesCount,
    auditAllies
  );

  return {
    ...player,
    lineaDefensa: updatedDefense,
    lineaAtaque: updatedAtaque,
  };
}

/**
 * Triggers abilities at the start of Agrupación (DAR 5.1).
 */
export function executeAgrupacionAbilities(
  activeTurnPlayer: 'player' | 'cpu',
  player: PlayerState,
  cpu: PlayerState
): {
  updatedPlayer: PlayerState;
  updatedCpu: PlayerState;
  logMessages: string[];
} {
  let updatedPlayer = { ...player };
  let updatedCpu = { ...cpu };
  const logMessages: string[] = [];

  if (activeTurnPlayer === 'player') {
    const cpuHasArturo = cpu.lineaDefensa.some((a) =>
      a.card.name.toUpperCase().includes('REY ARTURO')
    );
    if (cpuHasArturo && updatedPlayer.castillo.length > 0) {
      const millCount = Math.min(2, updatedPlayer.castillo.length);
      const milled = updatedPlayer.castillo.slice(0, millCount);
      updatedPlayer.castillo = updatedPlayer.castillo.slice(millCount);
      updatedPlayer.cementerio = [...updatedPlayer.cementerio, ...milled];
      logMessages.push(
        `👑 Habilidad pasiva de Rey Arturo rival: Botas ${millCount} carta(s) de tu Mazo Castillo en Agrupación.`
      );
    }
  } else {
    const playerHasArturo = player.lineaDefensa.some((a) =>
      a.card.name.toUpperCase().includes('REY ARTURO')
    );
    if (playerHasArturo && updatedCpu.castillo.length > 0) {
      const millCount = Math.min(2, updatedCpu.castillo.length);
      const milled = updatedCpu.castillo.slice(0, millCount);
      updatedCpu.castillo = updatedCpu.castillo.slice(millCount);
      updatedCpu.cementerio = [...updatedCpu.cementerio, ...milled];
      logMessages.push(
        `👑 Habilidad pasiva de tu Rey Arturo: El rival bota ${millCount} carta(s) de su Mazo Castillo en su Agrupación.`
      );
    }
  }

  return { updatedPlayer, updatedCpu, logMessages };
}

/**
 * Identifies if an ally must be banished at the end of the turn (Dragón Demonio, Mulvan, El Dragón, etc.)
 */
export function isBanishAtTurnEndAlly(ally: AllyInPlay): boolean {
  if (ally.banishAtTurnEnd) return true;
  const aName = (ally.card.name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const aText = (ally.card.ability || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (aName.includes('demonio')) return true;
  if (aName.includes('mulvan')) return true;
  if (aText.includes('destierralo')) return true;
  if (aText.includes('destierra este aliado')) return true;
  if (aText.includes('final de este turno') && aText.includes('destierr')) return true;
  if (aText.includes('final del turno') && aText.includes('destierr')) return true;
  if (/destierr.*(?:al\s+)?final.*turno/i.test(aText) && !aText.includes('lanza de los dioses')) return true;
  return false;
}

/**
 * Handles end-of-turn abilities (DAR 5.4 & 5.5).
 */
export function executeTurnEndAbilities(
  activeTurnPlayer: 'player' | 'cpu',
  player: PlayerState,
  cpu: PlayerState
): {
  updatedPlayer: PlayerState;
  updatedCpu: PlayerState;
  logMessages: string[];
} {
  let updatedPlayer = { ...player };
  let updatedCpu = { ...cpu };
  const logMessages: string[] = [];

  const target = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  const setTarget = (newState: PlayerState) => {
    if (activeTurnPlayer === 'player') updatedPlayer = newState;
    else updatedCpu = newState;
  };

  // 1. Extra draw from Hacha de Batalla
  const hasExtraDraw = target.lineaDefensa.some((a) => a.extraTurnEndDraw);
  const auditList: DestructionAuditItem[] = [];
  const specialTriggerLogs: string[] = [];

  if (hasExtraDraw && target.castillo.length > 0) {
    const drawn = target.castillo[0];
    const newTarget: PlayerState = {
      ...target,
      castillo: target.castillo.slice(1),
      mano: [...target.mano, drawn],
    };
    setTarget(newTarget);
    const drawMsg = `🪓 Hacha de Batalla: ${activeTurnPlayer === 'player' ? 'Robas' : 'Rival roba'} 1 carta extra al final del turno ("${drawn.name}").`;
    logMessages.push(drawMsg);
    specialTriggerLogs.push(drawMsg);
  }

  // 1b. Extra draw from Bruja Anís: "En respuesta a finalizar tu turno, y si todos tus aliados son Faeries, roba 1 carta extra."
  const targetAllies = [...target.lineaDefensa, ...(target.lineaAtaque || [])];
  const hasBrujaAnis = targetAllies.some(
    (a) => a.card.name.toUpperCase().includes('BRUJA ANIS') || a.card.name.toUpperCase().includes('BRUJA ANÍS')
  );
  if (hasBrujaAnis && targetAllies.length > 0) {
    const allFaeries = targetAllies.every(
      (a) => (a.card.race || '').toLowerCase().trim() === 'faerie'
    );
    if (allFaeries && target.castillo.length > 0) {
      const drawn = target.castillo[0];
      const withAnisTarget: PlayerState = {
        ...target,
        castillo: target.castillo.slice(1),
        mano: [...target.mano, drawn],
      };
      setTarget(withAnisTarget);
      const anisMsg = `🧙‍♀️ Bruja Anís: Al finalizar el turno (todos tus Aliados son Faeries), ${activeTurnPlayer === 'player' ? 'robas' : 'rival roba'} 1 carta extra ("${drawn.name}").`;
      logMessages.push(anisMsg);
      specialTriggerLogs.push(anisMsg);
    }
  }

  // 2. Banishing La Lanza de Los Dioses at turn end
  const currentTarget = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  let lanceBanished = false;
  const banishedLances: CardData[] = [];

  const updatedDef = currentTarget.lineaDefensa.map((ally) => {
    const hasLance = (ally.attachedWeapons || []).some((w) =>
      w.name.toUpperCase().includes('LANZA DE LOS DIOSES')
    );
    if (hasLance) {
      lanceBanished = true;
      const lance = ally.attachedWeapons!.find((w) =>
        w.name.toUpperCase().includes('LANZA DE LOS DIOSES')
      )!;
      banishedLances.push(lance);
      return {
        ...ally,
        attachedWeapons: ally.attachedWeapons!.filter(
          (w) => !w.name.toUpperCase().includes('LANZA DE LOS DIOSES')
        ),
      };
    }
    return ally;
  });

  if (lanceBanished) {
    const withBanishedLance: PlayerState = {
      ...currentTarget,
      lineaDefensa: updatedDef,
      destierro: [...currentTarget.destierro, ...banishedLances],
    };
    setTarget(recalculateContinuousAuras(withBanishedLance));
    const lanceMsg = '⚡ La Lanza de Los Dioses cumple su cometido y se destierra a la Zona de Destierro al finalizar el turno.';
    logMessages.push(lanceMsg);
    specialTriggerLogs.push(lanceMsg);
  }

  // Helper for accent-insensitive text matching
  const normStr = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // 3. Self-destruction of allies that attacked and must be destroyed at turn end (DAR 5.4)
  // Cards: Dragón Montaña, Dregon, Rávido, and cards specifying destruction at turn end after attacking.
  const activeSide = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  const destroyedAttackers: AllyInPlay[] = [];

  const checkAttackerSuicide = (ally: AllyInPlay, zone: 'lineaDefensa' | 'lineaAtaque'): { willDestroy: boolean; matched: boolean; reason: string } => {
    const normName = normStr(ally.card.name);
    const normAbility = normStr(ally.card.ability || '');

    const isSuicideCard =
      normName.includes('dragon montana') ||
      normName.includes('dregon') ||
      normName.includes('ravido') ||
      /si\s+.*ataca.*(?:debe\s+ser|es)\s+destruido.*final\s+del\s+turno/i.test(normAbility) ||
      /declarado\s+atacante.*destruir.*final\s+del\s+turno/i.test(normAbility) ||
      /destruir.*(?:al\s+)?final\s+del\s+turno/i.test(normAbility);

    const hasAttacked =
      Boolean(ally.hasAttackedThisTurn) ||
      activeSide.lineaAtaque.some((atk) => atk.instanceId === ally.instanceId);

    const flagged = Boolean(ally.destroyAtTurnEndIfAttacked);

    if (flagged || (isSuicideCard && hasAttacked)) {
      return {
        willDestroy: true,
        matched: isSuicideCard || flagged,
        reason: `Atacó este turno y su habilidad ("${ally.card.ability || 'Efecto'}") exige ser destruido al final del turno.`,
      };
    }

    if (isSuicideCard && !hasAttacked) {
      return {
        willDestroy: false,
        matched: true,
        reason: 'Posee habilidad de autodestrucción pero NO fue declarado atacante este turno. Se conserva.',
      };
    }

    return { willDestroy: false, matched: false, reason: 'No cumple condición de autodestrucción por ataque.' };
  };

  const remainingDefenseAfterSuicide = activeSide.lineaDefensa.filter((ally) => {
    const evalResult = checkAttackerSuicide(ally, 'lineaDefensa');
    const hasAttacked = Boolean(ally.hasAttackedThisTurn) || activeSide.lineaAtaque.some((atk) => atk.instanceId === ally.instanceId);
    if (evalResult.willDestroy) {
      destroyedAttackers.push(ally);
      auditList.push({
        allyName: ally.card.name,
        instanceId: ally.instanceId,
        zone: 'lineaDefensa',
        hasAttackedThisTurn: hasAttacked,
        destroyAtTurnEndIfAttackedFlag: Boolean(ally.destroyAtTurnEndIfAttacked),
        matchedSuicideCardText: evalResult.matched,
        willBeDestroyed: true,
        decisionReason: evalResult.reason,
        cardAbility: ally.card.ability || 'Sin habilidad',
      });
      return false;
    }
    return true;
  });

  const remainingAttackAfterSuicide = activeSide.lineaAtaque.filter((ally) => {
    const evalResult = checkAttackerSuicide(ally, 'lineaAtaque');
    const hasAttacked = true;
    if (evalResult.willDestroy) {
      destroyedAttackers.push(ally);
      auditList.push({
        allyName: ally.card.name,
        instanceId: ally.instanceId,
        zone: 'lineaAtaque',
        hasAttackedThisTurn: hasAttacked,
        destroyAtTurnEndIfAttackedFlag: Boolean(ally.destroyAtTurnEndIfAttacked),
        matchedSuicideCardText: evalResult.matched,
        willBeDestroyed: true,
        decisionReason: evalResult.reason,
        cardAbility: ally.card.ability || 'Sin habilidad',
      });
      return false;
    }
    return true;
  });

  if (destroyedAttackers.length > 0) {
    const allCemeteryCards: CardData[] = [];
    destroyedAttackers.forEach((ally) => {
      allCemeteryCards.push(ally.card);
      if (ally.attachedWeapons && ally.attachedWeapons.length > 0) {
        allCemeteryCards.push(...ally.attachedWeapons);
      }
      logMessages.push(
        `💥 "${ally.card.name}" atacó este turno y es destruido al final del turno según su habilidad.`
      );
    });

    const updatedWithDestruction: PlayerState = {
      ...activeSide,
      lineaDefensa: remainingDefenseAfterSuicide,
      lineaAtaque: remainingAttackAfterSuicide,
      cementerio: [...activeSide.cementerio, ...allCemeteryCards],
    };
    setTarget(updatedWithDestruction);
  }

  // 4. Guardia Real: If did not attack this turn, it must be destroyed
  const currentActiveSide = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  const guardiaToDestroy: AllyInPlay[] = [];
  const defWithoutGuardia = currentActiveSide.lineaDefensa.filter((ally) => {
    const normName = normStr(ally.card.name);
    if (normName.includes('guardia real')) {
      const hasAttacked = Boolean(ally.hasAttackedThisTurn) || currentActiveSide.lineaAtaque.some((atk) => atk.instanceId === ally.instanceId);
      if (!hasAttacked) {
        guardiaToDestroy.push(ally);
        auditList.push({
          allyName: ally.card.name,
          instanceId: ally.instanceId,
          zone: 'lineaDefensa',
          hasAttackedThisTurn: false,
          destroyAtTurnEndIfAttackedFlag: false,
          matchedSuicideCardText: true,
          willBeDestroyed: true,
          decisionReason: 'Guardia Real debe atacar cada turno. Al no haber atacado este turno, es destruido.',
          cardAbility: ally.card.ability || 'Sin habilidad',
        });
        return false;
      }
    }
    return true;
  });

  if (guardiaToDestroy.length > 0) {
    const allCem: CardData[] = [];
    guardiaToDestroy.forEach((g) => {
      allCem.push(g.card);
      if (g.attachedWeapons) allCem.push(...g.attachedWeapons);
      logMessages.push(`💥 "Guardia Real": Al no haber atacado este turno, debe ser destruido al final del turno.`);
    });
    setTarget({
      ...currentActiveSide,
      lineaDefensa: defWithoutGuardia,
      cementerio: [...currentActiveSide.cementerio, ...allCem],
    });
  }

  // 5. Bárbaros Enfurecidos: "Si no tienes otro Aliado Dragón en juego, destruye a los Bárbaros Enfurecidos al final de este turno."
  const sideForBarbaros = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  const barbarosToDestroy: AllyInPlay[] = [];
  const allCurrentAllies = [...sideForBarbaros.lineaDefensa, ...sideForBarbaros.lineaAtaque];

  const defWithoutBarbaros = sideForBarbaros.lineaDefensa.filter((ally) => {
    const normName = normStr(ally.card.name);
    if (normName.includes('barbaros enfurecidos')) {
      const otherDragons = allCurrentAllies.filter(
        (a) => a.instanceId !== ally.instanceId && normStr(a.card.race || '').includes('dragon')
      );
      if (otherDragons.length === 0) {
        barbarosToDestroy.push(ally);
        auditList.push({
          allyName: ally.card.name,
          instanceId: ally.instanceId,
          zone: 'lineaDefensa',
          hasAttackedThisTurn: Boolean(ally.hasAttackedThisTurn),
          destroyAtTurnEndIfAttackedFlag: false,
          matchedSuicideCardText: true,
          willBeDestroyed: true,
          decisionReason: 'Bárbaros Enfurecidos: No controlas ningún otro Aliado Dragón en juego al final del turno.',
          cardAbility: ally.card.ability || 'Sin habilidad',
        });
        return false;
      } else {
        auditList.push({
          allyName: ally.card.name,
          instanceId: ally.instanceId,
          zone: 'lineaDefensa',
          hasAttackedThisTurn: Boolean(ally.hasAttackedThisTurn),
          destroyAtTurnEndIfAttackedFlag: false,
          matchedSuicideCardText: true,
          willBeDestroyed: false,
          decisionReason: `Bárbaros Enfurecidos: Hay ${otherDragons.length} otro(s) Dragón(es) en juego (${otherDragons.map((d) => d.card.name).join(', ')}). Sobrevive.`,
          cardAbility: ally.card.ability || 'Sin habilidad',
        });
      }
    }
    return true;
  });

  const atkWithoutBarbaros = sideForBarbaros.lineaAtaque.filter((ally) => {
    const normName = normStr(ally.card.name);
    if (normName.includes('barbaros enfurecidos')) {
      const otherDragons = allCurrentAllies.filter(
        (a) => a.instanceId !== ally.instanceId && normStr(a.card.race || '').includes('dragon')
      );
      if (otherDragons.length === 0) {
        barbarosToDestroy.push(ally);
        auditList.push({
          allyName: ally.card.name,
          instanceId: ally.instanceId,
          zone: 'lineaAtaque',
          hasAttackedThisTurn: true,
          destroyAtTurnEndIfAttackedFlag: false,
          matchedSuicideCardText: true,
          willBeDestroyed: true,
          decisionReason: 'Bárbaros Enfurecidos: No controlas ningún otro Aliado Dragón en juego al final del turno.',
          cardAbility: ally.card.ability || 'Sin habilidad',
        });
        return false;
      } else {
        auditList.push({
          allyName: ally.card.name,
          instanceId: ally.instanceId,
          zone: 'lineaAtaque',
          hasAttackedThisTurn: true,
          destroyAtTurnEndIfAttackedFlag: false,
          matchedSuicideCardText: true,
          willBeDestroyed: false,
          decisionReason: `Bárbaros Enfurecidos: Hay ${otherDragons.length} otro(s) Dragón(es) en juego (${otherDragons.map((d) => d.card.name).join(', ')}). Sobrevive.`,
          cardAbility: ally.card.ability || 'Sin habilidad',
        });
      }
    }
    return true;
  });

  if (barbarosToDestroy.length > 0) {
    const allCem: CardData[] = [];
    barbarosToDestroy.forEach((b) => {
      allCem.push(b.card);
      if (b.attachedWeapons) allCem.push(...b.attachedWeapons);
      logMessages.push('💥 "Bárbaros Enfurecidos": Al no haber otro Dragón en juego, son destruidos al final del turno.');
    });
    setTarget({
      ...sideForBarbaros,
      lineaDefensa: defWithoutBarbaros,
      lineaAtaque: atkWithoutBarbaros,
      cementerio: [...sideForBarbaros.cementerio, ...allCem],
    });
  }

  // 6. Ally Banish at turn end (Dragón Demonio, Mulvan, El Dragón, etc.)
  // Process Player side
  const playerBanished: AllyInPlay[] = [];
  const playerBanishedWeapons: CardData[] = [];
  const pDefWithout = updatedPlayer.lineaDefensa.filter((ally) => {
    if (isBanishAtTurnEndAlly(ally)) {
      playerBanished.push(ally);
      if (ally.attachedWeapons) playerBanishedWeapons.push(...ally.attachedWeapons);
      return false;
    }
    return true;
  });
  const pAtkWithout = updatedPlayer.lineaAtaque.filter((ally) => {
    if (isBanishAtTurnEndAlly(ally)) {
      playerBanished.push(ally);
      if (ally.attachedWeapons) playerBanishedWeapons.push(...ally.attachedWeapons);
      return false;
    }
    return true;
  });

  if (playerBanished.length > 0) {
    playerBanished.forEach((m) => {
      const inAtk = updatedPlayer.lineaAtaque.some((a) => a.instanceId === m.instanceId);
      const isDemonio = (m.card.name || '').toUpperCase().includes('DEMONIO');
      const isMulvan = (m.card.name || '').toUpperCase().includes('MULVAN');
      const msg = isDemonio
        ? `🌀 "${m.card.name}" es desterrado a la Zona de Destierro al final del turno ("Al final de este turno, destiérralo").`
        : isMulvan
        ? `🌀 "${m.card.name}" es desterrado a la Zona de Destierro al final del turno tras duplicar su fuerza.`
        : `🌀 "${m.card.name}" es desterrado a la Zona de Destierro al final del turno según su habilidad.`;

      logMessages.push(msg);
      specialTriggerLogs.push(msg);

      auditList.push({
        allyName: m.card.name,
        instanceId: m.instanceId,
        zone: inAtk ? 'lineaAtaque' : 'lineaDefensa',
        hasAttackedThisTurn: Boolean(m.hasAttackedThisTurn) || inAtk,
        destroyAtTurnEndIfAttackedFlag: false,
        matchedSuicideCardText: true,
        willBeDestroyed: true,
        decisionReason: msg,
        cardAbility: m.card.ability || 'Destierro al final del turno',
      });
    });

    updatedPlayer = {
      ...updatedPlayer,
      lineaDefensa: pDefWithout,
      lineaAtaque: pAtkWithout,
      destierro: [...updatedPlayer.destierro, ...playerBanished.map((m) => m.card)],
      cementerio: playerBanishedWeapons.length > 0 ? [...updatedPlayer.cementerio, ...playerBanishedWeapons] : updatedPlayer.cementerio,
    };
  }

  // Process CPU side
  const cpuBanished: AllyInPlay[] = [];
  const cpuBanishedWeapons: CardData[] = [];
  const cDefWithout = updatedCpu.lineaDefensa.filter((ally) => {
    if (isBanishAtTurnEndAlly(ally)) {
      cpuBanished.push(ally);
      if (ally.attachedWeapons) cpuBanishedWeapons.push(...ally.attachedWeapons);
      return false;
    }
    return true;
  });
  const cAtkWithout = updatedCpu.lineaAtaque.filter((ally) => {
    if (isBanishAtTurnEndAlly(ally)) {
      cpuBanished.push(ally);
      if (ally.attachedWeapons) cpuBanishedWeapons.push(...ally.attachedWeapons);
      return false;
    }
    return true;
  });

  if (cpuBanished.length > 0) {
    cpuBanished.forEach((m) => {
      const inAtk = updatedCpu.lineaAtaque.some((a) => a.instanceId === m.instanceId);
      const isDemonio = (m.card.name || '').toUpperCase().includes('DEMONIO');
      const isMulvan = (m.card.name || '').toUpperCase().includes('MULVAN');
      const msg = isDemonio
        ? `🌀 "${m.card.name}" (Rival) es desterrado a la Zona de Destierro al final del turno ("Al final de este turno, destiérralo").`
        : isMulvan
        ? `🌀 "${m.card.name}" (Rival) es desterrado a la Zona de Destierro al final del turno tras duplicar su fuerza.`
        : `🌀 "${m.card.name}" (Rival) es desterrado a la Zona de Destierro al final del turno según su habilidad.`;

      logMessages.push(msg);
      specialTriggerLogs.push(msg);

      auditList.push({
        allyName: m.card.name,
        instanceId: m.instanceId,
        zone: inAtk ? 'lineaAtaque' : 'lineaDefensa',
        hasAttackedThisTurn: Boolean(m.hasAttackedThisTurn) || inAtk,
        destroyAtTurnEndIfAttackedFlag: false,
        matchedSuicideCardText: true,
        willBeDestroyed: true,
        decisionReason: msg,
        cardAbility: m.card.ability || 'Destierro al final del turno',
      });
    });

    updatedCpu = {
      ...updatedCpu,
      lineaDefensa: cDefWithout,
      lineaAtaque: cAtkWithout,
      destierro: [...updatedCpu.destierro, ...cpuBanished.map((m) => m.card)],
      cementerio: cpuBanishedWeapons.length > 0 ? [...updatedCpu.cementerio, ...cpuBanishedWeapons] : updatedCpu.cementerio,
    };
  }

  // 7. Record audit entries for all surviving allies that weren't destroyed or banished
  const currentSideFinal = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  [...currentSideFinal.lineaDefensa, ...currentSideFinal.lineaAtaque].forEach((ally) => {
    const alreadyAudited = auditList.some((item) => item.instanceId === ally.instanceId);
    if (!alreadyAudited) {
      const inAtk = currentSideFinal.lineaAtaque.some((a) => a.instanceId === ally.instanceId);
      auditList.push({
        allyName: ally.card.name,
        instanceId: ally.instanceId,
        zone: inAtk ? 'lineaAtaque' : 'lineaDefensa',
        hasAttackedThisTurn: Boolean(ally.hasAttackedThisTurn) || inAtk,
        destroyAtTurnEndIfAttackedFlag: Boolean(ally.destroyAtTurnEndIfAttacked),
        matchedSuicideCardText: false,
        willBeDestroyed: false,
        decisionReason: 'Aliado regular sin cláusula de autodestrucción. Permanece en mesa.',
        cardAbility: ally.card.ability || 'Sin habilidad',
      });
    }
  });

  // 8. Dragón de Luz: "Si Dragón de Luz no es declarado atacante, puedes tomar las 3 cartas superiores de tu cementerio y barajarlas con tu mazo castillo."
  const currentActiveSide3 = activeTurnPlayer === 'player' ? updatedPlayer : updatedCpu;
  const dragonDeLuz = currentActiveSide3.lineaDefensa.find(
    (ally) =>
      normStr(ally.card.name).includes('dragon de luz') &&
      !ally.hasAttackedThisTurn &&
      !ally.dragonDeLuzTriggeredTurn
  );

  if (dragonDeLuz && currentActiveSide3.cementerio.length > 0) {
    const recycleCount = Math.min(3, currentActiveSide3.cementerio.length);
    const recycledCards = currentActiveSide3.cementerio.slice(-recycleCount);
    const remainingCemetery = currentActiveSide3.cementerio.slice(
      0,
      currentActiveSide3.cementerio.length - recycleCount
    );
    const updatedCastillo = [...currentActiveSide3.castillo, ...recycledCards].sort(
      () => Math.random() - 0.5
    );

    const updatedDef = currentActiveSide3.lineaDefensa.map((a) =>
      a.instanceId === dragonDeLuz.instanceId
        ? { ...a, dragonDeLuzTriggeredTurn: 1 }
        : a
    );

    setTarget({
      ...currentActiveSide3,
      lineaDefensa: updatedDef,
      cementerio: remainingCemetery,
      castillo: updatedCastillo,
    });

    const luzMsg = `✨ "Dragón de Luz": Al no ser declarado atacante, ${
      activeTurnPlayer === 'player' ? 'tomas' : 'el Rival toma'
    } las ${recycledCards.length} cartas superiores del Cementerio (${recycledCards
      .map((c) => `"${c.name}"`)
      .join(', ')}) y las barajas en el Mazo Castillo.`;
    logMessages.push(luzMsg);
    specialTriggerLogs.push(luzMsg);
  }

  // 9. Remove temporary gold tokens from reserve at end of turn
  const cleanPlayerGolds = updatedPlayer.oroCards.filter((c) => !c.id.startsWith('oro-temp-'));
  const cleanPlayerPaidGolds = updatedPlayer.oroPagado.filter((c) => !c.id.startsWith('oro-temp-'));
  updatedPlayer = {
    ...updatedPlayer,
    oroCards: cleanPlayerGolds,
    oroPagado: cleanPlayerPaidGolds,
    reservaOro: cleanPlayerGolds.length,
  };

  const cleanCpuGolds = updatedCpu.oroCards.filter((c) => !c.id.startsWith('oro-temp-'));
  const cleanCpuPaidGolds = updatedCpu.oroPagado.filter((c) => !c.id.startsWith('oro-temp-'));
  updatedCpu = {
    ...updatedCpu,
    oroCards: cleanCpuGolds,
    oroPagado: cleanCpuPaidGolds,
    reservaOro: cleanCpuGolds.length,
  };

  // 10. Output complete audit to Developer Console
  const totalDestroyed =
    destroyedAttackers.length +
    guardiaToDestroy.length +
    barbarosToDestroy.length +
    playerBanished.length +
    cpuBanished.length;
  abilityLogger.logTurnEndAudit(activeTurnPlayer, totalDestroyed, auditList, specialTriggerLogs);

  return { updatedPlayer, updatedCpu, logMessages };
}

/**
 * Executes abilities triggered conditionally by combat damage dealt to the Castle Deck (DAR 5.3.4).
 * Enforces the strict rule: the attacker MUST deal damage (> 0) to the Castle Deck
 * in order to trigger the subsequent conditional action(s).
 * Examples:
 * - "Si hace daño al mazo castillo rival botar una carta" -> Precondition: damage > 0 -> Result: Defender mills 1 card.
 * - "Si hace daño al mazo castillo oponente, descártale 1 al azar" (Sir Galahad) -> Result: Defender discards 1 card.
 * - "Si hace daño al mazo castillo oponente, puedes ver su mano" (Dragón Espía) -> Result: Reveals defender's hand.
 */
export function executeCombatDamageAbilities(
  attacker: AllyInPlay,
  damageDealtToCastle: number,
  attackerOwner: PlayerState,
  defender: PlayerState,
  isAttackerCpu: boolean = false
): {
  updatedAttackerOwner: PlayerState;
  updatedDefender: PlayerState;
  logMessages: string[];
  revealedHandCards?: CardData[];
} {
  let updatedAttackerOwner = { ...attackerOwner };
  let updatedDefender = { ...defender };
  const logMessages: string[] = [];
  let revealedHandCards: CardData[] | undefined = undefined;

  // Strict Precondition: Must deal unblocked/unprevented damage (> 0) to Castle Deck first!
  if (damageDealtToCastle <= 0) {
    return { updatedAttackerOwner, updatedDefender, logMessages };
  }

  // Collect ability texts from attacker ally card and attached weapons
  const abilitiesToCheck: { sourceName: string; text: string }[] = [];
  if (attacker.card.ability) {
    abilitiesToCheck.push({ sourceName: attacker.card.name, text: attacker.card.ability });
  }
  if (attacker.attachedWeapons) {
    attacker.attachedWeapons.forEach((w) => {
      if (w.ability) {
        abilitiesToCheck.push({ sourceName: `${w.name} (equipada a ${attacker.card.name})`, text: w.ability });
      }
    });
  }

  for (const item of abilitiesToCheck) {
    const textLower = item.text.toLowerCase();
    const isDamageTrigger =
      textLower.includes('daño al mazo castillo') ||
      textLower.includes('dano al mazo castillo') ||
      textLower.includes('daño al castillo') ||
      textLower.includes('dano al castillo') ||
      (textLower.includes('si hace daño') && textLower.includes('castillo')) ||
      (textLower.includes('cuando inflija daño') && textLower.includes('castillo')) ||
      (textLower.includes('al causar daño') && textLower.includes('castillo'));

    if (!isDamageTrigger) continue;

    // 1. MILL CASTLE DECK: "botar una carta", "botar 1 carta", "bota 2 cartas", "el rival bota X cartas"
    if (textLower.includes('bota') || textLower.includes('bote') || textLower.includes('botar')) {
      let millCount = 1;
      const countMatch =
        textLower.match(/bota[r]?\s+(\d+|una|dos|tres|cuatro)\s+carta/i) ||
        textLower.match(/bota[r]?\s+(\d+|una|dos|tres|cuatro)/i);
      if (countMatch) {
        const raw = countMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') millCount = 2;
        else if (raw === 'tres' || raw === '3') millCount = 3;
        else if (raw === 'cuatro' || raw === '4') millCount = 4;
      }

      const actualMill = Math.min(millCount, updatedDefender.castillo.length);
      if (actualMill > 0) {
        const milled = updatedDefender.castillo.slice(0, actualMill);
        updatedDefender.castillo = updatedDefender.castillo.slice(actualMill);
        updatedDefender.cementerio = [...updatedDefender.cementerio, ...milled];
        logMessages.push(
          `🎯 "${item.sourceName}": Al infligir daño al Mazo Castillo, se ejecuta la acción condicional: ${
            isAttackerCpu ? 'Tú botas' : 'El rival bota'
          } ${actualMill} carta(s) de su Mazo Castillo (${milled.map((c) => c.name).join(', ')}).`
        );
      }
    }

    // 2. DISCARD FROM HAND: "descártale 1 al azar", "descarta 1 carta", "el oponente descarta"
    if (
      textLower.includes('descártale') ||
      textLower.includes('descartale') ||
      (textLower.includes('descarta') && !textLower.includes('descarta de tu'))
    ) {
      let discardCount = 1;
      const countMatch = textLower.match(/descarta[r]?(?:le)?\s+(\d+|una|dos|tres)/i);
      if (countMatch) {
        const raw = countMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') discardCount = 2;
        else if (raw === 'tres' || raw === '3') discardCount = 3;
      }

      const actualDiscard = Math.min(discardCount, updatedDefender.mano.length);
      if (actualDiscard > 0) {
        const discarded = updatedDefender.mano.slice(0, actualDiscard);
        updatedDefender.mano = updatedDefender.mano.slice(actualDiscard);
        updatedDefender.cementerio = [...updatedDefender.cementerio, ...discarded];
        logMessages.push(
          `🎯 "${item.sourceName}": Al infligir daño al Mazo Castillo, se ejecuta la acción condicional: ${
            isAttackerCpu ? 'Tú descartas' : 'El rival descarta'
          } ${actualDiscard} carta(s) (${discarded.map((c) => c.name).join(', ')}).`
        );
      }
    }

    // 3. REVEAL OPPONENT HAND: "puedes ver su mano", "ver la mano" (Dragón Espía)
    if (textLower.includes('ver su mano') || textLower.includes('ver la mano') || textLower.includes('mira la mano')) {
      revealedHandCards = [...updatedDefender.mano];
      const handNames = updatedDefender.mano.map((c) => c.name).join(', ') || 'mano vacía';
      logMessages.push(
        `👁️ "${item.sourceName}": Al infligir daño al Mazo Castillo, revela la mano rival: [${handNames}].`
      );
    }

    // 4. DRAW CARDS: "roba 1 carta", "robas 1 carta"
    if (textLower.includes('roba') || textLower.includes('robar')) {
      let drawCount = 1;
      const countMatch = textLower.match(/roba[rs]?\s+(\d+|una|dos|tres)\s+carta/i);
      if (countMatch) {
        const raw = countMatch[1].toLowerCase();
        if (raw === 'dos' || raw === '2') drawCount = 2;
        else if (raw === 'tres' || raw === '3') drawCount = 3;
      }
      const actualDraw = Math.min(drawCount, updatedAttackerOwner.castillo.length);
      if (actualDraw > 0) {
        const drawn = updatedAttackerOwner.castillo.slice(0, actualDraw);
        updatedAttackerOwner.castillo = updatedAttackerOwner.castillo.slice(actualDraw);
        updatedAttackerOwner.mano = [...updatedAttackerOwner.mano, ...drawn];
        logMessages.push(
          `🎴 "${item.sourceName}": Al infligir daño al Mazo Castillo, ${
            isAttackerCpu ? 'Rival roba' : 'Robas'
          } ${actualDraw} carta(s) (${drawn.map((c) => c.name).join(', ')}).`
        );
      }
    }
  }

  return {
    updatedAttackerOwner: recalculateContinuousAuras(updatedAttackerOwner),
    updatedDefender: recalculateContinuousAuras(updatedDefender),
    logMessages,
    revealedHandCards,
  };
}

/**
 * Triggers abilities when allies leave play (e.g. Ellyllon milling 2 cards).
 */
export function checkLeavingPlayAllies(
  leavingAllies: (AllyInPlay | CardData)[],
  alliesOwner: 'player' | 'cpu',
  player: PlayerState,
  cpu: PlayerState
): { updatedPlayer: PlayerState; updatedCpu: PlayerState; logMessages: string[] } {
  let updatedPlayer = { ...player };
  let updatedCpu = { ...cpu };
  const logMessages: string[] = [];

  leavingAllies.forEach((item) => {
    const card = 'card' in item ? item.card : item;
    const nameUpper = card.name.toUpperCase();
    if (nameUpper.includes('ELLYLLON')) {
      const targetOpponent = alliesOwner === 'player' ? updatedCpu : updatedPlayer;
      const mill = Math.min(2, targetOpponent.castillo.length);
      if (mill > 0) {
        const milled = targetOpponent.castillo.slice(0, mill);
        const oppAfterMill: PlayerState = {
          ...targetOpponent,
          castillo: targetOpponent.castillo.slice(mill),
          cementerio: [...targetOpponent.cementerio, ...milled],
        };
        if (alliesOwner === 'player') {
          updatedCpu = oppAfterMill;
        } else {
          updatedPlayer = oppAfterMill;
        }
        logMessages.push(
          `🧚 Ellyllon sale del juego: ${
            alliesOwner === 'player' ? 'El rival' : 'Tu oponente'
          } bota ${mill} carta(s) de su Mazo Castillo.`
        );
      }
    }
  });

  return { updatedPlayer, updatedCpu, logMessages };
}


