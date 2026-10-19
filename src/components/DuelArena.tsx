import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CardData, TurnPhase, PlayerState, AllyInPlay, SupportInPlay } from '../types/card';
import { MythosCard } from './MythosCard';
import { DarRulesModal } from './DarRulesModal';
import { CardModal } from './CardModal';
import { CardPickerModal } from './CardPickerModal';
import { DecisionModal } from './DecisionModal';
import { FieldInspectorModal } from './FieldInspectorModal';
import { PlaymatBoard } from './PlaymatBoard';
import { soundFx } from '../utils/soundFx';
import { CANONICAL_CARDS } from '../data/canonicalCards';
import { SavedDeck, loadAllSavedDecks, setActiveCpuDeck } from '../utils/deckStorage';
import {
  executeCardOnPlayAbility,
  recalculateContinuousAuras,
  executeAgrupacionAbilities,
  executeTurnEndAbilities,
  executeCombatDamageAbilities,
  checkWeaponBearerEligibility,
  isWeaponSupportLineOnly,
  hasActivatedInPlayAbility,
  getMaxActivationsPerTurn,
  isEntryAbilityOnly,
  allyCanAttackOnEntry,
  allyCannotAttack,
  getEligibleGoldCards,
  payGoldForCard,
  isBanishAtTurnEndAlly,
  checkLeavingPlayAllies,
  TutorRequest,
  ChoiceRequest,
  DiscardRequest,
  AbilityExecutionResult,
} from '../services/abilityEngine';
import { abilityLogger } from '../services/abilityLogger';

interface DuelArenaProps {
  playerDeck: CardData[];
  playerDeckName?: string;
  cpuDeck?: CardData[];
  cpuDeckName?: string;
  onExitDuel: () => void;
  onGoToDeckBuilder: () => void;
  onChangeCpuDeck?: (deck: SavedDeck) => void;
}

