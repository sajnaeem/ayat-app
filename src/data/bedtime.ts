/**
 * Bedtime stories for children (about 4–9), to be read aloud by a parent or played with Munib's narration.
 *
 * Rules: every detail comes from the Quran passage or the authentic hadith in `sources`; nothing is added that
 * the sources don't say (where a story leaves something out, we leave it out too, e.g. how many sleepers were in
 * the cave). Words spoken by prophets are given only where the Quran gives them, in simple English, and marked
 * "Allah tells us…". No pictures of prophets, ever. Written by Munib (13 Nov 2026); ALL need a scholar's check
 * before launch (`check: true`).
 *
 * Narration: website/stories/<id>.mp3, an AI voice (Kokoro, disclosed in the app), made by scripts/narrate-stories.py.
 */

export type Story = {
  id: string;
  title: string;
  /** Who the story is about, shown above the title. */
  about: string;
  minutes: number;
  paras: string[];
  /** A gentle question to talk about before sleep. */
  think: string;
  sources: string;
  check: boolean;
};

export const STORIES: Story[] = [
  {
    id: 'yunus',
    title: 'A prayer in the dark',
    about: 'Prophet Yunus',
    minutes: 4,
    paras: [
      'A long time ago, Allah sent a prophet called Yunus, peace be upon him, to a town full of people. Yunus told them about Allah, again and again. But the people would not listen.',
      'One day Yunus became upset with his people, and he went away. He hurried down to the sea and climbed onto a ship that was packed full.',
      'Out on the waves, the people on the ship drew lots, and the lot fell on Yunus. So into the deep, dark sea he went, and a huge fish swallowed him whole.',
      'Imagine how dark it was. The dark of the night. The dark of the deep sea. And the dark inside the fish. But Yunus knew that Allah can hear us anywhere, even there.',
      'So in the darkness, Yunus called out to Allah. Allah tells us in the Quran what he said: “There is no god but You. Glory be to You. I have done wrong.”',
      'And Allah heard him. Allah answered his prayer and saved him from his sadness. The fish carried Yunus to the shore and let him out onto the sand. He was tired and weak, so Allah made a leafy plant grow over him, to give him shade while he rested.',
      'When Yunus was strong again, Allah sent him to his people: a hundred thousand of them, or even more. And this time, something wonderful happened. They believed! And Allah let them enjoy their lives in safety.',
      'Allah tells us that this is how He saves the believers. So if you ever feel sad, or scared, or alone in the dark, you can say what Yunus said. Allah is always listening.',
    ],
    think: 'Where is a place that Allah can’t hear you? (There isn’t one!)',
    sources: 'Quran 21:87–88, 37:139–148, 10:98',
    check: true,
  },
  {
    id: 'nuh',
    title: 'The big boat',
    about: 'Prophet Nuh',
    minutes: 4,
    paras: [
      'Prophet Nuh, peace be upon him, lived for a very, very long time. For nine hundred and fifty years he called his people to worship Allah alone.',
      'He talked to them in the daytime and he talked to them at night. He talked to them in front of everyone, and he talked to them quietly, one by one. But most of them put their fingers in their ears so they wouldn’t hear.',
      'Then Allah told Nuh to build a ship. Not a little boat, but a big, strong ship. And Allah said He would be watching over him as he built it.',
      'So Nuh worked, plank by plank. Every time some of his people walked past, they laughed at him. A ship, on dry land? But Nuh kept going, calmly, because he trusted Allah.',
      'When the ship was ready, Allah told Nuh to bring on board a pair of every kind of animal, two by two, and his family, and the people who believed. There were not very many of them.',
      'Nuh said, “Bismillah. In the name of Allah it sails, and in the name of Allah it stops.” Then the rain came pouring down from the sky, and water burst up from the earth. Soon the ship was riding on waves as tall as mountains.',
      'But inside the ship, everyone was safe. Allah was looking after them.',
      'At last, Allah told the sky to stop raining and the earth to swallow its water. The water went down and down, and the ship came to rest on a mountain called al-Judi.',
      'Then Allah said to Nuh, “Come down, with peace from Us, and blessings on you.” And Nuh and everyone with him stepped out onto the fresh, clean earth.',
    ],
    think: 'Nuh kept going even when people laughed. What is something good you can keep doing?',
    sources: 'Quran 29:14, 71:5–9, 11:36–48, 54:11–13',
    check: true,
  },
  {
    id: 'ibrahim-fire',
    title: 'The fire that was cool',
    about: 'Prophet Ibrahim',
    minutes: 3,
    paras: [
      'When Prophet Ibrahim, peace be upon him, was a young man, the people of his town worshipped statues they had carved out of stone. They bowed to them and asked them for help.',
      'Ibrahim asked them, “What are these statues you are so devoted to?” They said, “Our fathers did it, so we do it too.” Ibrahim said, “Then you and your fathers have been making a mistake.”',
      'One day, when everyone had gone out of town, Ibrahim went to the statues and broke them into pieces, all except the biggest one.',
      'When the people came back, they were furious. “Who did this to our gods?” Ibrahim said, pointing to the biggest statue, “Ask them, if they can talk!” The people went quiet. They knew the statues couldn’t speak, or see, or help anyone at all.',
      'But instead of listening, they grew angry. “Burn him!” they shouted. They built a huge fire and threw Ibrahim into it.',
      'Then Allah spoke to the fire. Allah tells us exactly what He said: “O fire, be cool, and be safe, for Ibrahim.”',
      'And the fire obeyed. It did not hurt Ibrahim at all. The people had wanted to harm him, but Allah made their plan come to nothing.',
      'Everything in the world, even fire, does what Allah tells it to. And Allah looks after the people who trust Him.',
    ],
    think: 'Ibrahim was brave and told the truth. When is it hard to tell the truth?',
    sources: 'Quran 21:51–70',
    check: true,
  },
  {
    id: 'musa-basket',
    title: 'A basket on the river',
    about: 'Prophet Musa and his mother',
    minutes: 4,
    paras: [
      'Long ago in Egypt there was a proud and cruel king called Pharaoh. He was afraid of the families of Bani Israel, and he made their lives very hard. He had even ordered that their baby boys be taken away.',
      'In one of those families, a baby boy was born. His name was Musa. His mother loved him so much, and she was frightened for him.',
      'Then Allah put a thought into her heart: “Feed your baby. And if you are afraid for him, put him into the river. Don’t be afraid and don’t be sad. We will bring him back to you, and one day he will be a messenger.”',
      'So she placed baby Musa in a little box, and gently let it float away on the great river. Her heart felt empty as she watched it go. She told Musa’s sister, “Follow him,” and his sister walked along the bank, watching from far away, without anyone noticing.',
      'The river carried the box all the way to Pharaoh’s palace, and Pharaoh’s family lifted it out of the water. Pharaoh’s wife looked at the baby and said, “He will be a joy for me and for you. Don’t harm him. Maybe he will be good for us, or we could take him as our son.”',
      'But baby Musa was hungry, and he would not drink milk from any of the women they brought. He cried and cried.',
      'Then his sister stepped forward. “Shall I tell you about a family who will look after him well?” And she brought them… Musa’s own mother!',
      'So Musa went back into his mother’s arms, just as Allah had promised, so that her eyes would be cooled and she would not be sad. And she knew that Allah’s promise is always true.',
    ],
    think: 'Musa’s mother trusted Allah even when she was scared. What helps you feel safe?',
    sources: 'Quran 28:4–13, 20:38–40',
    check: true,
  },
  {
    id: 'sulayman-ant',
    title: 'The ant who spoke up',
    about: 'Prophet Sulayman',
    minutes: 3,
    paras: [
      'Prophet Sulayman, peace be upon him, was a king. Allah gave him wonderful gifts. He could understand the language of the birds, and he had a great army of people, and jinn, and birds too.',
      'One day Sulayman and his army were marching along, row after row after row. They came to a valley where lots and lots of ants lived.',
      'One little ant saw them coming. She called out to all the other ants: “Ants! Go into your homes, quickly, so that Sulayman and his army don’t step on you without even noticing!”',
      'And Sulayman heard her. Imagine that: a great king, listening to a tiny ant! He smiled, and laughed at what she said.',
      'Sulayman didn’t feel proud. Instead, he thanked Allah. He said, “My Lord, help me to be thankful for all the blessings You have given me and my parents, and help me do good things that please You.”',
      'A tiny ant looked after her friends. A great king was gentle and grateful. Allah loves both of those things.',
    ],
    think: 'The ant looked after her friends. How can you look after someone tomorrow?',
    sources: 'Quran 27:15–19',
    check: true,
  },
  {
    id: 'cave',
    title: 'The very long sleep',
    about: 'The young men of the cave',
    minutes: 4,
    paras: [
      'Long ago, there were some young men who believed in Allah, even though the people around them did not. Allah made their hearts strong, and they said, “Our Lord is the Lord of the heavens and the earth.”',
      'To keep their faith safe, they went to a cave in the mountains. Their dog came with them. Inside the cave they prayed: “Our Lord, give us mercy from You, and make everything right for us.”',
      'And then Allah made them fall asleep. A deep, deep sleep.',
      'Every morning the sun rose, and its light turned away from the cave. Every evening it set, and passed them by. They lay in a wide, cool space inside. If you had seen them, you would have thought they were awake! Allah turned them over to the right and to the left, and their dog lay at the entrance with its paws stretched out.',
      'They slept, and slept, and slept. For three hundred years, and nine more.',
      'Then Allah woke them up. They rubbed their eyes and asked each other, “How long have we been asleep?” “A day,” said one, “or maybe part of a day.”',
      'They were hungry, so they sent one of them into town with a silver coin to buy some good, clean food. “Be gentle and careful,” they told him.',
      'Allah let the people of the town find out about the young men and their very long sleep, so that they would know that Allah’s promise is true and the Day of Judgement will surely come.',
      'Only Allah knows exactly how many of them there were. But we know they trusted Him, and He looked after them, even while they slept. And Allah looks after you, too, while you sleep tonight.',
    ],
    think: 'If you slept for three hundred years, what would you want to see when you woke up?',
    sources: 'Quran 18:9–26',
    check: true,
  },
  {
    id: 'maryam',
    title: 'Dates under the palm tree',
    about: 'Maryam and baby Isa',
    minutes: 4,
    paras: [
      'Allah chose Maryam, peace be upon her, above all the women of the world. A whole chapter of the Quran is named after her. She spent her days worshipping Allah.',
      'One day, an angel brought her wonderful news from Allah: she was going to have a baby boy, called Isa. And he would be a prophet.',
      'When the time came for the baby to be born, Maryam went far away, to a quiet place. She was tired and in pain, and she leaned against the trunk of a date palm tree. She felt very alone.',
      'Then a voice called to her, from below her: “Don’t be sad. Your Lord has made a little stream of water flow beneath you. Shake the trunk of the palm tree, and fresh, ripe dates will fall down for you. So eat, and drink, and be happy.”',
      'Maryam shook the tree, and down came the sweet dates. There was cool water to drink. Allah had taken care of everything.',
      'Soon baby Isa was born. When Maryam carried him back to her people, they started asking her questions. Maryam didn’t answer. She just pointed to the baby.',
      '“How can we talk to a baby in a cradle?” they said. And then baby Isa spoke! Allah tells us what he said: “I am the servant of Allah. He has given me the Book and made me a prophet. Peace was on me the day I was born, and peace will be on me the day I die, and the day I am raised to life again.”',
      'Whenever we eat a date, we can remember Maryam, and how Allah looks after us when we feel tired and alone.',
    ],
    think: 'What is something sweet Allah has given you today?',
    sources: 'Quran 19:16–33, 3:42–47',
    check: true,
  },
  {
    id: 'thirsty-dog',
    title: 'The man and the thirsty dog',
    about: 'A story the Prophet ﷺ told',
    minutes: 3,
    paras: [
      'Our Prophet Muhammad, peace and blessings be upon him, once told his friends this story.',
      'A man was walking along a road when he grew very, very thirsty. Then he found a well. He climbed down inside it, drank the cool water, and climbed back out.',
      'At the top, he saw a dog. The dog was panting, with its tongue hanging out, and it was so thirsty it was licking the damp earth.',
      'The man thought, “This dog is as thirsty as I was.” So he climbed back down into the well. He filled his leather sock with water, held it in his teeth so his hands were free to climb, and came back up. Then he gave the water to the dog to drink.',
      'Allah was pleased with what the man did. Allah thanked him for it, and forgave him.',
      'The Prophet’s friends were surprised. “Messenger of Allah, do we get a reward for being kind to animals too?” The Prophet ﷺ said, “There is a reward for kindness to every living thing.”',
      'So a drink of water for a thirsty dog can be a big deed with Allah. No kindness is too small.',
    ],
    think: 'Is there an animal, or a person, you could be kind to tomorrow?',
    sources: 'Sahih al-Bukhari 2363, Sahih Muslim 2244',
    check: true,
  },
];

/** The dua before sleeping, from Munib's Hisn al-Muslim library (Sahih al-Bukhari 6324). */
export const SLEEP_DUA_ID = 'h105';
