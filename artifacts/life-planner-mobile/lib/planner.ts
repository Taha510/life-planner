export type Task = { id: string; text: string };
export type FlowItem = { id: string; time: string; description: string };
export type Topic = {
  id: string;
  name: string;
  hours: string;
  icon: string;
  color: string;
};
export type ThemePreference = 'system' | 'light' | 'dark';
export type DateRange = { startDate: string; endDate: string };
export type DailyPlan = Record<string, Task[]>;

export type PlannerStructure = {
  customTopics: Topic[];
  hiddenTopicIds: string[];
  topicDetails: Record<string, { name: string; hours: string }>;
  deletedTaskIds: Record<string, string[]>;
  addedTasks: Record<string, Task[]>;
  flow: FlowItem[];
};

export type PlannerState = {
  range: DateRange;
  selectedDate: string;
  checks: Record<string, string[]>;
  overrides: Record<string, Record<string, string>>;
  structure: PlannerStructure;
  theme: ThemePreference;
};

export const DEFAULT_START = '2026-10-08';
export const DEFAULT_END = '2027-06-01';

export const CATEGORIES: Record<string, Omit<Topic, 'id'>> = {
  uni: { icon: 'school-outline', name: 'University', hours: '2h', color: '#4d7cfe' },
  cy: { icon: 'shield-checkmark-outline', name: 'Cybersecurity', hours: '5–6h', color: '#00b894' },
  lg: { icon: 'language-outline', name: 'German + English', hours: '3h', color: '#e17055' },
  hi: { icon: 'library-outline', name: 'History', hours: '1h', color: '#d4a017' },
  is: { icon: 'moon-outline', name: 'Learning about Islam', hours: '1h', color: '#0a9396' },
  rd: { icon: 'book-outline', name: 'Reading & self-improvement', hours: '2h', color: '#e84393' },
  bo: { icon: 'sparkles-outline', name: 'Boosters', hours: 'extras', color: '#8e7cff' },
};

export const FLOW: Array<[string, string]> = [
  ['Morning', 'Islam 1h → Cybersecurity deep block'],
  ['Midday', 'University 2h'],
  ['Afternoon', 'German + English, split in 2 sessions'],
  ['Evening', 'Cybersecurity lab → History 1h'],
  ['Night', 'Reading 2h → plan tomorrow'],
];

const phases = [
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

const eras = [
  'Ancient civilizations (Mesopotamia, Egypt, Greece)',
  'Rome & Late Antiquity',
  'Rise of Islam & the early caliphates',
  'Islamic Golden Age & the medieval world',
  'Mongols, Ottomans & great empires',
  'Renaissance & Age of Exploration',
  'Revolutions & the Industrial age',
  'World Wars & the modern world',
];
const labs = [
  'TryHackMe/HackTheBox room on ',
  'Home-lab: set up a VM and practise ',
  'Write a script related to ',
  'PortSwigger Academy / web lab for ',
  'CTF challenge (picoCTF, HTB) on ',
  'Mini-project on GitHub about ',
  'Write-up of your best lab on ',
];
const drills = [
  'Linux commands drill',
  'Python scripting kata',
  'nmap / netcat practice',
  'Regex & log reading',
  'Crypto puzzle (CryptoHack)',
  'Analyse a pcap in Wireshark',
  'Read one CVE and explain it simply',
];
const university = [
  'Plan the week: deadlines, assignments, exams',
  'Hardest course: practice problems (60 min)',
  'Assignment / project progress (60 min)',
  'Past exam questions, timed (60 min)',
  'Textbook chapter + one-page summary',
  'Ask questions: professor, classmates, forum',
  'Catch-up block + organise notes',
];
const german = [
  'Cases: Nominativ vs Akkusativ',
  'Dativ & prepositions',
  'Verbs: Präsens & Perfekt',
  'Word order (V2, Nebensätze)',
  'Adjective endings',
  'Listening: Nicos Weg / DW + shadowing',
  'Write a 10-line diary in German',
];
const english = [
  'Podcast + 10 new words',
  'Write a 200-word essay',
  'Read a security blog, note vocabulary',
  'Record a 3-min speaking clip',
  'Grammar & collocations',
  'Watch a talk without subtitles',
  'Summarise a cyber topic in English',
];
const islam = [
  'Tafsir of a short surah',
  "Seerah: one episode of the Prophet's ﷺ life",
  'Hadith: one of the 40 Nawawi + reflection',
  'Fiqh / aqeedah basics: one lesson',
  'Learn one Name of Allah and its meaning',
  "Jumu'ah, Surah Al-Kahf, extra dua & salawat",
  'Quran: review old + memorise 3 new ayat',
];
const reading = [
  'Set weekly goals (3 max)',
  'Review your habit tracker',
  'Learn a method: Pomodoro or time-blocking',
  'Communication: practise explaining an idea',
  'Money basics (20 min): budgeting / saving',
  'Improve note-taking system / touch typing',
  'Digital detox hour + plan next week',
];

export const TIPS = [
  {
    title: 'Be realistic',
    items: [
      '14–15 focused hours a day is a very heavy load. If you feel burnt out, trim the optional hour first, then shorten the lowest-priority block.',
      'Keep one lighter day each week and never skip sleep. Tired study is slow study.',
    ],
  },
  {
    title: 'Study smarter',
    items: [
      'Work in 50/10 blocks: 50 minutes focus, 10 minutes break.',
      'Active recall and spaced repetition beat re-reading.',
      'Explain a topic out loud as if teaching a beginner (Feynman method).',
    ],
  },
  {
    title: 'Cybersecurity',
    items: [
      'Labs over videos: aim for 70% hands-on.',
      'Keep a write-up for every lab. It becomes your portfolio.',
      'Only practise on systems you own or platforms that allow it (TryHackMe, HackTheBox, PortSwigger).',
      'Build a small home lab with VirtualBox: Kali plus a vulnerable VM.',
    ],
  },
  {
    title: 'Languages',
    items: [
      'Shadow native speakers: repeat sentences right after hearing them.',
      'Use Anki daily, small and steady. Add words from real content only.',
      'Switch your phone and some apps to German.',
    ],
  },
  {
    title: 'Faith & mindset',
    items: [
      'Anchor Islam study to a fixed time, such as right after Fajr.',
      'Small daily consistency with the Quran beats occasional marathons.',
    ],
  },
  {
    title: 'Focus',
    items: [
      'Phone in another room during blocks.',
      'Time-block the next day every night.',
      'Start with the hardest task while your energy is highest.',
    ],
  },
  {
    title: 'Body & energy',
    items: [
      'Walk or exercise 30 minutes daily. It improves focus and memory.',
      'Sleep 7–8 hours, drink water, take a short break each hour, and follow the 20-20-20 eye rule.',
    ],
  },
  {
    title: 'Staying on track',
    items: [
      'Do the weekly review every Sunday.',
      'Never miss twice: if you skip a day, resume the next one.',
      'Celebrate milestones, like finishing a phase or a certificate.',
    ],
  },
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
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86400000,
  );
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dateKey(toDate(value)) === value;
}

