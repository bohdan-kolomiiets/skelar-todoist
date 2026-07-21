/** The four-point "spark" glyph, drawn in a 24×24 box (Dayspark mark). */
export const SPARK_PATH =
  "M12 0 C12 6 18 12 24 12 C18 12 12 18 12 24 C12 18 6 12 0 12 C6 12 12 6 12 0 Z";

export const BRAND = {
  /** Gold used in badge gradient. */
  gold: "#FFB43C",
  /** Gold used in mark gradient (docs/brand/dayspark-mark.svg). */
  goldMark: "#FFC24B",
  /** Coral used in mark and wordmark. */
  coral: "#FF6A3D",
  /** Deep coral used in badge gradient. */
  coralDeep: "#FF5E5E",
  /** Cream background in badge and wordmark. */
  cream: "#FDF8EE",
  /** Dark ink text. */
  ink: "#2B2A27",
} as const;
