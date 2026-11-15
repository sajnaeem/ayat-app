/**
 * Ramadan companion content (Saj, 15 Nov 2026).
 *
 * Religious lines carry their source and ALL need a scholar's check before launch (like the rest of Munib). The duas for
 * breaking the fast, sighting the new moon and "I am fasting" come from the Hisn al-Muslim library (src/data/duas.ts);
 * only the Laylat al-Qadr dua is typed in here (Tirmidhi 3513, Ibn Majah 3850) and needs checking by someone with Arabic.
 *
 * Sleep and food (Saj: "how to optimise sleep during this period to ensure proper recovery, and meal suggestions"):
 * general wellbeing ideas in plain words, not medical advice and not religious rulings. Nothing here is personalised
 * and nothing is sent anywhere.
 */
export const QADR_DUA = {
  id: 'qadr',
  ar: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
  tl: 'Allahumma innaka ʿafuwwun tuhibbul-ʿafwa faʿfu ʿanni',
  en: 'O Allah, You are Pardoning and love to pardon, so pardon me.',
  n: 1,
};
export const QADR_SRC = 'Taught to ʿAʾishah for Laylat al-Qadr · Jamiʿ at-Tirmidhi 3513, Sunan Ibn Majah 3850';

/** Hisn al-Muslim ids used on the Ramadan screen. */
export const DUA_IDS = { iftar: 'h176', moon: 'h175', rude: 'h186', host: 'h184' };

export type Meal = { name: string; what: string; why: string };

/** Suhoor: slow energy, protein to stay full, fluids, and not too much salt. */
export const SUHOOR: Meal[] = [
  { name: 'Porridge, almond butter and eggs', what: 'Oats cooked with milk, a spoon of almond butter stirred in, and 2–4 eggs on the side.', why: 'Oats release energy slowly, and the eggs and nut butter keep you full well into the afternoon.' },
  { name: 'Overnight oats', what: 'Oats soaked in milk and yoghurt with chia seeds, chopped dates and a handful of nuts. Made the night before.', why: 'Nothing to cook at 4am, and it has slow carbs, protein and fluid in one bowl.' },
  { name: 'Eggs on wholemeal toast', what: 'Scrambled or boiled eggs, wholemeal toast, avocado or olive oil, and a piece of fruit.', why: 'Protein and healthy fats slow digestion, so hunger comes later.' },
  { name: 'Daal, roti and yoghurt', what: 'Lentils or chickpeas with a wholemeal roti, plain yoghurt and cucumber. Go light on the salt and chilli.', why: 'Lentils give protein and fibre together. Salty or very spicy food makes the thirst worse.' },
  { name: 'Yoghurt bowl', what: 'Thick plain yoghurt with banana, berries, oats or granola, nuts and a little honey.', why: 'Good when you can’t face a cooked meal: light on the stomach but high in protein.' },
  { name: 'A smoothie, if you can’t eat early', what: 'Milk, oats, banana, peanut butter and a few dates, blended. Sip it with water.', why: 'Something is far better than nothing: suhoor is what the fast runs on.' },
];

/** Iftar: open gently, pray, then a balanced plate. */
export const IFTAR: Meal[] = [
  { name: 'Open with dates and water', what: 'One to three dates and a glass of water, then pray Maghrib before the main meal.', why: 'Quick natural sugar and fluid after the fast, and the pause stops you overeating. It is also the Sunnah (Abu Dawud 2356).' },
  { name: 'Soup first', what: 'Lentil soup, chicken broth or harira, with a squeeze of lemon.', why: 'Puts back fluid and salt gently, and takes the edge off your hunger.' },
  { name: 'Grilled chicken, rice and salad', what: 'Half the plate vegetables or salad, a quarter chicken or fish, a quarter rice or potatoes.', why: 'Protein repairs muscle while you sleep. A balanced plate means steadier energy for taraweeh.' },
  { name: 'Curry with roti and salad', what: 'Chicken, chana or vegetable curry with one or two rotis, salad and yoghurt.', why: 'Home food is fine: it is the portion, the oil and the fried sides that make you heavy.' },
  { name: 'Fried food as a treat', what: 'A samosa or a couple of pakoras with the meal, not as the meal.', why: 'A lot of fried food on an empty stomach brings heartburn and a sleepy, heavy taraweeh.' },
  { name: 'A light second snack', what: 'After taraweeh: fruit, yoghurt, nuts, or milk with a date.', why: 'Tops you up without a full stomach at bedtime, which spoils sleep.' },
];

export const FOOD_RULES = [
  'Drink steadily between iftar and suhoor, about 8 glasses, not all at once before Fajr.',
  'Have tea or coffee at iftar, not after taraweeh: caffeine late at night steals the little sleep you have.',
  'If you train: keep it light just before iftar, or go an hour or two after you have eaten, and get protein at both meals.',
];

/** Sleep: the night is short and broken, so protect it and top it up. */
export const SLEEP_TIPS: { title: string; body: string }[] = [
  { title: 'Sleep in two parts', body: 'You won’t get it all in one go this month. A main sleep after taraweeh, then a second one after Fajr or a nap, adds up to a full night.' },
  { title: 'Keep the same times every day', body: 'Going to bed and getting up at the same times, weekends too, helps your body settle into the new pattern within the first week.' },
  { title: 'Nap for 20–30 minutes', body: 'A short rest after Dhuhr lifts the afternoon. Keep it short and before mid-afternoon, or it will be harder to sleep at night.' },
  { title: 'Don’t go to bed full', body: 'Eat your main meal at iftar and keep anything after taraweeh light. A heavy stomach means shallow sleep.' },
  { title: 'Wind down after taraweeh', body: 'Dim the lights and put the phone away once you’re home. The bright scroll before bed costs more sleep than it feels like.' },
  { title: 'Get morning light', body: 'A few minutes outside in daylight after sunrise helps you stay alert through the day and sleepy at the right time.' },
  { title: 'Guard the last ten nights', body: 'If you plan to stay up for worship, rest earlier in the day and keep work light where you can, rather than running on empty.' },
];

export const HEALTH_NOTE = 'These are general ideas, not medical advice. If you have a health condition, are pregnant or breastfeeding, or take regular medication, speak to your doctor before fasting, and to your imam about what applies to you.';
