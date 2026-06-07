/** Definición data-driven de la misión del vertical slice. */
export const RELIC_QUEST = {
  id: "relic",
  name: "El encargo del Anciano",
  objectives: {
    /** Antes de empezar (no debería mostrarse en HUD). */
    inactive: "",
    /** Misión activa, sin la reliquia todavía. */
    searching: "Buscá la reliquia dorada en el bosque del noroeste.",
    /** Misión activa, ya con la reliquia. */
    deliver: "Llevá la reliquia al Aldeano de la casa del este.",
    /** Completada. */
    done: "¡Misión completada! Entregaste la reliquia.",
  },
} as const;
