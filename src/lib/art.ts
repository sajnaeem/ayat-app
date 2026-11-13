/**
 * Munib's 3D graphics: objects, places, light and pattern only, never faces or people
 * (rendered with three.js; Munib owns them). Sources: scratchpad art.html, re-render to change.
 */
export const ART = {
  crescent: require('../../assets/art/crescent.png'),
  mushaf: require('../../assets/art/mushaf.png'),
  beads: require('../../assets/art/beads.png'),
  kaaba: require('../../assets/art/kaaba.png'),
  globe: require('../../assets/art/globe.png'),
  moon: require('../../assets/art/moon.png'),
  hands: require('../../assets/art/hands.png'),
  star8: require('../../assets/art/star8.png'),
} as const;
export type ArtName = keyof typeof ART;