export function clampDate(value: string, range: DateRange): string {
  if (value < range.startDate) return range.startDate;
  if (value > range.endDate) return range.endDate;
  return value;
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-GB', options);
}

export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthKey(date: Date): string {
  return dateKey(monthStart(date));
}

export function monthLabel(date: Date): string {
  return formatDate(date, { month: 'short', year: 'numeric' });
}

export function monthsBetween(range: DateRange): Date[] {
  const months: Date[] = [];
  const cursor = monthStart(toDate(range.startDate));
  const last = monthStart(toDate(range.endDate));
  for (
    let month = cursor;
    month <= last;
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  ) {
    months.push(month);
  }
  return months;
}

export function makePlan(date: Date): DailyPlan {
  const n = dayDistance(toDate(DEFAULT_START), date);
  const week = Math.max(0, Math.floor(n / 7));
  const weekday = date.getDay();
  const month = date.getMonth();
  const exam = month === 0 || month === 4;
  const phase = phases[Math.min(Math.floor(week / 3), 11)];
  const eraIndex = Math.max(
    0,
    Math.min((date.getFullYear() - 2026) * 12 + month - 9, 7),
  );
  const era = eras[eraIndex];
  const cyber = [
    `Theory block (90 min): ${phase[0]} — ${phase[1]}`,
    `Hands-on lab (2h): ${labs[weekday]}${phase[0]}`,
    'Notes & flashcards (45 min)',
    `Daily drill (45 min): ${drills[weekday]}`,
    'Optional +1h: CTF, cert prep or security news',
  ];
  const boosters = [
    '30 min walk or workout',
    'Sleep by 23:30 (7+ hours) and drink water',
    'Plan tomorrow in 5 minutes',
  ];
  if (weekday === 0) boosters.push('Weekly review (30 min): what worked, what to change');
  if (date.getDate() === 1) boosters.push('Monthly check: update goals and pick one thing to improve');
  const groups: Array<[string, string[]]> = [
    [
      'uni',
      [
        exam ? 'Exam mode: timed past paper (90 min)' : university[weekday],
        'Review lecture notes and rewrite key points (30 min)',
        'Active recall: close notes and self-quiz (20 min)',
      ],
    ],
    ['cy', cyber],
    [
      'lg',
      [
        `German (90 min): ${german[weekday]}`,
        `English (90 min): ${english[weekday]}`,
        'Anki review (15 min, split through the day)',
      ],
    ],
    [
      'hi',
      [
        `Read or watch (40 min): ${era}`,
        'Write a 5-line summary + why it matters',
        'Add one event to your personal timeline',
      ],
    ],
    [
      'is',
      [
        'Quran: read and reflect (15 min)',
        `${islam[weekday]} (35 min)`,
        'Dhikr and dua (10 min)',
      ],
    ],
    [
      'rd',
      [
        'Read 30–40 pages of your book (60 min)',
        'Write the key takeaway (20 min)',
        `Skill of the day: ${reading[weekday]} (20 min)`,
        'Reflect: 3 wins, 1 lesson (10 min)',
      ],
    ],
    ['bo', boosters],
  ];
  return Object.fromEntries(
    groups.map(([category, tasks]) => [
      category,
      tasks.map((text, index) => ({ id: `${category}${index}`, text })),
    ]),
  );
}

