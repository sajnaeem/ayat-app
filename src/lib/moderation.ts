/**
 * A light first filter on reflections before they're posted (Apple asks apps with user posts to filter objectionable content).
 * Reports, hiding after three reports, and blocking do the rest. Returns a reason to show the person, or null if it's fine.
 */
const WORDS = [
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'cunt', 'bitch', 'bastard', 'dick', 'dickhead', 'cock', 'pussy',
  'twat', 'wanker', 'slut', 'whore', 'porn', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'paki', 'kys',
];
const WORD_RE = new RegExp(`(^|[^a-z])(${WORDS.join('|')})s?([^a-z]|$)`, 'i');
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|uk|me|ly|app|xyz)\b)/i;
const PHONE_RE = /(\+?\d[\d\s-]{8,}\d)/;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export function checkReflection(text: string): string | null {
  // Catch simple disguises like f.u.c.k or sh1t.
  const squashed = text.toLowerCase().replace(/[0]/g, 'o').replace(/[1!]/g, 'i').replace(/[3]/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's');
  if (WORD_RE.test(squashed) || WORD_RE.test(squashed.replace(/[.\-_*]/g, ''))) return 'Please keep reflections free of offensive language.';
  if (LINK_RE.test(text)) return 'Links aren’t allowed in reflections.';
  if (PHONE_RE.test(text) || EMAIL_RE.test(text)) return 'Please don’t share phone numbers or email addresses.';
  return null;
}
