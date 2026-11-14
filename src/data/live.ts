/**
 * Live TV and Quran radio (Saj, 14 Nov 2026).
 *
 * TV: the two official 24-hour broadcasts from the Saudi Broadcasting Authority on YouTube (KSA Qur'an TV from
 * Masjid al-Haram, Sunnah TV from Masjid an-Nabawi). They open on YouTube itself (the in-app browser), which is
 * the allowed way to show someone else's YouTube live stream; nothing is copied or re-streamed.
 *
 * Radio: 24/7 Quran stations from mp3quran.net's public API (https://mp3quran.net/api/v3/radios), credited in the app.
 * Stations giving rulings (its fatwa radio) are deliberately left out. Ask mp3quran.net for written permission before launch.
 */

export type TvChannel = { id: string; name: string; place: string; note: string; url: string; art: 'kaaba' | 'dome' };
export const TV: TvChannel[] = [
  {
    id: 'makkah',
    name: 'Makkah',
    place: 'Masjid al-Haram',
    note: 'KSA Qurʾan TV, live around the clock from the Grand Mosque',
    url: 'https://www.youtube.com/channel/UCos52azQNBgW63_9uDJoPDA/live',
    art: 'kaaba',
  },
  {
    id: 'madinah',
    name: 'Madinah',
    place: 'Masjid an-Nabawi',
    note: 'Sunnah TV, live around the clock from the Prophet’s Mosque',
    url: 'https://www.youtube.com/channel/UCROKYPep-UuODNwyipe6JMw/live',
    art: 'dome',
  },
];

export type Station = { id: number; name: string; sub: string; url: string; group: 'quran' | 'reciter' | 'english' | 'urdu' | 'adhkar' };
const Q = 'https://backup.qurango.net/radio/';
export const STATIONS: Station[] = [
  { id: 109082, name: 'Holy Quran from Saudi Arabia', sub: 'Quran radio, live', url: 'https://stream.radiojar.com/0tpy1h0kxtzuv', group: 'quran' },
  { id: 123, name: 'Short, beautiful recitations', sub: 'Many reciters, one after another', url: Q + 'tarateel', group: 'quran' },
  { id: 79, name: 'Mishary Alafasy', sub: 'Kuwait', url: Q + 'mishary_alafasi', group: 'reciter' },
  { id: 33, name: 'Abdul Rahman al-Sudais', sub: 'Imam of the Grand Mosque, Makkah', url: Q + 'abdulrahman_alsudaes', group: 'reciter' },
  { id: 18, name: 'Saud al-Shuraim', sub: 'Makkah', url: Q + 'saud_alshuraim', group: 'reciter' },
  { id: 63, name: 'Maher al-Muaiqly', sub: 'Imam of the Grand Mosque, Makkah', url: Q + 'maher', group: 'reciter' },
  { id: 58, name: 'Yasser al-Dosari', sub: 'Makkah', url: Q + 'yasser_aldosari', group: 'reciter' },
  { id: 17, name: 'Saad al-Ghamdi', sub: 'Saudi Arabia', url: Q + 'saad_alghamdi', group: 'reciter' },
  { id: 74, name: 'Mahmoud Khalil al-Husary', sub: 'Egypt · slow and clear', url: Q + 'mahmoud_khalil_alhussary', group: 'reciter' },
  { id: 69, name: 'Muhammad Siddiq al-Minshawi', sub: 'Egypt', url: Q + 'mohammed_siddiq_alminshawi', group: 'reciter' },
  { id: 32, name: 'Abdul Basit Abdul Samad', sub: 'Egypt', url: Q + 'abdulbasit_abdulsamad', group: 'reciter' },
  { id: 30, name: 'Abdul Basit (mujawwad)', sub: 'Egypt · melodic', url: Q + 'abdulbasit_abdulsamad_mojawwad', group: 'reciter' },
  { id: 109046, name: 'Quran with English', sub: 'Abdul Basit, then the English meaning', url: Q + 'translation_quran_english_basit', group: 'english' },
  { id: 109047, name: 'Quran with English', sub: 'Abdullah Basfar, then the English meaning', url: Q + 'translation_quran_english_bsfr', group: 'english' },
  { id: 109039, name: 'Quran with Urdu', sub: 'Abdul Basit, then the Urdu meaning', url: Q + 'translation_quran_urdu_basit', group: 'urdu' },
  { id: 109044, name: 'Quran with Urdu', sub: 'Al-Sudais and al-Shuraim, then the Urdu meaning', url: Q + 'translation_quran_urdu_sds_shur', group: 'urdu' },
  { id: 10906, name: 'Morning remembrance', sub: 'Adhkar for the morning', url: Q + 'athkar_sabah', group: 'adhkar' },
  { id: 10907, name: 'Evening remembrance', sub: 'Adhkar for the evening', url: Q + 'athkar_masa', group: 'adhkar' },
];

export const GROUPS: { id: Station['group']; title: string }[] = [
  { id: 'quran', title: 'Quran radio' },
  { id: 'reciter', title: 'Your favourite reciter, all day' },
  { id: 'english', title: 'With the English meaning' },
  { id: 'urdu', title: 'With the Urdu meaning' },
  { id: 'adhkar', title: 'Remembrance' },
];