export function defaultStructure(): PlannerStructure {
  return {
    customTopics: [],
    hiddenTopicIds: [],
    topicDetails: {},
    deletedTaskIds: {},
    addedTasks: {},
    flow: FLOW.map(([time, description], index) => ({
      id: `flow-${index}`,
      time,
      description,
    })),
  };
}

export function createDefaultState(): PlannerState {
  const range = { startDate: DEFAULT_START, endDate: DEFAULT_END };
  const today = dateKey(new Date());
  return {
    range,
    selectedDate: clampDate(today, range),
    checks: {},
    overrides: {},
    structure: defaultStructure(),
    theme: 'system',
  };
}

export function topicsFor(structure: PlannerStructure): Topic[] {
  const builtIn = Object.entries(CATEGORIES)
    .filter(([id]) => !structure.hiddenTopicIds.includes(id))
    .map(([id, meta]) => ({
      id,
      ...meta,
      ...structure.topicDetails[id],
    }));
  return [...builtIn, ...structure.customTopics];
}

export function planForDate(date: Date, structure: PlannerStructure): DailyPlan {
  const generated = makePlan(date);
  return Object.fromEntries(
    topicsFor(structure).map((topic) => {
      const deleted = new Set(structure.deletedTaskIds[topic.id] ?? []);
      const generatedTasks = (generated[topic.id] ?? []).filter(
        (task) => !deleted.has(task.id),
      );
      return [
        topic.id,
        [...generatedTasks, ...(structure.addedTasks[topic.id] ?? [])],
      ];
    }),
  );
}

export function progressFor(
  date: Date,
  checks: Record<string, string[]>,
  structure: PlannerStructure,
): number {
  const plan = planForDate(date, structure);
  const tasks = Object.values(plan).flat();
  if (!tasks.length) return 0;
  const validIds = new Set(tasks.map((task) => task.id));
  const complete = (checks[dateKey(date)] ?? []).filter((id) => validIds.has(id)).length;
  return complete / tasks.length;
}

export function dayBanners(date: Date, range: DateRange): string[] {
  const messages: string[] = [];
  const time = date.getTime();
  if (time >= new Date(2027, 1, 8).getTime() && time <= new Date(2027, 2, 9).getTime()) {
    messages.push('Ramadan is expected around now (dates approximate). Consider lowering the load and keeping the core hours: cybersecurity, university and Quran.');
  }
  if (date.getMonth() === 0) {
    messages.push('January: exam season for many universities. Past papers replace your regular university task.');
  }
  if (date.getMonth() === 4) {
    messages.push('May: final exam stretch. Past papers replace your regular university task.');
  }
  if (date.getDay() === 5) {
    messages.push("Friday: Jumu'ah. Keep the day lighter if you need, but protect your cybersecurity block.");
  }
  if (date.getDay() === 0) {
    messages.push('Sunday: weekly review. Look back, fix your weakest area, and plan the week.');
  }
  const key = dateKey(date);
  if (key === range.startDate) {
    messages.push('Day one. Start small, finish every block, and let the habit build.');
  }
  if (key === range.endDate) {
    messages.push(
      `Final day! Review everything you achieved since ${formatDate(toDate(range.startDate), { month: 'long' })}.`,
    );
  }
  return messages;
}

export function streakFor(
  today: Date,
  range: DateRange,
  checks: Record<string, string[]>,
  structure: PlannerStructure,
): number {
  const duration = dayDistance(toDate(range.startDate), toDate(range.endDate)) + 1;
  let current = dayDistance(toDate(range.startDate), today);
  let total = 0;
  while (current >= 0 && current < duration) {
    const date = addDays(toDate(range.startDate), current);
    if (progressFor(date, checks, structure) >= 0.7) total++;
    else if (dateKey(date) < dateKey(today)) break;
    current--;
  }
  return total;
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function belongsToTopic(taskId: string, topicId: string): boolean {
  const suffix = taskId.slice(topicId.length);
  return (
    taskId.startsWith(`custom:${topicId}:`) ||
    (suffix.length > 0 && /^\d+$/.test(suffix))
  );
}
