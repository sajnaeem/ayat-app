/**
 * Munib's website. Every shared ayah links to its own page there (e.g. /93/1-4),
 * which shows the ayah to people without the app and opens the app for people who have it
 * (once universal links are set up in the TestFlight build).
 * Switch to 'https://getmunib.com' once the domain is bought and connected on Vercel.
 */
export const SITE = 'https://ayat-app-website.vercel.app';

/** The page for an ayah or a short run of ayat. Never carries anything about who shared it. */
export function ayahLink(s: number, from: number, to = from): string {
  return `${SITE}/${s}/${to > from ? `${from}-${to}` : from}`;
}

/** The same address without https://, short enough to print on a share image. */
export const shortLink = (url: string) => url.replace(/^https?:\/\//, '');
