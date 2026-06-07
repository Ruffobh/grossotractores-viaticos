import type { DialogueNode, QuestStatus } from "../types";
import { HERO_NAME } from "../gift";

/** Estado del juego que condiciona qué dice cada NPC. */
export interface GameState {
  quest: QuestStatus;
  hasRelic: boolean;
}

/**
 * Devuelve el diálogo apropiado para un NPC según el estado del juego.
 * El campo `onEnd` engancha con QuestManager (ver WorldScene).
 */
export function getDialogue(npcId: string, state: GameState): DialogueNode {
  if (npcId === "elder") return elderDialogue(state);
  if (npcId === "villager") return villagerDialogue(state);
  return { lines: [{ speaker: "?", text: "..." }] };
}

function elderDialogue(state: GameState): DialogueNode {
  if (state.quest === "completed") {
    return {
      lines: [
        {
          speaker: "Anciano",
          text: `El pueblo entero habla de tu hazaña, ${HERO_NAME}. Gracias.`,
        },
      ],
    };
  }
  if (state.quest === "active") {
    return {
      lines: [
        {
          speaker: "Anciano",
          text: "La reliquia sigue perdida en el bosque, al noroeste. ¡Buscala bien!",
        },
      ],
    };
  }
  // Inactiva: el anciano entrega la misión
  return {
    lines: [
      {
        speaker: "Anciano",
        text: `Bienvenido, ${HERO_NAME}. Por fin llega un alma valiente a nuestra aldea.`,
      },
      {
        speaker: "Anciano",
        text: "Una antigua reliquia dorada se perdió en el bosque del noroeste.",
      },
      {
        speaker: "Anciano",
        text: "Encontrala y entregásela al Aldeano de la casa del este. Te lo ruego.",
      },
    ],
    onEnd: "start_quest",
  };
}

function villagerDialogue(state: GameState): DialogueNode {
  if (state.quest === "completed") {
    return {
      lines: [
        {
          speaker: "Aldeano",
          text: "La reliquia volvió a casa gracias a vos. ¡Sos un héroe!",
        },
      ],
    };
  }
  if (state.quest === "active" && state.hasRelic) {
    return {
      lines: [
        { speaker: "Aldeano", text: "¿Eso que llevás...? ¡Es la reliquia perdida!" },
        { speaker: "Aldeano", text: "No puedo creerlo. Te estaré agradecido por siempre." },
      ],
      onEnd: "complete_quest",
    };
  }
  if (state.quest === "active") {
    return {
      lines: [
        {
          speaker: "Aldeano",
          text: "El Anciano te encargó la reliquia, ¿no? Está en el bosque del noroeste.",
        },
      ],
    };
  }
  return {
    lines: [
      { speaker: "Aldeano", text: "Buen día, forastero. Si buscás aventuras, hablá con el Anciano." },
    ],
  };
}
