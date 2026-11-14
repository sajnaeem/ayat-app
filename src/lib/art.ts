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
  dome: require('../../assets/art/dome.png'),
  radio: require('../../assets/art/radio.png'),
} as const;
export type ArtName = keyof typeof ART;

/** Learn to pray: a faceless figure on a prayer mat in each position (scripts/art/pose.html, PAGE=pose.html node shoot.js). */
const P = {
  'brother-stand': require('../../assets/art/pray/brother-stand.png'),
  'brother-takbir': require('../../assets/art/pray/brother-takbir.png'),
  'brother-fold': require('../../assets/art/pray/brother-fold.png'),
  'brother-ruku': require('../../assets/art/pray/brother-ruku.png'),
  'brother-sujud': require('../../assets/art/pray/brother-sujud.png'),
  'brother-sit': require('../../assets/art/pray/brother-sit.png'),
  'brother-tashahhud': require('../../assets/art/pray/brother-tashahhud.png'),
  'brother-salam': require('../../assets/art/pray/brother-salam.png'),
  'sister-stand': require('../../assets/art/pray/sister-stand.png'),
  'sister-takbir': require('../../assets/art/pray/sister-takbir.png'),
  'sister-fold': require('../../assets/art/pray/sister-fold.png'),
  'sister-ruku': require('../../assets/art/pray/sister-ruku.png'),
  'sister-sujud': require('../../assets/art/pray/sister-sujud.png'),
  'sister-sit': require('../../assets/art/pray/sister-sit.png'),
  'sister-tashahhud': require('../../assets/art/pray/sister-tashahhud.png'),
  'sister-salam': require('../../assets/art/pray/sister-salam.png'),
} as const;
export const poseArt = (figure: 'brother' | 'sister', pose: string) => P[`${figure}-${pose}` as keyof typeof P] ?? P['brother-stand'];
