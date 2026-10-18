export type CardType = 'Aliado' | 'Talismán' | 'Arma' | 'Tótem' | 'Oro';

export type CardRace =
  | 'Caballero'
  | 'Dragón'
  | 'Faerie'
  | 'Olímpico'
  | 'Héroe'
  | 'Sombra'
  | 'Eterno'
  | 'Bestia'
  | 'Sacerdote'
  | 'Sin Raza';

export type CardRarity = 'Vasallo' | 'Cortesano' | 'Real' | 'Ultra Real' | 'Promocional';

export type FoilEffect = 'none' | 'rainbow' | 'gold';

export interface CardData {
  id: string;
  number: number;
  totalInSet: number;
  edition: string;
  name: string;
  type: CardType;
  race: CardRace;
  strength: number; // Red shield (0 for non-allies or 0-strength)
  cost: number;     // Gold coin
  flavorText: string;
  ability: string;
  illustrator: string;
  rarity: CardRarity;
  foil: FoilEffect;
  imageUrl?: string;
  imagePreset?: string;
  isCustom?: boolean;
  uniqueCard?: boolean;
  goldRestriction?: string;
}

export type GameZone =
  | 'MAZO_CASTILLO'
  | 'MANO'
  | 'LINEA_DEFENSA'
  | 'LINEA_ATAQUE'
  | 'LINEA_APOYO'
  | 'RESERVA_ORO'
  | 'ZONA_ORO_PAGADO'
  | 'CEMENTERIO'
  | 'ZONA_DESTIERRO'
  | 'EFECTOS_PERMANENTES';

export type TurnPhase =
  | 'AGRUPACION'
  | 'VIGILIA'
  | 'DECLARACION_ATAQUE'
  | 'DECLARACION_BLOQUEO'
  | 'GUERRA_TALISMANES'
  | 'ASIGNACION_DANO'
  | 'FASE_FINAL'
  | 'FINAL_TURNO';

export interface AllyInPlay {
  instanceId: string;
  card: CardData;
  baseStrength: number;
  currentStrength: number;
  exhausted: boolean;
  canAttack: boolean; // DAR 4.2.1: In play since start of latest Agrupacion
  blockedById?: string;
  attachedWeapons?: CardData[];
  unblockable?: boolean;
  indestructibleInCombat?: boolean;
  cannotBeDestroyedByTalismans?: boolean;
  immuneToOpponentAllies?: boolean;
  extraTurnEndDraw?: boolean;
  mustPayGoldToAttack?: number;
  onBlockedDiscard?: number;
  banishAtTurnEndWeaponId?: string;
  cannotDefend?: boolean;
  turnStrengthBonus?: number;
  permanentStrengthBonus?: number;
  hasAttackedThisTurn?: boolean;
  destroyAtTurnEndIfAttacked?: boolean;
  banishAtTurnEnd?: boolean;
  dragonDeLuzTriggeredTurn?: number;
  canAttackOverride?: boolean;
}

export interface SupportInPlay {
  instanceId: string;
  card: CardData; // Tótem or Arma
  attachedToAllyId?: string;
}

export interface PlayerState {
  id: 'player' | 'cpu';
  name: string;
  castillo: CardData[];
  mano: CardData[];
  lineaDefensa: AllyInPlay[];
  lineaAtaque: AllyInPlay[];
  lineaApoyo: SupportInPlay[];
  reservaOro: number; // Available gold count
  oroCards: CardData[]; // Physical gold cards in Reserva de Oro
  oroPagado: CardData[]; // Physical gold cards in Zona de Oro Pagado
  oroJugadoEsteTurno: boolean; // DAR 4.2.5: Only 1 gold per turn in Vigilia
  cementerio: CardData[];
  destierro: CardData[];
  efectosPermanentes: string[];
}
