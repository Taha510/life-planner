export type CategoryId = 'uni' | 'cy' | 'lg' | 'hi' | 'is' | 'rd' | 'bo';
export type Task = { id: string; text: string };
export type DailyPlan = Record<CategoryId, Task[]>;
export type CategoryMeta = { icon: string; name: string; hours: string; color: string };

export const DEFAULT_START = '2026-10-08';
export const DEFAULT_END = '2027-06-01';
export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  uni: { icon: '🎓', name: 'University', hours: '2h', color: '#4d7cfe' },
  cy: { icon: '🛡️', name: 'Cybersecurity', hours: '5–6h', color: '#00b894' },
  lg: { icon: '🌍', name: 'German + English', hours: '3h', color: '#e17055' },
  hi: { icon: '🏛️', name: 'History', hours: '1h', color: '#d4a017' },
  is: { icon: '🌙', name: 'Learning about Islam', hours: '1h', color: '#0a9396' },
  rd: { icon: '📚', name: 'Reading & self-improvement', hours: '2h', color: '#e84393' },
  bo: { icon: '✨', name: 'Boosters', hours: 'extras', color: '#8e7cff' },
};

const PH = [
  ['Networking basics', 'TCP/IP, DNS, HTTP, Wireshark'],
  ['Linux & command line', 'permissions, processes, Bash'],
  ['Python for security', 'scripting, sockets, automation'],
  ['Web security', 'OWASP Top 10, Burp Suite'],
  ['Cryptography', 'hashing, TLS, encryption basics'],
  ['Windows & Active Directory', 'attacks and defence'],
  ['Pentest methodology', 'recon, scanning, exploitation'],
  ['CTF training', 'picoCTF, TryHackMe, HackTheBox'],
  ['Blue team & SOC', 'logs, SIEM, detection'],
  ['Digital forensics', 'disk, memory, network artifacts'],
  ['Cloud security', 'AWS/Azure basics, IAM'],
  ['Cert prep & portfolio', 'Security+ style exam, write-ups'],
] as const;
const ERA = [
  'Ancient civilizations (Mesopotamia, Egypt, Greece)', 'Rome & Late Antiquity',
  'Rise of Islam & the early caliphates', 'Islamic Golden Age & the medieval world',
  'Mongols, Ottomans & great empires', 'Renaissance & Age of Exploration',
  'Revolutions & the Industrial age', 'World Wars & the modern world',
];
const lab = [
  'TryHackMe/HackTheBox room on ', 'Home-lab: set up a VM and practise ',
  'Write a script related to ', 'PortSwigger Academy / web lab for ',
  'CTF challenge (picoCTF, HTB) on ', 'Mini-project on GitHub about ',
  'Write-up of your best lab on ',
];
const drill = [
  'Linux commands drill', 'Python scripting kata', 'nmap / netcat practice',
  'Regex & log reading', 'Crypto puzzle (CryptoHack)', 'Analyse a pcap in Wireshark',
  'Read one CVE and explain it simply',
];
const uni = [
  'Plan the week: deadlines, assignments, exams', 'Hardest course: practice problems (60 min)',
  'Assignment / project progress (60 min)', 'Past exam questions, timed (60 min)',
  'Textbook chapter + one-page summary', 'Ask questions: professor, classmates, forum',
  'Catch-up block + organise notes',
];
const de = [
  'Cases: Nominativ vs Akkusativ', 'Dativ & prepositions', 'Verbs: Präsens & Perfekt',
  'Word order (V2, Nebensätze)', 'Adjective endings', 'Listening: Nicos Weg / DW + shadowing',
  'Write a 10-line diary in German',
];
const en = [
  'Podcast + 10 new words', 'Write a 200-word essay', 'Read a security blog, note vocabulary',
  'Record a 3-min speaking clip', 'Grammar & collocations', 'Watch a talk without subtitles',
  'Summarise a cyber topic in English',
];
const isl = [
  'Tafsir of a short surah', "Seerah: one episode of the Prophet's ﷺ life",
  'Hadith: one of the 40 Nawawi + reflection', 'Fiqh / aqeedah basics: one lesson',
  'Learn one Name of Allah and its meaning', "Jumu'ah, Surah Al-Kahf, extra dua & salawat",
  'Quran: review old + memorise 3 new ayat',
];
const reading = [
  'Set weekly goals (3 max)', 'Review your habit tracker',
  'Learn a method: Pomodoro or time-blocking',
  'Communication: practise explaining an idea',
  'Money basics (20 min): budgeting / saving',
  'Improve note-taking system / touch typing',
  'Digital detox hour + plan next week',
];

export function toDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}
export function dayDistance(from: Date, to: Date): number {
  return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000);
}
export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
export function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dateKey(toDate(value)) === value;
}

