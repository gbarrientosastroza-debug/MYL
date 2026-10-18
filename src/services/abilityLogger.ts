/**
 * Comprehensive Developer Console Logger for Mitos y Leyendas Ability Engine.
 * Tracks Strength Modifiers, Continuous Auras, Attack Declarations, and End-of-Turn Destruction Audits.
 */

import { AllyInPlay, CardData, PlayerState } from '../types/card';

const STYLES = {
  header: 'background: #1e1b4b; color: #c7d2fe; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  strengthBuff: 'background: #064e3b; color: #6ee7b7; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  strengthDebuff: 'background: #7f1d1d; color: #fca5a5; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  aura: 'background: #1e3a8a; color: #93c5fd; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  turnEndSuccess: 'background: #78350f; color: #fde68a; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  destructionHit: 'background: #831843; color: #fbcfe8; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  destructionSkip: 'background: #374151; color: #d1d5db; padding: 2px 6px; border-radius: 4px;',
  attackTrigger: 'background: #701a75; color: #f5d0fe; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  info: 'color: #38bdf8;',
  subText: 'color: #94a3b8; font-style: italic;',
};

export interface StrengthLogEvent {
  sourceCardName: string;
  sourceType: 'Talismán' | 'Habilidad_Entrada' | 'Habilidad_Activada' | 'Aura_Continua' | 'Declaración_Ataque';
  targetAlly: AllyInPlay;
  targetOwner: 'player' | 'cpu';
  changeType: 'buff' | 'debuff' | 'fuerza_cero' | 'duplicar';
  amount: number;
  isPermanent: boolean;
  previousStrength: number;
  newStrength: number;
  reason?: string;
}

export interface DestructionAuditItem {
  allyName: string;
  instanceId: string;
  zone: 'lineaDefensa' | 'lineaAtaque';
  hasAttackedThisTurn: boolean;
  destroyAtTurnEndIfAttackedFlag: boolean;
  matchedSuicideCardText: boolean;
  willBeDestroyed: boolean;
  decisionReason: string;
  cardAbility: string;
}

export const abilityLogger = {
  /**
   * Log when a card modifies the strength of an ally (buff or debuff)
   */
  logStrengthModification(event: StrengthLogEvent) {
    const isBuff = event.changeType === 'buff' || event.changeType === 'duplicar';
    const badgeStyle = isBuff ? STYLES.strengthBuff : STYLES.strengthDebuff;
    const sign = isBuff ? '+' : '-';

    console.groupCollapsed(
      `%c[MotorHabilidades:Fuerza]%c ${event.sourceCardName} ➜ "${event.targetAlly.card.name}" (${sign}${event.amount} F) [${event.isPermanent ? 'Permanente' : 'Hasta fin de turno'}]`,
      badgeStyle,
      'color: inherit; font-weight: bold;'
    );
    console.log('%cOrigen:%c', STYLES.info, '', {
      carta: event.sourceCardName,
      tipoFuente: event.sourceType,
      propietarioObjetivo: event.targetOwner,
    });
    console.log('%cDetalles del Objetivo:%c', STYLES.info, '', {
      aliado: event.targetAlly.card.name,
      instanceId: event.targetAlly.instanceId,
      raza: event.targetAlly.card.race || 'Sin Raza',
      fuerzaBase: event.targetAlly.baseStrength,
      fuerzaPrevia: event.previousStrength,
      fuerzaCalculada: event.newStrength,
      bonoTurnoPrevio: event.targetAlly.turnStrengthBonus || 0,
      bonoPermanentePrevio: event.targetAlly.permanentStrengthBonus || 0,
    });
    if (event.reason) {
      console.log('%cRegla / Razón:%c', STYLES.subText, '', event.reason);
    }
    console.groupEnd();
  },

  /**
   * Log recalculateContinuousAuras breakdown
   */
  logAuraRecalculation(
    ownerLabel: 'Jugador' | 'Rival',
    activeAuras: string[],
    allyCount: number,
    updatedAllies: { name: string; base: number; auras: number; bonuses: number; final: number }[]
  ) {
    if (activeAuras.length === 0 && updatedAllies.length === 0) return;

    console.groupCollapsed(
      `%c[MotorHabilidades:Auras]%c Recálculo continuo para ${ownerLabel} (${activeAuras.length} auras activas, ${allyCount} aliados)`,
      STYLES.aura,
      'color: inherit;'
    );
    console.log('%cAuras detectadas activas:%c', STYLES.info, '', activeAuras.length > 0 ? activeAuras : ['Ninguna']);
    console.table(updatedAllies);
    console.groupEnd();
  },

  /**
   * Log attack declaration triggers (Dragón de Eter, Sir Thomas, Ciervo Sagrado, Dragón de Luz)
   */
  logAttackDeclarationTrigger(triggerName: string, triggeringAlly: string, effectSummary: string, details?: any) {
    console.groupCollapsed(
      `%c[MotorHabilidades:Ataque]%c Disparador de Ataque: "${triggerName}" (${triggeringAlly})`,
      STYLES.attackTrigger,
      'color: inherit;'
    );
    console.log('%cEfecto ejecutado:%c', STYLES.info, '', effectSummary);
    if (details) {
      console.log('%cDatos de contexto:%c', STYLES.subText, '', details);
    }
    console.groupEnd();
  },

  /**
   * Log comprehensive Turn-End Audit: Shows exactly which allies were evaluated for end-of-turn
   * destruction, whether they were destroyed or spared, and why.
   */
  logTurnEndAudit(
    activeTurnPlayer: 'player' | 'cpu',
    destroyedCount: number,
    auditList: DestructionAuditItem[],
    specialTriggerLogs: string[]
  ) {
    const playerTitle = activeTurnPlayer === 'player' ? 'Jugador' : 'Rival';

    console.group(
      `%c[MotorHabilidades:FaseFinal]%c Auditoría de Destrucción y Disparadores de Fin de Turno (${playerTitle})`,
      STYLES.turnEndSuccess,
      'color: inherit; font-weight: bold;'
    );

    console.log(
      `%cResumen:%c Se evaluaron ${auditList.length} aliado(s) en mesa. Se destruyeron ${destroyedCount} aliado(s).`,
      STYLES.info,
      ''
    );

    if (auditList.length > 0) {
      console.table(
        auditList.map((item) => ({
          Aliado: item.allyName,
          Zona: item.zone,
          '¿Atacó?': item.hasAttackedThisTurn ? 'SÍ ✅' : 'NO ❌',
          'Flag Destrucción': item.destroyAtTurnEndIfAttackedFlag ? 'SÍ ⚠️' : 'NO',
          'Texto Coincide': item.matchedSuicideCardText ? 'SÍ ⚠️' : 'NO',
          '¿Destruido?': item.willBeDestroyed ? '💥 DESTRUIDO' : '🛡️ CONSERVADO',
          Motivo: item.decisionReason,
        }))
      );
    } else {
      console.log('%cNo hay aliados en mesa para evaluar.%c', STYLES.subText, '');
    }

    if (specialTriggerLogs.length > 0) {
      console.log('%cOtros disparadores de Fin de Turno ejecutados:%c', STYLES.info, '', specialTriggerLogs);
    }

    console.groupEnd();
  },
};