export const DuelArena: React.FC<DuelArenaProps> = ({
  playerDeck,
  playerDeckName = 'Caballeros de Camelot',
  cpuDeck,
  cpuDeckName = 'Dragones Sagrados',
  onExitDuel,
  onGoToDeckBuilder,
  onChangeCpuDeck,
}) => {
  const [turn, setTurn] = useState<number>(1);
  const [phase, setPhase] = useState<TurnPhase>('AGRUPACION');
  const [activePlayer, setActivePlayer] = useState<'player' | 'cpu'>('player');
  const [viewMode, setViewMode] = useState<'dual' | 'player' | 'cpu'>('dual');
  const [currentCpuDeckName, setCurrentCpuDeckName] = useState<string>(
    cpuDeckName || 'Dragones Sagrados'
  );
  const [currentCpuDeckCards, setCurrentCpuDeckCards] = useState<CardData[]>(
    cpuDeck && cpuDeck.length > 0 ? cpuDeck : []
  );
  const [showCpuDeckModal, setShowCpuDeckModal] = useState<boolean>(false);
  const [availableSavedDecks, setAvailableSavedDecks] = useState<SavedDeck[]>([]);
  const [selectedAttackerIds, setSelectedAttackerIds] = useState<string[]>([]);
  const [blockAssignments, setBlockAssignments] = useState<Record<string, string>>({}); // attackerInstanceId -> blockerInstanceId
  const [talismansPriority, setTalismansPriority] = useState<'defender' | 'attacker'>('defender');
  const [talismansConsecutivePasses, setTalismansConsecutivePasses] = useState<number>(0);
  const [winner, setWinner] = useState<'player' | 'cpu' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
  const [assigningWeaponCard, setAssigningWeaponCard] = useState<CardData | null>(null);
  const [abilitiesUsedThisTurn, setAbilitiesUsedThisTurn] = useState<Record<string, number>>({});

  const [cardPickerState, setCardPickerState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    filterLabel?: string;
    cards: CardData[];
    maxSelect: number;
    tutorInfo?: TutorRequest;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    cards: [],
    maxSelect: 1,
  });

  const [discardPickerState, setDiscardPickerState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    filterLabel?: string;
    cards: CardData[];
    maxSelect: number;
    discardInfo?: DiscardRequest;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    cards: [],
    maxSelect: 1,
  });

  const [decisionState, setDecisionState] = useState<{
    isOpen: boolean;
    choiceInfo?: ChoiceRequest;
  }>({
    isOpen: false,
  });

  const [showFieldInspector, setShowFieldInspector] = useState<boolean>(false);

  const [combatDamagePrevented, setCombatDamagePrevented] = useState<boolean>(false);
  const [playerBlockPromptState, setPlayerBlockPromptState] = useState<{
    isOpen: boolean;
    attacker: AllyInPlay;
    eligibleBlockers: AllyInPlay[];
    onSelectBlocker: (blocker: AllyInPlay) => void;
    onLetDamagePass: () => void;
  } | null>(null);
  const [codexPromptState, setCodexPromptState] = useState<{
    isOpen: boolean;
    pendingAttackerStrength: number;
    pendingAttackerName: string;
    onConfirmBanish: () => void;
    onDecline: () => void;
  } | null>(null);

  const [rivalResponsePrompt, setRivalResponsePrompt] = useState<{
    rivalCard: CardData;
    onAnnul: () => void;
    onPass: () => void;
  } | null>(null);

  const [inspectedCardData, setInspectedCardData] = useState<{
    card: CardData;
    sourceZone?: string;
    canPlay?: boolean;
    playLabel?: string;
    cannotPlayReason?: string;
    attachedWeapons?: CardData[];
    effectiveStrength?: number;
    canActivate?: boolean;
    activateLabel?: string;
    isExhausted?: boolean;
    instanceId?: string;
    allyInstanceId?: string;
  } | null>(null);

  const [graveyardViewer, setGraveyardViewer] = useState<{
    title: string;
    cards: CardData[];
  } | null>(null);

  const [gameAlert, setGameAlert] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [isProcessingStep, setIsProcessingStep] = useState<boolean>(false);

  const notify = (msg: string) => {
    setGameAlert(msg);
    addLog(`⚠️ ${msg}`);
    setTimeout(() => setGameAlert(null), 3500);
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 45)]);
  };

  const openCardDetail = (
    card: CardData,
    sourceZone: string,
    canPlay: boolean = false,
    playLabel?: string,
    attachedWeapons?: CardData[],
    effectiveStrength?: number,
    canActivate?: boolean,
    activateLabel?: string,
    isExhausted?: boolean,
    cannotPlayReason?: string,
    instanceId?: string,
    allyInstanceId?: string
  ) => {
    soundFx.playCardFlick();
    setInspectedCardData({
      card,
      sourceZone,
      canPlay,
      playLabel,
      cannotPlayReason,
      attachedWeapons,
      effectiveStrength,
      canActivate,
      activateLabel,
      isExhausted,
      instanceId,
      allyInstanceId,
    });
  };

  // Find a canonical basic Oro for starting resource
  const getBasicOro = (): CardData => {
    const found = CANONICAL_CARDS.find((c) => c.type === 'Oro' && c.cost === 0 && !c.uniqueCard);
    if (found) return found;
    return {
      id: 'oro-basico-init',
      number: 236,
      totalInSet: 236,
      edition: 'PRIMERA EDICION',
      name: 'ORO BASICO',
      type: 'Oro',
      race: 'Sin Raza',
      strength: 0,
      cost: 0,
      flavorText: 'La riqueza del reino forja el destino de las leyendas.',
      ability: '',
      illustrator: 'SALO S.A.',
      rarity: 'Vasallo',
      foil: 'none',
      imageUrl: '/cards/236.png',
    };
  };

  // Build a legal 50-card castle deck according to DAR 4.3.1
  const createLegalDeck = (source: CardData[]): CardData[] => {
    let pool = source.length >= 15 ? [...source] : [...CANONICAL_CARDS];
    while (pool.length < 49) {
      pool = [...pool, ...CANONICAL_CARDS];
    }
    return pool
      .slice(0, 49)
      .sort(() => Math.random() - 0.5)
      .map((c, idx) => ({
        ...c,
        id: `${c.id}-inst-${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      }));
  };

  // Initial Player & CPU states
  const [player, setPlayer] = useState<PlayerState>({
    id: 'player',
    name: 'Jugador (Tú)',
    castillo: [],
    mano: [],
    lineaDefensa: [],
    lineaAtaque: [],
    lineaApoyo: [],
    reservaOro: 1,
    oroCards: [],
    oroPagado: [],
    oroJugadoEsteTurno: false,
    cementerio: [],
    destierro: [],
    efectosPermanentes: ['Aura Sagrada de Espada Sagrada'],
  });

  const [cpu, setCpu] = useState<PlayerState>({
    id: 'cpu',
    name: 'Rival (CPU)',
    castillo: [],
    mano: [],
    lineaDefensa: [],
    lineaAtaque: [],
    lineaApoyo: [],
    reservaOro: 1,
    oroCards: [],
    oroPagado: [],
    oroJugadoEsteTurno: false,
    cementerio: [],
    destierro: [],
    efectosPermanentes: ['Aura Oscura del Dragón'],
  });

  const playerRef = useRef<PlayerState>(player);
  playerRef.current = player;
  const cpuRef = useRef<PlayerState>(cpu);
  cpuRef.current = cpu;

  // Start new game according to DAR rules
  const initGame = (customCpuSource?: CardData[]) => {
    const pDeck = createLegalDeck(playerDeck);
    const cpuSource =
      customCpuSource ||
      (currentCpuDeckCards.length > 0
        ? currentCpuDeckCards
        : cpuDeck && cpuDeck.length > 0
        ? cpuDeck
        : CANONICAL_CARDS);
    const cLegalDeck = createLegalDeck(cpuSource);

    // Initial 5-card hands (DAR 4.3.10)
    const pHand = pDeck.splice(0, 5);
    const cHand = cLegalDeck.splice(0, 5);

    // Initial basic Oro in Reserva de Oro (DAR 4.2.5 & 4.3.2)
    const basicOroPlayer = { ...getBasicOro(), id: `oro-p-start-${Date.now()}` };
    const basicOroCpu = { ...getBasicOro(), id: `oro-c-start-${Date.now()}` };

    setPlayer({
      id: 'player',
      name: 'Jugador (Tú)',
      castillo: pDeck,
      mano: pHand,
      lineaDefensa: [],
      lineaAtaque: [],
      lineaApoyo: [],
      reservaOro: 1,
      oroCards: [basicOroPlayer],
      oroPagado: [],
      oroJugadoEsteTurno: false,
      cementerio: [],
      destierro: [],
      efectosPermanentes: ['Aura Sagrada de Espada Sagrada'],
    });

    setCpu({
      id: 'cpu',
      name: 'Rival (CPU)',
      castillo: cLegalDeck,
      mano: cHand,
      lineaDefensa: [],
      lineaAtaque: [],
      lineaApoyo: [],
      reservaOro: 1,
      oroCards: [basicOroCpu],
      oroPagado: [],
      oroJugadoEsteTurno: false,
      cementerio: [],
      destierro: [],
      efectosPermanentes: ['Aura Oscura del Dragón'],
    });

    setTurn(1);
    setPhase('AGRUPACION');
    setActivePlayer('player');
    setSelectedAttackerIds([]);
    setBlockAssignments({});
    setWinner(null);
    setAssigningWeaponCard(null);
    setAbilitiesUsedThisTurn({});

    setLogs([
      '⚔️ ¡Comienza el Duelo Oficial según el D.A.R. 1.0 (Primer Bloque)!',
      '🏰 Cada jugador inicia con 50 cartas en su Mazo Castillo y 5 cartas en mano.',
      `🛡️ Tu Mazo: "${playerDeckName}".`,
      `🤖 Mazo Rival (CPU): "${currentCpuDeckName}".`,
      '🪙 Cada jugador comienza con 1 Oro en su Reserva de Oro.',
      '☀️ Turno 1: Fase de Agrupación (DAR 5.1). Pulsa "Agrupar" para pasar a Vigilia.',
    ]);
  };

  const handleSelectCpuDeck = (selectedDeck: SavedDeck) => {
    soundFx.playSummon();
    setCurrentCpuDeckName(selectedDeck.name);
    setCurrentCpuDeckCards(selectedDeck.cards);
    setActiveCpuDeck(selectedDeck);
    if (onChangeCpuDeck) {
      onChangeCpuDeck(selectedDeck);
    }
    setShowCpuDeckModal(false);
    initGame(selectedDeck.cards);
    notify(`🤖 ¡Mazo "${selectedDeck.name}" (${selectedDeck.cards.length} cartas) asignado al Bot Rival!`);
    addLog(`🤖 Mazo "${selectedDeck.name}" asignado al Rival (CPU).`);
  };

  useEffect(() => {
    setAvailableSavedDecks(loadAllSavedDecks());
  }, [showCpuDeckModal]);

  useEffect(() => {
    initGame();
  }, []);

  // Check victory / loss condition: empty Castillo (DAR 4.3.1 & 7.1)
  useEffect(() => {
    if (winner) return;

    // In Mitos y Leyendas DAR 4.3.1 & 7.1: A player whose Castle Deck reaches 0 cards loses immediately!
    const gameHasStarted = turn > 1 || player.mano.length > 0 || player.lineaDefensa.length > 0;

    if (player.castillo.length === 0 && gameHasStarted) {
      setWinner('cpu');
      soundFx.playDefeat();
      addLog('💀 ¡Tu Mazo Castillo ha llegado a 0 cartas! Has perdido el duelo (DAR 4.3.1).');
    } else if (cpu.castillo.length === 0 && gameHasStarted) {
      setWinner('player');
      soundFx.playVictory();
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
      addLog('🏆 ¡El Mazo Castillo del rival ha llegado a 0 cartas! ¡Has ganado el duelo!');
    }
  }, [player.castillo.length, cpu.castillo.length, winner, turn, player.mano.length, cpu.mano.length, player.lineaDefensa.length]);

  // ================= FASE 1: AGRUPACION (DAR 5.1) =================
  const executeAgrupacion = (targetPlayer: 'player' | 'cpu', shouldDraw?: boolean) => {
    soundFx.playCardFlick();
    const isPlayer = targetPlayer === 'player';
    // Primer Bloque DAR 5.1: El primer jugador no roba en Turno 1.
    // En todos los demás turnos (Turno >= 2 para jugador, o Turno >= 1 para CPU que es 2do), se roba 1 carta.
    const mustDraw = shouldDraw !== undefined ? shouldDraw : (isPlayer ? turn > 1 : true);

    if (isPlayer) {
      setPlayer((prev) => {
        // Return paid gold to reserve (DAR 5.1.1)
        const returnedGold = [...prev.oroCards, ...prev.oroPagado];

        // Clean out any ally that should have been banished at turn end (e.g. Dragón Demonio)
        const validAttackers = prev.lineaAtaque.filter((a) => !isBanishAtTurnEndAlly(a));
        const banishedFromAtk = prev.lineaAtaque.filter((a) => isBanishAtTurnEndAlly(a)).map((a) => a.card);
        const validDefenders = prev.lineaDefensa.filter((a) => !isBanishAtTurnEndAlly(a));
        const banishedFromDef = prev.lineaDefensa.filter((a) => isBanishAtTurnEndAlly(a)).map((a) => a.card);
        const newlyBanished = [...banishedFromAtk, ...banishedFromDef];

        // Move surviving attackers back to defense line (DAR 5.1.2)
        const returnedAttackers: AllyInPlay[] = validAttackers.map((a) => ({
          ...a,
          canAttack: !allyCannotAttack(a.card, prev, cpuRef.current) || Boolean(a.canAttackOverride) || Boolean((a.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'))),
          exhausted: false,
          blockedById: undefined,
        }));

        const restoredDefense: AllyInPlay[] = [
          ...validDefenders.map((a) => ({
            ...a,
            canAttack: !allyCannotAttack(a.card, prev, cpuRef.current) || Boolean(a.canAttackOverride) || Boolean((a.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'))),
            exhausted: false,
          })),
          ...returnedAttackers,
        ];

        let nextCastillo = prev.castillo;
        let nextMano = prev.mano;

        // Robar 1 carta de su Mazo Castillo (DAR 5.1 & 5.5)
        if (mustDraw && prev.castillo.length > 0) {
          const drawn = prev.castillo[0];
          nextCastillo = prev.castillo.slice(1);
          nextMano = [...prev.mano, drawn];
          addLog(`🎴 Robas "${drawn.name}" de tu Mazo Castillo (DAR 5.1).`);
        }

        let basePlayer: PlayerState = {
          ...prev,
          castillo: nextCastillo,
          mano: nextMano,
          oroCards: returnedGold,
          oroPagado: [],
          reservaOro: returnedGold.length,
          oroJugadoEsteTurno: false,
          lineaDefensa: restoredDefense,
          lineaAtaque: [],
          destierro: newlyBanished.length > 0 ? [...prev.destierro, ...newlyBanished] : prev.destierro,
        };

        // Recalculate passive continuous auras
        const withAuras = recalculateContinuousAuras(basePlayer, cpuRef.current);
        playerRef.current = withAuras;
        return withAuras;
      });

      setSelectedAttackerIds([]);
      setBlockAssignments({});
      setAbilitiesUsedThisTurn({});

      // Ability triggers in Agrupación (DAR 5.1 - e.g. Rey Arturo)
      const curPlayer = playerRef.current;
      const curCpu = cpuRef.current;
      const agrupTriggers = executeAgrupacionAbilities('player', curPlayer, curCpu);
      if (agrupTriggers.logMessages.length > 0) {
        agrupTriggers.logMessages.forEach((msg) => addLog(msg));
        setPlayer(agrupTriggers.updatedPlayer);
        setCpu(agrupTriggers.updatedCpu);
        playerRef.current = agrupTriggers.updatedPlayer;
        cpuRef.current = agrupTriggers.updatedCpu;
      }

      setPhase('VIGILIA');
      addLog(`☀️ Fase de Vigilia (DAR 5.2): Juega 1 Oro, invoca Aliados, equipa Armas o juega Tótems y Talismanes.`);
    } else {
      // CPU Agrupacion & Draw 1 card at turn start (DAR 5.5 / 5.1)
      setCpu((prev) => {
        const returnedGold = [...prev.oroCards, ...prev.oroPagado];

        // Clean out any ally that should have been banished at turn end (e.g. Dragón Demonio)
        const validAttackers = prev.lineaAtaque.filter((a) => !isBanishAtTurnEndAlly(a));
        const banishedFromAtk = prev.lineaAtaque.filter((a) => isBanishAtTurnEndAlly(a)).map((a) => a.card);
        const validDefenders = prev.lineaDefensa.filter((a) => !isBanishAtTurnEndAlly(a));
        const banishedFromDef = prev.lineaDefensa.filter((a) => isBanishAtTurnEndAlly(a)).map((a) => a.card);
        const newlyBanished = [...banishedFromAtk, ...banishedFromDef];

        const returnedAttackers: AllyInPlay[] = validAttackers.map((a) => ({
          ...a,
          canAttack: !allyCannotAttack(a.card, prev, playerRef.current) || Boolean(a.canAttackOverride) || Boolean((a.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'))),
          exhausted: false,
          blockedById: undefined,
        }));
        const restoredDefense: AllyInPlay[] = [
          ...validDefenders.map((a) => ({
            ...a,
            canAttack: !allyCannotAttack(a.card, prev, playerRef.current) || Boolean(a.canAttackOverride) || Boolean((a.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'))),
            exhausted: false,
          })),
          ...returnedAttackers,
        ];

        let nextCastillo = prev.castillo;
        let nextMano = prev.mano;

        // Robar 1 carta de su Mazo Castillo cada turno (DAR 5.5 / 5.1)
        if (mustDraw && prev.castillo.length > 0) {
          const drawn = prev.castillo[0];
          nextCastillo = prev.castillo.slice(1);
          nextMano = [...prev.mano, drawn];
          addLog(`🎴 Rival (CPU) roba 1 carta de su Mazo Castillo (DAR 5.1).`);
        }

        let baseCpu: PlayerState = {
          ...prev,
          castillo: nextCastillo,
          mano: nextMano,
          oroCards: returnedGold,
          oroPagado: [],
          reservaOro: returnedGold.length,
          oroJugadoEsteTurno: false,
          lineaDefensa: restoredDefense,
          lineaAtaque: [],
          destierro: newlyBanished.length > 0 ? [...prev.destierro, ...newlyBanished] : prev.destierro,
        };

        const withAuras = recalculateContinuousAuras(baseCpu, playerRef.current);
        cpuRef.current = withAuras;
        return withAuras;
      });

      // Ability triggers in CPU Agrupación (e.g. Player's Rey Arturo)
      const curPlayer = playerRef.current;
      const curCpu = cpuRef.current;
      const agrupTriggers = executeAgrupacionAbilities('cpu', curPlayer, curCpu);
      if (agrupTriggers.logMessages.length > 0) {
        agrupTriggers.logMessages.forEach((msg) => addLog(msg));
        setPlayer(agrupTriggers.updatedPlayer);
        setCpu(agrupTriggers.updatedCpu);
        playerRef.current = agrupTriggers.updatedPlayer;
        cpuRef.current = agrupTriggers.updatedCpu;
      }

      setPhase('VIGILIA');
      addLog(`☀️ Turno Rival: Fase de Vigilia de la CPU.`);
      setTimeout(() => executeCpuVigilia(), 1200);
    }
  };

  // Universal processor for ability results (handles auras, decisions, and searches/tutors)
  const processAbilityResult = (
    result: AbilityExecutionResult,
    card: CardData,
    activationInstanceId?: string,
    isCpu: boolean = false
  ) => {
    if (!result.activatedSuccessfully) {
      if (!isCpu) notify(result.logMessage);
      if (result.logMessage) addLog(result.logMessage);
      if (isCpu) {
        if (result.updatedPlayer) {
          setCpu(recalculateContinuousAuras(result.updatedPlayer));
        }
        if (result.updatedRival) {
          setPlayer(recalculateContinuousAuras(result.updatedRival));
        }
      } else {
        if (result.updatedPlayer) {
          setPlayer(recalculateContinuousAuras(result.updatedPlayer));
        }
        if (result.updatedRival) {
          setCpu(recalculateContinuousAuras(result.updatedRival));
        }
      }
      return;
    }

    if (activationInstanceId && !isCpu) {
      setAbilitiesUsedThisTurn((prev) => ({
        ...prev,
        [activationInstanceId]: (prev[activationInstanceId] || 0) + 1,
      }));
    }

    if (isCpu) {
      const withAuras = recalculateContinuousAuras(result.updatedPlayer);
      setCpu(withAuras);
      if (result.updatedRival) {
        setPlayer(recalculateContinuousAuras(result.updatedRival));
      }
      if (result.logMessage) {
        addLog(result.logMessage);
      }
      return;
    }

    const withAuras = recalculateContinuousAuras(result.updatedPlayer);
    setPlayer(withAuras);
    if (result.updatedRival) {
      setCpu(recalculateContinuousAuras(result.updatedRival));
    }
    if (result.logMessage) {
      addLog(result.logMessage);
    }

    // 1. Pending Decision (Choices like Misil Mágico, Tótem Hobgoblin, Pixie)
    if (result.pendingChoice) {
      setDecisionState({
        isOpen: true,
        choiceInfo: result.pendingChoice,
      });
      return;
    }

    // 2. Pending Tutor (Search in deck / graveyard: Alquimista, Guinivere, Arturo, etc.)
    if (result.pendingTutor) {
      const tutor = result.pendingTutor;
      const isCpuTarget = tutor.targetOwner === 'cpu';
      const targetState = isCpuTarget ? result.updatedRival : withAuras;
      const sourceList =
        tutor.sourceZone === 'both'
          ? [...targetState.castillo, ...targetState.cementerio]
          : tutor.sourceZone === 'cementerio'
          ? targetState.cementerio
          : targetState.castillo;

      const candidates = sourceList.filter((c) => {
        const norm = (s: string) =>
          s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        if (typeof tutor.filterStrength === 'number') {
          if (c.strength !== tutor.filterStrength) return false;
        }

        const originatingCardName = norm(tutor.cardName || '');
        if (originatingCardName.includes('nodriza') || (tutor.filterName && norm(tutor.filterName).includes('nodriza'))) {
          return norm(c.name).includes('nodriza');
        }
        if (
          originatingCardName.includes('avalon') ||
          originatingCardName.includes('lobo') ||
          (tutor.filterName && (norm(tutor.filterName).includes('avalon') || norm(tutor.filterName).includes('lobo')))
        ) {
          return norm(c.name).includes('avalon') || norm(c.name).includes('lobo');
        }

        if (tutor.filterName) {
          const fn = norm(tutor.filterName);
          const cn = norm(c.name);
          return cn.includes(fn);
        }
        if (tutor.filterType === 'Tótem') {
          return norm(c.type) === 'totem';
        }
        if (tutor.filterType === 'Talismán') {
          return norm(c.type) === 'talisman';
        }
        if (tutor.filterType === 'Arma') {
          return norm(c.type) === 'arma';
        }
        if (tutor.filterType === 'Caballero') {
          return norm(c.race) === 'caballero';
        }
        if (tutor.filterType === 'Faerie') {
          return norm(c.race) === 'faerie';
        }
        if (tutor.filterType === 'Dragón') {
          return norm(c.race) === 'dragon' || (c.race || '').toLowerCase().includes('drag');
        }
        if (tutor.filterType === 'Aliado') {
          return norm(c.type) === 'aliado';
        }
        if (tutor.filterType === 'Oro_Normal') {
          return norm(c.type) === 'oro' && (!c.ability || c.ability.length < 5);
        }
        return true;
      });

      if (candidates.length === 0) {
        notify(
          `No se encontraron cartas de tipo "${tutor.filterName || tutor.filterType || 'válido'}" en ${
            isCpuTarget ? 'el' : 'tu'
          } ${tutor.sourceZone === 'cementerio' ? 'Cementerio' : 'Mazo Castillo'}.`
        );
        addLog(
          `🔍 Búsqueda: No se encontraron cartas válidas en el ${tutor.sourceZone} de ${
            isCpuTarget ? 'el Rival' : 'tu mazo'
          }.`
        );
        if (tutor.drawExtraAfter && tutor.drawExtraAfter > 0) {
          if (isCpuTarget) {
            setCpu((cur) => {
              const extraDrawn = cur.castillo.slice(0, tutor.drawExtraAfter);
              return {
                ...cur,
                castillo: cur.castillo.slice(tutor.drawExtraAfter!),
                mano: [...cur.mano, ...extraDrawn],
              };
            });
          } else {
            setPlayer((cur) => {
              const extraDrawn = cur.castillo.slice(0, tutor.drawExtraAfter);
              return {
                ...cur,
                castillo: cur.castillo.slice(tutor.drawExtraAfter!),
                mano: [...cur.mano, ...extraDrawn],
              };
            });
          }
        }
        return;
      }

      setCardPickerState({
        isOpen: true,
        title: isCpuTarget
          ? `BUSCAR EN EL ${tutor.sourceZone === 'cementerio' ? 'CEMENTERIO' : 'MAZO CASTILLO'} DEL RIVAL`
          : `BUSCAR EN TU ${tutor.sourceZone === 'cementerio' ? 'CEMENTERIO' : 'MAZO CASTILLO'}`,
        subtitle: `${tutor.reason} — Decide qué carta deseas obtener:`,
        filterLabel: tutor.filterName || tutor.filterType || 'Cualquiera',
        cards: candidates,
        maxSelect: tutor.maxCount || 1,
        tutorInfo: tutor,
      });
      return;
    }

    // 3. Pending Discard (Sir Owen, Sir Héctor, Excalibur, Caballo Lunar, etc.)
    if (result.pendingDiscard) {
      const discard = result.pendingDiscard;
      const isTargetRival = discard.targetOwner === 'rival';
      const targetState = isTargetRival ? result.updatedRival : withAuras;

      if (targetState.mano.length === 0) {
        addLog(
          `🗑️ Descarte: La mano de ${isTargetRival ? 'el Rival' : 'tu jugador'} no tiene cartas para descartar.`
        );
      } else {
        const actualCount = Math.min(discard.count, targetState.mano.length);
        setDiscardPickerState({
          isOpen: true,
          title: isTargetRival ? 'DESCARTAR DE LA MANO RIVAL' : 'DESCARTAR DE TU MANO',
          subtitle: `${discard.reason} — Decide qué carta(s) enviar al Cementerio:`,
          filterLabel: `Selecciona ${actualCount} carta(s) para enviar al Cementerio`,
          cards: targetState.mano,
          maxSelect: actualCount,
          discardInfo: discard,
        });
        return;
      }
    }
  };

  const handleSelectTutorCards = (selectedCards: CardData[]) => {
    if (!cardPickerState.tutorInfo || selectedCards.length === 0) {
      setCardPickerState((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    const tutor = cardPickerState.tutorInfo;
    soundFx.playSummon();
    const isCpuTarget = tutor.targetOwner === 'cpu';

    if (isCpuTarget) {
      setCpu((prev) => {
        const selectedIds = new Set(selectedCards.map((c) => c.id));
        let nextCastillo = [...prev.castillo];
        let nextCementerio = [...prev.cementerio];
        let nextMano = [...prev.mano];
        let nextOroCards = [...prev.oroCards];
        let nextReserva = prev.reservaOro;

        if (tutor.sourceZone === 'cementerio') {
          nextCementerio = nextCementerio.filter((c) => !selectedIds.has(c.id));
        } else {
          nextCastillo = nextCastillo.filter((c) => !selectedIds.has(c.id));
        }

        if (tutor.destination === 'mano') {
          nextMano = [...nextMano, ...selectedCards];
          addLog(
            `🔍 Elegiste del Mazo Rival: ${selectedCards.map((c) => `"${c.name}"`).join(', ')} añadida a su mano.`
          );
        } else if (tutor.destination === 'reserva') {
          nextOroCards = [...nextOroCards, ...selectedCards];
          nextReserva = nextReserva + selectedCards.length;
          addLog(
            `🪙 Elegiste del Mazo Rival: ${selectedCards.map((c) => `"${c.name}"`).join(', ')} a su Reserva de Oro.`
          );
        } else if (tutor.destination === 'castillo_shuffle') {
          nextCastillo = [...nextCastillo, ...selectedCards].sort(() => Math.random() - 0.5);
          addLog(
            `♻️ Elegiste del Mazo Rival: ${selectedCards.map((c) => `"${c.name}"`).join(', ')} barajada en su Castillo.`
          );
        }

        if (tutor.sourceZone === 'castillo') {
          nextCastillo = nextCastillo.sort(() => Math.random() - 0.5);
        }

        return recalculateContinuousAuras({
          ...prev,
          castillo: nextCastillo,
          cementerio: nextCementerio,
          mano: nextMano,
          oroCards: nextOroCards,
          reservaOro: nextReserva,
        });
      });
    } else {
      setPlayer((prev) => {
        const selectedIds = new Set(selectedCards.map((c) => c.id));
        let nextCastillo = [...prev.castillo];
        let nextCementerio = [...prev.cementerio];
        let nextMano = [...prev.mano];
        let nextOroCards = [...prev.oroCards];
        let nextReserva = prev.reservaOro;

        let nextLineaDefensa = [...prev.lineaDefensa];
        let nextLineaApoyo = [...prev.lineaApoyo];
        let nextLineaAtaque = [...prev.lineaAtaque];

        if (tutor.sourceZone === 'both') {
          nextCastillo = nextCastillo.filter((c) => !selectedIds.has(c.id));
          nextCementerio = nextCementerio.filter((c) => !selectedIds.has(c.id));
        } else if (tutor.sourceZone === 'cementerio') {
          nextCementerio = nextCementerio.filter((c) => !selectedIds.has(c.id));
        } else {
          nextCastillo = nextCastillo.filter((c) => !selectedIds.has(c.id));
        }

        if (tutor.destination === 'mano') {
          nextMano = [...nextMano, ...selectedCards];
          addLog(`🔍 Buscaste y añadiste a tu mano: ${selectedCards.map((c) => `"${c.name}"`).join(', ')}.`);
        } else if (tutor.destination === 'reserva') {
          nextOroCards = [...nextOroCards, ...selectedCards];
          nextReserva = nextReserva + selectedCards.length;
          addLog(`🪙 Buscaste y añadiste a tu Reserva de Oro: ${selectedCards.map((c) => `"${c.name}"`).join(', ')}.`);
        } else if (tutor.destination === 'castillo_shuffle') {
          nextCastillo = [...nextCastillo, ...selectedCards].sort(() => Math.random() - 0.5);
          addLog(`♻️ Barajaste en tu Mazo Castillo: ${selectedCards.map((c) => `"${c.name}"`).join(', ')}.`);
        } else if (tutor.destination === 'lineaDefensa') {
          selectedCards.forEach((c) => {
            const newAlly: AllyInPlay = {
              instanceId: `ally-${c.id}-${Date.now()}`,
              card: c,
              baseStrength: c.strength,
              currentStrength: c.strength,
              exhausted: false,
              canAttack: false,
              attachedWeapons: [],
            };
            nextLineaDefensa.push(newAlly);
            addLog(`🛡️ "${c.name}" (${c.strength} F) entra directamente en tu Línea de Defensa sin pagar su coste.`);
          });
        } else if (tutor.destination === 'juego_arma') {
          selectedCards.forEach((c) => {
            if (isWeaponSupportLineOnly(c)) {
              nextLineaApoyo.push({
                instanceId: `weapon-support-${c.id}-${Date.now()}`,
                card: c,
              });
              addLog(`🏹 "${c.name}" entra directamente a tu Línea de Apoyo sin pagar su coste (La Dama del Lago).`);
            } else {
              const allAllies = [...nextLineaDefensa, ...nextLineaAtaque];
              if (allAllies.length > 0) {
                // Enter assigning weapon mode with freeCost: true!
                setTimeout(() => {
                  setAssigningWeaponCard({ ...c, freeCost: true } as any);
                  notify(`⚔️ ¡La Dama del Lago! Haz clic sobre el Aliado al que deseas equipar "${c.name}" sin pagar su coste.`);
                }, 100);
                addLog(`⚔️ La Dama del Lago: Selecciona a qué Aliado deseas equipar "${c.name}" sin pagar su coste.`);
              } else {
                nextMano.push(c);
                addLog(`🔍 "${c.name}" añadida a tu mano al no haber Aliados portadores.`);
              }
            }
          });
        }

        if (tutor.sourceZone === 'castillo' || tutor.sourceZone === 'both') {
          nextCastillo = nextCastillo.sort(() => Math.random() - 0.5);
        }

        if (tutor.drawExtraAfter && tutor.drawExtraAfter > 0 && nextCastillo.length > 0) {
          const extraDrawn = nextCastillo.slice(0, tutor.drawExtraAfter);
          nextCastillo = nextCastillo.slice(tutor.drawExtraAfter);
          nextMano = [...nextMano, ...extraDrawn];
          addLog(`🎴 Robaste 1 carta extra (${extraDrawn.map((c) => `"${c.name}"`).join(', ')}).`);
        }

        const updated: PlayerState = {
          ...prev,
          castillo: nextCastillo,
          cementerio: nextCementerio,
          mano: nextMano,
          oroCards: nextOroCards,
          reservaOro: nextReserva,
          lineaDefensa: nextLineaDefensa,
          lineaApoyo: nextLineaApoyo,
          lineaAtaque: nextLineaAtaque,
        };

        return recalculateContinuousAuras(updated);
      });
    }

    setCardPickerState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSelectDiscardCards = (selectedCards: CardData[]) => {
    if (!discardPickerState.discardInfo || selectedCards.length === 0) {
      setDiscardPickerState((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    const discard = discardPickerState.discardInfo;
    soundFx.playCardFlick();
    const selectedIds = new Set(selectedCards.map((c) => c.id));

    if (discard.targetOwner === 'rival') {
      setCpu((prev) => {
        const nextMano = prev.mano.filter((c) => !selectedIds.has(c.id));
        const nextCementerio = [...prev.cementerio, ...selectedCards];
        return recalculateContinuousAuras({
          ...prev,
          mano: nextMano,
          cementerio: nextCementerio,
        });
      });
      addLog(
        `🗑️ Descarte Rival: Se descartó de la mano del Rival: ${selectedCards.map((c) => `"${c.name}"`).join(', ')}.`
      );
    } else {
      setPlayer((prev) => {
        const nextMano = prev.mano.filter((c) => !selectedIds.has(c.id));
        const nextCementerio = [...prev.cementerio, ...selectedCards];
        let nextDefensa = prev.lineaDefensa;
        let nextAtaque = prev.lineaAtaque || [];

        // If afterDiscardEffect === 'buff' (e.g. Excalibur: +cost force to Arturo)
        if (
          discard.afterDiscardEffect === 'buff' &&
          discard.cardName?.toUpperCase().includes('EXCALIBUR')
        ) {
          const boost = Math.max(1, selectedCards[0]?.cost || 1);
          const applyArturoBoost = (a: AllyInPlay) => {
            if (a.card.name.toUpperCase().includes('ARTURO')) {
              return {
                ...a,
                turnStrengthBonus: (a.turnStrengthBonus || 0) + boost,
                currentStrength: a.currentStrength + boost,
              };
            }
            return a;
          };
          nextDefensa = nextDefensa.map(applyArturoBoost);
          nextAtaque = nextAtaque.map(applyArturoBoost);
          addLog(
            `Excalibur: Descartaste "${selectedCards[0].name}" (Coste ${selectedCards[0].cost}). ¡Rey Arturo gana +${boost} a la Fuerza este turno!`
          );
        }

        return recalculateContinuousAuras({
          ...prev,
          mano: nextMano,
          cementerio: nextCementerio,
          lineaDefensa: nextDefensa,
          lineaAtaque: nextAtaque,
        });
      });
      addLog(
        `🗑️ Descarte: Descartaste de tu mano al Cementerio: ${selectedCards.map((c) => `"${c.name}"`).join(', ')}.`
      );
    }

    setDiscardPickerState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleChooseDecisionOption = (optionId: string) => {
    if (!decisionState.choiceInfo) {
      setDecisionState({ isOpen: false });
      return;
    }

    const { invokingCard } = decisionState.choiceInfo;
    setDecisionState({ isOpen: false });
    soundFx.playCardFlick();

    const result = executeCardOnPlayAbility(invokingCard, player, cpu, {
      chosenOptionId: optionId,
    });

    processAbilityResult(result, invokingCard);
  };

  // ================= FASE 2: VIGILIA (DAR 5.2) =================

  // Play Gold (DAR 4.2.5: Limit 1 gold per turn in Vigilia)
  const handlePlayGold = (card: CardData) => {
    if (activePlayer !== 'player') {
      notify('Solo puedes bajar Oro en tu propio turno.');
      return;
    }

    if (phase === 'AGRUPACION') {
      executeAgrupacion('player');
    } else if (phase !== 'VIGILIA') {
      notify('El Oro solo se puede bajar durante tu Fase de Vigilia (DAR 4.2.5).');
      return;
    }

    if (player.oroJugadoEsteTurno) {
      notify('Regla DAR 4.2.5: Solo puedes jugar 1 carta de Oro por turno en tu Fase de Vigilia.');
      return;
    }

    if (card.uniqueCard) {
      const alreadyInGold = player.oroCards.some(
        (o) => o.name.toUpperCase().trim() === card.name.toUpperCase().trim()
      );
      if (alreadyInGold) {
        notify(`Regla DAR 4.1.2: "${card.name}" es una Carta Única. Ya tienes una copia en tu Reserva de Oro.`);
        return;
      }
    }

    soundFx.playSummon();
    const handIdx = player.mano.findIndex(
      (c) => c.id === card.id || (c.number === card.number && c.name === card.name)
    );
    const nextMano =
      handIdx >= 0
        ? [...player.mano.slice(0, handIdx), ...player.mano.slice(handIdx + 1)]
        : player.mano.filter((c) => c.id !== card.id);

    const basePlayer: PlayerState = {
      ...player,
      mano: nextMano,
      oroCards: [...player.oroCards, card],
      reservaOro: player.reservaOro + 1,
      oroJugadoEsteTurno: true,
    };

    addLog(`🪙 Bajaste "${card.name}" a tu Reserva de Oro (Total: ${player.reservaOro + 1} Oro).`);

    // Special Gold ability triggers on-entry (e.g. draw card like Herrero)
    const text = (card.ability || '').toLowerCase();
    const hasEntryTrigger =
      !card.name.toUpperCase().includes('CODEX') &&
      (text.includes('entra en juego') ||
        text.includes('al entrar') ||
        text.includes('cuando entra') ||
        text.includes('al jugar') ||
        text.includes('roba') ||
        text.includes('busca'));

    if (hasEntryTrigger) {
      const abilityResult = executeCardOnPlayAbility(card, basePlayer, cpu);
      processAbilityResult(abilityResult, card);
    } else {
      setPlayer(recalculateContinuousAuras(basePlayer));
    }
  };

  // Play Ally (DAR 4.2.1: Enters Linea de Defensa, pays cost from Reserva de Oro)
  const handlePlayAlly = (card: CardData) => {
    if (activePlayer !== 'player' || phase !== 'VIGILIA') return;

    const eligibleGold = getEligibleGoldCards(player.oroCards, card);
    if (eligibleGold.length < card.cost) {
      if (player.reservaOro >= card.cost) {
        notify(`Oro restringido: Tienes ${player.reservaOro} Oro, pero solo ${eligibleGold.length} es aplicable para "${card.name}" (el oro de Dragón Cobrizo solo sirve para bajar Dragones).`);
      } else {
        notify(`No tienes suficiente Oro en Reserva (${player.reservaOro}/${card.cost}) para invocar a ${card.name}.`);
      }
      return;
    }

    // Unique card rule (DAR 4.1.2)
    if (card.uniqueCard) {
      const alreadyInDefense = player.lineaDefensa.some((a) => a.card.name === card.name);
      if (alreadyInDefense) {
        notify(`Regla DAR 4.1.2: "${card.name}" es una Carta Única. No puedes tener más de una copia en juego.`);
        return;
      }
    }

    soundFx.playSummon();
    const { paid: paidGolds, remaining: remainingGolds } = payGoldForCard(player.oroCards, card.cost, card);
    const canAttackImmediately = allyCanAttackOnEntry(card, player);
    const isDemonio =
      (card.name || '').toUpperCase().includes('DRAGON DEMONIO') ||
      (card.name || '').toUpperCase().includes('DEMONIO') ||
      (card.ability || '').toLowerCase().includes('destiérralo al final') ||
      (card.ability || '').toLowerCase().includes('al final de este turno, destiérralo') ||
      (card.ability || '').toLowerCase().includes('destierralo al final') ||
      (card.ability || '').toLowerCase().includes('al final de este turno destierralo');
    const isTalismanImmune =
      isDemonio ||
      (card.ability || '').toLowerCase().includes('no puede ser afectado por talismanes') ||
      (card.ability || '').toLowerCase().includes('no puede ser destruido por talismanes');

    const newAlly: AllyInPlay = {
      instanceId: `ally-${card.id}-${Date.now()}`,
      card,
      baseStrength: card.strength,
      currentStrength: card.strength,
      exhausted: false,
      canAttack: canAttackImmediately, // Haste / Furia / DAR immediate attack exemption
      attachedWeapons: [],
      banishAtTurnEnd: isDemonio || undefined,
      cannotBeDestroyedByTalismans: isTalismanImmune || undefined,
    };

    const basePlayer: PlayerState = {
      ...player,
      mano: player.mano.filter((c) => c.id !== card.id),
      oroCards: remainingGolds,
      oroPagado: [...player.oroPagado, ...paidGolds],
      reservaOro: remainingGolds.length,
      lineaDefensa: [...player.lineaDefensa, newAlly],
    };

    addLog(`🛡️ Invocaste a "${card.name}" (${card.strength} Fuerza) en tu Línea de Defensa pagando ${card.cost} Oro.`);
    if (canAttackImmediately) {
      addLog(`⚡ "${card.name}" entra con Furia / Ataque Inmediato: ¡Habilitado para atacar en la Fase de Batalla de este mismo turno!`);
    }

    // Tótem del Conjurador trigger: opponent mills cards equal to Ally strength
    const hasConjurador = player.lineaApoyo.some((s) =>
      s.card.name.toUpperCase().includes('CONJURADOR')
    );
    if (hasConjurador && card.strength > 0) {
      const mill = Math.min(card.strength, cpu.castillo.length);
      const milled = cpu.castillo.slice(0, mill);
      setCpu((prev) => ({
        ...prev,
        castillo: prev.castillo.slice(mill),
        cementerio: [...prev.cementerio, ...milled],
      }));
      addLog(`🗿 Tótem del Conjurador: Invocaste a "${card.name}" (${card.strength} F). El rival bota ${mill} carta(s) de su Mazo Castillo.`);
    }

    // Tótem del Draco trigger: when you play a Dragon, can recycle a card from cemetery
    const hasDracoTotem = player.lineaApoyo.some((s) =>
      s.card.name.toUpperCase().includes('DRACO')
    );
    const isDragon = (card.race || '').toLowerCase().includes('drag');
    if (hasDracoTotem && isDragon && player.cementerio.length > 0) {
      setCardPickerState({
        isOpen: true,
        title: 'TÓTEM DEL DRACO — RECICLAJE',
        subtitle: 'Invocaste un Dragón: Elige una carta de tu Cementerio para barajarla en tu Mazo Castillo:',
        filterLabel: 'Cualquiera de tu Cementerio',
        cards: player.cementerio,
        maxSelect: 1,
        tutorInfo: {
          sourceZone: 'cementerio',
          destination: 'castillo_shuffle',
          maxCount: 1,
          reason: 'Tótem del Draco: Baraja 1 carta de tu Cementerio en tu Mazo Castillo',
          cardName: 'Tótem del Draco',
        },
      });
    }

    // Execute on-play ability
    const abilityResult = executeCardOnPlayAbility(card, basePlayer, cpu);
    processAbilityResult(abilityResult, card);
  };

  // Play Tótem (DAR 4.2.4: Enters Linea de Apoyo)
  const handlePlayTotem = (card: CardData) => {
    if (activePlayer !== 'player' || phase !== 'VIGILIA') return;

    // Woodhage tax
    const hasWoodhage = cpu.lineaApoyo.some((s) =>
      s.card.name.toUpperCase().includes('WOODHAGE')
    );
    const effectiveCost = hasWoodhage ? card.cost + 1 : card.cost;

    const eligibleGold = getEligibleGoldCards(player.oroCards, card);
    if (eligibleGold.length < effectiveCost) {
      notify(
        hasWoodhage
          ? `Woodhage rival aumenta el coste de Tótems en +1 (${eligibleGold.length}/${effectiveCost} 🪙 aplicables).`
          : `No tienes suficiente Oro aplicable (${eligibleGold.length}/${card.cost}) para jugar ${card.name}.`
      );
      return;
    }

    // Unique card check for Totems (DAR 4.1.2)
    if (card.uniqueCard) {
      const alreadyInSupport = player.lineaApoyo.some((s) => s.card.name === card.name);
      if (alreadyInSupport) {
        notify(`Regla DAR 4.1.2: "${card.name}" es una Carta Única. No puedes tener más de una copia en juego.`);
        return;
      }
    }

    soundFx.playSummon();
    const { paid: paidGolds, remaining: remainingGolds } = payGoldForCard(player.oroCards, effectiveCost, card);

    const newSupport: SupportInPlay = {
      instanceId: `support-${card.id}-${Date.now()}`,
      card,
    };

    const basePlayer: PlayerState = {
      ...player,
      mano: player.mano.filter((c) => c.id !== card.id),
      oroCards: remainingGolds,
      oroPagado: [...player.oroPagado, ...paidGolds],
      reservaOro: remainingGolds.length,
      lineaApoyo: [...player.lineaApoyo, newSupport],
    };

    addLog(`🗿 Jugaste el Tótem "${card.name}" en tu Línea de Apoyo (DAR 4.2.4).`);

    // Tótem del Alba trigger: opponent mills 1 card when you play a Totem
    const hasAlba = player.lineaApoyo.some((s) =>
      s.card.name.toUpperCase().includes('ALBA')
    );
    if (hasAlba && cpu.castillo.length > 0) {
      const mill = cpu.castillo.slice(0, 1);
      setCpu((prev) => ({
        ...prev,
        castillo: prev.castillo.slice(1),
        cementerio: [...prev.cementerio, ...mill],
      }));
      addLog(`🌅 Tótem del Alba: Al jugar un Tótem, el rival bota 1 carta de su Mazo Castillo.`);
    }

    const abilityResult = executeCardOnPlayAbility(card, basePlayer, cpu);
    processAbilityResult(abilityResult, card);
  };

  // ================= ASIGNACIÓN INTERACTIVA DE ARMAS (DAR 4.2.2) =================

  // Play an Arma directly to Línea de Apoyo if its ability states so
  const handlePlayWeaponToSupportLine = (card: CardData) => {
    if (activePlayer !== 'player' || phase !== 'VIGILIA') {
      notify('Las Armas solo se pueden jugar durante tu Fase de Vigilia (DAR 4.2.2).');
      return;
    }
    const eligibleGold = getEligibleGoldCards(player.oroCards, card);
    if (eligibleGold.length < card.cost) {
      notify(`No tienes suficiente Oro aplicable (${eligibleGold.length}/${card.cost}) para jugar "${card.name}".`);
      return;
    }

    soundFx.playSummon();
    const { paid: paidGolds, remaining: remainingGolds } = payGoldForCard(player.oroCards, card.cost, card);

    const newSupport: SupportInPlay = {
      instanceId: `weapon-support-${card.id}-${Date.now()}`,
      card,
    };

    const basePlayer: PlayerState = {
      ...player,
      mano: player.mano.filter((c) => c.id !== card.id),
      oroCards: remainingGolds,
      oroPagado: [...player.oroPagado, ...paidGolds],
      reservaOro: remainingGolds.length,
      lineaApoyo: [...player.lineaApoyo, newSupport],
    };

    addLog(`🏹 Jugaste el Arma "${card.name}" directamente en tu Línea de Apoyo según su texto de habilidad (DAR 4.2.2/4.3.6).`);

    const abilityResult = executeCardOnPlayAbility(card, basePlayer, cpu);
    processAbilityResult(abilityResult, card);
  };

  // Step 1: Start weapon assignment targeting mode (requires an Ally unless ability specifies Línea de Apoyo)
  const handleStartPlayArma = (card: CardData) => {
    if (activePlayer !== 'player' || phase !== 'VIGILIA') {
      notify('Las Armas solo se pueden jugar durante tu Fase de Vigilia (DAR 4.2.2).');
      return;
    }
    const eligibleGold = getEligibleGoldCards(player.oroCards, card);
    if (eligibleGold.length < card.cost) {
      notify(`No tienes suficiente Oro aplicable (${eligibleGold.length}/${card.cost}) para jugar "${card.name}".`);
      return;
    }

    // Check if this weapon goes directly to Línea de Apoyo according to its ability text
    if (isWeaponSupportLineOnly(card)) {
      handlePlayWeaponToSupportLine(card);
      return;
    }

    const eligibleCount = player.lineaDefensa.length + player.lineaAtaque.length;
    if (eligibleCount === 0) {
      notify('Requisito DAR 4.2.2: Las Armas deben asignarse a un Aliado portador en juego, salvo que su texto de habilidad especifique que va en Línea de Apoyo.');
      return;
    }

    soundFx.playCardFlick();
    setAssigningWeaponCard(card);
    addLog(`🗡️ Modo Asignación: Haz clic sobre el Aliado al que deseas equipar "${card.name}". Revisa los requisitos de raza y portador.`);
  };

  // Step 2: Equip weapon to chosen ally with race/ally validation and trait assignment
  const handleAssignWeaponToAlly = (targetAllyInstanceId: string) => {
    if (!assigningWeaponCard) return;

    const weapon = assigningWeaponCard;
    const eligibleGold = getEligibleGoldCards(player.oroCards, weapon);
    if (eligibleGold.length < weapon.cost) {
      notify(`No tienes suficiente Oro aplicable (${eligibleGold.length}/${weapon.cost}).`);
      setAssigningWeaponCard(null);
      return;
    }

    const targetAlly =
      player.lineaDefensa.find((a) => a.instanceId === targetAllyInstanceId) ||
      player.lineaAtaque.find((a) => a.instanceId === targetAllyInstanceId);

    if (!targetAlly) return;

    // Check weapon bearer eligibility (DAR 4.2.2 - race restrictions, ally name, weapon limit)
    const check = checkWeaponBearerEligibility(weapon, targetAlly);
    if (!check.allowed) {
      notify(check.reason || 'Este Aliado no puede portar esta Arma según sus requisitos.');
      return;
    }

    soundFx.playSummon();
    const isFree = Boolean((weapon as any).freeCost);
    const { paid: paidGolds, remaining: remainingGolds } = isFree
      ? { paid: [], remaining: player.oroCards }
      : payGoldForCard(player.oroCards, weapon.cost, weapon);
    const bonusStrength = check.bonusStrength;
    const traits = check.traits;
    const targetAllyName = targetAlly.card.name;

    setPlayer((prev) => {
      const updatedDefense = prev.lineaDefensa.map((a) => {
        if (a.instanceId === targetAllyInstanceId) {
          return {
            ...a,
            currentStrength: a.currentStrength + bonusStrength,
            attachedWeapons: [...(a.attachedWeapons || []), weapon],
            unblockable: traits.unblockable || a.unblockable,
            indestructibleInCombat: traits.indestructibleInCombat || a.indestructibleInCombat,
            cannotBeDestroyedByTalismans: traits.cannotBeDestroyedByTalismans || a.cannotBeDestroyedByTalismans,
            immuneToOpponentAllies: traits.immuneToOpponentAllies || a.immuneToOpponentAllies,
            extraTurnEndDraw: traits.extraTurnEndDraw || a.extraTurnEndDraw,
            mustPayGoldToAttack: traits.mustPayGoldToAttack || a.mustPayGoldToAttack,
            onBlockedDiscard: traits.onBlockedDiscard || a.onBlockedDiscard,
            canAttack: traits.furyCanAttackImmediately || traits.canAttackOverride ? true : a.canAttack,
            canAttackOverride: traits.canAttackOverride ? true : a.canAttackOverride,
          };
        }
        return a;
      });

      const updatedAttack = prev.lineaAtaque.map((a) => {
        if (a.instanceId === targetAllyInstanceId) {
          return {
            ...a,
            currentStrength: a.currentStrength + bonusStrength,
            attachedWeapons: [...(a.attachedWeapons || []), weapon],
            unblockable: traits.unblockable || a.unblockable,
            indestructibleInCombat: traits.indestructibleInCombat || a.indestructibleInCombat,
            cannotBeDestroyedByTalismans: traits.cannotBeDestroyedByTalismans || a.cannotBeDestroyedByTalismans,
            immuneToOpponentAllies: traits.immuneToOpponentAllies || a.immuneToOpponentAllies,
            extraTurnEndDraw: traits.extraTurnEndDraw || a.extraTurnEndDraw,
            mustPayGoldToAttack: traits.mustPayGoldToAttack || a.mustPayGoldToAttack,
            onBlockedDiscard: traits.onBlockedDiscard || a.onBlockedDiscard,
            canAttackOverride: traits.canAttackOverride ? true : a.canAttackOverride,
          };
        }
        return a;
      });

      const playerWithWeapon: PlayerState = {
        ...prev,
        mano: isFree ? prev.mano : prev.mano.filter((c) => c.id !== weapon.id),
        oroCards: remainingGolds,
        oroPagado: [...prev.oroPagado, ...paidGolds],
        reservaOro: remainingGolds.length,
        lineaDefensa: updatedDefense,
        lineaAtaque: updatedAttack,
      };

      return recalculateContinuousAuras(playerWithWeapon);
    });

    const traitsDesc: string[] = [];
    if (traits.unblockable) traitsDesc.push('Imbloqueable');
    if (traits.furyCanAttackImmediately) traitsDesc.push('Furia');
    if (traits.indestructibleInCombat) traitsDesc.push('Indestructible');
    if (traits.cannotBeDestroyedByTalismans) traitsDesc.push('Inmune a Talismanes');
    if (traits.immuneToOpponentAllies) traitsDesc.push('Inmune a Aliados');
    if (traits.extraTurnEndDraw) traitsDesc.push('Robo Extra Fin de Turno');
    if (traits.mustPayGoldToAttack) traitsDesc.push('Pagar 2 Oro al Atacar');
    const traitText = traitsDesc.length > 0 ? ` [${traitsDesc.join(', ')}]` : '';

    addLog(
      isFree
        ? `⚔️ ¡"${weapon.name}" entra en juego sin pagar su coste y se equipa a "${targetAllyName}" (+${bonusStrength} a la Fuerza${traitText}) gracias a La Dama del Lago!`
        : `⚔️ ¡Equipaste "${weapon.name}" a "${targetAllyName}" (+${bonusStrength} a la Fuerza${traitText}) - DAR 4.2.2!`
    );

    // Execute weapon ability if applicable (e.g. Excalibur special passive)
    const abilityResult = executeCardOnPlayAbility(weapon, player, cpu);
    if (abilityResult.logMessage && !abilityResult.logMessage.includes('efecto continuo')) {
      addLog(abilityResult.logMessage);
    }

    setAssigningWeaponCard(null);
  };

  // Play Talismán (DAR 4.2.3 & 5.3.3)
  const handlePlayTalisman = (card: CardData) => {
    const eligibleGold = getEligibleGoldCards(player.oroCards, card);
    if (eligibleGold.length < card.cost) {
      if (player.reservaOro >= card.cost) {
        notify(`Oro restringido: Tienes ${player.reservaOro} Oro, pero solo ${eligibleGold.length} es aplicable para Talismanes (el oro de Dragón Cobrizo solo sirve para bajar Dragones).`);
      } else {
        notify(`No tienes suficiente Oro (${player.reservaOro}/${card.cost}) para jugar ${card.name}.`);
      }
      return;
    }

    soundFx.playSummon();
    const { paid: paidGolds, remaining: remainingGolds } = payGoldForCard(player.oroCards, card.cost, card);

    const basePlayer: PlayerState = {
      ...player,
      mano: player.mano.filter((c) => c.id !== card.id),
      oroCards: remainingGolds,
      oroPagado: [...player.oroPagado, ...paidGolds],
      reservaOro: remainingGolds.length,
      cementerio: [...player.cementerio, card],
    };

    addLog(`🔮 Jugaste el Talismán "${card.name}" pagando ${card.cost} Oro.`);

    // Execute talisman ability dynamically!
    const abilityResult = executeCardOnPlayAbility(card, basePlayer, cpu);
    processAbilityResult(abilityResult, card);

    if (phase === 'GUERRA_TALISMANES') {
      setTalismansPriority('defender');
      setTalismansConsecutivePasses(0);
    }
  };

  // Activate an in-play Ally, Totem, Weapon, or Gold ability on demand
  const handleActivateInPlayAbility = (card: CardData, instanceId: string, allyInstanceId?: string) => {
    const isCodexDamageActivation =
      card.name.toUpperCase().includes('CODEX') &&
      (phase === 'ASIGNACION_DANO' ||
        phase === 'DECLARACION_ATAQUE' ||
        phase === 'DECLARACION_BLOQUEO' ||
        phase === 'GUERRA_TALISMANES');

    if (!isCodexDamageActivation && (activePlayer !== 'player' || phase !== 'VIGILIA')) {
      notify('Solo puedes activar habilidades durante tu Fase de Vigilia.');
      return;
    }

    if (isCodexDamageActivation) {
      soundFx.playShieldBlock();
      setCombatDamagePrevented(true);
      setPlayer((prev) => {
        const remainingGold = prev.oroCards.filter((o) => o.id !== card.id);
        return {
          ...prev,
          oroCards: remainingGold,
          reservaOro: remainingGold.length,
          destierro: [...prev.destierro, card],
        };
      });
      addLog(`🌌 ¡Destierraste Codex Artúricos en Combate! Todo el daño de combate se reduce a 0.`);
      return;
    }

    const currentUses = abilitiesUsedThisTurn[instanceId] || 0;
    const maxUses = getMaxActivationsPerTurn(card);
    if (currentUses >= maxUses) {
      notify(`Regla de Activación: "${card.name}" ya utilizó su habilidad este turno (${currentUses}/${maxUses}).`);
      return;
    }

    soundFx.playSummon();
    const abilityResult = executeCardOnPlayAbility(card, player, cpu, {
      isManualActivation: true,
      instanceId,
      allyInstanceId,
    });

    processAbilityResult(abilityResult, card, instanceId);
  };

  const handlePlayCardFromAnywhere = (card: CardData) => {
    if (activePlayer === 'player' && phase === 'AGRUPACION') {
      executeAgrupacion('player');
    }

    if (card.type === 'Oro') {
      handlePlayGold(card);
    } else if (card.type === 'Aliado') {
      handlePlayAlly(card);
    } else if (card.type === 'Tótem') {
      handlePlayTotem(card);
    } else if (card.type === 'Arma') {
      if (isWeaponSupportLineOnly(card)) {
        handlePlayWeaponToSupportLine(card);
      } else {
        handleStartPlayArma(card);
      }
    } else if (card.type === 'Talismán') {
      handlePlayTalisman(card);
    }
  };

  // ================= FASE 3: BATALLA MITOLOGICA (DAR 5.3) =================

  // Move from Vigilia to Attack Declaration
  const handleStartAttackDeclaration = () => {
    const isAllyAttackerEligible = (a: AllyInPlay) => {
      const hasEspadaLarga = (a.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'));
      const attackOverridden = Boolean(a.canAttackOverride || hasEspadaLarga);
      return (a.canAttack || attackOverridden) && (!allyCannotAttack(a.card, player, cpu) || attackOverridden);
    };

    const eligibleAttackerCount = player.lineaDefensa.filter(isAllyAttackerEligible).length;
    if (eligibleAttackerCount === 0) {
      notify('Requisito DAR 4.2.1: No tienes Aliados legalmente habilitados para declarar ataque.');
      return;
    }
    soundFx.playCardFlick();
    setPhase('DECLARACION_ATAQUE');
    setSelectedAttackerIds([]);
    addLog('⚔️ Paso de Declaración de Ataque (DAR 5.3.1): Selecciona los Aliados que atacarán y pulsa "Confirmar Ataque".');
  };

  const toggleSelectAttacker = (instanceId: string) => {
    const ally = player.lineaDefensa.find((a) => a.instanceId === instanceId);
    if (!ally) return;

    const hasEspadaLarga = (ally.attachedWeapons || []).some((w) => w.name.toUpperCase().includes('ESPADA LARGA'));
    const attackOverridden = Boolean(ally.canAttackOverride || hasEspadaLarga);

    if (allyCannotAttack(ally.card, player, cpu) && !attackOverridden) {
      notify(`Restricción: "${ally.card.name}" sólo puede defender o no puede ser declarado atacante.`);
      return;
    }
    if (!ally.canAttack && !attackOverridden) {
      notify(`Requisito DAR 4.2.1: "${ally.card.name}" no puede atacar este turno.`);
      return;
    }

    soundFx.playCardFlick();
    setSelectedAttackerIds((prev) =>
      prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]
    );
  };

  // Confirm Attack Declaration: Move attackers to Linea de Ataque (DAR 5.3.1)
  const handleConfirmAttackDeclaration = () => {
    if (selectedAttackerIds.length === 0) {
      notify('Selecciona al menos 1 Aliado para declarar ataque.');
      return;
    }

    soundFx.playSummon();

    let declaredAttackers: AllyInPlay[] = [];
    let remainingDefense: AllyInPlay[] = [];

    const normStr = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    player.lineaDefensa.forEach((ally) => {
      if (selectedAttackerIds.includes(ally.instanceId)) {
        const normName = normStr(ally.card.name);
        const normAbility = normStr(ally.card.ability || '');
        const willSuicide =
          normName.includes('dragon montana') ||
          normName.includes('dregon') ||
          normName.includes('ravido') ||
          /si\s+.*ataca.*(?:debe\s+ser|es)\s+destruido.*final\s+del\s+turno/i.test(normAbility) ||
          /declarado\s+atacante.*destruir.*final\s+del\s+turno/i.test(normAbility) ||
          /destruir.*(?:al\s+)?final\s+del\s+turno/i.test(normAbility);

        if (willSuicide) {
          abilityLogger.logAttackDeclarationTrigger(
            'Autodestrucción al Fin del Turno',
            ally.card.name,
            'Marcado para autodestrucción al final del turno por haber sido declarado atacante.'
          );
        }

        if (normName.includes('dragon demonio') || normAbility.includes('destierralo')) {
          abilityLogger.logAttackDeclarationTrigger(
            'Destierro al Fin del Turno',
            ally.card.name,
            'Marcado para destierro a la Zona de Destierro al final del turno ("Al final de este turno, destiérralo").'
          );
        }

        declaredAttackers.push({
          ...ally,
          exhausted: true,
          hasAttackedThisTurn: true,
          destroyAtTurnEndIfAttacked: willSuicide,
        });
      } else {
        remainingDefense.push(ally);
      }
    });

    // Check attack declaration triggers:
    // 1) Dragón de Eter: "Cuando Dragón de Eter es declarado atacante, todos los Aliados oponentes ganan - 1 a la fuerza hasta el final del turno"
    const eterAttacker = declaredAttackers.find((a) => normStr(a.card.name).includes('dragon de eter'));
    if (eterAttacker) {
      abilityLogger.logAttackDeclarationTrigger(
        'Dragón de Eter',
        eterAttacker.card.name,
        'Todos los Aliados rivales reciben -1 a la Fuerza hasta el final del turno.'
      );
      setCpu((prev) =>
        recalculateContinuousAuras(
          {
            ...prev,
            lineaDefensa: prev.lineaDefensa.map((b) => {
              const prevF = b.currentStrength;
              const newF = Math.max(0, b.currentStrength - 1);
              abilityLogger.logStrengthModification({
                sourceCardName: 'Dragón de Eter',
                sourceType: 'Declaración_Ataque',
                targetAlly: b,
                targetOwner: 'cpu',
                changeType: 'debuff',
                amount: 1,
                isPermanent: false,
                previousStrength: prevF,
                newStrength: newF,
                reason: 'Disparado por Dragón de Eter al ser declarado atacante.',
              });
              return {
                ...b,
                turnStrengthBonus: (b.turnStrengthBonus || 0) - 1,
                currentStrength: newF,
              };
            }),
            lineaAtaque: (prev.lineaAtaque || []).map((b) => {
              const prevF = b.currentStrength;
              const newF = Math.max(0, b.currentStrength - 1);
              abilityLogger.logStrengthModification({
                sourceCardName: 'Dragón de Eter',
                sourceType: 'Declaración_Ataque',
                targetAlly: b,
                targetOwner: 'cpu',
                changeType: 'debuff',
                amount: 1,
                isPermanent: false,
                previousStrength: prevF,
                newStrength: newF,
                reason: 'Disparado por Dragón de Eter al ser declarado atacante.',
              });
              return {
                ...b,
                turnStrengthBonus: (b.turnStrengthBonus || 0) - 1,
                currentStrength: newF,
              };
            }),
          },
          player
        )
      );
      addLog('✨ "Dragón de Eter" es declarado atacante: ¡Todos los Aliados rivales ganan -1 a la Fuerza hasta el final del turno!');
    }

    // 2) Sir Thomas: "Cuando Sir Thomas es declarado atacante, gana + 2 a la fuerza hasta el final del turno"
    declaredAttackers = declaredAttackers.map((a) => {
      if (normStr(a.card.name).includes('sir thomas')) {
        const prevF = a.currentStrength;
        const newF = a.currentStrength + 2;
        abilityLogger.logAttackDeclarationTrigger(
          'Sir Thomas',
          a.card.name,
          'Gana +2 a la Fuerza hasta el final del turno.'
        );
        abilityLogger.logStrengthModification({
          sourceCardName: 'Sir Thomas',
          sourceType: 'Declaración_Ataque',
          targetAlly: a,
          targetOwner: 'player',
          changeType: 'buff',
          amount: 2,
          isPermanent: false,
          previousStrength: prevF,
          newStrength: newF,
          reason: 'Disparado por Sir Thomas al ser declarado atacante.',
        });
        addLog('✨ "Sir Thomas" es declarado atacante: ¡Gana +2 a la Fuerza hasta el final del turno!');
        return {
          ...a,
          turnStrengthBonus: (a.turnStrengthBonus || 0) + 2,
          currentStrength: newF,
        };
      }
      return a;
    });

    // 3) Ciervo Sagrado: "Cuando Ciervo Sagrado ataque, tus Aliados imbloqueables ganan + 1 a la fuerza hasta el final del turno"
    const ciervoAttacker = declaredAttackers.find((a) => normStr(a.card.name).includes('ciervo sagrado'));
    if (ciervoAttacker) {
      abilityLogger.logAttackDeclarationTrigger(
        'Ciervo Sagrado',
        ciervoAttacker.card.name,
        'Tus Aliados imbloqueables ganan +1 a la Fuerza hasta el final del turno.'
      );
      const applyCiervoBuff = (a: AllyInPlay): AllyInPlay => {
        if (!a.unblockable) return a;
        const prevF = a.currentStrength;
        const newF = a.currentStrength + 1;
        abilityLogger.logStrengthModification({
          sourceCardName: 'Ciervo Sagrado',
          sourceType: 'Declaración_Ataque',
          targetAlly: a,
          targetOwner: 'player',
          changeType: 'buff',
          amount: 1,
          isPermanent: false,
          previousStrength: prevF,
          newStrength: newF,
          reason: 'Disparado por ataque de Ciervo Sagrado para Aliados imbloqueables.',
        });
        return {
          ...a,
          turnStrengthBonus: (a.turnStrengthBonus || 0) + 1,
          currentStrength: newF,
        };
      };
      declaredAttackers = declaredAttackers.map(applyCiervoBuff);
      remainingDefense = remainingDefense.map(applyCiervoBuff);
      addLog('✨ "Ciervo Sagrado" ataca: ¡Tus Aliados imbloqueables ganan +1 a la Fuerza hasta el final del turno!');
    }

    // 4) Dragón de Luz: "Si Dragón de Luz no es declarado atacante, puedes tomar las 3 cartas superiores de tu cementerio y barajarlas con tu mazo castillo."
    let nextCastillo = player.castillo;
    let nextCementerio = player.cementerio;
    const dragonDeLuz = remainingDefense.find(
      (a) => normStr(a.card.name).includes('dragon de luz') && !a.dragonDeLuzTriggeredTurn
    );
    if (dragonDeLuz && nextCementerio.length > 0) {
      const recycleCount = Math.min(3, nextCementerio.length);
      const recycledCards = nextCementerio.slice(-recycleCount);
      nextCementerio = nextCementerio.slice(0, nextCementerio.length - recycleCount);
      nextCastillo = [...nextCastillo, ...recycledCards].sort(() => Math.random() - 0.5);
      remainingDefense = remainingDefense.map((a) =>
        a.instanceId === dragonDeLuz.instanceId ? { ...a, dragonDeLuzTriggeredTurn: 1 } : a
      );
      abilityLogger.logAttackDeclarationTrigger(
        'Dragón de Luz',
        dragonDeLuz.card.name,
        `Al no ser declarado atacante, baraja ${recycledCards.length} cartas del Cementerio al Mazo Castillo.`
      );
      addLog(
        `✨ "Dragón de Luz": Al no ser declarado atacante, tomaste las ${recycledCards.length} cartas superiores del Cementerio (${recycledCards
          .map((c) => `"${c.name}"`)
          .join(', ')}) y las barajaste en tu Mazo Castillo.`
      );
    }

    // Check weapon gold cost to attack (e.g. Mandoble, Espada Larga: "para atacar debe pagar 2 de oro")
    let goldRequired = 0;
    declaredAttackers.forEach((a) => {
      if (a.mustPayGoldToAttack) goldRequired += a.mustPayGoldToAttack;
    });

    if (goldRequired > 0) {
      const eligibleGold = getEligibleGoldCards(player.oroCards);
      if (eligibleGold.length < goldRequired) {
        notify(`Armas pesadas (Mandoble / Espada Larga) exigen pagar ${goldRequired} de Oro sin restricción para atacar (tienes ${eligibleGold.length} aplicable).`);
        return;
      }
      const { paid, remaining } = payGoldForCard(player.oroCards, goldRequired);
      setPlayer((prev) => ({
        ...prev,
        castillo: nextCastillo,
        cementerio: nextCementerio,
        oroCards: remaining,
        oroPagado: [...prev.oroPagado, ...paid],
        reservaOro: remaining.length,
        lineaDefensa: remainingDefense,
        lineaAtaque: declaredAttackers,
      }));
      addLog(`🪙 Pagaste ${goldRequired} de Oro para declarar ataque con tus armas (Mandoble/Espada Larga).`);
    } else {
      setPlayer((prev) => ({
        ...prev,
        castillo: nextCastillo,
        cementerio: nextCementerio,
        lineaDefensa: remainingDefense,
        lineaAtaque: declaredAttackers,
      }));
    }

    // 5) Ettin: "En respuesta a que Ettin sea declarado atacante, puedes buscar un Aliado de fuerza 2 en tu mazo castillo y ponerlo en la línea de defensa sin pagar su coste."
    const ettinAttacker = declaredAttackers.find((a) => normStr(a.card.name).includes('ettin'));
    if (ettinAttacker) {
      const eligibleStrength2 = nextCastillo.filter((c) => c.type === 'Aliado' && c.strength === 2);
      if (eligibleStrength2.length > 0) {
        setCardPickerState({
          isOpen: true,
          title: 'HABILIDAD DE ETTIN (ATACANTE)',
          subtitle: 'Ettin fue declarado atacante: Elige 1 Aliado de fuerza 2 en tu Mazo Castillo para ponerlo en tu Línea de Defensa sin pagar su coste:',
          filterLabel: 'Aliado Fuerza 2',
          cards: eligibleStrength2,
          maxSelect: 1,
          tutorInfo: {
            sourceZone: 'castillo',
            filterType: 'Aliado',
            filterStrength: 2,
            destination: 'lineaDefensa',
            maxCount: 1,
            reason: 'Ettin: Busca un Aliado de fuerza 2 y ponlo en tu Línea de Defensa gratis',
            cardName: 'Ettin',
          },
        });
        addLog('⚔️ ¡Ettin declarado atacante! Puedes buscar un Aliado de fuerza 2 en tu Mazo Castillo para tu Línea de Defensa sin pagar su coste.');
      } else {
        addLog('⚔️ Ettin declarado atacante: No tienes Aliados de fuerza 2 en tu Mazo Castillo.');
      }
    }

    addLog(`⚔️ Declaraste ataque con ${declaredAttackers.length} Aliado(s): ${declaredAttackers.map((a) => `"${a.card.name}" (${a.currentStrength} F)`).join(', ')}.`);

    // Proceed to Step 5.3.2: Declaracion de Bloqueo by Defender (CPU)
    setPhase('DECLARACION_BLOQUEO');
    setTimeout(() => {
      executeCpuBlockDeclaration(declaredAttackers);
    }, 1200);
  };

  // CPU Block Declaration (DAR 5.3.2)
  const executeCpuBlockDeclaration = (playerAttackers: AllyInPlay[]) => {
    addLog('🛡️ Paso de Declaración de Bloqueo (DAR 5.3.2): El Rival decide defensores.');

    setCpu((curCpu) => {
      const assignments: Record<string, string> = {};
      const cpuBlockers = curCpu.lineaDefensa.filter((b) => !b.cannotDefend);
      const restrictedDefenders = curCpu.lineaDefensa.filter((b) => b.cannotDefend);
      if (restrictedDefenders.length > 0) {
        restrictedDefenders.forEach((b) => {
          addLog(`🚫 "${b.card.name}" del rival no puede defender ni bloquear este turno (afectado por Talismán/Efecto).`);
        });
      }
      let blockerIdx = 0;

      playerAttackers.forEach((atk) => {
        if (atk.unblockable) {
          addLog(`💨 Tu "${atk.card.name}" es Imbloqueable (Arma/Habilidad) -> No puede ser bloqueado y golpeará directo al Castillo.`);
          return;
        }
        if (cpuBlockers.length > blockerIdx) {
          const blocker = cpuBlockers[blockerIdx];
          assignments[atk.instanceId] = blocker.instanceId;
          blockerIdx++;
          addLog(`🛡️ Rival asigna a "${blocker.card.name}" (${blocker.currentStrength} F) para bloquear a tu "${atk.card.name}".`);
        } else {
          addLog(`⚡ Tu "${atk.card.name}" (${atk.currentStrength} F) no tiene bloqueador asignado -> Golpeará directo al Mazo Castillo.`);
        }
      });

      setBlockAssignments(assignments);
      return curCpu;
    });

    // Move to 5.3.3 Guerra de Talismanes (Defender priority)
    setTimeout(() => {
      setPhase('GUERRA_TALISMANES');
      setTalismansPriority('defender');
      setTalismansConsecutivePasses(0);
      addLog('📜 Paso de Guerra de Talismanes (DAR 5.3.3): Prioridad inicial para el Defensor (Rival).');

      // CPU pass priority in Talisman War
      setTimeout(() => {
        addLog('🤖 Rival cede la prioridad en Guerra de Talismanes. Tu turno de jugar Talismanes o pasar.');
        setTalismansPriority('attacker');
      }, 1000);
    }, 1400);
  };

  // Pass Priority in Guerra de Talismanes (DAR 5.3.3 / 6.7)
  const handlePassPriority = () => {
    soundFx.playCardFlick();
    const newPasses = talismansConsecutivePasses + 1;
    setTalismansConsecutivePasses(newPasses);

    if (newPasses >= 2) {
      addLog('⚖️ Ambos jugadores cedieron prioridad consecutivamente. Concluye Guerra de Talismanes.');
      setPhase('ASIGNACION_DANO');
      setTimeout(() => {
        executeAsignacionDano();
      }, 1000);
    } else {
      addLog('Cedes prioridad al rival.');
      setTalismansPriority('defender');
      setTimeout(() => {
        addLog('🤖 Rival también cede prioridad.');
        setPhase('ASIGNACION_DANO');
        setTimeout(() => {
          executeAsignacionDano();
        }, 1000);
      }, 900);
    }
  };

  // Combat Resolution & Damage Assignment (DAR 5.3.4)
  const executeAsignacionDano = () => {
    addLog('💥 Paso de Asignación de Daño (DAR 5.3.4): Comparando fuerzas de combate.');
    soundFx.playDamage();

    let totalDamageToCpuCastle = 0;
    const destroyedPlayerAttackers: AllyInPlay[] = [];
    const survivingPlayerAttackers: AllyInPlay[] = [];
    const destroyedCpuBlockers: AllyInPlay[] = [];
    const attackersDealingCastleDamage: { atk: AllyInPlay; damage: number }[] = [];
    let updatedCpuDefense = [...cpu.lineaDefensa];
    let updatedCpuHand = [...cpu.mano];
    let updatedCpuCemetery = [...cpu.cementerio];

    player.lineaAtaque.forEach((atk) => {
      const blockerId = blockAssignments[atk.instanceId];
      const blocker = updatedCpuDefense.find((b) => b.instanceId === blockerId);

      if (!blocker) {
        // Case A: Unblocked (DAR 5.3.4: All force to Castle Deck)
        totalDamageToCpuCastle += atk.currentStrength;
        survivingPlayerAttackers.push(atk);
        attackersDealingCastleDamage.push({ atk, damage: atk.currentStrength });
        addLog(`⚔️ "${atk.card.name}" causa ${atk.currentStrength} de daño directo al Mazo Castillo rival.`);
      } else {
        // Case B: Blocked. Compare Forces
        const atkIsIndestructible = atk.indestructibleInCombat;
        const blockerIsIndestructible =
          blocker.indestructibleInCombat ||
          (blocker.attachedWeapons || []).some((w) =>
            (w.ability || '').toLowerCase().includes('escudo sidhe') ||
            (w.ability || '').toLowerCase().includes('no puede ser destruido')
          );

        // Catapulta trait: if blocked, opponent discards
        if (atk.onBlockedDiscard && updatedCpuHand.length > 0) {
          const disc = updatedCpuHand[0];
          updatedCpuHand = updatedCpuHand.slice(1);
          updatedCpuCemetery.push(disc);
          addLog(`🏹 Catapulta: Al ser bloqueado "${atk.card.name}", el rival descarta "${disc.name}".`);
        }

        if (atk.currentStrength > blocker.currentStrength) {
          if (!blockerIsIndestructible) {
            destroyedCpuBlockers.push(blocker);
            updatedCpuDefense = updatedCpuDefense.filter((b) => b.instanceId !== blocker.instanceId);
            addLog(`⚔️ "${atk.card.name}" (${atk.currentStrength} F) destruye a "${blocker.card.name}" (${blocker.currentStrength} F).`);
          } else {
            addLog(`🛡️ "${blocker.card.name}" (${blocker.currentStrength} F) es Indestructible en combate y sobrevive.`);
          }
          survivingPlayerAttackers.push(atk);
        } else if (atk.currentStrength === blocker.currentStrength) {
          if (!blockerIsIndestructible) {
            destroyedCpuBlockers.push(blocker);
            updatedCpuDefense = updatedCpuDefense.filter((b) => b.instanceId !== blocker.instanceId);
          }
          if (!atkIsIndestructible) {
            destroyedPlayerAttackers.push(atk);
          } else {
            survivingPlayerAttackers.push(atk);
          }
          addLog(`⚖️ Choque mutuo: "${atk.card.name}" y "${blocker.card.name}" (${atk.currentStrength} F).`);
        } else {
          if (!atkIsIndestructible) {
            destroyedPlayerAttackers.push(atk);
            addLog(`🛡️ Bloqueador "${blocker.card.name}" (${blocker.currentStrength} F) vence y destruye a "${atk.card.name}" (${atk.currentStrength} F).`);
          } else {
            survivingPlayerAttackers.push(atk);
            addLog(`🛡️ "${atk.card.name}" es Indestructible en combate y sobrevive al choque.`);
          }
        }
      }
    });

    // Apply Mill Damage to CPU Castle (DAR 4.3.1)
    const cpuMilled = cpu.castillo.slice(0, totalDamageToCpuCastle);
    const cpuRemainingCastillo = cpu.castillo.slice(totalDamageToCpuCastle);

    // Move destroyed cards to Cemeteries, including attached weapons (DAR 4.2.2)
    const playerWeaponsToCemetery: CardData[] = [];
    destroyedPlayerAttackers.forEach((a) => {
      if (a.attachedWeapons) playerWeaponsToCemetery.push(...a.attachedWeapons);
    });

    let nextPlayer: PlayerState = {
      ...player,
      lineaAtaque: survivingPlayerAttackers,
      cementerio: [
        ...player.cementerio,
        ...destroyedPlayerAttackers.map((a) => a.card),
        ...playerWeaponsToCemetery,
      ],
    };

    let nextCpu: PlayerState = {
      ...cpu,
      mano: updatedCpuHand,
      castillo: cpuRemainingCastillo,
      cementerio: [
        ...updatedCpuCemetery,
        ...cpuMilled,
        ...destroyedCpuBlockers.map((b) => b.card),
      ],
      lineaDefensa: updatedCpuDefense,
    };

    if (totalDamageToCpuCastle > 0) {
      addLog(`💔 El rival bota ${totalDamageToCpuCastle} cartas de su Mazo Castillo.`);
    }

    // Check leaving play triggers (e.g. Ellyllon)
    if (destroyedPlayerAttackers.length > 0) {
      const ellyllonRes = checkLeavingPlayAllies(destroyedPlayerAttackers, 'player', nextPlayer, nextCpu);
      nextPlayer = ellyllonRes.updatedPlayer;
      nextCpu = ellyllonRes.updatedCpu;
      ellyllonRes.logMessages.forEach((msg) => addLog(msg));
    }
    if (destroyedCpuBlockers.length > 0) {
      const ellyllonRes = checkLeavingPlayAllies(destroyedCpuBlockers, 'cpu', nextPlayer, nextCpu);
      nextPlayer = ellyllonRes.updatedPlayer;
      nextCpu = ellyllonRes.updatedCpu;
      ellyllonRes.logMessages.forEach((msg) => addLog(msg));
    }

    // Execute post-combat damage conditional triggers (e.g. "si hace daño al mazo castillo rival botar una carta...")
    attackersDealingCastleDamage.forEach(({ atk, damage }) => {
      const combatTrigRes = executeCombatDamageAbilities(atk, damage, nextPlayer, nextCpu, false);
      if (combatTrigRes.logMessages.length > 0) {
        combatTrigRes.logMessages.forEach((msg) => addLog(msg));
        nextPlayer = combatTrigRes.updatedAttackerOwner;
        nextCpu = combatTrigRes.updatedDefender;
      }
    });

    setPlayer(recalculateContinuousAuras(nextPlayer, nextCpu));
    setCpu(recalculateContinuousAuras(nextCpu, nextPlayer));

    setTimeout(() => {
      executeFaseFinal('player', nextPlayer, nextCpu);
    }, 1500);
  };

  // Phase 4: Fase Final & End of Turn (DAR 5.4 & 5.5)
  const executeFaseFinal = (
    activeTurnPlayer: 'player' | 'cpu',
    overridePlayer?: PlayerState,
    overrideCpu?: PlayerState
  ) => {
    setCombatDamagePrevented(false);
    setPhase('FASE_FINAL');
    addLog(`🏁 Fase Final (DAR 5.4): Limpiando efectos temporales y regresando unidades.`);

    const effectivePlayer = overridePlayer || player;
    const effectiveCpu = overrideCpu || cpu;

    // Execute end-of-turn abilities (self-destruct on attack, Guardia Real, Dragón de Luz, Hacha de Batalla, etc.)
    const turnEndRes = executeTurnEndAbilities(activeTurnPlayer, effectivePlayer, effectiveCpu);
    if (turnEndRes.logMessages.length > 0) {
      turnEndRes.logMessages.forEach((msg) => addLog(msg));
    }

    const clearTemporaryTurnEffects = (allies: AllyInPlay[]): AllyInPlay[] => {
      return allies.map((a) => ({
        ...a,
        turnStrengthBonus: 0,
        cannotDefend: false,
        hasAttackedThisTurn: false,
        destroyAtTurnEndIfAttacked: false,
        dragonDeLuzTriggeredTurn: undefined,
      }));
    };

    // Definitive banish guarantee for Dragón Demonio & end-of-turn banished allies
    const banishFinalSweep = (state: PlayerState, ownerName: string): PlayerState => {
      const sweepBanished: CardData[] = [];
      const sweepWeapons: CardData[] = [];
      const defClean = state.lineaDefensa.filter((a) => {
        if (isBanishAtTurnEndAlly(a)) {
          sweepBanished.push(a.card);
          if (a.attachedWeapons) sweepWeapons.push(...a.attachedWeapons);
          return false;
        }
        return true;
      });
      const atkClean = state.lineaAtaque.filter((a) => {
        if (isBanishAtTurnEndAlly(a)) {
          sweepBanished.push(a.card);
          if (a.attachedWeapons) sweepWeapons.push(...a.attachedWeapons);
          return false;
        }
        return true;
      });
      if (sweepBanished.length > 0) {
        sweepBanished.forEach((c) => {
          addLog(`🌀 "${c.name}" (${ownerName}) es desterrado a la Zona de Destierro al final del turno ("Al final de este turno, destiérralo").`);
        });
      }
      return {
        ...state,
        lineaDefensa: defClean,
        lineaAtaque: atkClean,
        destierro: [...state.destierro, ...sweepBanished],
        cementerio: sweepWeapons.length > 0 ? [...state.cementerio, ...sweepWeapons] : state.cementerio,
      };
    };

    const nextPlayerState = banishFinalSweep(turnEndRes.updatedPlayer, 'Jugador');
    const nextCpuState = banishFinalSweep(turnEndRes.updatedCpu, 'Rival');

    const cleanedPlayerDef = clearTemporaryTurnEffects(nextPlayerState.lineaDefensa);
    const cleanedPlayerAtk = clearTemporaryTurnEffects(nextPlayerState.lineaAtaque);
    const cleanedCpuDef = clearTemporaryTurnEffects(nextCpuState.lineaDefensa);
    const cleanedCpuAtk = clearTemporaryTurnEffects(nextCpuState.lineaAtaque);

    const finalPlayer = recalculateContinuousAuras(
      {
        ...nextPlayerState,
        lineaDefensa: cleanedPlayerDef,
        lineaAtaque: cleanedPlayerAtk,
      },
      nextCpuState
    );

    const finalCpu = recalculateContinuousAuras(
      {
        ...nextCpuState,
        lineaDefensa: cleanedCpuDef,
        lineaAtaque: cleanedCpuAtk,
      },
      nextPlayerState
    );

    setPlayer(finalPlayer);
    setCpu(finalCpu);
    playerRef.current = finalPlayer;
    cpuRef.current = finalCpu;

    if (activeTurnPlayer === 'player') {
      // End of turn (DAR 5.5): Draw 1 card at start of next turn / turn change
      setTimeout(() => {
        setPhase('FINAL_TURNO');
        addLog(`🌙 Final del Turno (DAR 5.5): Turno pasa al Rival. (Tus Aliados atacantes permanecen en Línea de Ataque hasta tu próxima Agrupación)`);

        // Switch to CPU turn
        setActivePlayer('cpu');
        setPhase('AGRUPACION');
        executeAgrupacion('cpu', true);
      }, 1000);
    } else {
      // CPU ending turn -> Switch back to Player

      setTimeout(() => {
        setTurn((t) => {
          const nextTurn = t + 1;
          addLog(`☀️ Inicia Turno ${nextTurn} (Tu Turno): Fase de Agrupación y Robo (DAR 5.1).`);
          return nextTurn;
        });
        setActivePlayer('player');
        setPhase('AGRUPACION');
        setAbilitiesUsedThisTurn({});
        executeAgrupacion('player', true);
      }, 1000);
    }
  };

  // Simple CPU AI for Vigilia & Combat (DAR rules compliant)
  const executeCpuVigilia = () => {
    setIsProcessingStep(true);

    // 1. CPU plays 1 Gold if available (DAR 4.2.5)
    setTimeout(() => {
      setCpu((curCpu) => {
        const goldInHand = curCpu.mano.find((c) => c.type === 'Oro');
        if (goldInHand && !curCpu.oroJugadoEsteTurno) {
          soundFx.playSummon();
          addLog(`🤖 Rival bajó un Oro a su Reserva (Total: ${curCpu.reservaOro + 1}).`);
          let nextCpu = {
            ...curCpu,
            mano: curCpu.mano.filter((c) => c.id !== goldInHand.id),
            oroCards: [...curCpu.oroCards, goldInHand],
            reservaOro: curCpu.reservaOro + 1,
            oroJugadoEsteTurno: true,
          };
          const goldText = (goldInHand.ability || '').toLowerCase();
          const hasEntryTrigger =
            !goldInHand.name.toUpperCase().includes('CODEX') &&
            (goldText.includes('entra en juego') ||
              goldText.includes('al entrar') ||
              goldText.includes('roba') ||
              goldText.includes('busca'));
          if (hasEntryTrigger) {
            const goldAbilityResult = executeCardOnPlayAbility(goldInHand, nextCpu, player, {
              isCpu: true,
            });
            if (goldAbilityResult.logMessage) {
              addLog(goldAbilityResult.logMessage);
            }
            if (goldAbilityResult.updatedRival) {
              setPlayer(recalculateContinuousAuras(goldAbilityResult.updatedRival));
            }
            nextCpu = goldAbilityResult.updatedPlayer;
          }
          return recalculateContinuousAuras(nextCpu);
        }
        return curCpu;
      });

      // 2. CPU plays Ally, Weapon, Totem, or Talisman if can afford
      setTimeout(() => {
        setCpu((curCpu) => {
          let updatedCpu = { ...curCpu };

          const applyCpuAbility = (res: AbilityExecutionResult) => {
            if (res.logMessage) {
              addLog(res.logMessage);
            }
            if (res.updatedRival) {
              setPlayer(recalculateContinuousAuras(res.updatedRival));
            }
            let nextCpuState = res.updatedPlayer;

            // Automatically resolve tutor for CPU if present
            if (res.pendingTutor) {
              const tutor = res.pendingTutor;
              const source = tutor.sourceZone === 'cementerio' ? nextCpuState.cementerio : nextCpuState.castillo;
              const found = source.find((c) => {
                if (tutor.filterName) return c.name.toUpperCase().includes(tutor.filterName.toUpperCase());
                if (tutor.filterType === 'Tótem') return c.type === 'Tótem';
                if (tutor.filterType === 'Talismán') return c.type === 'Talismán';
                if (tutor.filterType === 'Arma') return c.type === 'Arma';
                if (tutor.filterType === 'Caballero') return c.race === 'Caballero';
                if (tutor.filterType === 'Faerie') return c.race === 'Faerie';
                if (tutor.filterType === 'Dragón') return (c.race || '').toLowerCase().includes('drag');
                if (tutor.filterType === 'Aliado') return c.type === 'Aliado';
                if (tutor.filterType === 'Oro_Normal') return c.type === 'Oro' && (!c.ability || c.ability.length < 5);
                return true;
              });

              if (found) {
                if (tutor.sourceZone === 'cementerio') {
                  nextCpuState = {
                    ...nextCpuState,
                    cementerio: nextCpuState.cementerio.filter((c) => c.id !== found.id),
                  };
                } else {
                  nextCpuState = {
                    ...nextCpuState,
                    castillo: nextCpuState.castillo.filter((c) => c.id !== found.id),
                  };
                }

                if (tutor.destination === 'mano') {
                  nextCpuState = {
                    ...nextCpuState,
                    mano: [...nextCpuState.mano, found],
                  };
                  addLog(`🤖 Rival buscó y añadió a su mano "${found.name}".`);
                } else if (tutor.destination === 'reserva') {
                  nextCpuState = {
                    ...nextCpuState,
                    oroCards: [...nextCpuState.oroCards, found],
                    reservaOro: nextCpuState.reservaOro + 1,
                  };
                  addLog(`🤖 Rival buscó y colocó en su Reserva "${found.name}".`);
                } else {
                  nextCpuState = {
                    ...nextCpuState,
                    castillo: [...nextCpuState.castillo, found].sort(() => Math.random() - 0.5),
                  };
                  addLog(`🤖 Rival barajó "${found.name}" en su Mazo Castillo.`);
                }
              }
            }

            // Automatically resolve discard if targeted at CPU, or open modal if targeted at player
            if (res.pendingDiscard) {
              if (res.pendingDiscard.targetOwner === 'rival') {
                const count = Math.min(res.pendingDiscard.count, nextCpuState.mano.length);
                const discarded = nextCpuState.mano.slice(0, count);
                nextCpuState = {
                  ...nextCpuState,
                  mano: nextCpuState.mano.slice(count),
                  cementerio: [...nextCpuState.cementerio, ...discarded],
                };
                if (discarded.length > 0) {
                  addLog(`🤖 Rival descartó ${discarded.map((c) => c.name).join(', ')} al Cementerio.`);
                }
              } else {
                setDiscardPickerState({
                  isOpen: true,
                  title: 'DESCARTAR DE TU MANO',
                  subtitle: `${res.pendingDiscard.reason} — Elige qué carta(s) enviar al Cementerio:`,
                  filterLabel: `Selecciona ${Math.min(res.pendingDiscard.count, player.mano.length)} carta(s)`,
                  cards: player.mano,
                  maxSelect: Math.min(res.pendingDiscard.count, player.mano.length),
                  discardInfo: res.pendingDiscard,
                });
              }
            }

            return nextCpuState;
          };

          // Check if CPU controls Dragón Cobrizo in defense and hasn't activated it yet
          const cobrizoAlly = updatedCpu.lineaDefensa.find(
            (a) =>
              (a.card.name.toUpperCase().includes('COBRIZO') || (a.card.ability || '').toLowerCase().includes('bajar dragones')) &&
              (abilitiesUsedThisTurn[a.instanceId] || 0) < 1
          );
          if (cobrizoAlly) {
            const cobrizoRes = executeCardOnPlayAbility(cobrizoAlly.card, updatedCpu, playerRef.current, {
              isCpu: true,
              isManualActivation: true,
              instanceId: cobrizoAlly.instanceId,
              allyInstanceId: cobrizoAlly.instanceId,
            });
            updatedCpu = applyCpuAbility(cobrizoRes);
            setAbilitiesUsedThisTurn((prev) => ({ ...prev, [cobrizoAlly.instanceId]: 1 }));
            addLog(`🐉 Rival activó a Dragón Cobrizo: Genera 2 Oros exclusivamente para bajar Dragones.`);
          }

          // A. Ally
          const playableAlly = updatedCpu.mano.find(
            (c) => c.type === 'Aliado' && getEligibleGoldCards(updatedCpu.oroCards, c).length >= c.cost
          );
          if (playableAlly) {
            soundFx.playSummon();
            const { paid, remaining } = payGoldForCard(updatedCpu.oroCards, playableAlly.cost, playableAlly);
            const cpuCanAttackImmediately = allyCanAttackOnEntry(playableAlly, updatedCpu);
            const isCpuDemonio =
              (playableAlly.name || '').toUpperCase().includes('DRAGON DEMONIO') ||
              (playableAlly.name || '').toUpperCase().includes('DEMONIO') ||
              (playableAlly.ability || '').toLowerCase().includes('destiérralo al final') ||
              (playableAlly.ability || '').toLowerCase().includes('al final de este turno, destiérralo') ||
              (playableAlly.ability || '').toLowerCase().includes('destierralo al final') ||
              (playableAlly.ability || '').toLowerCase().includes('al final de este turno destierralo');
            const isCpuTalismanImmune =
              isCpuDemonio ||
              (playableAlly.ability || '').toLowerCase().includes('no puede ser afectado por talismanes') ||
              (playableAlly.ability || '').toLowerCase().includes('no puede ser destruido por talismanes');

            const newAlly: AllyInPlay = {
              instanceId: `cpu-ally-${playableAlly.id}-${Date.now()}`,
              card: playableAlly,
              baseStrength: playableAlly.strength,
              currentStrength: playableAlly.strength,
              exhausted: false,
              canAttack: cpuCanAttackImmediately,
              attachedWeapons: [],
              banishAtTurnEnd: isCpuDemonio || undefined,
              cannotBeDestroyedByTalismans: isCpuTalismanImmune || undefined,
            };

            addLog(`🤖 Rival invocó a "${playableAlly.name}" (${playableAlly.strength} F) en su Línea de Defensa.`);
            if (cpuCanAttackImmediately) {
              addLog(`⚡ Rival invocó a "${playableAlly.name}" con Furia / Ataque Inmediato: Podrá atacar este turno.`);
            }
            updatedCpu = {
              ...updatedCpu,
              mano: updatedCpu.mano.filter((c) => c.id !== playableAlly.id),
              oroCards: remaining,
              oroPagado: [...updatedCpu.oroPagado, ...paid],
              reservaOro: remaining.length,
              lineaDefensa: [...updatedCpu.lineaDefensa, newAlly],
            };

            const abilityResult = executeCardOnPlayAbility(playableAlly, updatedCpu, player, {
              isCpu: true,
            });
            updatedCpu = applyCpuAbility(abilityResult);
          }

          // B. Arma (Weapon) - Must be assigned to an eligible Ally, or played to Línea de Apoyo if specified
          const playableWeapon = updatedCpu.mano.find(
            (c) => c.type === 'Arma' && getEligibleGoldCards(updatedCpu.oroCards, c).length >= c.cost
          );
          if (playableWeapon) {
            if (isWeaponSupportLineOnly(playableWeapon)) {
              const { paid, remaining } = payGoldForCard(updatedCpu.oroCards, playableWeapon.cost, playableWeapon);
              const sup: SupportInPlay = {
                instanceId: `cpu-sup-wpn-${playableWeapon.id}-${Date.now()}`,
                card: playableWeapon,
              };
              updatedCpu = {
                ...updatedCpu,
                mano: updatedCpu.mano.filter((c) => c.id !== playableWeapon.id),
                oroCards: remaining,
                oroPagado: [...updatedCpu.oroPagado, ...paid],
                reservaOro: remaining.length,
                lineaApoyo: [...updatedCpu.lineaApoyo, sup],
              };
              addLog(`🤖 Rival jugó el Arma "${playableWeapon.name}" en su Línea de Apoyo (DAR 4.3.6).`);
              const abilityResult = executeCardOnPlayAbility(playableWeapon, updatedCpu, player, {
                isCpu: true,
              });
              updatedCpu = applyCpuAbility(abilityResult);
            } else {
              const eligibleTarget = updatedCpu.lineaDefensa.find(
                (a) => checkWeaponBearerEligibility(playableWeapon, a).allowed
              );
              if (eligibleTarget) {
                const check = checkWeaponBearerEligibility(playableWeapon, eligibleTarget);
                const { paid, remaining } = payGoldForCard(updatedCpu.oroCards, playableWeapon.cost, playableWeapon);

                updatedCpu = {
                  ...updatedCpu,
                  mano: updatedCpu.mano.filter((c) => c.id !== playableWeapon.id),
                  oroCards: remaining,
                  oroPagado: [...updatedCpu.oroPagado, ...paid],
                  reservaOro: remaining.length,
                  lineaDefensa: updatedCpu.lineaDefensa.map((a) => {
                    if (a.instanceId === eligibleTarget.instanceId) {
                      return {
                        ...a,
                        currentStrength: a.currentStrength + check.bonusStrength,
                        attachedWeapons: [...(a.attachedWeapons || []), playableWeapon],
                        unblockable: check.traits.unblockable || a.unblockable,
                        indestructibleInCombat: check.traits.indestructibleInCombat || a.indestructibleInCombat,
                      };
                    }
                    return a;
                  }),
                };
                addLog(`🤖 Rival equipó el Arma "${playableWeapon.name}" a "${eligibleTarget.card.name}" (+${check.bonusStrength} F) - DAR 4.2.2.`);
                const abilityResult = executeCardOnPlayAbility(playableWeapon, updatedCpu, player, {
                  isCpu: true,
                });
                updatedCpu = applyCpuAbility(abilityResult);
              }
            }
          }

          // C. Tótem - Always goes to Línea de Apoyo
          const playableTotem = updatedCpu.mano.find(
            (c) => c.type === 'Tótem' && getEligibleGoldCards(updatedCpu.oroCards, c).length >= c.cost
          );
          if (playableTotem) {
            const { paid, remaining } = payGoldForCard(updatedCpu.oroCards, playableTotem.cost, playableTotem);
            const sup: SupportInPlay = {
              instanceId: `cpu-totem-${playableTotem.id}-${Date.now()}`,
              card: playableTotem,
            };
            updatedCpu = {
              ...updatedCpu,
              mano: updatedCpu.mano.filter((c) => c.id !== playableTotem.id),
              oroCards: remaining,
              oroPagado: [...updatedCpu.oroPagado, ...paid],
              reservaOro: remaining.length,
              lineaApoyo: [...updatedCpu.lineaApoyo, sup],
            };
            addLog(`🤖 Rival jugó el Tótem "${playableTotem.name}" en su Línea de Apoyo (DAR 4.2.4).`);
            const abilityResult = executeCardOnPlayAbility(playableTotem, updatedCpu, player, {
              isCpu: true,
            });
            updatedCpu = applyCpuAbility(abilityResult);
          }

          // D. Talismán
          const playableTalisman = updatedCpu.mano.find(
            (c) => c.type === 'Talismán' && getEligibleGoldCards(updatedCpu.oroCards, c).length >= c.cost
          );
          if (playableTalisman) {
            const { paid, remaining } = payGoldForCard(updatedCpu.oroCards, playableTalisman.cost, playableTalisman);
            soundFx.playSummon();
            addLog(`🤖 Rival jugó el Talismán "${playableTalisman.name}".`);
            updatedCpu = {
              ...updatedCpu,
              mano: updatedCpu.mano.filter((c) => c.id !== playableTalisman.id),
              oroCards: remaining,
              oroPagado: [...updatedCpu.oroPagado, ...paid],
              reservaOro: remaining.length,
              cementerio: [...updatedCpu.cementerio, playableTalisman],
            };
            const abilityResult = executeCardOnPlayAbility(playableTalisman, updatedCpu, player, {
              isCpu: true,
            });
            updatedCpu = applyCpuAbility(abilityResult);
          }

          const withContinuousAuras = recalculateContinuousAuras(updatedCpu, playerRef.current);
          cpuRef.current = withContinuousAuras;
          return withContinuousAuras;
        });

        // 3. CPU Attack Phase (DAR 5.3)
        setTimeout(() => {
          setCpu((checkCpu) => {
            const readyAttackers = checkCpu.lineaDefensa.filter((a) => a.canAttack);
            if (readyAttackers.length > 0) {
              let attacker = readyAttackers[0];
              let remainingDef = checkCpu.lineaDefensa.filter((a) => a.instanceId !== attacker.instanceId);

              const normStr = (s: string) =>
                (s || '')
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .trim();

              const normName = normStr(attacker.card.name);
              const normAbility = normStr(attacker.card.ability || '');
              const willSuicide =
                normName.includes('dragon montana') ||
                normName.includes('dregon') ||
                normName.includes('ravido') ||
                /si\s+.*ataca.*(?:debe\s+ser|es)\s+destruido.*final\s+del\s+turno/i.test(normAbility) ||
                /declarado\s+atacante.*destruir.*final\s+del\s+turno/i.test(normAbility) ||
                /destruir.*(?:al\s+)?final\s+del\s+turno/i.test(normAbility);

              if (willSuicide) {
                abilityLogger.logAttackDeclarationTrigger(
                  'Autodestrucción al Fin del Turno (CPU)',
                  attacker.card.name,
                  'Marcado para autodestrucción al final del turno por haber sido declarado atacante.'
                );
              }

              if (normName.includes('dragon demonio') || normAbility.includes('destierralo')) {
                abilityLogger.logAttackDeclarationTrigger(
                  'Destierro al Fin del Turno (CPU)',
                  attacker.card.name,
                  'Marcado para destierro a la Zona de Destierro al final del turno ("Al final de este turno, destiérralo").'
                );
              }

              attacker = {
                ...attacker,
                hasAttackedThisTurn: true,
                destroyAtTurnEndIfAttacked: willSuicide,
              };

              // Triggers when CPU declares attack:
              // 1) Dragón de Eter
              if (normName.includes('dragon de eter')) {
                abilityLogger.logAttackDeclarationTrigger(
                  'Dragón de Eter (CPU)',
                  attacker.card.name,
                  'Todos los Aliados del Jugador reciben -1 a la Fuerza hasta el final del turno.'
                );
                setPlayer((prev) =>
                  recalculateContinuousAuras(
                    {
                      ...prev,
                      lineaDefensa: prev.lineaDefensa.map((b) => {
                        const prevF = b.currentStrength;
                        const newF = Math.max(0, b.currentStrength - 1);
                        abilityLogger.logStrengthModification({
                          sourceCardName: 'Dragón de Eter',
                          sourceType: 'Declaración_Ataque',
                          targetAlly: b,
                          targetOwner: 'player',
                          changeType: 'debuff',
                          amount: 1,
                          isPermanent: false,
                          previousStrength: prevF,
                          newStrength: newF,
                          reason: 'Disparado por Dragón de Eter rival al atacar.',
                        });
                        return {
                          ...b,
                          turnStrengthBonus: (b.turnStrengthBonus || 0) - 1,
                          currentStrength: newF,
                        };
                      }),
                      lineaAtaque: (prev.lineaAtaque || []).map((b) => {
                        const prevF = b.currentStrength;
                        const newF = Math.max(0, b.currentStrength - 1);
                        abilityLogger.logStrengthModification({
                          sourceCardName: 'Dragón de Eter',
                          sourceType: 'Declaración_Ataque',
                          targetAlly: b,
                          targetOwner: 'player',
                          changeType: 'debuff',
                          amount: 1,
                          isPermanent: false,
                          previousStrength: prevF,
                          newStrength: newF,
                          reason: 'Disparado por Dragón de Eter rival al atacar.',
                        });
                        return {
                          ...b,
                          turnStrengthBonus: (b.turnStrengthBonus || 0) - 1,
                          currentStrength: newF,
                        };
                      }),
                    },
                    checkCpu
                  )
                );
                addLog('✨ "Dragón de Eter" rival es declarado atacante: ¡Todos tus Aliados ganan -1 a la Fuerza hasta el final del turno!');
              }

              // 2) Sir Thomas
              if (normName.includes('sir thomas')) {
                const prevF = attacker.currentStrength;
                const newF = attacker.currentStrength + 2;
                abilityLogger.logAttackDeclarationTrigger(
                  'Sir Thomas (CPU)',
                  attacker.card.name,
                  'Gana +2 a la Fuerza hasta el final del turno.'
                );
                abilityLogger.logStrengthModification({
                  sourceCardName: 'Sir Thomas',
                  sourceType: 'Declaración_Ataque',
                  targetAlly: attacker,
                  targetOwner: 'cpu',
                  changeType: 'buff',
                  amount: 2,
                  isPermanent: false,
                  previousStrength: prevF,
                  newStrength: newF,
                  reason: 'Disparado por Sir Thomas rival al atacar.',
                });
                attacker = {
                  ...attacker,
                  turnStrengthBonus: (attacker.turnStrengthBonus || 0) + 2,
                  currentStrength: newF,
                };
                addLog('✨ "Sir Thomas" rival es declarado atacante: ¡Gana +2 a la Fuerza hasta el final del turno!');
              }

              // 3) Ciervo Sagrado
              if (normName.includes('ciervo sagrado')) {
                abilityLogger.logAttackDeclarationTrigger(
                  'Ciervo Sagrado (CPU)',
                  attacker.card.name,
                  'Aliados imbloqueables rivales ganan +1 a la Fuerza hasta el final del turno.'
                );
                remainingDef = remainingDef.map((a) => {
                  if (!a.unblockable) return a;
                  const prevF = a.currentStrength;
                  const newF = a.currentStrength + 1;
                  abilityLogger.logStrengthModification({
                    sourceCardName: 'Ciervo Sagrado',
                    sourceType: 'Declaración_Ataque',
                    targetAlly: a,
                    targetOwner: 'cpu',
                    changeType: 'buff',
                    amount: 1,
                    isPermanent: false,
                    previousStrength: prevF,
                    newStrength: newF,
                    reason: 'Disparado por Ciervo Sagrado rival al atacar.',
                  });
                  return {
                    ...a,
                    turnStrengthBonus: (a.turnStrengthBonus || 0) + 1,
                    currentStrength: newF,
                  };
                });
                addLog('✨ "Ciervo Sagrado" rival ataca: ¡Aliados imbloqueables rivales ganan +1 a la Fuerza!');
              }

              // 4) Dragón de Luz in remainingDef
              let nextCpuCastillo = checkCpu.castillo;
              let nextCpuCementerio = checkCpu.cementerio;
              const cpuDragonDeLuz = remainingDef.find(
                (a) => normStr(a.card.name).includes('dragon de luz') && !a.dragonDeLuzTriggeredTurn
              );
              if (cpuDragonDeLuz && nextCpuCementerio.length > 0) {
                const recycleCount = Math.min(3, nextCpuCementerio.length);
                const recycledCards = nextCpuCementerio.slice(-recycleCount);
                nextCpuCementerio = nextCpuCementerio.slice(0, nextCpuCementerio.length - recycleCount);
                nextCpuCastillo = [...nextCpuCastillo, ...recycledCards].sort(() => Math.random() - 0.5);
                remainingDef = remainingDef.map((a) =>
                  a.instanceId === cpuDragonDeLuz.instanceId ? { ...a, dragonDeLuzTriggeredTurn: 1 } : a
                );
                abilityLogger.logAttackDeclarationTrigger(
                  'Dragón de Luz (CPU)',
                  cpuDragonDeLuz.card.name,
                  `Al no ser declarado atacante, el Rival barajó ${recycledCards.length} cartas del Cementerio al Mazo Castillo.`
                );
                addLog(
                  `✨ "Dragón de Luz": Al no ser declarado atacante, el Rival barajó ${recycledCards.length} cartas de su Cementerio en su Mazo Castillo.`
                );
              }

              soundFx.playSummon();
              setPhase('DECLARACION_ATAQUE');
              addLog(`⚔️ Rival declara ataque con "${attacker.card.name}" (${attacker.currentStrength} F).`);

              // CPU Ettin trigger when declared attacker
              if (attacker.card.name.toUpperCase().includes('ETTIN')) {
                const idx = nextCpuCastillo.findIndex((c) => c.type === 'Aliado' && c.strength === 2);
                if (idx !== -1) {
                  const found = nextCpuCastillo[idx];
                  nextCpuCastillo = [
                    ...nextCpuCastillo.slice(0, idx),
                    ...nextCpuCastillo.slice(idx + 1),
                  ];
                  const newAlly: AllyInPlay = {
                    instanceId: `cpu-ally-${found.id}-${Date.now()}`,
                    card: found,
                    baseStrength: found.strength,
                    currentStrength: found.strength,
                    exhausted: false,
                    canAttack: false,
                    attachedWeapons: [],
                  };
                  remainingDef.push(newAlly);
                  addLog(`🤖 Ettin (Rival) declarado atacante: Pone a "${found.name}" (Fuerza 2) en su Línea de Defensa sin pagar su coste.`);
                }
              }

              // Check if player controls Codex Artúricus in Oro Cards
              const playerHasCodex = player.oroCards.some((o) =>
                o.name.toUpperCase().includes('CODEX')
              );

              const resolveCombatDamage = (chosenBlocker?: AllyInPlay, banishedCodexNow?: boolean) => {
                setPhase('ASIGNACION_DANO');
                let unblocked = attacker.currentStrength;
                let blockerLog = '';
                let nextPlayerState = { ...player };
                let nextCpuState = {
                  ...checkCpu,
                  castillo: nextCpuCastillo,
                  cementerio: nextCpuCementerio,
                  lineaDefensa: remainingDef,
                  lineaAtaque: [attacker],
                };

                if (chosenBlocker) {
                  soundFx.playShieldBlock();
                  addLog(`🛡️ Bloqueaste a "${attacker.card.name}" (${attacker.currentStrength} F) con "${chosenBlocker.card.name}" (${chosenBlocker.currentStrength} F).`);

                  if (attacker.currentStrength > chosenBlocker.currentStrength) {
                    unblocked = attacker.currentStrength - chosenBlocker.currentStrength;
                    blockerLog = ` Tu "${chosenBlocker.card.name}" fue destruido en combate.`;
                    nextPlayerState = {
                      ...nextPlayerState,
                      lineaDefensa: nextPlayerState.lineaDefensa.filter((a) => a.instanceId !== chosenBlocker.instanceId),
                      cementerio: [...nextPlayerState.cementerio, chosenBlocker.card],
                    };
                    const res = checkLeavingPlayAllies([chosenBlocker], 'player', nextPlayerState, nextCpuState);
                    nextPlayerState = res.updatedPlayer;
                    nextCpuState = res.updatedCpu;
                    res.logMessages.forEach((msg) => addLog(msg));
                  } else if (attacker.currentStrength === chosenBlocker.currentStrength) {
                    unblocked = 0;
                    addLog(`⚖️ Choque equilibrado: Ambos Aliados son destruidos (DAR 5.3.4).`);
                    nextPlayerState = {
                      ...nextPlayerState,
                      lineaDefensa: nextPlayerState.lineaDefensa.filter((a) => a.instanceId !== chosenBlocker.instanceId),
                      cementerio: [...nextPlayerState.cementerio, chosenBlocker.card],
                    };
                    nextCpuState = {
                      ...nextCpuState,
                      lineaAtaque: [],
                      cementerio: [...nextCpuState.cementerio, attacker.card],
                    };
                    const res1 = checkLeavingPlayAllies([chosenBlocker], 'player', nextPlayerState, nextCpuState);
                    nextPlayerState = res1.updatedPlayer;
                    nextCpuState = res1.updatedCpu;
                    res1.logMessages.forEach((msg) => addLog(msg));
                    const res2 = checkLeavingPlayAllies([attacker], 'cpu', nextPlayerState, nextCpuState);
                    nextPlayerState = res2.updatedPlayer;
                    nextCpuState = res2.updatedCpu;
                    res2.logMessages.forEach((msg) => addLog(msg));
                  } else {
                    unblocked = 0;
                    addLog(`🛡️ Tu defensor "${chosenBlocker.card.name}" superó al atacante rival ("${attacker.card.name}" es destruido).`);
                    nextCpuState = {
                      ...nextCpuState,
                      lineaAtaque: [],
                      cementerio: [...nextCpuState.cementerio, attacker.card],
                    };
                    const res = checkLeavingPlayAllies([attacker], 'cpu', nextPlayerState, nextCpuState);
                    nextPlayerState = res.updatedPlayer;
                    nextCpuState = res.updatedCpu;
                    res.logMessages.forEach((msg) => addLog(msg));
                  }
                } else {
                  addLog(`⚡ Decidiste no bloquear (o no tenías defensores habilitados) -> Ataque de "${attacker.card.name}" (${attacker.currentStrength} F) impacta directo al Mazo Castillo.`);
                }

                if (combatDamagePrevented || banishedCodexNow) {
                  unblocked = 0;
                  addLog(`🌌 ¡Codex Artúricus protegió tu reino! Todo el daño de combate se redujo a 0.${blockerLog}`);
                } else if (unblocked > 0) {
                  soundFx.playDamage();
                  const milled = nextPlayerState.castillo.slice(0, unblocked);
                  nextPlayerState = {
                    ...nextPlayerState,
                    castillo: nextPlayerState.castillo.slice(unblocked),
                    cementerio: [...nextPlayerState.cementerio, ...milled],
                  };
                  addLog(`💔 El ataque rival te inflige ${unblocked} de Daño al Mazo Castillo.${blockerLog}`);

                  // Post-combat damage trigger for CPU attacker (e.g. "si hace daño al mazo castillo rival botar una carta...")
                  const combatTrigRes = executeCombatDamageAbilities(attacker, unblocked, nextCpuState, nextPlayerState, true);
                  if (combatTrigRes.logMessages.length > 0) {
                    combatTrigRes.logMessages.forEach((msg) => addLog(msg));
                    nextCpuState = combatTrigRes.updatedAttackerOwner;
                    nextPlayerState = combatTrigRes.updatedDefender;
                  }
                }

                setPlayer(recalculateContinuousAuras(nextPlayerState, nextCpuState));
                setCpu(recalculateContinuousAuras(nextCpuState, nextPlayerState));

                setTimeout(() => {
                  executeFaseFinal('cpu', nextPlayerState, nextCpuState);
                  setIsProcessingStep(false);
                }, 1500);
              };

              const proceedWithDamageAssignment = (chosenBlocker?: AllyInPlay) => {
                if (playerHasCodex) {
                  setCodexPromptState({
                    isOpen: true,
                    pendingAttackerStrength: attacker.currentStrength,
                    pendingAttackerName: attacker.card.name,
                    onConfirmBanish: () => {
                      setCodexPromptState(null);
                      soundFx.playShieldBlock();
                      setCombatDamagePrevented(true);
                      setPlayer((prev) => {
                        const codexCard = prev.oroCards.find((o) =>
                          o.name.toUpperCase().includes('CODEX')
                        );
                        const remainingGold = prev.oroCards.filter(
                          (o) => !o.name.toUpperCase().includes('CODEX')
                        );
                        return {
                          ...prev,
                          oroCards: remainingGold,
                          reservaOro: remainingGold.length,
                          destierro: codexCard ? [...prev.destierro, codexCard] : prev.destierro,
                        };
                      });
                      addLog('🌌 ¡Activaste y desterraste Codex Artúricus! Todo el daño de combate se reduce a 0.');
                      resolveCombatDamage(chosenBlocker, true);
                    },
                    onDecline: () => {
                      setCodexPromptState(null);
                      resolveCombatDamage(chosenBlocker, false);
                    },
                  });
                } else {
                  setTimeout(() => {
                    resolveCombatDamage(chosenBlocker, false);
                  }, 800);
                }
              };

              // Step 5.3.2: Declaración de Bloqueo del Defensor (El usuario decide bloquear o dejar pasar daño)
              setTimeout(() => {
                setPhase('DECLARACION_BLOQUEO');
                addLog('🛡️ Declaración de Bloqueo (DAR 5.3.2): Como defensor, elige con qué Aliado bloquear o si dejas pasar el daño.');

                const currentDefenders = player.lineaDefensa;
                const eligibleDefenders = currentDefenders.filter((a) => !a.cannotDefend);
                const restrictedDefenders = currentDefenders.filter((a) => a.cannotDefend);

                if (restrictedDefenders.length > 0) {
                  restrictedDefenders.forEach((b) => {
                    addLog(`🚫 Tu "${b.card.name}" no puede defender ni bloquear este turno (afectado por Talismán/Efecto).`);
                  });
                }

                if (eligibleDefenders.length > 0) {
                  setPlayerBlockPromptState({
                    isOpen: true,
                    attacker,
                    eligibleBlockers: eligibleDefenders,
                    onSelectBlocker: (blocker) => {
                      setPlayerBlockPromptState(null);
                      setBlockAssignments({ [attacker.instanceId]: blocker.instanceId });
                      proceedWithDamageAssignment(blocker);
                    },
                    onLetDamagePass: () => {
                      setPlayerBlockPromptState(null);
                      setBlockAssignments({});
                      proceedWithDamageAssignment(undefined);
                    },
                  });
                } else {
                  if (currentDefenders.length > 0) {
                    addLog('⚠️ Todos tus Aliados están inhabilitados para defender. El ataque rival impactará directo al Castillo.');
                  } else {
                    addLog('⚠️ No tienes Aliados en tu Línea de Defensa para bloquear. El ataque rival impactará directo al Castillo.');
                  }
                  proceedWithDamageAssignment(undefined);
                }
              }, 1000);

              return {
                ...checkCpu,
                lineaDefensa: remainingDef,
                lineaAtaque: [attacker],
              };
            } else {
              addLog('🤖 Rival no tiene Aliados preparados para atacar este turno.');
              setTimeout(() => {
                executeFaseFinal('cpu', player, checkCpu);
                setIsProcessingStep(false);
              }, 1200);
              return checkCpu;
            }
          });
        }, 1200);
      }, 1200);
    }, 1000);
  };

  // Phase badge color
  const getPhaseBadge = (p: TurnPhase) => {
    switch (p) {
      case 'AGRUPACION':
        return { label: '5.1 Agrupación', bg: 'bg-blue-600' };
      case 'VIGILIA':
        return { label: '5.2 Vigilia', bg: 'bg-emerald-600' };
      case 'DECLARACION_ATAQUE':
        return { label: '5.3.1 Declaración de Ataque', bg: 'bg-amber-600' };
      case 'DECLARACION_BLOQUEO':
        return { label: '5.3.2 Declaración de Bloqueo', bg: 'bg-indigo-600' };
      case 'GUERRA_TALISMANES':
        return { label: '5.3.3 Guerra de Talismanes', bg: 'bg-purple-600 animate-pulse' };
      case 'ASIGNACION_DANO':
        return { label: '5.3.4 Asignación de Daño', bg: 'bg-red-600' };
      case 'FASE_FINAL':
        return { label: '5.4 Fase Final', bg: 'bg-neutral-700' };
      case 'FINAL_TURNO':
        return { label: '5.5 Final del Turno', bg: 'bg-neutral-800' };
    }
  };

  const badge = getPhaseBadge(phase);

  return (
    <div className="relative min-h-[calc(100vh-80px)] bg-[#0b0c10] text-neutral-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Banner: Turn info, Phase, Actions & Rules */}
      <div className="relative z-30 px-3 py-2 bg-neutral-900/95 border-b border-neutral-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left Section: Turn & Phase */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-cinzel font-bold text-amber-400">
            Turno {turn}
          </span>
          <span className="text-neutral-600">·</span>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-cinzel font-bold text-white shadow-xs ${
              activePlayer === 'player' ? 'bg-amber-600' : 'bg-red-700'
            }`}
          >
            {activePlayer === 'player' ? 'Tu Turno' : 'Turno Rival'}
          </span>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-cinzel font-semibold text-white ${badge.bg}`}>
            {badge.label}
          </span>

          <button
            onClick={() => setShowFieldInspector(true)}
            className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/70 text-xs font-cinzel font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
            title="Revisar cartas en juego y armas equipadas de ambos jugadores"
          >
            <span>🔍</span> Revisar Campo
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-medium border border-amber-600/40 transition-colors flex items-center gap-1"
            title="Consultar Reglamento Oficial D.A.R. 1.0"
          >
            <span>📜</span> Reglas D.A.R.
          </button>

          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1"
          >
            <span>📜</span> Registro ({logs.length})
          </button>
        </div>

        {/* Center Section: Mat Switcher (Dual Cara a Cara | Solo Jugador | Solo Rival) */}
        <div className="flex items-center bg-black/70 p-1 rounded-xl border border-neutral-700 shadow-inner">
          <button
            onClick={() => {
              soundFx.playCardFlick();
              setViewMode('dual');
            }}
            className={`px-3 py-1 text-xs font-cinzel font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'dual'
                ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-lg shadow-amber-950 font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Ver los 2 tapetes cara a cara al mismo tiempo"
          >
            <span>⚔️</span> Ambos Tapetes (Cara a Cara)
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              setViewMode('player');
            }}
            className={`px-2.5 py-1 text-xs font-cinzel font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'player'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Ver solo tu tapete"
          >
            <span>🛡️</span> Solo Tu Tapete
          </button>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              setViewMode('cpu');
            }}
            className={`px-2.5 py-1 text-xs font-cinzel font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'cpu'
                ? 'bg-red-700 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Ver solo el tapete del rival"
          >
            <span>👹</span> Solo Tapete Rival
          </button>
        </div>

        {/* Right Section: Phase Actions */}
        <div className="flex items-center gap-2">
          {activePlayer === 'player' && phase === 'AGRUPACION' && (
            <button
              onClick={() => executeAgrupacion('player')}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-cinzel animate-pulse shadow-md"
            >
              🔄 Agrupar y Pasar a Vigilia
            </button>
          )}

          {activePlayer === 'player' && phase === 'VIGILIA' && (
            <>
              <button
                onClick={handleStartAttackDeclaration}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold font-cinzel transition-all shadow-md shadow-amber-950 flex items-center gap-1"
              >
                <span>⚔️</span> Declarar Ataque (5.3)
              </button>
              <button
                onClick={() => executeFaseFinal('player', player, cpu)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
              >
                ⏭️ Pasar Turno (DAR 5.4)
              </button>
            </>
          )}

          {activePlayer === 'player' && phase === 'DECLARACION_ATAQUE' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmAttackDeclaration}
                disabled={selectedAttackerIds.length === 0}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-cinzel transition-colors disabled:opacity-50 shadow-md flex items-center gap-1"
              >
                <span>💥</span> Confirmar Ataque ({selectedAttackerIds.length})
              </button>
              <button
                onClick={() => setPhase('VIGILIA')}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
              >
                Cancelar
              </button>
            </div>
          )}

          {phase === 'GUERRA_TALISMANES' && (
            <button
              onClick={handlePassPriority}
              className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold font-cinzel shadow-md flex items-center gap-1.5"
            >
              <span>✋</span> Ceder Prioridad (DAR 6.7)
            </button>
          )}

          <button
            onClick={onExitDuel}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs"
          >
            Salir
          </button>
        </div>
      </div>

      {/* WEAPON TARGETING PROMPT BANNER (When assigning an Arma to an Ally) */}
      {assigningWeaponCard && (
        <div className="relative z-30 mx-3 mt-2 p-3 rounded-xl bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-2 border-amber-400 text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-3xl animate-bounce shrink-0">🗡️</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-cinzel font-bold text-amber-200">
                  MODO ASIGNAR ARMA: "{assigningWeaponCard.name}"
                </h4>
                {assigningWeaponCard.strength > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-bold">
                    +{assigningWeaponCard.strength} Fuerza
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-amber-400 text-[10px] font-mono border border-amber-500/50">
                  Coste: {(assigningWeaponCard as any).freeCost ? '0 Oro (Gratis por La Dama del Lago)' : `${assigningWeaponCard.cost} Oro`}
                </span>
              </div>
              <p className="text-xs text-amber-300/90 mt-0.5 leading-relaxed font-sans">
                {assigningWeaponCard.ability}
              </p>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                👉 Haz clic sobre un Aliado compatible (halo verde). Aliados incompatibles por raza, límite o restricción están marcados en rojo (DAR 4.2.2).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playCardFlick();
              setAssigningWeaponCard(null);
            }}
            className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500 text-xs font-semibold shrink-0 cursor-pointer shadow-md"
          >
            ✕ Cancelar Asignación
          </button>
        </div>
      )}

      {/* Notice Banner */}
      {gameAlert && (
        <div className="relative z-30 mx-4 mt-2 px-4 py-2 rounded-lg bg-amber-950/95 border border-amber-500 text-amber-200 text-xs font-medium flex items-center justify-between shadow-xl animate-pulse">
          <span>⚠️ {gameAlert}</span>
          <button onClick={() => setGameAlert(null)} className="text-amber-400 hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PLAYMAT BOARDS CONTAINER (DUAL / INDIVIDUAL VIEW)                         */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 p-2 sm:p-3 max-w-7xl mx-auto w-full flex flex-col justify-start">
        {/* DUAL VIEW: Both tapetes face-to-face simultaneously */}
        {viewMode === "dual" && (
          <div className="flex flex-col gap-2">
            {/* 1. TOP TAPETE: Rival (CPU) - Gira 180° vista mesa real */}
            <PlaymatBoard
              owner="cpu"
              state={cpu}
              isPlayer={false}
              activePlayer={activePlayer}
              phase={phase}
              deckName={currentCpuDeckName}
              isDualView={true}
              rotated180={true}
              selectedAttackerIds={selectedAttackerIds}
              blockAssignments={blockAssignments}
              abilitiesUsedThisTurn={abilitiesUsedThisTurn}
              assigningWeaponCard={assigningWeaponCard}
              talismansPriority={talismansPriority}
              playerOroJugadoEsteTurno={player.oroJugadoEsteTurno}
              onOpenCardDetail={openCardDetail}
              onOpenGraveyard={(title, cards) => setGraveyardViewer({ title, cards })}
              onOpenBanish={(title, cards) => setGraveyardViewer({ title, cards })}
              onActivateAbility={(card, instanceId, allyInstanceId) =>
                handleActivateInPlayAbility(card, instanceId, allyInstanceId)
              }
              onAssignWeaponTarget={handleAssignWeaponToAlly}
              onToggleAttacker={toggleSelectAttacker}
              onChangeCpuDeckClick={() => setShowCpuDeckModal(true)}
              onOpenFieldInspector={() => setShowFieldInspector(true)}
            />

            {/* Central Battle Confrontation Divider */}
            <div className="relative my-1 px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-950/90 via-neutral-900 to-amber-950/90 border border-neutral-700/80 flex items-center justify-between text-xs backdrop-blur-md shadow-md">
              <div className="flex items-center gap-2">
                <span className="font-cinzel font-bold text-red-400 text-xs">👹 Rival (CPU)</span>
                <span className="text-neutral-500 font-mono text-xs">⚡ VS ⚡</span>
                <span className="font-cinzel font-bold text-amber-400 text-xs">🛡️ Jugador (Tú)</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-cinzel text-neutral-300">
                {phase === "DECLARACION_ATAQUE" && (
                  <span className="text-amber-400 font-bold animate-pulse">
                    ⚔️ Selecciona atacantes en tu Línea de Defensa abajo y confirma ataque
                  </span>
                )}
                {phase === "DECLARACION_BLOQUEO" && (
                  <span className="text-indigo-400 font-bold">
                    🛡️ El Rival está asignando bloqueadores
                  </span>
                )}
                {phase === "GUERRA_TALISMANES" && (
                  <span className="text-purple-400 font-bold animate-pulse">
                    📜 Guerra de Talismanes (Prioridad: {talismansPriority === "defender" ? "Rival" : "Tú"})
                  </span>
                )}
                {phase === "VIGILIA" && (
                  <span className="text-neutral-400">
                    Fase de Vigilia · Juega Oros, Aliados, Armas o Tótems
                  </span>
                )}
                {phase === "AGRUPACION" && (
                  <span className="text-blue-400 font-bold">
                    Fase de Agrupación · Pulsa "Agrupar" para comenzar
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFieldInspector(true)}
                  className="px-2.5 py-0.5 rounded bg-amber-950/90 hover:bg-amber-900 text-amber-200 border border-amber-600/70 text-[10px] font-cinzel font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
                  title="Revisar cartas en juego y armas equipadas"
                >
                  <span>🔍</span> Revisar Campo
                </button>
                <button
                  onClick={() => setShowCpuDeckModal(true)}
                  className="px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 text-[10px] font-cinzel font-bold transition-colors cursor-pointer"
                  title="Cambiar mazo asignado al CPU"
                >
                  🤖 Cambiar Mazo Rival
                </button>
              </div>
            </div>

            {/* 2. BOTTOM TAPETE: Player (Tú) */}
            <PlaymatBoard
              owner="player"
              state={player}
              isPlayer={true}
              activePlayer={activePlayer}
              phase={phase}
              deckName={playerDeckName}
              isDualView={true}
              selectedAttackerIds={selectedAttackerIds}
              blockAssignments={blockAssignments}
              abilitiesUsedThisTurn={abilitiesUsedThisTurn}
              assigningWeaponCard={assigningWeaponCard}
              talismansPriority={talismansPriority}
              playerOroJugadoEsteTurno={player.oroJugadoEsteTurno}
              onOpenCardDetail={openCardDetail}
              onOpenGraveyard={(title, cards) => setGraveyardViewer({ title, cards })}
              onOpenBanish={(title, cards) => setGraveyardViewer({ title, cards })}
              onActivateAbility={(card, instanceId, allyInstanceId) =>
                handleActivateInPlayAbility(card, instanceId, allyInstanceId)
              }
              onAssignWeaponTarget={handleAssignWeaponToAlly}
              onToggleAttacker={toggleSelectAttacker}
              onChangeCpuDeckClick={() => setShowCpuDeckModal(true)}
              onOpenFieldInspector={() => setShowFieldInspector(true)}
            />
          </div>
        )}

        {/* SOLO JUGADOR VIEW */}
        {viewMode === "player" && (
          <div className="flex flex-col gap-2">
            {/* Quick Rival Bar */}
            <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-cinzel font-bold text-red-400 flex items-center gap-1">
                  <span>👹</span> Rival (CPU): <strong>{currentCpuDeckName}</strong>
                </span>
                <span className="text-neutral-500">·</span>
                <span>Castillo: <strong className="text-amber-400 font-mono">{cpu.castillo.length}</strong></span>
                <span className="text-neutral-500">·</span>
                <span>Mano: <strong className="text-amber-400 font-mono">{cpu.mano.length}</strong></span>
                <span className="text-neutral-500">·</span>
                <span>Oro: <strong className="text-amber-400 font-mono">{cpu.reservaOro}</strong></span>
                <span className="text-neutral-500">·</span>
                <span>Defensores: <strong className="text-red-400 font-mono">{cpu.lineaDefensa.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCpuDeckModal(true)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-red-300 text-[11px] font-cinzel font-semibold cursor-pointer"
                >
                  🤖 Cambiar Mazo Rival
                </button>
                <button
                  onClick={() => setViewMode("dual")}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-cinzel font-semibold cursor-pointer"
                >
                  ⚔️ Ver Ambos Tapetes
                </button>
              </div>
            </div>

            <PlaymatBoard
              owner="player"
              state={player}
              isPlayer={true}
              activePlayer={activePlayer}
              phase={phase}
              deckName={playerDeckName}
              isDualView={false}
              selectedAttackerIds={selectedAttackerIds}
              blockAssignments={blockAssignments}
              abilitiesUsedThisTurn={abilitiesUsedThisTurn}
              assigningWeaponCard={assigningWeaponCard}
              talismansPriority={talismansPriority}
              playerOroJugadoEsteTurno={player.oroJugadoEsteTurno}
              onOpenCardDetail={openCardDetail}
              onOpenGraveyard={(title, cards) => setGraveyardViewer({ title, cards })}
              onOpenBanish={(title, cards) => setGraveyardViewer({ title, cards })}
              onActivateAbility={(card, instanceId, allyInstanceId) =>
                handleActivateInPlayAbility(card, instanceId, allyInstanceId)
              }
              onAssignWeaponTarget={handleAssignWeaponToAlly}
              onToggleAttacker={toggleSelectAttacker}
              onOpenFieldInspector={() => setShowFieldInspector(true)}
            />
          </div>
        )}

        {/* SOLO RIVAL VIEW */}
        {viewMode === "cpu" && (
          <div className="flex flex-col gap-2">
            {/* Quick Player Bar */}
            <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-cinzel font-bold text-amber-400 flex items-center gap-1">
                  <span>🛡️</span> Tu Estado: <strong>{playerDeckName}</strong>
                </span>
                <span className="text-neutral-500">·</span>
                <span>Castillo: <strong className="text-amber-400 font-mono">{player.castillo.length}</strong></span>
                <span className="text-neutral-500">·</span>
                <span>Oro: <strong className="text-amber-400 font-mono">{player.reservaOro}</strong></span>
                <span className="text-neutral-500">·</span>
                <span>Defensores: <strong className="text-emerald-400 font-mono">{player.lineaDefensa.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCpuDeckModal(true)}
                  className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-[11px] font-cinzel font-semibold cursor-pointer"
                >
                  🤖 Cambiar Mazo Rival
                </button>
                <button
                  onClick={() => setViewMode("dual")}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-cinzel font-semibold cursor-pointer"
                >
                  ⚔️ Ver Ambos Tapetes
                </button>
              </div>
            </div>

            <PlaymatBoard
              owner="cpu"
              state={cpu}
              isPlayer={false}
              activePlayer={activePlayer}
              phase={phase}
              deckName={currentCpuDeckName}
              isDualView={false}
              rotated180={true}
              selectedAttackerIds={selectedAttackerIds}
              blockAssignments={blockAssignments}
              abilitiesUsedThisTurn={abilitiesUsedThisTurn}
              assigningWeaponCard={assigningWeaponCard}
              talismansPriority={talismansPriority}
              playerOroJugadoEsteTurno={player.oroJugadoEsteTurno}
              onOpenCardDetail={openCardDetail}
              onOpenGraveyard={(title, cards) => setGraveyardViewer({ title, cards })}
              onOpenBanish={(title, cards) => setGraveyardViewer({ title, cards })}
              onActivateAbility={(card, instanceId, allyInstanceId) =>
                handleActivateInPlayAbility(card, instanceId, allyInstanceId)
              }
              onAssignWeaponTarget={handleAssignWeaponToAlly}
              onToggleAttacker={toggleSelectAttacker}
              onChangeCpuDeckClick={() => setShowCpuDeckModal(true)}
              onOpenFieldInspector={() => setShowFieldInspector(true)}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PLAYER HAND AT BOTTOM (TU MANO)                                           */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full bg-neutral-900/95 border-t border-neutral-800 p-2.5 backdrop-blur-md shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-cinzel font-bold text-amber-300 px-1">
            <span className="flex items-center gap-2">
              <span>🎴</span> Tu Mano ({player.mano.length} cartas)
            </span>
            <div className="flex items-center gap-3 text-[11px] font-sans font-normal text-neutral-400">
              <span>Reserva de Oro disponible: <strong className="text-amber-400 font-mono font-bold">{player.reservaOro} 🪙</strong></span>
              <span>·</span>
              <span>Límite de mano en fase final: 8 cartas (DAR 5.5)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1 min-h-[145px]">
            {player.mano.length === 0 ? (
              <div className="w-full text-center text-xs text-neutral-500 italic py-6">
                Tu mano está vacía. Robarás 1 carta al inicio de tu siguiente turno.
              </div>
            ) : (
              player.mano.map((card) => {
                const isGold = card.type === 'Oro';
                const isSupportWeapon = card.type === 'Arma' && isWeaponSupportLineOnly(card);
                const alreadyInGold =
                  isGold &&
                  card.uniqueCard &&
                  player.oroCards.some(
                    (o) => o.name.toUpperCase().trim() === card.name.toUpperCase().trim()
                  );

                const canPlayGold =
                  isGold &&
                  activePlayer === 'player' &&
                  (phase === 'VIGILIA' || phase === 'AGRUPACION') &&
                  !player.oroJugadoEsteTurno &&
                  !alreadyInGold;
                const eligibleGold = getEligibleGoldCards(player.oroCards, card);
                const canPlayRegular =
                  !isGold &&
                  activePlayer === 'player' &&
                  (phase === 'VIGILIA' ||
                    phase === 'AGRUPACION' ||
                    (phase === 'GUERRA_TALISMANES' && card.type === 'Talismán')) &&
                  eligibleGold.length >= card.cost;

                const isPlayable = canPlayGold || canPlayRegular;

                const cannotPlayReason =
                  activePlayer !== 'player'
                    ? 'No es tu turno de juego.'
                    : isGold && player.oroJugadoEsteTurno
                    ? 'Regla DAR 4.2.5: Solo puedes jugar 1 carta de Oro por turno en tu Fase de Vigilia.'
                    : isGold && alreadyInGold
                    ? `Regla DAR 4.1.2: "${card.name}" es una Carta Única y ya tienes una en tu Reserva de Oro.`
                    : !isGold &&
                      phase !== 'VIGILIA' &&
                      phase !== 'AGRUPACION' &&
                      !(phase === 'GUERRA_TALISMANES' && card.type === 'Talismán')
                    ? 'Esta carta solo se puede jugar durante tu Fase de Vigilia.'
                    : !isGold && eligibleGold.length < card.cost
                    ? player.reservaOro >= card.cost
                      ? `Oro restringido: Tienes ${player.reservaOro} Oro, pero solo ${eligibleGold.length} es aplicable para "${card.name}" (el oro de Dragón Cobrizo solo sirve para bajar Dragones).`
                      : `No tienes suficiente Oro en Reserva (${player.reservaOro}/${card.cost} 🪙).`
                    : undefined;

                const playLabel = isGold
                  ? phase === 'AGRUPACION'
                    ? 'Agrupar y Bajar Oro'
                    : 'Bajar Oro'
                  : card.type === 'Tótem'
                  ? phase === 'AGRUPACION'
                    ? `Agrupar y Bajar Tótem (${card.cost} 🪙)`
                    : `Bajar a Línea de Apoyo (${card.cost} 🪙)`
                  : isSupportWeapon
                  ? phase === 'AGRUPACION'
                    ? `Agrupar y Jugar Arma (${card.cost} 🪙)`
                    : `Jugar en Línea de Apoyo (${card.cost} 🪙)`
                  : card.type === 'Arma'
                  ? phase === 'AGRUPACION'
                    ? `Agrupar y Asignar (${card.cost} 🪙)`
                    : `Asignar a un Aliado (${card.cost} 🪙)`
                  : card.type === 'Aliado'
                  ? phase === 'AGRUPACION'
                    ? `Agrupar e Invocar (${card.cost} 🪙)`
                    : `Invocar en Línea de Defensa (${card.cost} 🪙)`
                  : phase === 'AGRUPACION'
                  ? `Agrupar y Jugar Talismán (${card.cost} 🪙)`
                  : `Jugar Talismán (${card.cost} 🪙)`;

                return (
                  <div
                    key={card.id}
                    className={`relative shrink-0 group/handCard transition-transform duration-200 hover:-translate-y-2 ${
                      isPlayable ? 'ring-1 ring-amber-500/60 rounded-lg' : 'opacity-80'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (isPlayable) {
                          handlePlayCardFromAnywhere(card);
                        } else {
                          openCardDetail(
                            card,
                            'Tu Mano',
                            isPlayable,
                            playLabel,
                            undefined,
                            undefined,
                            false,
                            undefined,
                            false,
                            cannotPlayReason
                          );
                        }
                      }}
                      title="Clic para jugar o ver detalle"
                    >
                      <MythosCard card={card} size="sm" interactive={false} />
                    </div>

                    {/* Dedicated corner inspect button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCardDetail(
                          card,
                          'Tu Mano',
                          isPlayable,
                          playLabel,
                          undefined,
                          undefined,
                          false,
                          undefined,
                          false,
                          cannotPlayReason
                        );
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/85 hover:bg-amber-600 text-white text-[11px] flex items-center justify-center shadow-md transition-colors z-20"
                      title="Ver detalle 3D"
                    >
                      🔍
                    </button>

                    {/* Quick action buttons under card */}
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCardDetail(
                            card,
                            'Tu Mano',
                            isPlayable,
                            playLabel,
                            undefined,
                            undefined,
                            false,
                            undefined,
                            false,
                            cannotPlayReason
                          );
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 transition-colors flex items-center gap-0.5"
                      >
                        <span>🔍</span> Detalle
                      </button>
                      {isPlayable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayCardFromAnywhere(card);
                          }}
                          className="text-[9px] px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold transition-colors shadow-xs"
                          title={playLabel}
                        >
                          {isGold
                            ? '🪙 Bajar'
                            : card.type === 'Tótem'
                            ? '🗿 A Apoyo'
                            : isSupportWeapon
                            ? '🏹 A Apoyo'
                            : card.type === 'Arma'
                            ? '🗡️ Asignar'
                            : card.type === 'Aliado'
                            ? `🛡️ ${card.cost} 🪙`
                            : `📜 ${card.cost} 🪙`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DRAWER / POPUP FOR COMBAT LOGS (REGISTRO DE COMBATE)                      */}
      {/* ========================================================================= */}
      {showLogDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowLogDrawer(false)}
        >
          <div
            className="w-full max-w-xl max-h-[75vh] rounded-2xl bg-neutral-900 border border-neutral-800 p-4 shadow-2xl flex flex-col text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-cinzel font-bold text-amber-200 text-sm flex items-center gap-2">
                <span>📜</span> Registro Oficial de Batalla D.A.R. 1.0
              </h3>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1 text-xs font-mono text-neutral-300">
              {logs.map((log, i) => (
                <div key={i} className="p-2 rounded bg-neutral-950 border border-neutral-800/80">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal D.A.R. 1.0 */}
      <DarRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      {/* 3D Card Detail Inspection Modal */}
      {inspectedCardData && (
        <CardModal
          card={inspectedCardData.card}
          onClose={() => setInspectedCardData(null)}
          onPlayCard={
            inspectedCardData.sourceZone === 'Tu Mano'
              ? (c) => {
                  setInspectedCardData(null);
                  handlePlayCardFromAnywhere(c);
                }
              : inspectedCardData.canPlay
              ? (c) => {
                  setInspectedCardData(null);
                  handlePlayCardFromAnywhere(c);
                }
              : undefined
          }
          canPlay={inspectedCardData.canPlay}
          playLabel={inspectedCardData.playLabel}
          cannotPlayReason={inspectedCardData.cannotPlayReason}
          sourceZone={inspectedCardData.sourceZone}
          attachedWeapons={inspectedCardData.attachedWeapons}
          effectiveStrength={inspectedCardData.effectiveStrength}
          onActivateAbility={
            inspectedCardData.canActivate ||
            (inspectedCardData.sourceZone !== 'Tu Mano' &&
              hasActivatedInPlayAbility(inspectedCardData.card))
              ? (c) => {
                  setInspectedCardData(null);
                  handleActivateInPlayAbility(
                    c,
                    inspectedCardData.instanceId || c.id,
                    inspectedCardData.allyInstanceId
                  );
                }
              : undefined
          }
          canActivate={inspectedCardData.canActivate}
          activateLabel={inspectedCardData.activateLabel}
          isExhausted={inspectedCardData.isExhausted}
        />
      )}

      {/* Codex Artúricus Combat Defense Prompt Modal */}
      {codexPromptState && codexPromptState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-3xl">🌌</div>
            <h3 className="text-lg font-cinzel font-bold text-amber-300">
              ¡Respuesta de Combate: Codex Artúricus!
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              El rival está atacando con <strong className="text-red-400 font-cinzel">"{codexPromptState.pendingAttackerName}"</strong> ({codexPromptState.pendingAttackerStrength} Fuerza).
            </p>
            <div className="p-3 rounded-lg bg-neutral-950 border border-amber-500/40 text-left text-xs font-mono text-amber-200">
              📜 <em>"En la fase de asignación de daño, destierra Codex Artúricos para reducir todo el daño a 0." (D.A.R. 5.3.4)</em>
            </div>
            <p className="text-xs text-neutral-400">
              ¿Deseas desterrar Codex Artúricus de tu Reserva de Oro para anular completamente este daño?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={codexPromptState.onConfirmBanish}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-cinzel font-bold text-xs shadow-lg shadow-amber-950/60 cursor-pointer transition-transform hover:scale-102"
              >
                🌌 Desterrar Codex (Daño = 0)
              </button>
              <button
                onClick={codexPromptState.onDecline}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-cinzel text-xs cursor-pointer transition-colors"
              >
                Recibir Daño Normal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Card Play Response Modal (Reglamento D.A.R. 1.0 - En Respuesta a que el Oponente Juegue una Carta) */}
      {rivalResponsePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border-2 border-purple-500 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="text-3xl">📜</div>
            <h3 className="text-lg font-cinzel font-bold text-purple-300">
              ¡Respuesta a Jugada Rival! (D.A.R. 6.7)
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              El Rival (CPU) acaba de jugar la carta <strong className="text-amber-400 font-cinzel">"{rivalResponsePrompt.rivalCard.name}"</strong> ({rivalResponsePrompt.rivalCard.type}).
            </p>
            <div className="p-3 rounded-lg bg-neutral-950 border border-purple-500/40 text-left text-xs font-mono text-purple-200">
              💬 <em>"En respuesta a que tu oponente juegue / baje una carta, puedes jugar un Talismán o habilidad en respuesta antes de su resolución."</em>
            </div>
            <p className="text-xs text-neutral-400">
              ¿Deseas responder jugando una carta o habilidad de tu mano?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={rivalResponsePrompt.onAnnul}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-cinzel font-bold text-xs shadow-lg shadow-purple-950/60 cursor-pointer transition-transform hover:scale-102"
              >
                ⚡ Responder / Jugar Carta
              </button>
              <button
                onClick={rivalResponsePrompt.onPass}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-cinzel text-xs cursor-pointer transition-colors"
              >
                Pasar / No Responder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Defender Block Choice Modal (DAR 5.3.2) */}
      {playerBlockPromptState && playerBlockPromptState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-indigo-500/80 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.3)] p-4 sm:p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />

            <div className="text-center mb-4 shrink-0">
              <span className="inline-block text-3xl mb-1">🛡️</span>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-indigo-300 tracking-wider">
                DECLARACIÓN DE BLOQUEO (DAR 5.3.2)
              </h2>
              <p className="text-xs text-neutral-300 mt-1 max-w-lg mx-auto">
                El rival te ataca con <strong className="text-red-400 font-cinzel text-sm">"{playerBlockPromptState.attacker.card.name}"</strong> (Fuerza: <span className="text-amber-300 font-bold font-mono">{playerBlockPromptState.attacker.currentStrength}</span>).
              </p>
              <p className="text-xs text-indigo-400/90 font-medium mt-1">
                Elige con qué Aliado bloquear o decide dejar pasar el daño directamente a tu Mazo Castillo:
              </p>
            </div>

            {/* List of eligible blockers */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
              <div className="text-[11px] font-cinzel font-bold text-neutral-400 uppercase tracking-wider mb-1">
                Tus Aliados defensores disponibles ({playerBlockPromptState.eligibleBlockers.length}):
              </div>

              {playerBlockPromptState.eligibleBlockers.map((blocker) => {
                const diff = blocker.currentStrength - playerBlockPromptState.attacker.currentStrength;
                let outcomeLabel = '';
                let outcomeClass = '';

                if (diff > 0) {
                  outcomeLabel = `Vences y destruyes al atacante (Bloqueador sobrevive)`;
                  outcomeClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-600/60';
                } else if (diff === 0) {
                  outcomeLabel = `Empate: Ambos Aliados son destruidos en combate`;
                  outcomeClass = 'text-amber-400 bg-amber-950/60 border-amber-600/60';
                } else {
                  const castleDamage = Math.abs(diff);
                  outcomeLabel = `Tu Aliado es destruido; ${castleDamage} de Daño pasa a tu Castillo`;
                  outcomeClass = 'text-rose-400 bg-rose-950/60 border-rose-600/60';
                }

                return (
                  <button
                    key={blocker.instanceId}
                    onClick={() => playerBlockPromptState.onSelectBlocker(blocker)}
                    className="w-full text-left p-3 rounded-xl border border-indigo-500/40 bg-neutral-900/90 hover:bg-indigo-950/40 hover:border-indigo-400 transition-all group flex items-center justify-between gap-3 shadow-md hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-lg shrink-0 group-hover:bg-indigo-500/30">
                        🛡️
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-cinzel text-sm font-bold text-indigo-200 group-hover:text-white truncate">
                            {blocker.card.name}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded bg-black/80 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                            {blocker.currentStrength} F
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-mono ${outcomeClass}`}>
                            {outcomeLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 text-white font-cinzel text-xs font-bold shadow transition-transform group-hover:scale-105">
                      <span>Bloquear</span>
                      <span>➔</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions: Let damage pass directly */}
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-neutral-400">
                ⚡ Si dejas pasar el daño, no pierdes defensores pero recibes <strong className="text-red-400 font-mono">{playerBlockPromptState.attacker.currentStrength}</strong> de daño al Castillo.
              </div>
              <button
                onClick={playerBlockPromptState.onLetDamagePass}
                className="py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-600/80 text-red-200 font-cinzel font-bold text-xs cursor-pointer transition-colors shadow flex items-center gap-1.5 shrink-0"
              >
                <span>⚡</span>
                <span>Dejar Pasar el Daño ({playerBlockPromptState.attacker.currentStrength})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graveyard / Exile Viewer Modal */}
      {graveyardViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setGraveyardViewer(null)}
        >
          <div
            className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 max-w-2xl w-full max-h-[85vh] flex flex-col gap-4 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-cinzel text-amber-500 font-bold tracking-wider">
                  Zona de Juego DAR
                </span>
                <h3 className="font-cinzel font-bold text-amber-100 text-lg">
                  {graveyardViewer.title} ({graveyardViewer.cards.length} cartas)
                </h3>
              </div>
              <button
                onClick={() => setGraveyardViewer(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              Esta zona es de conocimiento público. Haz clic en cualquier carta para examinarla en 3D.
            </p>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 pr-1">
              {graveyardViewer.cards.length === 0 ? (
                <div className="col-span-2 sm:col-span-4 text-center py-10 text-neutral-500 italic">
                  No hay cartas en esta zona actualmente.
                </div>
              ) : (
                graveyardViewer.cards.map((c, i) => (
                  <div
                    key={`${c.id}-${i}`}
                    className="flex flex-col items-center gap-1 cursor-pointer transform hover:scale-105 transition-transform p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-600/50"
                    onClick={() => {
                      openCardDetail(c, graveyardViewer.title, false);
                    }}
                    title="Clic para ver detalle"
                  >
                    <MythosCard card={c} size="sm" interactive={false} />
                    <span className="text-[11px] text-neutral-300 font-cinzel truncate max-w-[130px] font-semibold text-center mt-1">
                      {c.name}
                    </span>
                    <span className="text-[9px] text-neutral-400">
                      {c.type} {c.race !== 'Sin Raza' ? `· ${c.race}` : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setGraveyardViewer(null)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

            {/* CPU RIVAL DECK SELECTION MODAL */}
      {showCpuDeckModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowCpuDeckModal(false)}
        >
          <div
            className="p-6 rounded-2xl bg-neutral-900 border border-red-800/80 max-w-xl w-full max-h-[85vh] flex flex-col gap-4 text-left shadow-2xl shadow-red-950/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-cinzel text-red-400 font-bold tracking-wider">
                  Configuración de Rival D.A.R. 1.0
                </span>
                <h3 className="font-cinzel font-bold text-amber-100 text-lg flex items-center gap-2">
                  <span>🤖</span> Asignar Mazo al Bot Rival
                </h3>
              </div>
              <button
                onClick={() => setShowCpuDeckModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Selecciona cualquier mazo guardado o preconstruido para que el Rival juegue con él. Al seleccionarlo, se reiniciará el duelo con este nuevo mazo.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 max-h-[50vh]">
              {availableSavedDecks.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs italic">
                  No hay mazos guardados aún. Ve al Constructor de Mazos para crear y guardar nuevos mazos.
                </div>
              ) : (
                availableSavedDecks.map((d) => {
                  const isCurrent = currentCpuDeckName === d.name;
                  return (
                    <div
                      key={d.id}
                      className={"p-3 rounded-xl border flex items-center justify-between gap-3 transition-all " + (
                        isCurrent
                          ? "bg-red-950/60 border-red-600 shadow-md shadow-red-950"
                          : "bg-neutral-950 border-neutral-800 hover:border-red-700/60 hover:bg-neutral-900"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-cinzel font-bold text-amber-200 text-sm">
                            {d.name}
                          </h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-cinzel font-bold bg-red-600 text-white">
                              Actualmente en uso
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
                          <span>{d.cards.length} cartas ({d.cards.length === 50 ? "✓ DAR 50" : "Personalizado"})</span>
                          <span>·</span>
                          <span>Aliados: {d.cards.filter((c) => c.type === "Aliado").length}</span>
                          <span>·</span>
                          <span>Oros: {d.cards.filter((c) => c.type === "Oro").length}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectCpuDeck(d)}
                        className={"px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition-all cursor-pointer " + (
                          isCurrent
                            ? "bg-neutral-800 text-neutral-400 cursor-default"
                            : "bg-red-700 hover:bg-red-600 text-white shadow-md"
                        )}
                      >
                        {isCurrent ? "Asignado" : "Asignar al Bot"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowCpuDeckModal(false);
                  onGoToDeckBuilder();
                }}
                className="text-xs text-amber-400 hover:underline font-cinzel cursor-pointer"
              >
                🛠️ Crear / Editar Mazos en Constructor
              </button>
              <button
                onClick={() => setShowCpuDeckModal(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-medium cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL (DAR 4.3.1 & 7.1: Game Ends When Castillo Reaches 0) */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border-2 border-amber-500/80 p-6 md:p-8 text-center shadow-2xl space-y-5">
            <div className="text-6xl animate-bounce">
              {winner === 'player' ? '🏆' : '💀'}
            </div>

            <div>
              <span className="text-xs font-cinzel text-amber-400 font-bold uppercase tracking-widest">
                Fin del Duelo Mitológico · DAR 7.1
              </span>
              <h2 className="text-2xl md:text-3xl font-cinzel font-black text-amber-100 mt-1">
                {winner === 'player' ? '¡VICTORIA MITOLÓGICA!' : 'DERROTA: TU CASTILLO HA CAÍDO'}
              </h2>
              <p className="text-sm text-neutral-300 mt-2 max-w-md mx-auto">
                {winner === 'player'
                  ? 'El Mazo Castillo del rival ha llegado a 0 cartas. ¡Has vencido y conquistado el reino!'
                  : 'Tu Mazo Castillo ha llegado a 0 cartas. Tu reino ha caído ante las fuerzas del rival.'}
              </p>
            </div>

            {/* Match Stats */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono">
              <div className="flex flex-col items-center">
                <span className="text-neutral-500 text-[10px]">Turnos</span>
                <span className="text-amber-400 font-bold text-sm">{turn}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-neutral-500 text-[10px]">Tu Castillo</span>
                <span className="text-white font-bold text-sm">{player.castillo.length} cartas</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-neutral-500 text-[10px]">Castillo Rival</span>
                <span className="text-red-400 font-bold text-sm">{cpu.castillo.length} cartas</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => initGame()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-sm transition-all shadow-lg shadow-amber-950 flex items-center justify-center gap-2"
              >
                <span>⚔️</span> Jugar Revancha
              </button>
              <button
                onClick={onGoToDeckBuilder}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-cinzel font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>🏰</span> Ajustar Mazo
              </button>
              <button
                onClick={onExitDuel}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs transition-colors"
              >
                Salir al Menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARD PICKER MODAL (For Deck & Graveyard Searching / Tutors) */}
      <CardPickerModal
        isOpen={cardPickerState.isOpen}
        title={cardPickerState.title}
        subtitle={cardPickerState.subtitle}
        filterLabel={cardPickerState.filterLabel}
        cards={cardPickerState.cards}
        maxSelect={cardPickerState.maxSelect}
        onSelect={handleSelectTutorCards}
        onClose={() => setCardPickerState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* DISCARD PICKER MODAL (User Decides What to Discard) */}
      <CardPickerModal
        isOpen={discardPickerState.isOpen}
        title={discardPickerState.title}
        subtitle={discardPickerState.subtitle}
        filterLabel={discardPickerState.filterLabel}
        cards={discardPickerState.cards}
        maxSelect={discardPickerState.maxSelect}
        onSelect={handleSelectDiscardCards}
        onClose={() => setDiscardPickerState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* DECISION MODAL (Choices like Misil Mágico, Hobgoblin, etc.) */}
      <DecisionModal
        isOpen={decisionState.isOpen}
        title={decisionState.choiceInfo?.title || 'TOMA UNA DECISIÓN'}
        cardName={decisionState.choiceInfo?.cardName || ''}
        description={decisionState.choiceInfo?.description || ''}
        options={decisionState.choiceInfo?.options || []}
        onChoose={handleChooseDecisionOption}
        onCancel={() => setDecisionState({ isOpen: false })}
      />

      {/* FIELD INSPECTOR MODAL (Revisar cartas en juego y armas equipadas de ambos jugadores) */}
      <FieldInspectorModal
        isOpen={showFieldInspector}
        onClose={() => setShowFieldInspector(false)}
        playerState={player}
        cpuState={cpu}
        playerDeckName={playerDeckName}
        cpuDeckName={currentCpuDeckName}
        activePlayer={activePlayer}
        phase={phase}
        abilitiesUsedThisTurn={abilitiesUsedThisTurn}
        onInspectCard={(card, sourceZone, canPlay, playLabel, attachedWeapons, effectiveStrength) => {
          setInspectedCardData({
            card,
            sourceZone,
            canPlay,
            playLabel,
            attachedWeapons,
            effectiveStrength,
          });
        }}
        onActivateAbility={handleActivateInPlayAbility}
      />
    </div>
  );
};