export function makePlan(date: Date): DailyPlan {
  const start = toDate(DEFAULT_START);
  const n = dayDistance(start, date);
  const week = Math.max(0, Math.floor(n / 7));
  const weekday = date.getDay();
  const month = date.getMonth();
  const exam = month === 0 || month === 4;
  const phase = PH[Math.min(Math.floor(week / 3), 11)];
  const phaseName = phase[0];
  const eraIndex = Math.max(0, Math.min((date.getFullYear() - 2026) * 12 + month - 9, 7));
  const era = ERA[eraIndex];
  const cyber = [
    `Theory block (90 min): ${phaseName} — ${phase[1]}`,
    `Hands-on lab (2h): ${lab[weekday]}${phaseName}`,
    'Notes & flashcards (45 min)',
    `Daily drill (45 min): ${drill[weekday]}`,
    'Optional +1h: CTF, cert prep or security news',
  ];
  const boosters = [
    '30 min walk or workout',
    'Sleep by 23:30 (7+ hours) and drink water',
    'Plan tomorrow in 5 minutes',
  ];
  if (weekday === 0) boosters.push('Weekly review (30 min): what worked, what to change');
  if (date.getDate() === 1) boosters.push('Monthly check: update goals and pick one thing to improve');
  const groups: Array<[CategoryId, string[]]> = [
    ['uni', [
      exam ? 'Exam mode: timed past paper (90 min)' : uni[weekday],
      'Review lecture notes and rewrite key points (30 min)',
      'Active recall: close notes and self-quiz (20 min)',
    ]],
    ['cy', cyber],
    ['lg', [
      `German (90 min): ${de[weekday]}`, `English (90 min): ${en[weekday]}`,
      'Anki review (15 min, split through the day)',
    ]],
    ['hi', [
      `Read or watch (40 min): ${era}`, 'Write a 5-line summary + why it matters',
      'Add one event to your personal timeline',
    ]],
    ['is', [
      'Quran: read and reflect (15 min)', `${isl[weekday]} (35 min)`,
      'Dhikr and dua (10 min)',
    ]],
    ['rd', [
      'Read 30–40 pages of your book (60 min)', 'Write the key takeaway (20 min)',
      `Skill of the day: ${reading[weekday]} (20 min)`, 'Reflect: 3 wins, 1 lesson (10 min)',
    ]],
    ['bo', boosters],
  ];
  return Object.fromEntries(groups.map(([category, tasks]) => [
    category, tasks.map((text, index) => ({ id: `${category}${index}`, text })),
  ])) as DailyPlan;
}

export function banners(date: Date, startIso: string, endIso: string): string[] {
  const messages: string[] = [];
  const time = date.getTime();
  if (time >= new Date(2027, 1, 8).getTime() && time <= new Date(2027, 2, 9).getTime()) {
    messages.push('🌙 Ramadan is expected around now (dates approximate). Consider lowering the load and keeping the core hours: cybersecurity, university and Quran.');
  }
  if (date.getMonth() === 0) messages.push('📝 January: exam season for many universities. Past papers replace your regular uni task.');
  if (date.getMonth() === 4) messages.push('📝 May: final exam stretch. Past papers replace your regular uni task.');
  if (date.getDay() === 5) messages.push('🕌 Friday: Jumu' + "'" + 'ah. Keep the day lighter if you need, but protect your cybersecurity block.');
  if (date.getDay() === 0) messages.push('🗓️ Sunday: weekly review. Look back, fix your weakest area, plan the week.');
  if (dateKey(date) === startIso) messages.push('🚀 Day one. Start small, finish every block, and let the habit build.');
  if (dateKey(date) === endIso) {
    const startMonth = toDate(startIso).toLocaleDateString('en-GB', { month: 'long' });
    messages.push(`🏁 Final day! Review everything you achieved since ${startMonth}.`);
  }
  return messages;
}

export const FLOW = [
  ['Morning', 'Islam 1h → Cybersecurity deep block'],
  ['Midday', 'University 2h'],
  ['Afternoon', 'German + English, split in 2 sessions'],
  ['Evening', 'Cybersecurity lab → History 1h'],
  ['Night', 'Reading 2h → plan tomorrow'],
] as const;

export const TIPS = [
  ['⚠️ Be realistic', 'warn', [
    '14–15 focused hours a day is a very heavy load. If you feel burnt out, trim the optional hour first, then shorten the lowest-priority block.',
    'Keep one lighter day each week and never skip sleep. Tired study is slow study.',
  ]],
  ['⏱️ Study smarter', '', [
    'Work in 50/10 blocks: 50 minutes focus, 10 minutes break.',
    'Active recall and spaced repetition beat re-reading.',
    'Explain a topic out loud as if teaching a beginner (Feynman method).',
  ]],
  ['🛡️ Cybersecurity', '', [
    'Labs over videos: aim for 70% hands-on.',
    'Keep a write-up for every lab. It becomes your portfolio.',
    'Only practise on systems you own or platforms that allow it (TryHackMe, HackTheBox, PortSwigger).',
    'Build a small home lab with VirtualBox: Kali plus a vulnerable VM.',
  ]],
  ['🌍 Languages', '', [
    'Shadow native speakers: repeat sentences right after hearing them.',
    'Use Anki daily, small and steady. Add words from real content only.',
    'Switch your phone and some apps to German.',
  ]],
  ['🌙 Faith & mindset', '', [
    'Anchor Islam study to a fixed time, such as right after Fajr.',
    'Small daily consistency with the Quran beats occasional marathons.',
  ]],
  ['🧠 Focus', '', [
    'Phone in another room during blocks.',
    'Time-block the next day every night.',
    'Start with the hardest task while your energy is highest.',
  ]],
  ['💪 Body & energy', '', [
    'Walk or exercise 30 minutes daily. It improves focus and memory.',
    'Sleep 7–8 hours, drink water, take a short break each hour, and follow the 20-20-20 eye rule.',
  ]],
  ['🏁 Staying on track', '', [
    'Do the weekly review every Sunday.',
    'Never miss twice: if you skip a day, resume the next one.',
    'Celebrate milestones, like finishing a phase or a certificate.',
  ]],
] as const;
